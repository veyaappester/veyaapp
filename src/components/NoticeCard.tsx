import { Link } from 'react-router-dom';
import { dismissNotice, runQuickAction, snoozeNotice } from '../db/notices';
import type { Notice } from '../logic/notices';
import { Icon } from './Icon';
import { useToast } from './toastContext';

const toneClass = (n: Notice) => (n.tone === 'warn' ? '' : n.tone);

/** Compact, tappable notice used on Overblik. */
export function NoticeLink({ notice: n }: { notice: Notice }) {
  return (
    <Link to={n.link} className={`notice ${toneClass(n)}`}>
      <div className="notice-icon">
        <Icon name={n.icon} />
      </div>
      <div className="notice-body">
        <b>{n.title}</b>
        <span>{n.subtitle}</span>
      </div>
      <Icon name="chevron" size={18} className="chev" />
    </Link>
  );
}

/** Full notice with its action buttons, used on "Veya i dag". */
export function NoticeCard({ notice: n, today }: { notice: Notice; today: string }) {
  const toast = useToast();
  return (
    <div className="notice-card">
      <div className={`notice ${toneClass(n)}`}>
        <div className="notice-icon">
          <Icon name={n.icon} />
        </div>
        <div className="notice-body">
          <b>{n.title}</b>
          <span>{n.subtitle}</span>
        </div>
      </div>
      <div className="notice-actions">
        {n.quick && (
          <button
            type="button"
            className="action compact grow"
            onClick={async () => toast(await runQuickAction(n.quick!, today))}
          >
            <Icon name="check" size={18} /> {n.quick.label}
          </button>
        )}
        <Link to={n.link} className={`action compact grow ${n.quick ? 'secondary' : ''}`}>
          {n.actionLabel}
        </Link>
        {n.tone !== 'ok' && (
          <button
            type="button"
            className="chip-btn"
            onClick={async () => {
              await snoozeNotice(n.key, today);
              toast('Veya minder dig om det igen i morgen.');
            }}
          >
            <Icon name="clock" size={14} /> Udsæt
          </button>
        )}
        <button
          type="button"
          className="chip-btn"
          onClick={async () => {
            await dismissNotice(n.key);
            toast('Skjult.');
          }}
        >
          <Icon name="close" size={14} /> Skjul
        </button>
      </div>
    </div>
  );
}
