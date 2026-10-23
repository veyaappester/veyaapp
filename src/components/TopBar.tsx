import type { ReactNode } from 'react';
import { Icon } from './Icon';
import { Logo } from './Logo';
import { useGoBack } from './useGoBack';

interface TopBarProps {
  /** Show a back button. A string is the fallback route when there is no history. */
  back?: boolean | string;
  title?: ReactNode;
  right?: ReactNode;
}

export function TopBar({ back, title, right }: TopBarProps) {
  const goBack = useGoBack(typeof back === 'string' ? back : '/');

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
