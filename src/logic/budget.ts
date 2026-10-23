import type { AppData, Category } from '../db/types';
import { addMonthsISO, dayOfMonth, monthKey, startOfMonthISO, type ISODate } from './dates';

export interface SpendItem {
  date: ISODate;
  amount: number;
  category: Category;
  label: string;
  kind: 'purchase' | 'expense' | 'subscription' | 'bill';
}

type SpendData = Pick<AppData, 'purchases' | 'expenses' | 'subPayments' | 'bills'>;

/** Everything that counts as spending. Returned purchases and unpaid bills don't. */
export function spendItems(data: SpendData): SpendItem[] {
  return [
    ...data.purchases
      .filter((p) => p.status !== 'returned')
      .map((p) => ({ date: p.date, amount: p.price, category: p.category, label: p.product, kind: 'purchase' as const })),
    ...data.expenses.map((e) => ({ date: e.date, amount: e.amount, category: e.category, label: e.label, kind: 'expense' as const })),
    ...data.subPayments.map((s) => ({ date: s.date, amount: s.amount, category: s.category, label: s.name, kind: 'subscription' as const })),
    ...data.bills
      .filter((b) => b.paid)
      .map((b) => ({ date: b.paidAt ?? b.dueDate, amount: b.amount, category: b.category, label: b.name, kind: 'bill' as const })),
  ];
}

export function spentInMonth(data: SpendData, month: string): number {
  return round(spendItems(data).filter((i) => monthKey(i.date) === month).reduce((s, i) => s + i.amount, 0));
}

export interface BudgetStatus {
  spent: number;
  budget: number;
  remaining: number;
  /** 0–100+, share of the budget used */
  pct: number;
}

export function budgetStatus(data: SpendData & Pick<AppData, 'profile'>, today: ISODate): BudgetStatus {
  const spent = spentInMonth(data, monthKey(today));
  const budget = data.profile.monthlyBudget;
  return { spent, budget, remaining: round(budget - spent), pct: budget > 0 ? Math.round((spent / budget) * 100) : 0 };
}

/** Totals for the last `months` months, oldest first, ending with the current month. */
export function monthSeries(data: SpendData, today: ISODate, months = 6): { month: ISODate; total: number }[] {
  const items = spendItems(data);
  return Array.from({ length: months }, (_, i) => {
    const month = startOfMonthISO(addMonthsISO(today, i - (months - 1)));
    const key = monthKey(month);
    return { month, total: round(items.filter((it) => monthKey(it.date) === key).reduce((s, it) => s + it.amount, 0)) };
  });
}

export function categoryBreakdown(data: SpendData, month: string): { category: Category; amount: number }[] {
  const totals = new Map<Category, number>();
  for (const it of spendItems(data)) {
    if (monthKey(it.date) !== month) continue;
    totals.set(it.category, (totals.get(it.category) ?? 0) + it.amount);
  }
  return [...totals.entries()].map(([category, amount]) => ({ category, amount: round(amount) })).sort((a, b) => b.amount - a.amount);
}

/** Budget warning rule: more than 80 % used before day 20 of the month. */
export function isBudgetWarning(status: BudgetStatus, today: ISODate): boolean {
  return status.budget > 0 && status.pct > 80 && dayOfMonth(today) < 20;
}

function round(n: number) {
  return Math.round(n * 100) / 100;
}
