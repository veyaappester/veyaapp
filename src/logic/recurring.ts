import type { Bill, BillRecurrence, Cycle, Subscription, SubscriptionPayment } from '../db/types';
import { addMonthsISO, addWeeksISO, addYearsISO, type ISODate } from './dates';

export function nextCycleDate(iso: ISODate, cycle: Cycle): ISODate {
  if (cycle === 'weekly') return addWeeksISO(iso, 1);
  if (cycle === 'yearly') return addYearsISO(iso, 1);
  return addMonthsISO(iso, 1);
}

/** Price per month, so yearly and weekly subscriptions can be summed with monthly ones. */
export function monthlyAmount(sub: Pick<Subscription, 'price' | 'cycle'>): number {
  if (sub.cycle === 'yearly') return sub.price / 12;
  if (sub.cycle === 'weekly') return (sub.price * 52) / 12;
  return sub.price;
}

export function monthlyTotal(subs: Subscription[]): number {
  return Math.round(subs.filter((s) => s.active).reduce((sum, s) => sum + monthlyAmount(s), 0));
}

export const cycleLabel: Record<Cycle, string> = { monthly: 'månedligt', yearly: 'årligt', weekly: 'ugentligt' };
export const cycleUnit: Record<Cycle, string> = { monthly: 'md.', yearly: 'år', weekly: 'uge' };

/** Applies an announced price change that has taken effect on or before `date`. */
export function applyDuePriceChange(sub: Subscription, date: ISODate): Subscription {
  if (!sub.upcomingPrice || sub.upcomingPrice.from > date) return sub;
  const { price, from } = sub.upcomingPrice;
  return { ...sub, price, priceHistory: [...sub.priceHistory, { price, from }], upcomingPrice: undefined };
}

/**
 * Rolls `nextPayment` forward past `today`, logging one payment per passed
 * renewal (at the price valid on that date). Payments are charged on the
 * renewal day, so a renewal dated today is logged tomorrow.
 */
export function rollSubscription(
  sub: Subscription,
  today: ISODate,
  makeId: () => string,
): { sub: Subscription; payments: SubscriptionPayment[] } {
  let s = sub;
  const payments: SubscriptionPayment[] = [];
  if (!s.active) return { sub: applyDuePriceChange(s, today), payments };
  let guard = 0;
  while (s.nextPayment < today && guard++ < 520) {
    const priced = applyDuePriceChange(s, s.nextPayment);
    payments.push({
      id: makeId(),
      subscriptionId: s.id,
      name: s.name,
      amount: priced.price,
      date: s.nextPayment,
      category: s.category,
    });
    s = { ...priced, nextPayment: nextCycleDate(s.nextPayment, s.cycle) };
  }
  return { sub: applyDuePriceChange(s, today), payments };
}

export function billInterval(recurring: BillRecurrence): number {
  return recurring === 'monthly' ? 1 : recurring === 'quarterly' ? 3 : recurring === 'yearly' ? 12 : 0;
}

/** The next instance of a recurring bill, or null for one-off bills. */
export function nextBill(bill: Bill, makeId: () => string): Bill | null {
  const months = billInterval(bill.recurring);
  if (!months) return null;
  return {
    id: makeId(),
    name: bill.name,
    amount: bill.amount,
    category: bill.category,
    recurring: bill.recurring,
    dueDate: addMonthsISO(bill.dueDate, months),
    paid: false,
  };
}

export const recurrenceLabel: Record<BillRecurrence, string> = {
  none: 'Engangs',
  monthly: 'Hver måned',
  quarterly: 'Hvert kvartal',
  yearly: 'Hvert år',
};
