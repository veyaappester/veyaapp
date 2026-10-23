/**
 * Browser notifications (v1.5): shown when the app is opened and something needs
 * action. True background push needs a server and is Phase 2.
 */

const ENABLED_KEY = 'veya-notifications';
const LAST_SHOWN_KEY = 'veya-notified-on';

function storageGet(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function storageSet(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {
    // Private mode: the setting just won't persist.
  }
}

export function notificationsSupported(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window;
}

export function notificationsEnabled(): boolean {
  return notificationsSupported() && Notification.permission === 'granted' && storageGet(ENABLED_KEY) === '1';
}

export function setNotificationsEnabled(on: boolean) {
  storageSet(ENABLED_KEY, on ? '1' : '0');
}

/** Shows at most one summary notification per day. */
export async function notifyOncePerDay(today: string, title: string, body: string) {
  if (!notificationsEnabled() || storageGet(LAST_SHOWN_KEY) === today) return;
  storageSet(LAST_SHOWN_KEY, today);
  const options: NotificationOptions = { body, icon: `${import.meta.env.BASE_URL}pwa-192x192.png`, tag: 'veya-today' };
  try {
    const reg = await navigator.serviceWorker?.getRegistration();
    if (reg) await reg.showNotification(title, options);
    else new Notification(title, options);
  } catch {
    // Some browsers (Android Chrome) only allow notifications via a service worker.
  }
}
