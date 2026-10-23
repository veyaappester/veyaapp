import type { ISODate } from '../logic/dates';
import { DISMISS_FOREVER, snoozeUntil, type Notice } from '../logic/notices';
import { db } from './schema';
import { confirmStillUsed, markBillPaid } from './subscriptions';

export async function snoozeNotice(key: string, today: ISODate): Promise<void> {
  await db.dismissed.put({ key, until: snoozeUntil(today) });
}

export async function dismissNotice(key: string): Promise<void> {
  await db.dismissed.put({ key, until: DISMISS_FOREVER });
}

/** Runs a notice's inline action ("Markér som betalt", "Ja, jeg bruger den"). Returns a toast text. */
export async function runQuickAction(quick: NonNullable<Notice['quick']>, today: ISODate): Promise<string> {
  if (quick.type === 'markBillPaid') {
    await markBillPaid(quick.id, today);
    return 'Regningen er markeret som betalt.';
  }
  await confirmStillUsed(quick.id, today);
  return 'Godt! Veya spørger igen om et par måneder.';
}
