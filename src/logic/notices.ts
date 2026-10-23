import type { IconName } from '../components/Icon';
import type { AppData } from '../db/types';
import { budgetStatus, isBudgetWarning } from './budget';
import { daysBetween, monthKey, type ISODate } from './dates';
import { fmtLong, fmtMonth, fmtShort, kr, relDays } from './format';
import { monthlyAmount } from './recurring';

export type NoticeTone = 'danger' | 'warn' | 'info' | 'ok';
export type NoticeKind = 'return' | 'complaint' | 'renewal' | 'price' | 'unused' | 'bill' | 'billOverdue' | 'budget' | 'allClear';

export interface Notice {
  /** Stable per occurrence (includes the date), so dismissing hides only this one. */
  key: string;
  kind: NoticeKind;
  tone: NoticeTone;
  /** "Kræver handling" or "Veya passer også på" */
  group: 'action' | 'watch';
  icon: IconName;
  title: string;
  subtitle: string;
  actionLabel: string;
  link: string;
  daysLeft: number | null;
  amount: number;
  quick?: { label: string; type: 'markBillPaid' | 'confirmUsed'; id: string };
}

export const UNUSED_CHECK_DAYS = 60;
const COMPLAINT_WARN_DAYS = 30;
const RENEWAL_DAYS = 2;

/** "i dag", "i morgen", or the weekday ("fredag") within a week, else "om N dage". */
function whenText(days: number, iso: ISODate): string {
  if (days <= 1) return relDays(days);
  if (days < 7) return fmtLong(iso).split(' ')[0];
  return relDays(days);
}

/**
 * Pure rule engine behind "Veya i dag", the home notices and the bell badge.
 * Everything is derived from the stored records; nothing is stored separately.
 */
