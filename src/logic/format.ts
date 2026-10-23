import { format } from 'date-fns';
import { da } from 'date-fns/locale';
import { fromISO } from './dates';

const krFormat = new Intl.NumberFormat('da-DK', { maximumFractionDigits: 2, minimumFractionDigits: 0 });

/** 1899 → "1.899 kr.", 49.5 → "49,50 kr." */
export function kr(amount: number): string {
  const rounded = Math.round(amount * 100) / 100;
  const text = Number.isInteger(rounded)
    ? krFormat.format(rounded)
    : new Intl.NumberFormat('da-DK', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(rounded);
  return `${text} kr.`;
}

/** "2026-09-09" → "9. sep. 2026" */
export function fmtDate(iso: string): string {
  return format(fromISO(iso), 'd. MMM yyyy', { locale: da });
}

/** "2026-09-09" → "9. sep." */
export function fmtShort(iso: string): string {
  return format(fromISO(iso), 'd. MMM', { locale: da });
}

/** "2026-09-12" → "fredag 12. september" */
export function fmtLong(iso: string): string {
  return format(fromISO(iso), 'EEEE d. MMMM', { locale: da });
}

/** "2026-09-12" → "12. september 2026" */
export function fmtFull(iso: string): string {
  return format(fromISO(iso), 'd. MMMM yyyy', { locale: da });
}

/** "2026-09" → "september 2026" */
export function fmtMonth(iso: string): string {
  return format(fromISO(iso), 'MMMM yyyy', { locale: da });
}

/** "2026-09-12" → "sep" (bar chart label) */
export function fmtMonthShort(iso: string): string {
  return format(fromISO(iso), 'MMM', { locale: da }).replace('.', '');
}

/** Parses user/OCR amounts: "1.899,00", "1899", "49,5 kr." → number (NaN if invalid). */
export function parseAmount(input: string): number {
  let s = input.replace(/kr\.?|dkk|\s/gi, '');
  if (!s) return NaN;
  if (s.includes(',')) {
    s = s.replace(/\./g, '').replace(',', '.');
  } else if (/^\d{1,3}(\.\d{3})+$/.test(s)) {
    s = s.replace(/\./g, ''); // "1.899" is a thousands separator, not decimals
  }
  return /^-?\d+(\.\d+)?$/.test(s) ? Number(s) : NaN;
}

export function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/** Relative day text used in notices and lists: "i dag", "i morgen", "om 3 dage", "for 2 dage siden". */
export function relDays(days: number): string {
  if (days === 0) return 'i dag';
  if (days === 1) return 'i morgen';
  if (days === -1) return 'i går';
  if (days > 1) return `om ${days} dage`;
  return `for ${-days} dage siden`;
}
