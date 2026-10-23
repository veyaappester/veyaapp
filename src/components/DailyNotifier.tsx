import { useEffect } from 'react';
import { useAppData } from '../db/hooks';
import { actionCount, buildNotices } from '../logic/notices';
import { notifyOncePerDay } from '../pwa/notify';

/** Sends one summary browser notification per day when the app opens (only if enabled in Profil). */
export function DailyNotifier({ today }: { today: string }) {
  const data = useAppData();
  useEffect(() => {
    if (!data) return;
    const notices = buildNotices(data, today).filter((n) => n.group === 'action');
    const count = actionCount(notices);
    if (!count) return;
    const title = count === 1 ? 'Veya i dag: 1 ting kræver din opmærksomhed' : `Veya i dag: ${count} ting kræver din opmærksomhed`;
    notifyOncePerDay(today, title, notices[0].title);
  }, [data, today]);
  return null;
}