export function buildNotices(data: AppData, today: ISODate): Notice[] {
  const notices: Notice[] = [];
  const noticeDays = data.profile.noticeDaysBefore;

  for (const p of data.purchases) {
    if (p.status === 'active' && p.returnDeadline) {
      const left = daysBetween(today, p.returnDeadline);
      if (left >= 0 && left <= noticeDays) {
        notices.push({
          key: `return:${p.id}:${p.returnDeadline}`,
          kind: 'return',
          tone: left === 0 ? 'danger' : 'warn',
          group: 'action',
          icon: 'returnArrow',
          title: left === 0 ? 'Din returfrist udløber i dag' : `Din returfrist udløber ${relDays(left)}`,
          subtitle: `${p.product} · ${p.store}`,
          actionLabel: 'Se muligheder for købet',
          link: `/koeb/${p.id}`,
          daysLeft: left,
          amount: p.price,
        });
      }
    }
    if (p.status !== 'returned') {
      const left = daysBetween(today, p.complaintUntil);
      if (left >= 0 && left <= COMPLAINT_WARN_DAYS) {
        notices.push({
          key: `complaint:${p.id}:${p.complaintUntil}`,
          kind: 'complaint',
          tone: 'info',
          group: left <= 7 ? 'action' : 'watch',
          icon: 'shield',
          title: `Reklamationsretten på ${p.product} udløber snart`,
          subtitle: `Udløber ${relDays(left)} (${fmtShort(p.complaintUntil)}). Tjek, at alt virker.`,
          actionLabel: 'Se købet',
          link: `/koeb/${p.id}`,
          daysLeft: left,
          amount: p.price,
        });
      }
    }
  }

  for (const s of data.subscriptions) {
    if (!s.active) continue;
    const days = daysBetween(today, s.nextPayment);
    const newPriceApplies = s.upcomingPrice && s.upcomingPrice.from <= s.nextPayment;
    const chargedPrice = newPriceApplies ? s.upcomingPrice!.price : s.price;
    if (days >= 0 && days <= RENEWAL_DAYS) {
      notices.push({
        key: `renewal:${s.id}:${s.nextPayment}`,
        kind: 'renewal',
        tone: 'warn',
        group: 'action',
        icon: 'repeat',
        title: `${s.name} fornyes ${relDays(days)} · ${kr(chargedPrice)}`,
        subtitle: `${kr(chargedPrice)} bliver trukket ${fmtLong(s.nextPayment)}`,
        actionLabel: 'Se abonnement',
        link: `/abonnementer/${s.id}`,
        daysLeft: days,
        amount: chargedPrice,
      });
    }

    if (s.upcomingPrice && s.upcomingPrice.from >= today) {
      const diff = s.upcomingPrice.price - s.price;
      if (diff !== 0) {
        notices.push({
          key: `price:${s.id}:${s.upcomingPrice.from}:${s.upcomingPrice.price}`,
          kind: 'price',
          tone: diff > 0 ? 'warn' : 'ok',
          group: 'action',
          icon: 'trendUp',
          title: `${s.name} ${diff > 0 ? 'stiger' : 'falder'} ${kr(Math.abs(diff))} fra ${fmtShort(s.upcomingPrice.from)}`,
          subtitle: `${kr(s.upcomingPrice.price)} fremover · ${diff > 0 ? '+' : '−'}${kr(Math.abs(diff))}`,
          actionLabel: 'Se abonnement og påmindelser',
          link: `/abonnementer/${s.id}`,
          daysLeft: daysBetween(today, s.upcomingPrice.from),
          amount: Math.abs(diff),
        });
      }
    } else if (s.priceHistory.length > 1) {
      const last = s.priceHistory[s.priceHistory.length - 1];
      const prev = s.priceHistory[s.priceHistory.length - 2];
      const since = daysBetween(last.from, today);
      if (last.price > prev.price && since >= 0 && since <= 30) {
        notices.push({
          key: `price:${s.id}:${last.from}:${last.price}`,
          kind: 'price',
          tone: 'warn',
          group: 'action',
          icon: 'trendUp',
          title: `${s.name} er steget ${kr(last.price - prev.price)}`,
          subtitle: `Du betaler nu ${kr(last.price)} · fra ${fmtShort(last.from)}`,
          actionLabel: 'Se abonnement og påmindelser',
          link: `/abonnementer/${s.id}`,
          daysLeft: null,
          amount: last.price - prev.price,
        });
      }
    }

    const lastCheck = s.lastUsedCheck ?? s.createdAt.slice(0, 10);
    if (daysBetween(lastCheck, today) >= UNUSED_CHECK_DAYS) {
      notices.push({
        key: `unused:${s.id}:${lastCheck}`,
        kind: 'unused',
        tone: 'info',
        group: 'action',
        icon: 'repeat',
        title: `Bruger du stadig ${s.name}?`,
        subtitle: `${kr(Math.round(monthlyAmount(s)))} om måneden. Opsig den, hvis du ikke bruger den.`,
        actionLabel: 'Opsig',
        link: `/abonnementer/${s.id}`,
        daysLeft: null,
        amount: monthlyAmount(s),
        quick: { label: 'Ja, jeg bruger den', type: 'confirmUsed', id: s.id },
      });
    }
  }

  const unpaid = data.bills.filter((b) => !b.paid);
  for (const b of unpaid) {
    const days = daysBetween(today, b.dueDate);
    if (days < 0) {
      notices.push({
        key: `billOverdue:${b.id}:${b.dueDate}`,
        kind: 'billOverdue',
        tone: 'danger',
        group: 'action',
        icon: 'warning',
        title: `${b.name} er forfaldet · ${kr(b.amount)}`,
        subtitle: `Skulle være betalt ${fmtShort(b.dueDate)} (${relDays(days)})`,
        actionLabel: 'Se regninger',
        link: '/regninger',
        daysLeft: days,
        amount: b.amount,
        quick: { label: 'Markér som betalt', type: 'markBillPaid', id: b.id },
      });
    } else if (days <= noticeDays) {
      notices.push({
        key: `bill:${b.id}:${b.dueDate}`,
        kind: 'bill',
        tone: 'warn',
        group: 'action',
        icon: 'bill',
        title: `${b.name} forfalder ${whenText(days, b.dueDate)} · ${kr(b.amount)}`,
        subtitle: `Betal senest ${fmtLong(b.dueDate)}`,
        actionLabel: 'Se regninger',
        link: '/regninger',
        daysLeft: days,
        amount: b.amount,
        quick: { label: 'Markér som betalt', type: 'markBillPaid', id: b.id },
      });
    }
  }

  const status = budgetStatus(data, today);
  if (isBudgetWarning(status, today)) {
    notices.push({
      key: `budget:${monthKey(today)}`,
      kind: 'budget',
      tone: status.pct >= 100 ? 'danger' : 'warn',
      group: 'action',
      icon: 'wallet',
      title: `Du har brugt ${status.pct}% af dit budget`,
      subtitle:
        status.remaining > 0
          ? `${kr(status.remaining)} tilbage resten af ${fmtMonth(today).split(' ')[0]}`
          : `${kr(-status.remaining)} over budget i ${fmtMonth(today).split(' ')[0]}`,
      actionLabel: 'Se økonomi',
      link: '/oekonomi',
      daysLeft: null,
      amount: status.spent,
    });
  }

  const dueSoon = unpaid.filter((b) => daysBetween(today, b.dueDate) <= 7);
  if (dueSoon.length === 0) {
    notices.push({
      key: `allClear:${today}`,
      kind: 'allClear',
      tone: 'ok',
      group: 'watch',
      icon: 'check',
      title: unpaid.length === 0 ? 'Du har ingen ubetalte regninger' : 'Ingen regninger forfalder den næste uge',
      subtitle: 'Alt er håndteret lige nu',
      actionLabel: 'Se regninger',
      link: '/regninger',
      daysLeft: null,
      amount: 0,
    });
  }

  const hidden = new Set(data.dismissed.filter((d) => d.until >= today).map((d) => d.key));
  return notices.filter((n) => !hidden.has(n.key)).sort(compareNotices);
}

const toneRank: Record<NoticeTone, number> = { danger: 0, warn: 1, info: 2, ok: 3 };

/** Overdue first, then fewest days left, then largest amount. "All clear" always last. */
export function compareNotices(a: Notice, b: Notice): number {
  if ((a.tone === 'ok') !== (b.tone === 'ok')) return a.tone === 'ok' ? 1 : -1;
  const overdueA = a.tone === 'danger' ? 0 : 1;
  const overdueB = b.tone === 'danger' ? 0 : 1;
  if (overdueA !== overdueB) return overdueA - overdueB;
  const dA = a.daysLeft ?? Number.POSITIVE_INFINITY;
  const dB = b.daysLeft ?? Number.POSITIVE_INFINITY;
  if (dA !== dB) return dA - dB;
  if (toneRank[a.tone] !== toneRank[b.tone]) return toneRank[a.tone] - toneRank[b.tone];
  return b.amount - a.amount;
}

/** Number shown on the bell: things that need action. */
export function actionCount(notices: Notice[]): number {
  return notices.filter((n) => n.group === 'action').length;
}

/** Snooze = hidden until tomorrow; dismiss = hidden for good (this occurrence only). */
export function snoozeUntil(today: ISODate): ISODate {
  return today;
}

export const DISMISS_FOREVER = '9999-12-31';
