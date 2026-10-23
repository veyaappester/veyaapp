import type { IconName } from '../components/Icon';
import type { AppData } from '../db/types';
import { addDaysISO, daysBetween, type ISODate } from './dates';
import { kr } from './format';
import { nextCycleDate } from './recurring';

export type PlanKind = 'return' | 'complaint' | 'warranty' | 'renewal' | 'price' | 'bill' | 'event';

export interface PlanItem {
  key: string;
  date: ISODate;
  time?: string;
  kind: PlanKind;
  title: string;
  subtitle: string;
  tone: '' | 'warn' | 'danger';
  icon: IconName;
  link?: string;
  /** Own events can be edited from the plan. */
  eventId?: string;
}

/**
 * Everything with a date between `from` and `to` (inclusive): deadlines, renewals
 * (every occurrence), bills and the user's own events. Overdue unpaid bills are
 * included when `includeOverdue` is set, so they stay visible until paid.
 */
export function planItems(data: AppData, today: ISODate, from: ISODate, to: ISODate, includeOverdue = false): PlanItem[] {
  const items: PlanItem[] = [];
  const noticeDays = data.profile.noticeDaysBefore;
  const inRange = (d: ISODate) => d >= from && d <= to;
  const toneFor = (d: ISODate): PlanItem['tone'] => {
    const days = daysBetween(today, d);
    if (days < 0) return 'danger';
    return days <= noticeDays ? 'warn' : '';
  };

  for (const p of data.purchases) {
    if (p.status === 'active' && p.returnDeadline && p.returnDeadline >= today && inRange(p.returnDeadline)) {
      items.push({
        key: `return:${p.id}`,
        date: p.returnDeadline,
        kind: 'return',
        title: `Returfrist: ${p.product}`,
        subtitle: 'Husk at tage stilling til købet',
        tone: toneFor(p.returnDeadline),
        icon: 'returnArrow',
        link: `/koeb/${p.id}`,
      });
    }
    if (p.status !== 'returned' && p.complaintUntil >= today && inRange(p.complaintUntil)) {
      items.push({
        key: `complaint:${p.id}`,
        date: p.complaintUntil,
        kind: 'complaint',
        title: `Reklamationsret udløber: ${p.product}`,
        subtitle: `${p.store} · tjek at alt virker inden`,
        tone: daysBetween(today, p.complaintUntil) <= 30 ? 'warn' : '',
        icon: 'shield',
        link: `/koeb/${p.id}`,
      });
    }
    if (p.status !== 'returned' && p.extraWarrantyUntil && p.extraWarrantyUntil >= today && inRange(p.extraWarrantyUntil)) {
      items.push({
        key: `warranty:${p.id}`,
        date: p.extraWarrantyUntil,
        kind: 'warranty',
        title: `Ekstra garanti udløber: ${p.product}`,
        subtitle: p.store,
        tone: '',
        icon: 'shield',
        link: `/koeb/${p.id}`,
      });
    }
  }

  for (const s of data.subscriptions) {
    if (!s.active) continue;
    let d = s.nextPayment;
    let guard = 0;
    while (d <= to && guard++ < 400) {
      if (d >= from && d >= today) {
        const price = s.upcomingPrice && s.upcomingPrice.from <= d ? s.upcomingPrice.price : s.price;
        items.push({
          key: `renewal:${s.id}:${d}`,
          date: d,
          kind: 'renewal',
          title: `${s.name} fornyes`,
          subtitle: `${kr(price)} · ${s.cycle === 'yearly' ? 'årligt' : s.cycle === 'weekly' ? 'ugentligt' : 'månedligt'} abonnement`,
          tone: toneFor(d),
          icon: 'repeat',
          link: `/abonnementer/${s.id}`,
        });
      }
      d = nextCycleDate(d, s.cycle);
    }
    if (s.upcomingPrice && s.upcomingPrice.from >= today && inRange(s.upcomingPrice.from)) {
      const diff = s.upcomingPrice.price - s.price;
      items.push({
        key: `price:${s.id}`,
        date: s.upcomingPrice.from,
        kind: 'price',
        title: `${s.name} ${diff >= 0 ? 'stiger' : 'falder'} til ${kr(s.upcomingPrice.price)}`,
        subtitle: `${diff >= 0 ? '+' : '−'}${kr(Math.abs(diff))} pr. betaling`,
        tone: '',
        icon: 'trendUp',
        link: `/abonnementer/${s.id}`,
      });
    }
  }

  for (const b of data.bills) {
    if (b.paid) continue;
    const overdue = b.dueDate < today;
    if (inRange(b.dueDate) || (includeOverdue && overdue)) {
      items.push({
        key: `bill:${b.id}`,
        date: b.dueDate,
        kind: 'bill',
        title: `${overdue ? 'Forfaldet' : 'Betaling'}: ${b.name}`,
        subtitle: `${kr(b.amount)} · faste udgifter`,
        tone: toneFor(b.dueDate),
        icon: 'bill',
        link: '/regninger',
      });
    }
  }

  for (const e of data.events) {
    if (!inRange(e.date)) continue;
    items.push({
      key: `event:${e.id}`,
      date: e.date,
      time: e.time,
      kind: 'event',
      title: e.time ? `${e.title} kl. ${e.time}` : e.title,
      subtitle: e.place ?? 'Din begivenhed',
      tone: '',
      icon: 'calendar',
      eventId: e.id,
    });
  }

  return items.sort((a, b) => a.date.localeCompare(b.date) || (a.time ?? '').localeCompare(b.time ?? ''));
}

/** Upcoming items for the timeline: overdue bills plus the next `days` days. */
export function timelineItems(data: AppData, today: ISODate, days: number): PlanItem[] {
  return planItems(data, today, today, addDaysISO(today, days), true);
}
