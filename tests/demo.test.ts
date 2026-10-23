import 'fake-indexeddb/auto';
import { describe, expect, it } from 'vitest';
import { seedDemoData } from '../src/db/demo';
import { VeyaDB } from '../src/db/schema';
import { addDaysISO } from '../src/logic/dates';

const today = '2026-10-23';

describe('seedDemoData', () => {
  it('creates data relative to today', async () => {
    const db = new VeyaDB('demo-test');
    await seedDemoData(today, { database: db });

    const profile = await db.profile.get('me');
    expect(profile?.name).toBe('Sofie');
    expect(profile?.monthlyBudget).toBe(9600);

    const airpods = (await db.purchases.toArray()).find((p) => p.product === 'AirPods Pro 2');
    expect(airpods?.returnDeadline).toBe(addDaysISO(today, 2));

    const subs = await db.subscriptions.toArray();
    expect(subs).toHaveLength(6);
    const monthly = subs.reduce((sum, s) => sum + (s.cycle === 'yearly' ? s.price / 12 : s.price), 0);
    expect(monthly).toBe(597);

    const netflix = subs.find((s) => s.name === 'Netflix');
    expect(netflix?.nextPayment).toBe(addDaysISO(today, 1));
    expect(netflix?.upcomingPrice?.price).toBe(159);

    const events = await db.events.toArray();
    expect(events.some((e) => e.title === 'Studiegruppe' && e.time === '15.00')).toBe(true);

    // Seeding again replaces rather than duplicates.
    await seedDemoData(today, { database: db });
    expect(await db.subscriptions.count()).toBe(6);
  });
});
