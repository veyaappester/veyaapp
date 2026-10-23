import { withDeadlines } from '../logic/deadlines';
import { normalizeStore } from '../logic/storeDefaults';
import { db, newId } from './schema';
import type { Purchase, PurchaseStatus } from './types';

export type PurchaseInput = Omit<Purchase, 'id' | 'createdAt' | 'returnDeadline' | 'complaintUntil' | 'status'> &
  Partial<Pick<Purchase, 'status'>>;

/** Creates or updates a purchase (deadlines recomputed) and remembers the store choices. */
export async function savePurchase(
  input: PurchaseInput,
  existingId?: string,
  image?: { blob: Blob; thumb: Blob },
): Promise<string> {
  return db.transaction('rw', [db.purchases, db.receiptImages, db.storePrefs], async () => {
    const existing = existingId ? await db.purchases.get(existingId) : undefined;
    let receiptImageId = input.receiptImageId ?? existing?.receiptImageId;
    if (image) {
      receiptImageId = newId();
      await db.receiptImages.put({ id: receiptImageId, ...image });
    }
    const purchase: Purchase = withDeadlines({
      ...input,
      id: existing?.id ?? newId(),
      createdAt: existing?.createdAt ?? new Date().toISOString(),
      status: input.status ?? existing?.status ?? 'active',
      receiptImageId,
    });
    await db.purchases.put(purchase);
    if (purchase.store.trim()) {
      await db.storePrefs.put({
        store: normalizeStore(purchase.store),
        returnDays: purchase.returnDays,
        boughtOnline: purchase.boughtOnline,
        category: purchase.category,
      });
    }
    return purchase.id;
  });
}

export async function setPurchaseStatus(id: string, status: PurchaseStatus): Promise<void> {
  await db.purchases.update(id, { status });
}

export async function deletePurchase(id: string): Promise<void> {
  await db.transaction('rw', [db.purchases, db.receiptImages], async () => {
    const p = await db.purchases.get(id);
    if (p?.receiptImageId) await db.receiptImages.delete(p.receiptImageId);
    await db.purchases.delete(id);
  });
}
