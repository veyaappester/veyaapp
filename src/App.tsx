import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { Nav } from './components/Nav';
import { ToastProvider } from './components/Toast';
import { AppRoutes } from './routes';

/** Screens that take over the whole frame and hide the bottom nav. */
const fullscreenRoutes = [/^\/velkommen/, /^\/koeb\/[^/]+\/kvittering/];

export default function App() {
  const { pathname } = useLocation();
  const scroller = useRef<HTMLDivElement>(null);
  const showNav = !fullscreenRoutes.some((r) => r.test(pathname));

  // Each screen starts at the top, like a native app.
  useEffect(() => {
    scroller.current?.scrollTo(0, 0);
  }, [pathname]);

  return (
    <main className={`phone${showNav ? ' has-nav' : ''}`}>
      <ToastProvider>
        <div className="screen" ref={scroller}>
          <AppRoutes />
        </div>
        {showNav && <Nav />}
      </ToastProvider>
    </main>
  );
}
