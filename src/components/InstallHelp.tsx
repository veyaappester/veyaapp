import { useSyncExternalStore } from 'react';
import { canPromptInstall, isIOS, isStandalone, onInstallAvailabilityChange, promptInstall } from '../pwa/install';
import { Icon } from './Icon';

export function InstallHelp() {
  const canPrompt = useSyncExternalStore(onInstallAvailabilityChange, canPromptInstall);

  if (isStandalone()) {
    return (
      <div className="notice ok">
        <div className="notice-icon">
          <Icon name="check" />
        </div>
        <div className="notice-body">
          <b>Veya er installeret</b>
          <span>Du bruger Veya som en app på din telefon.</span>
        </div>
      </div>
    );
  }

  return (
    <div className="info" style={{ padding: '12px 14px' }}>
      {canPrompt && (
        <button type="button" className="action" onClick={() => promptInstall()}>
          <Icon name="phone" /> Installér Veya
        </button>
      )}
      <p className="small" style={{ fontWeight: 600, marginTop: canPrompt ? 10 : 0 }}>
        {isIOS() ? 'På iPhone (Safari):' : 'Sådan gør du:'}
      </p>
      {isIOS() ? (
        <ol className="steps">
          <li>Tryk på Del-knappen (firkanten med pilen) nederst i Safari.</li>
          <li>Vælg "Føj til hjemmeskærm".</li>
          <li>Tryk "Tilføj". Nu ligger Veya som en app.</li>
        </ol>
      ) : (
        <ol className="steps">
          <li>
            <b>iPhone:</b> Åbn linket i Safari, tryk Del → "Føj til hjemmeskærm".
          </li>
          <li>
            <b>Android:</b> Åbn i Chrome, tryk ⋮ → "Installér app" eller "Føj til startskærm".
          </li>
        </ol>
      )}
    </div>
  );
}
