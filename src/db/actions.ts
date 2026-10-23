import { addDaysISO, todayISO } from '../logic/dates';
import { DEMO_AIRPODS_DAYS_AGO, seedDemoData } from './demo';
import { makeDemoReceipt } from './demoReceipt';
import { clearAll, db } from './schema';
import type { Profile } from './types';

/** Replaces all data with demo data. Keeps the given name (default "Sofie"). */
export async function loadDemoData(name?: string): Promise<void> {
  const today = todayISO();
  let receiptImage: { blob: Blob; thumb: Blob } | undefined;
  try {
    receiptImage = await makeDemoReceipt(addDaysISO(today, -DEMO_AIRPODS_DAYS_AGO));
  } catch {
    receiptImage = undefined; // Demo still works without the picture.
  }
  await seedDemoData(today, { receiptImage, name });
}

export async function createProfile(name: string, monthlyBudget: number): Promise<void> {
  await db.profile.put({
    id: 'me',
    name: name.trim(),
    monthlyBudget,
    noticeDaysBefore: 3,
    defaultReturnDays: 30,
    createdAt: new Date().toISOString(),
  });
}

export async function updateProfile(changes: Partial<Omit<Profile, 'id'>>): Promise<void> {
  await db.profile.update('me', changes);
}

export async function deleteAllData(): Promise<void> {
  await clearAll();
}
