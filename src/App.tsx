import { useEffect, useRef } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { Nav } from './components/Nav';
import { ToastProvider } from './components/Toast';
import { useProfile } from './db/hooks';
import { AppRoutes } from './routes';

/** Screens that take over the whole frame and hide the bottom nav. */
const fullscreenRoutes = [/^\/velkommen/, /^\/koeb\/[^/]+\/kvittering/];

export default function App() {
  const { pathname } = useLocation();
  const scroller = useRef<HTMLDivElement>(null);
  const profile = useProfile();
  const onboarding = pathname.startsWith('/velkommen');
  const showNav = !!profile && !fullscreenRoutes.some((r) => r.test(pathname));

  // Each screen starts at the top, like a native app.
  useEffect(() => {
    scroller.current?.scrollTo(0, 0);
  }, [pathname]);

  let content;
  if (profile === undefined) content = null; // IndexedDB still opening
  else if (profile === false && !onboarding) content = <Navigate to="/velkommen" replace />;
  else if (profile && onboarding) content = <Navigate to="/" replace />;
  else content = <AppRoutes />;

  return (
    <main className={`phone${showNav ? ' has-nav' : ''}`}>
      <ToastProvider>
        <div className="screen" ref={scroller}>
          {content}
        </div>
        {showNav && <Nav />}
      </ToastProvider>
    </main>
  );
}
