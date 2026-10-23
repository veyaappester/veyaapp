import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

/** Goes back in history, or to `fallback` when the screen was opened directly (no history). */
export function useGoBack(fallback = '/') {
  const navigate = useNavigate();
  return useCallback(() => {
    // React Router keeps an index in history.state; idx 0 means this is the first entry.
    const idx = (window.history.state as { idx?: number } | null)?.idx ?? 0;
    if (idx > 0) navigate(-1);
    else navigate(fallback, { replace: true });
  }, [navigate, fallback]);
}
