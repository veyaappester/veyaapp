import { describe, expect, it } from 'vitest';
import { addDaysISO, addMonthsISO, daysBetween } from '../src/logic/dates';
import { fmtDate, fmtLong, kr, relDays } from '../src/logic/format';

describe('kr', () => {
  it('formats whole kroner the Danish way', () => {
    expect(kr(1899)).toBe('1.899 kr.');
    expect(kr(78)).toBe('78 kr.');
    expect(kr(9600)).toBe('9.600 kr.');
  });

  it('keeps øre when present', () => {
    expect(kr(49.5)).toBe('49,50 kr.');
  });
});

describe('dates', () => {
  it('formats short and long Danish dates', () => {
    expect(fmtDate('2026-09-09')).toBe('9. sep. 2026');
    expect(fmtLong('2026-09-12')).toBe('lørdag 12. september');
  });

  it('does calendar maths on local dates', () => {
    expect(addDaysISO('2026-09-09', 30)).toBe('2026-10-09');
    expect(addMonthsISO('2026-01-31', 1)).toBe('2026-02-28');
    expect(daysBetween('2026-09-09', '2026-09-14')).toBe(5);
    expect(daysBetween('2026-03-28', '2026-03-30')).toBe(2); // across DST change
  });

  it('describes relative days', () => {
    expect(relDays(0)).toBe('i dag');
    expect(relDays(1)).toBe('i morgen');
    expect(relDays(2)).toBe('om 2 dage');
    expect(relDays(-3)).toBe('for 3 dage siden');
  });
});
