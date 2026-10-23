import { useState } from 'react';
import { notificationsEnabled, notificationsSupported, setNotificationsEnabled } from '../pwa/notify';
import { useToast } from './toastContext';

/** Opt-in for browser notifications, asked from Profil only (never on first launch). */
export function NotificationSetting() {
  const toast = useToast();
  const [enabled, setEnabled] = useState(notificationsEnabled);

  if (!notificationsSupported()) return null;

  const toggle = async (on: boolean) => {
    if (on) {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        toast('Notifikationer er blokeret i din browser.');
        return;
      }
    }
    setNotificationsEnabled(on);
    setEnabled(on);
    if (on) toast('Veya sender en påmindelse, når du åbner appen og noget kræver handling.');
  };

  return (
    <label className="toggle" style={{ marginTop: 14 }}>
      <span>
        Notifikationer
        <br />
        <span className="muted small">Påmindelse om frister, når du åbner Veya</span>
      </span>
      <input type="checkbox" checked={enabled} onChange={(e) => toggle(e.target.checked)} />
    </label>
  );
}
