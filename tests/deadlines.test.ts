import { describe, expect, it } from 'vitest';
import type { Purchase } from '../src/db/types';
import { purchaseHint, withDeadlines } from '../src/logic/deadlines';
import { parseAmount } from '../src/logic/format';
import { findStoreDefault, purchaseDefaults } from '../src/logic/storeDefaults';

const base = (over: Partial<Purchase> = {}): Purchase =>
  withDeadlines({
    id: 'p1',
    product: 'AirPods Pro 2',
    store: 'Elgiganten',
    price: 1899,
    date: '2026-09-09',
    category: 'elektronik',
    boughtOnline: false,
    returnDays: 30,
    complaintYears: 2,
    status: 'active',
    createdAt: '',
    ...over,
  } as Purchase);

describe('withDeadlines', () => {
  it('computes return deadline and reklamationsret', () => {
    const p = base();
    expect(p.returnDeadline).toBe('2026-10-09');
    expect(p.complaintUntil).toBe('2028-09-09');
  });

  it('has no return deadline without a return right', () => {
    expect(base({ returnDays: null }).returnDeadline).toBeNull();
  });

  it('handles a leap day purchase', () => {
    expect(base({ date: '2028-02-29' }).complaintUntil).toBe('2030-02-28');
  });
});

describe('purchaseHint', () => {
  it('counts down the return deadline and warns when close', () => {
    expect(purchaseHint(base(), '2026-10-07', 3)).toEqual({ text: '↩ 2 dage', tone: 'warn' });
    expect(purchaseHint(base(), '2026-09-20', 3)).toEqual({ text: '↩ 19 dage', tone: 'muted' });
  });

  it('falls back to the complaint period after the deadline', () => {
    expect(purchaseHint(base(), '2026-11-01', 3).text).toBe('Reklamationsret gemt');
    expect(purchaseHint(base({ status: 'returned' }), '2026-10-01', 3).text).toBe('Returneret');
  });
});

describe('store defaults', () => {
  it('finds known stores in free text', () => {
    expect(findStoreDefault('ELGIGANTEN Frederiksberg')?.name).toBe('Elgiganten');
    expect(findStoreDefault('REMA 1000 Nørrebro')?.name).toBe('Rema 1000');
    expect(findStoreDefault('Powerbank 10000 mAh')).toBeUndefined();
  });

  it('applies Danish law and store policies', () => {
    expect(purchaseDefaults('Ukendt webshop', true, [], 30)).toMatchObject({ returnDays: 14, boughtOnline: true, source: 'law' });
    expect(purchaseDefaults('Lokal butik', false, [], 30)).toMatchObject({ returnDays: 30, source: 'profile' });
    expect(purchaseDefaults('Føtex', undefined, [], 30)).toMatchObject({ returnDays: null, category: 'mad' });
    expect(purchaseDefaults('Zalando', undefined, [], 30)).toMatchObject({ returnDays: 100, boughtOnline: true });
  });

  it('remembers the user’s last choice for a store', () => {
    const prefs = [{ store: 'elgiganten', returnDays: 60, boughtOnline: false, category: 'elektronik' as const }];
    expect(purchaseDefaults('Elgiganten', undefined, prefs, 30)).toMatchObject({ returnDays: 60, source: 'remembered' });
  });
});

describe('parseAmount', () => {
  it('reads Danish amounts', () => {
    expect(parseAmount('1.899,00')).toBe(1899);
    expect(parseAmount('1.899')).toBe(1899);
    expect(parseAmount('49,5 kr.')).toBe(49.5);
    expect(parseAmount('78')).toBe(78);
    expect(parseAmount('abc')).toBeNaN();
  });
});
