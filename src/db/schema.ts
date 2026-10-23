import Dexie, { type EntityTable } from 'dexie';
import type {
  Bill,
  DismissedNotice,
  Expense,
  PlanEvent,
  Profile,
  Purchase,
  ReceiptImage,
  StorePref,
  Subscription,
  SubscriptionPayment,
} from './types';

export class VeyaDB extends Dexie {
  profile!: EntityTable<Profile, 'id'>;
  purchases!: EntityTable<Purchase, 'id'>;
  receiptImages!: EntityTable<ReceiptImage, 'id'>;
  subscriptions!: EntityTable<Subscription, 'id'>;
  subPayments!: EntityTable<SubscriptionPayment, 'id'>;
  bills!: EntityTable<Bill, 'id'>;
  expenses!: EntityTable<Expense, 'id'>;
  events!: EntityTable<PlanEvent, 'id'>;
  dismissed!: EntityTable<DismissedNotice, 'key'>;
  storePrefs!: EntityTable<StorePref, 'store'>;

  constructor(name = 'veya') {
    super(name);
    this.version(1).stores({
      profile: 'id',
      purchases: 'id, date, store, category, status',
      receiptImages: 'id',
      subscriptions: 'id, nextPayment, active',
      subPayments: 'id, date, subscriptionId',
      bills: 'id, dueDate, paid',
      expenses: 'id, date',
      events: 'id, date',
      dismissed: 'key',
      storePrefs: 'store',
    });
  }
}

export const db = new VeyaDB();

export const dataTables = [
  'profile',
  'purchases',
  'receiptImages',
  'subscriptions',
  'subPayments',
  'bills',
  'expenses',
  'events',
  'dismissed',
  'storePrefs',
] as const;

export function newId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  // Fallback for non-secure contexts (e.g. testing over plain http on a LAN).
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

/** Deletes every record (used by "Slet alle data" and before loading demo data). */
export async function clearAll(database: VeyaDB = db): Promise<void> {
  await database.transaction('rw', dataTables.map((t) => database.table(t)), async () => {
    await Promise.all(dataTables.map((t) => database.table(t).clear()));
  });
}
