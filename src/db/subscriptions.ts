import type { ISODate } from '../logic/dates';
import { applyDuePriceChange, nextBill, rollSubscription } from '../logic/recurring';
import { db, newId } from './schema';
import type { Bill, Subscription } from './types';

export type SubscriptionInput = Pick<Subscription, 'name' | 'plan' | 'price' | 'cycle' | 'nextPayment' | 'category'>;

export async function saveSubscription(input: SubscriptionInput, today: ISODate, existingId?: string): Promise<string> {
  const existing = existingId ? await db.subscriptions.get(existingId) : undefined;
  if (existing) {
    const priceChanged = existing.price !== input.price;
    await db.subscriptions.put({
      ...existing,
      ...input,
      priceHistory: priceChanged ? [...existing.priceHistory, { price: input.price, from: today }] : existing.priceHistory,
    });
    return existing.id;
  }
  const sub: Subscription = {
    ...input,
    id: newId(),
    priceHistory: [{ price: input.price, from: today }],
    lastUsedCheck: today,
    active: true,
    createdAt: new Date().toISOString(),
  };
  await db.subscriptions.put(sub);
  return sub.id;
}

/** Registers an announced price change. Takes effect immediately if the date has passed. */
export async function setUpcomingPrice(id: string, price: number, from: ISODate, today: ISODate): Promise<void> {
  const sub = await db.subscriptions.get(id);
  if (!sub) return;
  await db.subscriptions.put(applyDuePriceChange({ ...sub, upcomingPrice: { price, from } }, today));
}

export async function clearUpcomingPrice(id: string): Promise<void> {
  const sub = await db.subscriptions.get(id);
  if (sub) await db.subscriptions.put({ ...sub, upcomingPrice: undefined });
}

export async function confirmStillUsed(id: string, today: ISODate): Promise<void> {
  await db.subscriptions.update(id, { lastUsedCheck: today });
}

export async function cancelSubscription(id: string, today: ISODate): Promise<void> {
  await db.subscriptions.update(id, { active: false, cancelledAt: today });
}

export async function reactivateSubscription(id: string, today: ISODate): Promise<void> {
  const sub = await db.subscriptions.get(id);
  if (!sub) return;
  // Bring the next payment date up to date without logging the skipped period.
  const { sub: rolled } = rollSubscription({ ...sub, active: true }, today, newId);
  await db.subscriptions.put({ ...rolled, cancelledAt: undefined, lastUsedCheck: today });
}

export async function deleteSubscription(id: string): Promise<void> {
  await db.subscriptions.delete(id);
}

export type BillInput = Pick<Bill, 'name' | 'amount' | 'dueDate' | 'recurring' | 'category'>;

export async function saveBill(input: BillInput, existingId?: string): Promise<void> {
  const existing = existingId ? await db.bills.get(existingId) : undefined;
  await db.bills.put(existing ? { ...existing, ...input } : { ...input, id: newId(), paid: false });
}

/** Marks a bill as paid and creates the next instance of a recurring bill (once). */
export async function markBillPaid(id: string, today: ISODate): Promise<void> {
  await db.transaction('rw', db.bills, async () => {
    const bill = await db.bills.get(id);
    if (!bill) return;
    await db.bills.put({ ...bill, paid: true, paidAt: today });
    const next = nextBill(bill, newId);
    if (!next) return;
    const exists = await db.bills.where('dueDate').equals(next.dueDate).filter((b) => b.name === bill.name).count();
    if (!exists) await db.bills.put(next);
  });
}

export async function markBillUnpaid(id: string): Promise<void> {
  const bill = await db.bills.get(id);
  if (bill) await db.bills.put({ ...bill, paid: false, paidAt: undefined });
}

export async function deleteBill(id: string): Promise<void> {
  await db.bills.delete(id);
}

/**
 * Runs on every app open: rolls passed subscription renewals forward and logs
 * their payments so the month's totals are right.
 */
export async function runRecurring(today: ISODate): Promise<void> {
  await db.transaction('rw', [db.subscriptions, db.subPayments], async () => {
    const subs = await db.subscriptions.toArray();
    for (const sub of subs) {
      const { sub: rolled, payments } = rollSubscription(sub, today, newId);
      if (payments.length || rolled !== sub) {
        await db.subscriptions.put(rolled);
        if (payments.length) await db.subPayments.bulkPut(payments);
      }
    }
  });
}
