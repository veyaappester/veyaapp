import { describe, expect, it } from 'vitest';
import type { Bill, Expense, Purchase, SubscriptionPayment } from '../src/db/types';
import { budgetStatus, categoryBreakdown, monthSeries, spentInMonth } from '../src/logic/budget';

const purchase = (over: Partial<Purchase>): Purchase =>
  ({
    id: 'p',
    product: 'x',
    store: 's',
    price: 100,
    date: '2026-10-05',
    category: 'toej',
    boughtOnline: false,
    returnDays: 30,
    returnDeadline: null,
    complaintYears: 2,
    complaintUntil: '2028-10-05',
    status: 'active',
    createdAt: '',
    ...over,
  }) as Purchase;

const data = {
  profile: { id: 'me' as const, name: 'A', monthlyBudget: 1000, noticeDaysBefore: 3, defaultReturnDays: 30, createdAt: '' },
  purchases: [
    purchase({ id: 'a', price: 300 }),
    purchase({ id: 'b', price: 500, status: 'returned' }), // excluded
    purchase({ id: 'c', price: 200, date: '2026-09-15', category: 'elektronik' }),
  ],
  expenses: [{ id: 'e', label: 'Café', amount: 50, date: '2026-10-10', category: 'mad' }] as Expense[],
  subPayments: [{ id: 's', subscriptionId: 'x', name: 'Netflix', amount: 149, date: '2026-10-12', category: 'fritid' }] as SubscriptionPayment[],
  bills: [
    { id: 'b1', name: 'Husleje', amount: 400, dueDate: '2026-10-01', paid: true, paidAt: '2026-10-01', recurring: 'monthly', category: 'bolig' },
    { id: 'b2', name: 'El', amount: 999, dueDate: '2026-10-20', paid: false, recurring: 'none', category: 'bolig' }, // unpaid: excluded
  ] as Bill[],
};

describe('budget maths', () => {
  it('sums purchases, expenses, subscription payments and paid bills', () => {
    expect(spentInMonth(data, '2026-10')).toBe(300 + 50 + 149 + 400);
    expect(spentInMonth(data, '2026-09')).toBe(200);
  });

  it('computes used % and remaining', () => {
    expect(budgetStatus(data, '2026-10-23')).toEqual({ spent: 899, budget: 1000, remaining: 101, pct: 90 });
  });

  it('builds a 6-month series ending with the current month', () => {
    const s = monthSeries(data, '2026-10-23');
    expect(s).toHaveLength(6);
    expect(s[0].month).toBe('2026-05-01');
    expect(s[5]).toEqual({ month: '2026-10-01', total: 899 });
    expect(s[4].total).toBe(200);
  });

  it('breaks spending down by category, largest first', () => {
    expect(categoryBreakdown(data, '2026-10')).toEqual([
      { category: 'bolig', amount: 400 },
      { category: 'toej', amount: 300 },
      { category: 'fritid', amount: 149 },
      { category: 'mad', amount: 50 },
    ]);
  });
});
