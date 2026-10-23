import { describe, expect, it } from 'vitest';
import type { Bill, Subscription } from '../src/db/types';
import { monthlyAmount, monthlyTotal, nextBill, rollSubscription } from '../src/logic/recurring';

let n = 0;
const id = () => `id${++n}`;

const netflix = (over: Partial<Subscription> = {}): Subscription => ({
  id: 's1',
  name: 'Netflix',
  price: 149,
  cycle: 'monthly',
  nextPayment: '2026-09-12',
  category: 'fritid',
  priceHistory: [{ price: 149, from: '2025-01-01' }],
  active: true,
  createdAt: '',
  ...over,
});

describe('rollSubscription', () => {
  it('does nothing before the renewal has passed', () => {
    const s = netflix();
    const r = rollSubscription(s, '2026-09-12', id);
    expect(r.payments).toHaveLength(0);
    expect(r.sub).toBe(s);
  });

  it('logs each passed renewal and moves the date forward', () => {
    const r = rollSubscription(netflix(), '2026-11-20', id);
    expect(r.payments.map((p) => p.date)).toEqual(['2026-09-12', '2026-10-12', '2026-11-12']);
    expect(r.sub.nextPayment).toBe('2026-12-12');
  });

  it('applies an announced price increase from its date', () => {
    const s = netflix({ upcomingPrice: { price: 159, from: '2026-10-12' } });
    const r = rollSubscription(s, '2026-10-20', id);
    expect(r.payments.map((p) => p.amount)).toEqual([149, 159]);
    expect(r.sub.price).toBe(159);
    expect(r.sub.upcomingPrice).toBeUndefined();
    expect(r.sub.priceHistory.at(-1)).toEqual({ price: 159, from: '2026-10-12' });
  });

  it('skips inactive subscriptions', () => {
    const r = rollSubscription(netflix({ active: false }), '2027-01-01', id);
    expect(r.payments).toHaveLength(0);
  });
});

describe('monthly totals', () => {
  it('converts yearly and weekly prices', () => {
    expect(monthlyAmount({ price: 864, cycle: 'yearly' })).toBe(72);
    expect(monthlyAmount({ price: 30, cycle: 'weekly' })).toBe(130);
    expect(monthlyTotal([netflix(), netflix({ id: 's2', price: 864, cycle: 'yearly' }), netflix({ id: 's3', active: false })])).toBe(221);
  });
});

describe('nextBill', () => {
  const rent: Bill = { id: 'b1', name: 'Husleje', amount: 4200, dueDate: '2026-10-01', recurring: 'monthly', category: 'bolig', paid: true };
  it('creates the next instance of recurring bills', () => {
    expect(nextBill(rent, id)).toMatchObject({ dueDate: '2026-11-01', paid: false, amount: 4200 });
    expect(nextBill({ ...rent, recurring: 'quarterly' }, id)?.dueDate).toBe('2027-01-01');
    expect(nextBill({ ...rent, recurring: 'none' }, id)).toBeNull();
  });
});
