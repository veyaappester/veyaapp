import type { Category } from '../db/types';
import { todayISO } from './dates';
import { findStoreDefault } from './storeDefaults';
import { matchStore } from './storeMatch';

/** Fields the review screen can flag as "Veya is not sure". */
export type ReceiptField = 'store' | 'date' | 'price' | 'product' | 'paymentMethod' | 'receiptNumber';

export interface ParsedReceipt {
  store?: string;
  storeLocation?: string;
  category?: Category;
  date?: string; // ISO yyyy-MM-dd
  time?: string; // "17.39"
  total?: number;
  items: { name: string; amount: number }[];
  receiptNumber?: string;
  register?: string; // kasse nr.
  paymentMethod?: string;
  online: boolean;
  /** Fields that were found but may be misread. */
  uncertain: ReceiptField[];
}

export interface ParseOptions {
  /** Dates after this are rejected as misreads. Defaults to today. */
  today?: string;
  /** OCR confidence (0–100) per line, keyed by the trimmed line text. */
  lineConfidence?: Map<string, number>;
}

/** Below this OCR confidence a line's values are flagged for review. */
const LOW_CONFIDENCE = 75;

// Amounts with øre: 14,00 · 14.00 · 1.899,00 · 1 899,00 · 1,899.00
const AMOUNT_RE = /(?<![\d,.])(-?\d{1,3}(?:[. ,]\d{3})+|-?\d+)\s?([,.])\s?(\d{2})(?![\d])/g;

const MONTHS: Record<string, number> = {
  jan: 1, feb: 2, mar: 3, apr: 4, maj: 5, may: 5, jun: 6, jul: 7, aug: 8, sep: 9, okt: 10, oct: 10, nov: 11, dec: 12,
};

const TOTAL_WORDS: { re: RegExp; rank: number }[] = [
  { re: /\b(at\s*betale|til\s*betaling)\b/i, rank: 0 },
  { re: /\b(total|totalt|i\s*alt|ialt|beløb\s*i\s*alt)\b/i, rank: 1 },
  { re: /\bsum\b/i, rank: 2 },
];
const NOT_TOTAL = /(sub\s*total|moms|vat|heraf|byttepenge|rabat|retur|antal|point|bonus)/i;

const PAYMENT_RE = /\b(mast[e3]r\s*c[a@]r[dao0]|v[i1l]sa|dank[o0]rt|maestro|mobile\s*pay|american\s*express|amex|apple\s*pay|kort)\b/i;

/** Lines that contain an amount but are never a product. */
const NOT_ITEM =
  /(sub\s*total|total|i\s*alt|ialt|at\s*betale|til\s*betaling|\bsum\b|moms|vat|heraf|cvr|\btlf|telefon|\btel\b|betjent|ekspedient|stregkode|\bean\b|\bkort|dankort|visa|mast[e3]r|maestro|mobile\s*pay|byttepenge|kontant|retur|beløb|betalt|saldo|point|bonus|\bks\b|\bbon\b|kasse|antal\s*varer|auth|terminal)/i;

const NOISE_FIRST_LINES = /(kvittering|faktura|velkommen|cvr|tlf|tel\.|www\.|@|\d{4}\s+\p{L}|kasse|dato|\bbon\b)/iu;

/** Fixes digits OCR read as letters inside numbers ("2O,OO" → "20,00", "l4,00" → "14,00"). */
function fixDigits(line: string): string {
  // Only whole tokens shaped like an amount are touched, so words ("LOG", "serum l") stay intact.
  return line.replace(/(?<=^|\s)[\dOoQDlI|][\dOoQDlI|.]*[.,][\dOoQD]{2}(?=\s|$|kr|-)/g, (token) =>
    /\d/.test(token) ? token.replace(/[OoQD]/g, '0').replace(/[lI|]/g, '1') : token,
  );
}

function amountsIn(line: string): number[] {
  const out: number[] = [];
  for (const m of fixDigits(line).matchAll(AMOUNT_RE)) {
    out.push(Number(m[1].replace(/[. ,]/g, '') + '.' + m[3]));
  }
  return out;
}

