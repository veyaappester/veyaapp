import { useLiveQuery } from 'dexie-react-hooks';
import { useEffect, useState } from 'react';
import { todayISO, type ISODate } from '../logic/dates';
import { db } from './schema';
import type { AppData, Profile } from './types';

/** Profile, `false` when none exists yet (first run), `undefined` while loading. */
export function useProfile(): Profile | false | undefined {
  return useLiveQuery(async () => (await db.profile.get('me')) ?? false, []);
}

/** All records the derived logic needs, kept live. `undefined` while loading. */
export function useAppData(): AppData | undefined {
  return useLiveQuery(async () => {
    const [profile, purchases, subscriptions, subPayments, bills, expenses, events, dismissed] = await Promise.all([
      db.profile.get('me'),
      db.purchases.toArray(),
      db.subscriptions.toArray(),
      db.subPayments.toArray(),
      db.bills.toArray(),
      db.expenses.toArray(),
      db.events.toArray(),
      db.dismissed.toArray(),
    ]);
    if (!profile) return undefined;
    return { profile, purchases, subscriptions, subPayments, bills, expenses, events, dismissed };
  }, []);
}

/** Today's date, refreshed when the app comes back to the foreground on a new day. */
export function useToday(): ISODate {
  const [today, setToday] = useState(todayISO);
  useEffect(() => {
    const refresh = () => setToday(todayISO());
    document.addEventListener('visibilitychange', refresh);
    const timer = window.setInterval(refresh, 60_000);
    return () => {
      document.removeEventListener('visibilitychange', refresh);
      window.clearInterval(timer);
    };
  }, []);
  return today;
}

/** Object URL for a stored receipt image (full size or thumbnail), revoked on unmount. */
export function useReceiptImageUrl(imageId: string | undefined, kind: 'blob' | 'thumb' = 'blob'): string | undefined {
  const image = useLiveQuery(async () => (imageId ? await db.receiptImages.get(imageId) : undefined), [imageId]);
  const [url, setUrl] = useState<string>();
  useEffect(() => {
    if (!image) {
      setUrl(undefined);
      return;
    }
    const u = URL.createObjectURL(image[kind]);
    setUrl(u);
    return () => URL.revokeObjectURL(u);
  }, [image, kind]);
  return url;
}
