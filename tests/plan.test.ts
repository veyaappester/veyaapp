import { describe, expect, it } from 'vitest';
import type { AppData } from '../src/db/types';
import { buildIcs } from '../src/logic/ics';
import { planItems, timelineItems } from '../src/logic/plan';

const today = '2026-10-23';
const data: AppData = {
  profile: { id: 'me', name: 'A', monthlyBudget: 1000, noticeDaysBefore: 3, defaultReturnDays: 30, createdAt: '' },
  purchases: [
    {
      id: 'p1',
      product: 'AirPods Pro 2',
      store: 'Elgiganten',
      price: 1899,
      date: '2026-09-25',
      category: 'elektronik',
      boughtOnline: false,
      returnDays: 30,
      returnDeadline: '2026-10-25',
      complaintYears: 2,
      complaintUntil: '2028-09-25',
      status: 'active',
      createdAt: '',
    },
  ],
  subscriptions: [
    {
      id: 's1',
      name: 'Netflix',
      price: 149,
      cycle: 'monthly',
      nextPayment: '2026-10-24',
      category: 'fritid',
      priceHistory: [],
      upcomingPrice: { price: 159, from: '2026-11-24' },
      active: true,
      createdAt: '',
    },
  ],
  subPayments: [],
  bills: [
    { id: 'b1', name: 'El', amount: 645, dueDate: '2026-10-20', recurring: 'none', category: 'bolig', paid: false },
    { id: 'b2', name: 'Husleje', amount: 4200, dueDate: '2026-11-01', recurring: 'monthly', category: 'bolig', paid: false },
  ],
  expenses: [],
  events: [{ id: 'e1', title: 'Studiegruppe', date: '2026-10-25', time: '15.00', place: 'CBS Bibliotek' }],
  dismissed: [],
};

describe('plan items', () => {
  it('collects deadlines, renewals, bills and events in date order', () => {
    const items = timelineItems(data, today, 60);
    expect(items.map((i) => i.title)).toEqual([
      'Forfaldet: El',
      'Netflix fornyes',
      'Returfrist: AirPods Pro 2',
      'Studiegruppe kl. 15.00',
      'Betaling: Husleje',
      'Netflix fornyes',
      'Netflix stiger til 159 kr.',
    ]);
    expect(items[0].tone).toBe('danger');
    expect(items[2].tone).toBe('warn');
  });

  it('uses the new price for renewals after a price change', () => {
    const renewals = planItems(data, today, today, '2026-12-31').filter((i) => i.kind === 'renewal');
    expect(renewals.map((r) => r.subtitle.split(' · ')[0])).toEqual(['149 kr.', '159 kr.', '159 kr.']);
  });
});

describe('buildIcs', () => {
  it('writes all-day and timed events', () => {
    const ics = buildIcs(timelineItems(data, today, 10), new Date('2026-10-23T10:00:00Z'));
    expect(ics).toContain('BEGIN:VCALENDAR');
    expect(ics).toContain('DTSTART;VALUE=DATE:20261025');
    expect(ics).toContain('DTSTART:20261025T150000');
    expect(ics).toContain('SUMMARY:Returfrist: AirPods Pro 2');
    expect(ics.split('\r\n').every((l) => new TextEncoder().encode(l).length <= 75)).toBe(true);
  });
});
