import type { Purchase } from '../db/types';
import { addDaysISO, addYearsISO, daysBetween, type ISODate } from './dates';

export const DEFAULT_COMPLAINT_YEARS = 2;
export const ONLINE_RETURN_DAYS = 14;

/** Return deadline (date + returnDays) or null when there is no return right. */
export function returnDeadlineFor(date: ISODate, returnDays: number | null): ISODate | null {
  return returnDays === null ? null : addDaysISO(date, returnDays);
}

/** End of reklamationsret (complaint period), counted from the purchase date. */
export function complaintUntilFor(date: ISODate, complaintYears: number): ISODate {
  return addYearsISO(date, complaintYears);
}

/** Fills in the computed deadline fields. Always call before saving a purchase. */
export function withDeadlines<T extends Pick<Purchase, 'date' | 'returnDays' | 'complaintYears'>>(
  p: T,
): T & Pick<Purchase, 'returnDeadline' | 'complaintUntil'> {
  return {
    ...p,
    returnDeadline: returnDeadlineFor(p.date, p.returnDays),
    complaintUntil: complaintUntilFor(p.date, p.complaintYears),
  };
}

/** Days left until the return deadline, or null if there is none / it no longer matters. */
export function returnDaysLeft(p: Purchase, today: ISODate): number | null {
  if (p.status !== 'active' || !p.returnDeadline) return null;
  return daysBetween(today, p.returnDeadline);
}

export type PurchaseHint = { text: string; tone: 'warn' | 'danger' | 'ok' | 'muted' };

/** Short status text for list rows: "↩ 2 dage", "Returneret", "Reklamationsret gemt". */
export function purchaseHint(p: Purchase, today: ISODate, noticeDaysBefore: number): PurchaseHint {
  if (p.status === 'returned') return { text: 'Returneret', tone: 'muted' };
  if (p.status === 'complaint') return { text: 'Reklamation', tone: 'warn' };
  const left = returnDaysLeft(p, today);
  if (left !== null && left >= 0) {
    const text = left === 0 ? '↩ i dag' : left === 1 ? '↩ 1 dag' : `↩ ${left} dage`;
    return { text, tone: left <= noticeDaysBefore ? 'warn' : 'muted' };
  }
  if (daysBetween(today, p.complaintUntil) >= 0) return { text: 'Reklamationsret gemt', tone: 'ok' };
  return { text: 'Udløbet', tone: 'muted' };
}
