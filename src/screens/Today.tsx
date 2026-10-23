import { Link } from 'react-router-dom';
import { EmptyState } from '../components/EmptyState';
import { Icon } from '../components/Icon';
import { NoticeCard } from '../components/NoticeCard';
import { TopBar } from '../components/TopBar';
import { useAppData, useToday } from '../db/hooks';
import { buildNotices } from '../logic/notices';

export default function Today() {
  const data = useAppData();
  const today = useToday();
  if (!data) return null;

  const notices = buildNotices(data, today);
  const action = notices.filter((n) => n.group === 'action');
  const watch = notices.filter((n) => n.group === 'watch');
  const receipts = data.purchases.filter((p) => p.receiptImageId || p.receiptText).length;
  const upcoming = data.subscriptions.filter((s) => s.active).length + data.bills.filter((b) => !b.paid).length;

  return (
    <section className="page">
      <TopBar back />
      <h1>Veya i dag</h1>
      <p className="muted">Kun det, der faktisk kræver din opmærksomhed.</p>

      {action.length > 0 ? (
        <>
          <h2>Kræver handling · {action.length}</h2>
          {action.map((n) => (
            <NoticeCard key={n.key} notice={n} today={today} />
          ))}
        </>
      ) : (
        <EmptyState icon="sparkle" title="Alt er under kontrol 🎉">
          <p>Veya siger til, når der sker noget.</p>
        </EmptyState>
      )}

      <h2>Veya passer også på</h2>
      {watch.map((n) => (
        <NoticeCard key={n.key} notice={n} today={today} />
      ))}
      <div className="info">
        <Link to="/koeb" className="row">
          <div className="row-icon">
            <Icon name="receipt" />
          </div>
          <div className="row-main wrap">
            <b>
              {receipts === 0 ? 'Din dokumentation samles her' : receipts === 1 ? '1 kvittering er gemt' : `${receipts} kvitteringer er gemt`}
            </b>
            <span>Kvittering, garanti og betaling kan deles ved reklamation.</span>
          </div>
        </Link>
        <Link to="/plan" className="row">
          <div className="row-icon">
            <Icon name="calendar" />
          </div>
          <div className="row-main wrap">
            <b>Din plan er opdateret</b>
            <span>
              {upcoming ? `${upcoming} frister og betalinger ligger allerede i din tidslinje.` : 'Frister og betalinger kommer automatisk i din tidslinje.'}
            </span>
          </div>
        </Link>
      </div>
    </section>
  );
}
