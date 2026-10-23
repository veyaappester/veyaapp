import type { Category, StorePref } from '../db/types';

export interface StoreDefault {
  name: string;
  /** Lower-case strings that identify the store on a receipt or in the store field. */
  match: string[];
  returnDays: number | null;
  online: boolean;
  category: Category;
}

/**
 * Common Danish stores. Return days are the stores' usual voluntary policies and
 * may change, which is why the UI always says "tjek butikkens regler".
 */
export const storeDefaults: StoreDefault[] = [
  { name: 'Elgiganten', match: ['elgiganten'], returnDays: 30, online: false, category: 'elektronik' },
  { name: 'Power', match: ['power'], returnDays: 30, online: false, category: 'elektronik' },
  { name: 'Proshop', match: ['proshop'], returnDays: 14, online: true, category: 'elektronik' },
  { name: 'Apple', match: ['apple'], returnDays: 14, online: false, category: 'elektronik' },
  { name: 'Zalando', match: ['zalando'], returnDays: 100, online: true, category: 'toej' },
  { name: 'Boozt', match: ['boozt'], returnDays: 30, online: true, category: 'toej' },
  { name: 'H&M', match: ['h&m', 'hennes'], returnDays: 30, online: false, category: 'toej' },
  { name: 'Zara', match: ['zara'], returnDays: 30, online: false, category: 'toej' },
  { name: 'Weekday', match: ['weekday'], returnDays: 30, online: false, category: 'toej' },
  { name: 'Magasin', match: ['magasin'], returnDays: 30, online: false, category: 'toej' },
  { name: 'Matas', match: ['matas'], returnDays: 30, online: false, category: 'skoenhed' },
  { name: 'Normal', match: ['normal'], returnDays: 30, online: false, category: 'skoenhed' },
  { name: 'Sephora', match: ['sephora'], returnDays: 30, online: false, category: 'skoenhed' },
  { name: 'IKEA', match: ['ikea'], returnDays: 365, online: false, category: 'bolig' },
  { name: 'JYSK', match: ['jysk'], returnDays: 30, online: false, category: 'bolig' },
  { name: 'Søstrene Grene', match: ['søstrene grene', 'sostrene grene'], returnDays: 30, online: false, category: 'bolig' },
  { name: 'Flying Tiger', match: ['flying tiger', 'tiger'], returnDays: 30, online: false, category: 'andet' },
  { name: 'Bilka', match: ['bilka'], returnDays: 30, online: false, category: 'mad' },
  { name: 'Føtex', match: ['føtex', 'fotex', 'foetex'], returnDays: null, online: false, category: 'mad' },
  { name: 'Netto', match: ['netto'], returnDays: null, online: false, category: 'mad' },
  { name: 'Rema 1000', match: ['rema 1000', 'rema'], returnDays: null, online: false, category: 'mad' },
  { name: 'Lidl', match: ['lidl'], returnDays: null, online: false, category: 'mad' },
  { name: 'Coop 365', match: ['coop 365', 'coop365'], returnDays: null, online: false, category: 'mad' },
  { name: 'Kvickly', match: ['kvickly'], returnDays: null, online: false, category: 'mad' },
  { name: 'Irma', match: ['irma'], returnDays: null, online: false, category: 'mad' },
  { name: 'Meny', match: ['meny'], returnDays: null, online: false, category: 'mad' },
  { name: 'SuperBrugsen', match: ['superbrugsen', 'super brugsen'], returnDays: null, online: false, category: 'mad' },
  { name: "Dagli'Brugsen", match: ["dagli'brugsen", 'daglibrugsen', 'dagli brugsen'], returnDays: null, online: false, category: 'mad' },
  { name: 'Løvbjerg', match: ['løvbjerg', 'lovbjerg'], returnDays: null, online: false, category: 'mad' },
  { name: 'Spar', match: ['spar'], returnDays: null, online: false, category: 'mad' },
  { name: 'Lagkagehuset', match: ['lagkagehuset'], returnDays: null, online: false, category: 'mad' },
  { name: 'Circle K', match: ['circle k'], returnDays: null, online: false, category: 'transport' },
  { name: 'Imerco', match: ['imerco'], returnDays: 30, online: false, category: 'bolig' },
  { name: '7-Eleven', match: ['7-eleven', '7 eleven'], returnDays: null, online: false, category: 'mad' },
  { name: 'Joe & The Juice', match: ['joe & the juice', 'joe and the juice'], returnDays: null, online: false, category: 'mad' },
  { name: 'Sport 24', match: ['sport 24', 'sport24'], returnDays: 30, online: false, category: 'fritid' },
  { name: 'Intersport', match: ['intersport'], returnDays: 30, online: false, category: 'fritid' },
  { name: 'Arket', match: ['arket'], returnDays: 30, online: false, category: 'toej' },
  { name: 'Amazon', match: ['amazon'], returnDays: 30, online: true, category: 'andet' },
  { name: 'Temu', match: ['temu'], returnDays: 90, online: true, category: 'andet' },
  { name: 'DSB', match: ['dsb'], returnDays: null, online: false, category: 'transport' },
];

export function normalizeStore(name: string): string {
  return name.trim().toLowerCase();
}

/** Finds a known store whose identifier appears in `text` (store field or receipt line). */
export function findStoreDefault(text: string): StoreDefault | undefined {
  const t = normalizeStore(text);
  if (!t) return undefined;
  // Longest identifiers first so "rema 1000" wins over "rema" and "flying tiger" over "tiger".
  const candidates = storeDefaults
    .flatMap((s) => s.match.map((m) => ({ s, m })))
    .sort((a, b) => b.m.length - a.m.length);
  for (const { s, m } of candidates) {
    const re = new RegExp(`(^|[^a-zæøå0-9])${m.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}($|[^a-zæøå0-9])`);
    if (re.test(t)) return s;
  }
  return undefined;
}

export interface PurchaseDefaults {
  returnDays: number | null;
  boughtOnline: boolean;
  category?: Category;
  /** Where the default came from, for the hint under the field. */
  source: 'remembered' | 'store' | 'law' | 'profile';
}

/**
 * Default return right for a purchase: the user's own last choice for this store
 * wins, then the store lookup, then Danish law (14 days online) / the profile default.
 */
export function purchaseDefaults(
  store: string,
  boughtOnline: boolean | undefined,
  prefs: StorePref[],
  profileDefaultReturnDays: number,
): PurchaseDefaults {
  const key = normalizeStore(store);
  const pref = prefs.find((p) => p.store === key);
  if (pref && (boughtOnline === undefined || boughtOnline === pref.boughtOnline)) {
    return { returnDays: pref.returnDays, boughtOnline: pref.boughtOnline, category: pref.category, source: 'remembered' };
  }
  const known = findStoreDefault(store);
  const online = boughtOnline ?? known?.online ?? false;
  if (known) {
    // Online purchases always have at least the 14-day statutory right of withdrawal.
    const days = online ? Math.max(14, known.returnDays ?? 0) : known.returnDays;
    return { returnDays: days, boughtOnline: online, category: known.category, source: 'store' };
  }
  if (online) return { returnDays: 14, boughtOnline: true, source: 'law' };
  return { returnDays: profileDefaultReturnDays, boughtOnline: false, source: 'profile' };
}
