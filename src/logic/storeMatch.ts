import { storeDefaults, type StoreDefault } from './storeDefaults';

/** Classic Levenshtein edit distance. */
export function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    for (let j = 1; j <= b.length; j++) {
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
    prev = cur;
  }
  return prev[b.length];
}

/**
 * Folds characters OCR typically confuses on receipts (I/l/|/1, O/0, ø/o, æ/ae…)
 * into one form, so "REMA IOOO" and "Rema 1OOO" both read as "rema 1000".
 */
export function ocrSkeleton(text: string): string {
  return text
    .toLowerCase()
    .replace(/æ/g, 'ae')
    .replace(/[øö]/g, 'o')
    .replace(/[åä]/g, 'a')
    .replace(/[éè€]/g, 'e')
    .replace(/@/g, 'a')
    .replace(/\$/g, 's')
    .replace(/[il|!1]/g, '1')
    .replace(/[o0]/g, '0')
    .replace(/[^a-z0-9& ]+/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Edits allowed for a store name of this length. Short names ("Power", "Netto")
 * must match exactly after folding, or ordinary words would turn into stores.
 */
function allowedDistance(len: number): number {
  if (len < 6) return 0;
  if (len < 9) return 1;
  return 2;
}

export interface StoreMatch {
  store: StoreDefault;
  /** 0 = exact after OCR folding; higher = less certain */
  distance: number;
  /** The name appears literally (no OCR correction needed). */
  exact: boolean;
}

/**
 * Finds a known Danish store in a line of OCR text, tolerating a few wrong
 * characters. Compares every run of 1–3 words (also with spaces removed, since
 * OCR often merges "REMA1000") against every alias.
 */
export function matchStore(line: string, maxDistance?: number): StoreMatch | undefined {
  const words = ocrSkeleton(line).split(' ').filter(Boolean);
  if (!words.length) return undefined;
  const spans: string[] = [];
  for (let i = 0; i < words.length; i++) {
    for (let n = 1; n <= 3 && i + n <= words.length; n++) {
      const span = words.slice(i, i + n);
      spans.push(span.join(' '), span.join(''));
    }
  }
  let best: Omit<StoreMatch, 'exact'> | undefined;
  for (const store of storeDefaults) {
    for (const alias of store.match) {
      const target = ocrSkeleton(alias);
      const compact = target.replace(/ /g, '');
      const limit = Math.min(maxDistance ?? Infinity, allowedDistance(compact.length));
      for (const span of spans) {
        // Spans far longer/shorter than the name can't be a match within the limit.
        if (Math.abs(span.length - target.length) > limit + 1) continue;
        const d = Math.min(levenshtein(span, target), levenshtein(span.replace(/ /g, ''), compact));
        if (d <= limit && (!best || d < best.distance || (d === best.distance && compact.length > bestLen(best)))) {
          best = { store, distance: d };
        }
      }
    }
  }
  if (!best) return undefined;
  const raw = line.toLowerCase();
  const exact = best.store.match.some((a) => raw.includes(a) || raw.replace(/\s/g, '').includes(a.replace(/\s/g, '')));
  return { ...best, exact };
}

function bestLen(m: Omit<StoreMatch, 'exact'>): number {
  return Math.max(...m.store.match.map((a) => a.replace(/ /g, '').length));
}
