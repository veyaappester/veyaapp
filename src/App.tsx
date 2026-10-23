import { useEffect, useRef } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { DailyNotifier } from './components/DailyNotifier';
import { Nav } from './components/Nav';
import { notificationsEnabled } from './pwa/notify';
import { ToastProvider } from './components/Toast';
import { useProfile, useToday } from './db/hooks';
import { runRecurring } from './db/subscriptions';
import { AppRoutes } from './routes';

/** Screens that take over the whole frame and hide the bottom nav. */
const fullscreenRoutes = [/^\/velkommen/, /^\/koeb\/[^/]+\/kvittering/];

export default function App() {
  const { pathname } = useLocation();
  const scroller = useRef<HTMLDivElement>(null);
  const profile = useProfile();
  const today = useToday();
  const hasProfile = !!profile;
  const onboarding = pathname.startsWith('/velkommen');
  const showNav = hasProfile && !fullscreenRoutes.some((r) => r.test(pathname));

  // Each screen starts at the top, like a native app.
  useEffect(() => {
    scroller.current?.scrollTo(0, 0);
  }, [pathname]);

  // On app open (and when the date changes): roll passed renewals forward and log their payments.
  useEffect(() => {
    if (hasProfile) runRecurring(today).catch(() => {});
  }, [hasProfile, today]);

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
        {hasProfile && notificationsEnabled() && <DailyNotifier today={today} />}
      </ToastProvider>
    </main>
  );
}
