import { useCallback, useRef, useState, type ReactNode } from 'react';
import { ToastContext, type ToastFn } from './toastContext';

export function ToastProvider({ children }: { children: ReactNode }) {
  const [message, setMessage] = useState<string | null>(null);
  const timer = useRef<number | undefined>(undefined);

  const show = useCallback<ToastFn>((text) => {
    window.clearTimeout(timer.current);
    setMessage(text);
    timer.current = window.setTimeout(() => setMessage(null), 2800);
  }, []);

  return (
    <ToastContext.Provider value={show}>
      {children}
      <div aria-live="polite" role="status">
        {message && <div className="toast">{message}</div>}
      </div>
    </ToastContext.Provider>
  );
}
