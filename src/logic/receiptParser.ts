import { findStoreDefault } from './storeDefaults';

export interface ParsedReceipt {
  store?: string;
  storeLocation?: string;
  date?: string; // ISO yyyy-MM-dd
  total?: number;
  items: { name: string; amount: number }[];
  receiptNumber?: string;
  paymentMethod?: string;
  online: boolean;
}

// Amounts like 1.899,00 · 1 899,00 · 1899,00 · 1899.00 · 49,95 (always with øre, as on receipts).
const AMOUNT_RE = /(?<![\d,.])(-?\d{1,3}(?:[. ]\d{3})+|-?\d+)\s?[,.]\s?(\d{2})(?![\d])/g;

const MONTHS: Record<string, number> = {
  jan: 1, feb: 2, mar: 3, apr: 4, maj: 5, may: 5, jun: 6, jul: 7, aug: 8, sep: 9, okt: 10, oct: 10, nov: 11, dec: 12,
};

const TOTAL_WORDS = [
  { re: /\b(at\s*betale|til\s*betaling)\b/i, rank: 0 },
  { re: /\b(total|totalt|i\s*alt|ialt|beløb\s*i\s*alt)\b/i, rank: 1 },
  { re: /\b(sum|beløb|betalt|dankort|visa|mastercard|kort)\b/i, rank: 2 },
];

/** Lines that contain an amount but are not a product. */
const NOT_ITEM = /(sub\s*total|total|i\s*alt|ialt|at\s*betale|moms|vat|byttepenge|retur|kontant|dankort|visa|mastercard|maestro|mobilepay|kort|beløb|betalt|rabat\s*i\s*alt|pant\s*i\s*alt|sum|heraf|cvr|tlf|tel|kasse|bon|ekspedient|saldo|point|bonus)/i;

const NOISE_FIRST_LINES = /(kvittering|faktura|velkommen|cvr|tlf|tel\.|www\.|@|\d{4}\s+[a-zæøå]|kasse|dato|bon)/i;

export function parseAmountToken(intPart: string, dec: string): number {
  return Number(intPart.replace(/[. ]/g, '') + '.' + dec);
}

function amountsIn(line: string): number[] {
  const out: number[] = [];
  for (const m of line.matchAll(AMOUNT_RE)) out.push(parseAmountToken(m[1], m[2]));
  return out;
}