/** True for barcodes and other long digit runs (EAN, card or reference numbers). */
function hasBarcode(line: string): boolean {
  return /\d{8,}/.test(line.replace(/\s/g, ''));
}

function validDate(y: number, m: number, d: number, today: string): string | undefined {
  if (y < 100) y += 2000;
  if (m < 1 || m > 12 || d < 1 || d > 31 || y < 2000) return undefined;
  const date = new Date(y, m - 1, d);
  if (date.getMonth() !== m - 1) return undefined; // e.g. 31-02
  const iso = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  return iso <= today ? iso : undefined; // a receipt can't be from the future
}

const TIME_AFTER = /^\s*(?:kl\.?\s*)?([01]?\d|2[0-3])[.:]([0-5]\d)(?!\d)/i;

/**
 * Finds the purchase date. Supports dd.mm.åå, dd-mm-åååå, dd/mm/åå, åååå-mm-dd and
 * "12. okt. 2026", with or without a time. Numbers without separators (like the
 * 8-digit bonnummer 20220107) are never read as dates. A date followed by a time
 * wins over other candidates, since that is how receipts print the purchase moment.
 */
export function findDate(text: string, today = todayISO()): { date: string; time?: string; candidates: number } | undefined {
  const found: { date: string; time?: string; index: number }[] = [];
  const add = (iso: string | undefined, index: number, rest: string) => {
    if (!iso) return;
    const t = rest.match(TIME_AFTER);
    found.push({ date: iso, time: t ? `${t[1].padStart(2, '0')}.${t[2]}` : undefined, index });
  };
  const fixed = text.replace(/(\d)\s*([.\-/])\s*(?=\d)/g, '$1$2'); // "18. 10.26" → "18.10.26"

  for (const m of fixed.matchAll(/(?<![\d.,])(20\d{2})([-./])(\d{1,2})\2(\d{1,2})(?![\d,])/g)) {
    add(validDate(+m[1], +m[3], +m[4], today), m.index!, fixed.slice(m.index! + m[0].length));
  }
  for (const m of fixed.matchAll(/(?<![\d.,])(\d{1,2})([-./])(\d{1,2})\2(\d{4}|\d{2})(?![\d,])/g)) {
    add(validDate(+m[4], +m[3], +m[1], today), m.index!, fixed.slice(m.index! + m[0].length));
  }
  for (const m of fixed.matchAll(/\b(\d{1,2})\.?\s*(\p{L}{3})\p{L}*\.?\s*(20\d{2})\b/giu)) {
    const month = MONTHS[m[2].toLowerCase()];
    if (month) add(validDate(+m[3], month, +m[1], today), m.index!, fixed.slice(m.index! + m[0].length));
  }
  if (!found.length) return undefined;
  const best = found.find((f) => f.time) ?? found.sort((a, b) => a.index - b.index)[0];
  const distinct = new Set(found.map((f) => f.date)).size;
  return { date: best.date, time: best.time, candidates: distinct };
}

function titleCase(s: string): string {
  return s
    .toLowerCase()
    .replace(/(^|[\s&-])(\p{L})/gu, (_, a: string, b: string) => a + b.toUpperCase())
    .trim();
}

