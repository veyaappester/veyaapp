import type { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { Icon } from './Icon';
import { Logo } from './Logo';

interface TopBarProps {
  /** Show a back button. A string is the fallback route when there is no history. */
  back?: boolean | string;
  title?: ReactNode;
  right?: ReactNode;
}

export function TopBar({ back, title, right }: TopBarProps) {
  const navigate = useNavigate();

  const goBack = () => {
    // HashRouter keeps an index in history.state; idx 0 means this is the first entry.
    const idx = (window.history.state as { idx?: number } | null)?.idx ?? 0;
    if (idx > 0) navigate(-1);
    else navigate(typeof back === 'string' ? back : '/');
  };

  return (
    <div className="top">
      {back ? (
        <button type="button" className="back" onClick={goBack} aria-label="Tilbage">
          <Icon name="back" />
        </button>
      ) : (
        <Logo size={40} />
      )}
      <div className="top-title">{title}</div>
      <div className="top-actions">{right ?? (back ? <Logo size={40} /> : null)}</div>
    </div>
  );
}
