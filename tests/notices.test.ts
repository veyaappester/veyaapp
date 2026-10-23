import 'fake-indexeddb/auto';
import { beforeAll, describe, expect, it } from 'vitest';
import { seedDemoData } from '../src/db/demo';
import { VeyaDB } from '../src/db/schema';
import type { AppData } from '../src/db/types';
import { addDaysISO } from '../src/logic/dates';
import { actionCount, buildNotices, DISMISS_FOREVER } from '../src/logic/notices';

const today = '2026-10-23';
let demo: AppData;

async function load(db: VeyaDB): Promise<AppData> {
  return {
    profile: (await db.profile.get('me'))!,
    purchases: await db.purchases.toArray(),
    subscriptions: await db.subscriptions.toArray(),
    subPayments: await db.subPayments.toArray(),
    bills: await db.bills.toArray(),
    expenses: await db.expenses.toArray(),
    events: await db.events.toArray(),
    dismissed: await db.dismissed.toArray(),
  };
}

beforeAll(async () => {
  const db = new VeyaDB('notices-test');
  await seedDemoData(today, { database: db });
  demo = await load(db);
});

describe('buildNotices with demo data', () => {
  it('produces the AirPods return and Netflix notices', () => {
    const notices = buildNotices(demo, today);
    const titles = notices.map((n) => n.title);
    expect(titles).toContain('Din returfrist udløber om 2 dage');
    expect(notices.find((n) => n.kind === 'return')?.subtitle).toBe('AirPods Pro 2 · Elgiganten');
    expect(titles).toContain('Netflix fornyes i morgen · 149 kr.');
    expect(titles.some((t) => t.startsWith('Netflix stiger 10 kr.'))).toBe(true);
    expect(titles).toContain('Reklamationsretten på Nintendo Switch OLED udløber snart');
    expect(titles).toContain('Bruger du stadig Viaplay?');
    expect(titles.some((t) => t.startsWith('El (kvartal) forfalder'))).toBe(true);
  });

  it('sorts by urgency: fewest days left first', () => {
    const notices = buildNotices(demo, today);
    expect(notices[0].kind).toBe('renewal'); // Netflix tomorrow
    expect(notices[1].kind).toBe('return'); // AirPods in 2 days
  });

  it('hides dismissed and snoozed notices', () => {
    const all = buildNotices(demo, today);
    const airpods = all.find((n) => n.kind === 'return')!;
    const snoozed = { ...demo, dismissed: [{ key: airpods.key, until: today }] };
    expect(buildNotices(snoozed, today).some((n) => n.key === airpods.key)).toBe(false);
    // A snooze lasts until tomorrow.
    expect(buildNotices(snoozed, addDaysISO(today, 1)).some((n) => n.kind === 'return')).toBe(true);
    const dismissed = { ...demo, dismissed: [{ key: airpods.key, until: DISMISS_FOREVER }] };
    expect(buildNotices(dismissed, addDaysISO(today, 1)).some((n) => n.kind === 'return')).toBe(false);
  });

  it('flags a just-missed return deadline in red for a few days', () => {
    const in3 = addDaysISO(today, 3); // AirPods deadline is today + 2
    const missed = buildNotices(demo, in3).find((n) => n.kind === 'return');
    expect(missed).toMatchObject({ tone: 'danger', title: 'Returfristen udløb i går' });
    expect(buildNotices(demo, addDaysISO(today, 6)).some((n) => n.kind === 'return')).toBe(false);
  });

  it('drops return notices once the purchase is kept or returned', () => {
    const kept = { ...demo, purchases: demo.purchases.map((p) => ({ ...p, status: 'kept' as const })) };
    expect(buildNotices(kept, today).some((n) => n.kind === 'return')).toBe(false);
  });
});

describe('bill rules', () => {
  const base: AppData = {
    profile: { id: 'me', name: 'A', monthlyBudget: 1000, noticeDaysBefore: 3, defaultReturnDays: 30, createdAt: '' },
    purchases: [],
    subscriptions: [],
    subPayments: [],
    bills: [],
    expenses: [],
    events: [],
    dismissed: [],
  };

  it('says all clear when there are no unpaid bills', () => {
    const n = buildNotices(base, today);
    expect(n).toHaveLength(1);
    expect(n[0]).toMatchObject({ kind: 'allClear', title: 'Du har ingen ubetalte regninger' });
    expect(actionCount(n)).toBe(0);
  });

  it('flags overdue bills in red, first', () => {
    const data = {
      ...base,
      bills: [
        { id: 'b1', name: 'Husleje', amount: 4200, dueDate: addDaysISO(today, -2), recurring: 'monthly' as const, category: 'bolig' as const, paid: false },
        { id: 'b2', name: 'El', amount: 600, dueDate: addDaysISO(today, 1), recurring: 'none' as const, category: 'bolig' as const, paid: false },
      ],
    };
    const n = buildNotices(data, today);
    expect(n[0]).toMatchObject({ kind: 'billOverdue', tone: 'danger' });
    expect(n[1].title).toBe('El forfalder i morgen · 600 kr.');
  });

  it('warns when more than 80 % of the budget is used before day 20', () => {
    const data = { ...base, expenses: [{ id: 'e', label: 'x', amount: 850, date: '2026-10-05', category: 'andet' as const }] };
    expect(buildNotices(data, '2026-10-10').some((n) => n.title === 'Du har brugt 85% af dit budget')).toBe(true);
    expect(buildNotices(data, '2026-10-21').some((n) => n.kind === 'budget')).toBe(false);
  });
});
