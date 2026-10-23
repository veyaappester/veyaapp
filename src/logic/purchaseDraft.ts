import type { Category, Purchase } from '../db/types';
import { todayISO } from './dates';
import { DEFAULT_COMPLAINT_YEARS } from './deadlines';

/** Form state for adding/editing a purchase (strings, as typed by the user). */
export interface PurchaseDraft {
  product: string;
  store: string;
  storeLocation: string;
  date: string;
  price: string;
  category: Category | '';
  boughtOnline: boolean;
  returnDays: string; // '' together with noReturn=false means "not decided yet"
  noReturn: boolean;
  complaintYears: string;
  extraWarrantyUntil: string;
  paymentMethod: string;
  receiptNumber: string;
  note: string;
}

export function emptyDraft(): PurchaseDraft {
  return {
    product: '',
    store: '',
    storeLocation: '',
    date: todayISO(),
    price: '',
    category: '',
    boughtOnline: false,
    returnDays: '',
    noReturn: false,
    complaintYears: String(DEFAULT_COMPLAINT_YEARS),
    extraWarrantyUntil: '',
    paymentMethod: '',
    receiptNumber: '',
    note: '',
  };
}

export function draftFromPurchase(p: Purchase): PurchaseDraft {
  return {
    product: p.product,
    store: p.store,
    storeLocation: p.storeLocation ?? '',
    date: p.date,
    price: String(p.price).replace('.', ','),
    category: p.category,
    boughtOnline: p.boughtOnline,
    returnDays: p.returnDays === null ? '' : String(p.returnDays),
    noReturn: p.returnDays === null,
    complaintYears: String(p.complaintYears),
    extraWarrantyUntil: p.extraWarrantyUntil ?? '',
    paymentMethod: p.paymentMethod ?? '',
    receiptNumber: p.receiptNumber ?? '',
    note: p.note ?? '',
  };
}