function cleanItemName(line: string): string {
  return fixDigits(line)
    .replace(AMOUNT_RE, '')
    .replace(/\b\d+\s*[xX×*]\s*/g, '')
    .replace(/\b(stk|kr|dkk)\.?(?=\s|$)/gi, '')
    .replace(/[*#=_|~]+/g, ' ')
    .replace(/\s+[A-Z]$/, '') // trailing VAT code letter ("HVIDLØG 6,00 A")
    .replace(/\s{2,}/g, ' ')
    .trim();
}

const letters = (s: string) => (s.match(/\p{L}/gu) ?? []).length;

/**
 * Pulls store, date, total, items, bonnummer, kasse and payment from the OCR text
 * of a Danish receipt. OCR is noisy, so every field is optional, doubtful values
 * are listed in `uncertain`, and the user always reviews before saving.
 */
export function parseReceipt(text: string, { today = todayISO(), lineConfidence }: ParseOptions = {}): ParsedReceipt {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.replace(/\s+/g, ' ').trim())
    .filter((l) => l.length > 1);
  const result: ParsedReceipt = { items: [], online: false, uncertain: [] };
  const unsure = new Set<ReceiptField>();
  const lowConf = (line: string | undefined) => !!line && (lineConfidence?.get(line) ?? 100) < LOW_CONFIDENCE;

  // --- Store: a known chain near the top (fuzzy), else the first name-like line.
  const top = lines.slice(0, 10);
  let storeIdx = -1;
  for (let i = 0; i < top.length && storeIdx < 0; i++) {
    const m = matchStore(top[i]);
    if (m) {
      result.store = m.store.name;
      storeIdx = i;
      if (!m.exact || lowConf(top[i])) unsure.add('store');
    }
  }
  if (!result.store) {
    const exact = findStoreDefault(text) ?? lines.map((l) => matchStore(l, 0)?.store).find(Boolean);
    if (exact) {
      result.store = exact.name;
      unsure.add('store');
    }
  }
  if (!result.store) {
    storeIdx = top.findIndex((l) => {
      const n = letters(l);
      return n >= 3 && n / l.length > 0.6 && !NOISE_FIRST_LINES.test(l) && amountsIn(l).length === 0;
    });
    if (storeIdx >= 0) {
      result.store = titleCase(top[storeIdx].replace(/[^\p{L}\d&' .-]/gu, ''));
      unsure.add('store');
    }
  }
  const known = result.store ? findStoreDefault(result.store) : undefined;
  if (known) result.category = known.category;

  // Location: the line right after the store if it is a place name ("Frederiksberg Centeret").
  const next = storeIdx >= 0 ? lines[storeIdx + 1] : undefined;
  if (next && /^[\p{L} .'-]{4,40}$/u.test(next) && !NOISE_FIRST_LINES.test(next) && !/^(tak|velkommen)/i.test(next)) {
    result.storeLocation = titleCase(next);
  }

  // --- Date (+ time).
  const date = findDate(text, today);
  if (date) {
    result.date = date.date;
    result.time = date.time;
    const dateLine = lines.find((l) => findDate(l, today)?.date === date.date);
    if ((date.candidates > 1 && !date.time) || lowConf(dateLine)) unsure.add('date');
  }

  // --- Total: keyword line with its amount; else the payment line; else the largest amount.
  let best: { rank: number; amount: number; line: string } | undefined;
  lines.forEach((line, i) => {
    if (NOT_TOTAL.test(line)) return;
    const w = TOTAL_WORDS.find((t) => t.re.test(line));
    if (!w) return;
    let amounts = amountsIn(line);
    let source = line;
    // Some receipts print the amount on the line below the keyword.
    if (!amounts.length && lines[i + 1] && letters(lines[i + 1]) <= 3) {
      amounts = amountsIn(lines[i + 1]);
      source = lines[i + 1];
    }
    const amount = amounts[amounts.length - 1];
    if (amount > 0 && (!best || w.rank < best.rank)) best = { rank: w.rank, amount, line: source };
  });
  const paymentAmounts = lines.filter((l) => PAYMENT_RE.test(l)).flatMap(amountsIn).filter((a) => a > 0);
  if (best) {
    result.total = best.amount;
    if (best.rank > 0 && !paymentAmounts.includes(best.amount)) unsure.add('price');
    if (lowConf(best.line)) unsure.add('price');
  } else {
    const allAmounts = lines.filter((l) => !/moms|vat|heraf|cvr|tlf/i.test(l) && !findDate(l, today)).flatMap(amountsIn);
    const confirmed = paymentAmounts.filter((a) => allAmounts.filter((x) => x === a).length > 1);
    const pick = confirmed.length ? confirmed : paymentAmounts.length ? paymentAmounts : allAmounts;
    if (pick.length) {
      result.total = Math.max(...pick);
      unsure.add('price');
    }
  }

  // --- Items: text followed by an amount on the right; "1 x 1.899,00" takes the name from the line above.
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (i <= storeIdx || NOT_ITEM.test(line) || hasBarcode(line) || findDate(line, today)) continue;
    const amounts = amountsIn(line);
    if (!amounts.length) continue;
    let name = cleanItemName(line);
    if (letters(name) < 3 && i > 0) {
      const prev = lines[i - 1];
      if (!amountsIn(prev).length && !NOT_ITEM.test(prev) && !hasBarcode(prev) && !findDate(prev, today)) name = cleanItemName(prev);
    }
    const amount = amounts[amounts.length - 1];
    if (letters(name) >= 3 && amount > 0) result.items.push({ name, amount });
  }
  if (result.items.length !== 1 || result.items.some((it) => lowConf(lines.find((l) => l.includes(it.name))))) unsure.add('product');

  // --- Bonnummer and kasse ("KS: 2 BON: 20220107", "Kassebon 3493829", "Bon nr: 0042-117").
  const fixedText = text.replace(/[Oo](?=\d)|(?<=\d)[Oo]/g, '0');
  const receiptNo = fixedText.match(
    /(?:kassebon|bon\s*nr\.?|bonnr\.?|\bbon\b|kvittering\s*nr\.?|kvitt\.?\s*nr\.?|trans(?:aktion)?\.?\s*nr\.?|ordre\s*nr\.?|ordrenummer|receipt\s*no\.?)\s*[:#.]?\s*(\d[A-Z0-9-]{2,})/i,
  );
  if (receiptNo) result.receiptNumber = receiptNo[1];
  const register = fixedText.match(/(?:\bks|\bkasse(?:\s*nr\.?)?)\s*[:.#]?\s*(\d{1,3})\b/i);
  if (register) result.register = register[1];

  // --- Payment method (+ last four digits when printed masked).
  const brand = text.match(PAYMENT_RE);
  if (brand && !/^kort$/i.test(brand[1])) {
    const b = brand[1].toLowerCase().replace(/\s+/g, '');
    const name = /^mast/.test(b)
      ? 'Mastercard'
      : /^v.sa$/.test(b)
        ? 'Visa'
        : /^dank/.test(b)
          ? 'Dankort'
          : b === 'mobilepay'
            ? 'MobilePay'
            : b === 'applepay'
              ? 'Apple Pay'
              : b === 'amex' || b === 'americanexpress'
                ? 'American Express'
                : titleCase(b);
    const last4 = text.match(/(?:[*xX•+#]{2,}[\s*xX•+#]*|\.{3,}\s*)(\d{4})\b/);
    result.paymentMethod = last4 && name !== 'MobilePay' ? `${name} •••• ${last4[1]}` : name;
    if (brand[1].toLowerCase().replace(/\s+/g, '') !== name.toLowerCase().replace(/\s+/g, '')) unsure.add('paymentMethod');
  }

  result.online = /\b(ordre\s*nr|ordrenummer|www\.|webshop|fortrydelsesret|levering|forsendelse)\b/i.test(text);
  result.uncertain = [...unsure];
  return result;
}

/** Product name to pre-fill: the single item, or the most expensive one (larger grocery shops become "Dagligvarer"). */
export function suggestProduct(parsed: ParsedReceipt): string | undefined {
  if (!parsed.items.length) return undefined;
  if (parsed.items.length > 2 && parsed.category === 'mad') return 'Dagligvarer';
  const main = [...parsed.items].sort((a, b) => b.amount - a.amount)[0];
  return main.name.length > 60 ? main.name.slice(0, 60) : main.name;
}

/** How complete a parse is (used to pick the best OCR variant): 0–100. */
export function parseScore(p: ParsedReceipt): number {
  let s = 0;
  if (p.store) s += p.uncertain.includes('store') ? 12 : 25;
  if (p.date) s += p.uncertain.includes('date') ? 12 : 25;
  if (p.total) s += p.uncertain.includes('price') ? 12 : 25;
  if (p.items.length) s += 10;
  if (p.total && p.items.length && Math.abs(p.items.reduce((a, i) => a + i.amount, 0) - p.total) < 0.01) s += 10;
  if (p.paymentMethod) s += 5;
  return s;
}
