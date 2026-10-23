import type { ISODate } from '../logic/dates';

export type Category = 'elektronik' | 'toej' | 'mad' | 'skoenhed' | 'bolig' | 'transport' | 'fritid' | 'andet';

export interface Profile {
  id: 'me';
  name: string;
  monthlyBudget: number; // kr.
  noticeDaysBefore: number; // how early deadlines become notices
  defaultReturnDays: number; // used for in-store purchases without a store default
  createdAt: string;
}

export type PurchaseStatus = 'active' | 'returned' | 'kept' | 'complaint';

export interface Purchase {
  id: string;
  product: string;
  store: string;
  storeLocation?: string;
  price: number; // kr., total
  date: ISODate; // purchase date
  category: Category;
  boughtOnline: boolean;
  returnDays: number | null; // null = no return right
  returnDeadline: ISODate | null; // computed: date + returnDays
  complaintYears: number; // reklamationsret, default 2
  complaintUntil: ISODate; // computed
  extraWarrantyUntil?: ISODate;
  receiptImageId?: string;
  receiptText?: string; // raw OCR text (searchable)
  receiptNumber?: string;
  register?: string; // kasse nr.
  time?: string; // time of purchase from the receipt, "17.39"
  paymentMethod?: string;
  status: PurchaseStatus;
  note?: string;
  createdAt: string;
}

export interface ReceiptImage {
  id: string;
  blob: Blob;
  thumb: Blob;
}

export type Cycle = 'monthly' | 'yearly' | 'weekly';

export interface Subscription {
  id: string;
  name: string;
  plan?: string;
  price: number; // current price per cycle
  cycle: Cycle;
  nextPayment: ISODate;
  category: Category;
  priceHistory: { price: number; from: ISODate }[];
  upcomingPrice?: { price: number; from: ISODate };
  lastUsedCheck?: ISODate;
  active: boolean;
  cancelledAt?: ISODate;
  createdAt: string;
}

/** One charged subscription payment, logged when `nextPayment` rolls forward. */
export interface SubscriptionPayment {
  id: string;
  subscriptionId: string;
  name: string;
  amount: number;
  date: ISODate;
  category: Category;
}

export type BillRecurrence = 'none' | 'monthly' | 'quarterly' | 'yearly';

export interface Bill {
  id: string;
  name: string;
  amount: number;
  dueDate: ISODate;
  recurring: BillRecurrence;
  category: Category;
  paid: boolean;
  paidAt?: ISODate;
}

export interface Expense {
  id: string;
  label: string;
  amount: number;
  date: ISODate;
  category: Category;
}

export interface PlanEvent {
  id: string;
  title: string;
  date: ISODate;
  time?: string;
  place?: string;
}

export interface DismissedNotice {
  key: string;
  until: ISODate;
}

/** The user's last choices for a store, remembered for the next purchase there. */
export interface StorePref {
  store: string; // lower-case store name
  returnDays: number | null;
  boughtOnline: boolean;
  category: Category;
}

/** Everything the derived logic (notices, budget, plan) needs, loaded in one go. */
export interface AppData {
  profile: Profile;
  purchases: Purchase[];
  subscriptions: Subscription[];
  subPayments: SubscriptionPayment[];
  bills: Bill[];
  expenses: Expense[];
  events: PlanEvent[];
  dismissed: DismissedNotice[];
}