function validDate(y: number, m: number, d: number): string | undefined {
  if (y < 100) y += 2000;
  if (m < 1 || m > 12 || d < 1 || d > 31 || y < 2000 || y > 2100) return undefined;
  const date = new Date(y, m - 1, d);
  if (date.getMonth() !== m - 1) return undefined;
  return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

export function findDate(text: string): string | undefined {
  // yyyy-mm-dd
  for (const m of text.matchAll(/\b(20\d{2})[-./](\d{1,2})[-./](\d{1,2})\b/g)) {
    const d = validDate(+m[1], +m[2], +m[3]);
    if (d) return d;
  }
  // dd-mm-yyyy, dd.mm.yy, dd/mm/yyyy (not part of an amount like 12.50)
  for (const m of text.matchAll(/(?<![\d,.])(\d{1,2})[-./](\d{1,2})[-./](\d{4}|\d{2})(?![\d,])/g)) {
    const d = validDate(+m[3], +m[2], +m[1]);
    if (d) return d;
  }
  // 12. sep 2026 / 12 september 2026
  for (const m of text.matchAll(/\b(\d{1,2})\.?\s*([a-zæøå]{3})[a-zæøå]*\.?\s*(20\d{2})\b/gi)) {
    const month = MONTHS[m[2].toLowerCase()];
    if (month) {
      const d = validDate(+m[3], month, +m[1]);
      if (d) return d;
    }
  }
  return undefined;
}

function titleCase(s: string): string {
  return s
    .toLowerCase()
    .replace(/(^|[\s&-])(\p{L})/gu, (_, a: string, b: string) => a + b.toUpperCase())
    .trim();
}

function cleanItemName(line: string): string {
  return line
    .replace(AMOUNT_RE, '')
    .replace(/\b\d+\s*[xX×]\s*/g, '')
    .replace(/\b(stk|kr|dkk)\.?\b/gi, '')
    .replace(/[*#=_|]+/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

/**
 * Pulls store, date, total, items, receipt number and card from OCR text of a
 * Danish receipt. OCR is noisy, so every field is optional and the user always
 * reviews the result before saving.
 */
export function parseReceipt(text: string): ParsedReceipt {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.replace(/\s+/g, ' ').trim())
    .filter((l) => l.length > 1);
  const result: ParsedReceipt = { items: [], online: false };

  // Store: a known chain anywhere near the top, else the first "name-like" line.
  const top = lines.slice(0, 8);
  let storeIdx = -1;
  for (let i = 0; i < top.length; i++) {
    const known = findStoreDefault(top[i]);
    if (known) {
      result.store = known.name;
      storeIdx = i;
      break;
    }
  }
  if (!result.store) {
    for (const known of [findStoreDefault(text)]) if (known) result.store = known.name;
  }
  if (!result.store) {
    storeIdx = top.findIndex((l) => {
      const letters = (l.match(/\p{L}/gu) ?? []).length;
      return letters >= 3 && letters / l.length > 0.6 && !NOISE_FIRST_LINES.test(l) && amountsIn(l).length === 0;
    });
    if (storeIdx >= 0) result.store = titleCase(top[storeIdx].replace(/[^\p{L}\d&' .-]/gu, ''));
  }
  // Location: the line right after the store if it is a place name (letters only, e.g. "Frederiksberg Centeret").
  const next = storeIdx >= 0 ? lines[storeIdx + 1] : undefined;
  if (next && /^[\p{L} .'-]{4,40}$/u.test(next) && !NOISE_FIRST_LINES.test(next) && !/^(tak|velkommen)/i.test(next)) {
    result.storeLocation = titleCase(next);
  }

  result.date = findDate(text);

  // Total: prefer "at betale" > "total / i alt" > card lines; fall back to the largest amount.
  let best: { rank: number; amount: number } | undefined;
  for (const line of lines) {
    if (/moms|vat|heraf|subtotal|byttepenge|rabat/i.test(line)) continue;
    const amounts = amountsIn(line);
    if (!amounts.length) continue;
    const amount = amounts[amounts.length - 1];
    for (const w of TOTAL_WORDS) {
      if (w.re.test(line) && amount > 0 && (!best || w.rank < best.rank || (w.rank === best.rank && amount > best.amount))) {
        best = { rank: w.rank, amount };
      }
    }
  }
  if (best) result.total = best.amount;
  else {
    const all = lines.filter((l) => !/moms|vat|heraf|cvr|tlf/i.test(l)).flatMap(amountsIn);
    if (all.length) result.total = Math.max(...all);
  }

  // Items: lines with a name and an amount; "1 x 1.899,00" lines take the name from the line above.
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (i <= storeIdx || NOT_ITEM.test(line)) continue;
    const amounts = amountsIn(line);
    if (!amounts.length) continue;
    let name = cleanItemName(line);
    if ((name.match(/\p{L}/gu) ?? []).length < 3 && i > 0) {
      const prev = lines[i - 1];
      if (!amountsIn(prev).length && !NOT_ITEM.test(prev) && !findDate(prev)) name = cleanItemName(prev);
    }
    if ((name.match(/\p{L}/gu) ?? []).length >= 3 && !findDate(line)) {
      result.items.push({ name, amount: amounts[amounts.length - 1] });
    }
  }

  const receiptNo = text.match(/(?:kassebon|bon\s*nr|bonnr|kvittering\s*nr|kvitt\.?\s*nr|trans(?:aktion)?\.?\s*nr|ordre\s*nr|ordrenummer|receipt\s*no)\.?\s*[:#]?\s*([A-Z0-9-]{3,})/i);
  if (receiptNo) result.receiptNumber = receiptNo[1];

  const brand = text.match(/\b(visa|mastercard|dankort|maestro|mobilepay|american express|amex|apple pay)\b/i);
  // Masked card numbers: "**** 4251", "XXXX XXXX 9921", OCR'd as "+++ 1234" or "... 1234".
  const last4 = text.match(/(?:[*xX•+#]{2,}[\s*xX•+#]*|\.{3,}\s*)(\d{4})\b/);
  if (brand) {
    const b = brand[1].toLowerCase();
    const name = b === 'mobilepay' ? 'MobilePay' : b === 'apple pay' ? 'Apple Pay' : b === 'amex' ? 'American Express' : titleCase(b);
    result.paymentMethod = last4 && b !== 'mobilepay' ? `${name} •••• ${last4[1]}` : name;
  }

  result.online = /\b(ordre\s*nr|ordrenummer|www\.|webshop|fortrydelsesret|levering|forsendelse)\b/i.test(text);
  return result;
}

/** Product name to pre-fill: the single item, or the most expensive one (groceries become "Dagligvarer"). */
export function suggestProduct(parsed: ParsedReceipt): string | undefined {
  if (!parsed.items.length) return undefined;
  if (parsed.items.length > 2 && parsed.store && findStoreDefault(parsed.store)?.category === 'mad') return 'Dagligvarer';
  const main = [...parsed.items].sort((a, b) => b.amount - a.amount)[0];
  return main.name.length > 60 ? main.name.slice(0, 60) : main.name;
}
