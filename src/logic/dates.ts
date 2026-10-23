import { addDays, addMonths, addWeeks, addYears, differenceInCalendarDays, format, parseISO } from 'date-fns';

/**
 * All dates are stored as local calendar dates ("yyyy-MM-dd") so deadline maths
 * never shifts by a day because of time zones.
 */
export type ISODate = string;

export function toISO(date: Date): ISODate {
  return format(date, 'yyyy-MM-dd');
}

export function fromISO(iso: ISODate): Date {
  // parseISO treats a date-only string as local midnight.
  return parseISO(iso.length > 10 ? iso.slice(0, 10) : iso);
}

export function todayISO(now: Date = new Date()): ISODate {
  return toISO(now);
}

export function addDaysISO(iso: ISODate, days: number): ISODate {
  return toISO(addDays(fromISO(iso), days));
}

export function addMonthsISO(iso: ISODate, months: number): ISODate {
  return toISO(addMonths(fromISO(iso), months));
}

export function addYearsISO(iso: ISODate, years: number): ISODate {
  return toISO(addYears(fromISO(iso), years));
}

export function addWeeksISO(iso: ISODate, weeks: number): ISODate {
  return toISO(addWeeks(fromISO(iso), weeks));
}

/** Whole calendar days from `from` to `to` (positive when `to` is later). */
export function daysBetween(from: ISODate, to: ISODate): number {
  return differenceInCalendarDays(fromISO(to), fromISO(from));
}

/** "2026-09" */
export function monthKey(iso: ISODate): string {
  return iso.slice(0, 7);
}

export function startOfMonthISO(iso: ISODate): ISODate {
  return `${iso.slice(0, 7)}-01`;
}

export function isSameMonth(a: ISODate, b: ISODate): boolean {
  return monthKey(a) === monthKey(b);
}

export function dayOfMonth(iso: ISODate): number {
  return Number(iso.slice(8, 10));
}
