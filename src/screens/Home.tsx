import { Link } from 'react-router-dom';
import { CategoryIcon } from '../components/CategoryIcon';
import { Icon } from '../components/Icon';
import { NoticeLink } from '../components/NoticeCard';
import { TopBar } from '../components/TopBar';
import { useAppData, useToday } from '../db/hooks';
import { categoryLabel } from '../logic/categories';
import { budgetStatus } from '../logic/budget';
import { daysBetween } from '../logic/dates';
import { capitalize, fmtLong, fmtMonth, fmtShort, kr, relDays } from '../logic/format';
import { actionCount, buildNotices } from '../logic/notices';
import { monthlyTotal } from '../logic/recurring';

function greeting(hour: number) {
  if (hour >= 5 && hour < 10) return 'Godmorgen';
  if (hour >= 10 && hour < 18) return 'Goddag';
  return 'Godaften';
}

export default function Home() {
  const data = useAppData();
  const today = useToday();
  if (!data) return null;

  const notices = buildNotices(data, today);
  const count = actionCount(notices);
  const budget = budgetStatus(data, today);
  const activeSubs = data.subscriptions.filter((s) => s.active).sort((a, b) => a.nextPayment.localeCompare(b.nextPayment));
  const nextSub = activeSubs[0];

  const recent = [
    ...data.purchases.map((p) => ({
      key: p.id,
      date: p.date,
      sortKey: `${p.date}${p.createdAt}`,
      title: p.product,
      sub: p.store,
      amount: p.price,
      category: p.category,
      link: `/koeb/${p.id}`,
    })),
    ...data.expenses.map((e) => ({
      key: e.id,
      date: e.date,
      sortKey: `${e.date}~`,
      title: e.label,
      sub: 'Udgift',
      amount: e.amount,
      category: e.category,
      link: '/oekonomi',
    })),
  ]
    .sort((a, b) => b.sortKey.localeCompare(a.sortKey))
    .slice(0, 3);

  const progressTone = budget.pct >= 100 ? 'danger' : budget.pct > 80 ? 'warn' : '';
  const isEmpty = data.purchases.length === 0 && data.subscriptions.length === 0 && data.bills.length === 0;

  return (
    <section className="page">
      <TopBar
        right={
          <>
            <Link to="/i-dag" className="icon-btn" aria-label={`Veya i dag, ${count} ting kræver handling`}>
              <Icon name="bell" />
              {count > 0 && <span className="badge">{count}</span>}
            </Link>
            <Link to="/profil" className="avatar" aria-label="Profil og indstillinger">
              {data.profile.name.charAt(0).toUpperCase()}
            </Link>
          </>
        }
      />
      <h1>
        {greeting(new Date().getHours())}, {data.profile.name}
      </h1>
      <p className="muted">{capitalize(fmtLong(today))} · Her er dit overblik for i dag.</p>

      <Link to="/i-dag" className="info bordered row" style={{ margin: '18px 0 4px', padding: '4px 14px' }}>
        <div className="row-icon">
          <Icon name="sparkle" />
        </div>
        <div className="row-main">
          <b>Veya i dag</b>
          <span>
            {count === 0 ? 'Alt er under kontrol' : count === 1 ? '1 ting kræver din opmærksomhed' : `${count} ting kræver din opmærksomhed`}
          </span>
        </div>
        <div className="row-end" style={{ color: 'var(--primary)' }}>
          Se nu ›
        </div>
      </Link>

      {isEmpty ? (
        <>
          <h2>Kom godt i gang</h2>
          <Link to="/scan" className="action">
            <Icon name="scan" /> Scan din første kvittering
          </Link>
          <Link to="/abonnementer" className="action secondary">
            Tilføj dine abonnementer
          </Link>
          <Link to="/regninger" className="action secondary">
            Tilføj faste regninger
          </Link>
        </>
      ) : (
        <>
          <h2>Det vigtigste lige nu</h2>
          {notices.slice(0, 3).map((n) => (
            <NoticeLink key={n.key} notice={n} />
          ))}
        </>
      )}

      <h2>Økonomi i {fmtMonth(today).split(' ')[0]}</h2>
      <Link to="/oekonomi" className="hero">
        <small>Du har brugt</small>
        <strong>{kr(budget.spent)}</strong>
        <small>af dit budget på {kr(budget.budget)}</small>
        <div className="budgetline">
          <span>{budget.pct}% brugt</span>
          <span>{budget.remaining >= 0 ? `${kr(budget.remaining)} tilbage` : `${kr(-budget.remaining)} over`}</span>
        </div>
        <div
          className={`progress ${progressTone}`}
          role="progressbar"
          aria-valuenow={budget.pct}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Budget brugt"
        >
          <i style={{ width: `${Math.min(100, budget.pct)}%` }} />
        </div>
      </Link>

      {activeSubs.length > 0 && (
        <>
          <div className="section-head">
            <h2>Abonnementer</h2>
            <Link to="/abonnementer" className="link">
              Se alle
            </Link>
          </div>
          <Link to="/abonnementer" className="row">
            <div className="row-icon">
              <Icon name="repeat" />
            </div>
            <div className="row-main">
              <b>{kr(monthlyTotal(activeSubs))} hver måned</b>
              <span>
                {activeSubs.length} aktive abonnementer
                {nextSub ? ` · ${nextSub.name} ${relDays(daysBetween(today, nextSub.nextPayment))}` : ''}
              </span>
            </div>
            <Icon name="chevron" className="chev" />
          </Link>
        </>
      )}

      {recent.length > 0 && (
        <>
          <div className="section-head">
            <h2>Seneste køb</h2>
            <Link to="/koeb" className="link">
              Se alle
            </Link>
          </div>
          {recent.map((r) => (
            <Link key={r.key} to={r.link} className="row">
              <CategoryIcon category={r.category} />
              <div className="row-main">
                <b>{r.title}</b>
                <span>
                  {r.sub} · {r.date === today ? 'I dag' : fmtShort(r.date)}
                </span>
              </div>
              <div className="row-end">
                {kr(r.amount)}
                <small>{categoryLabel[r.category]}</small>
              </div>
            </Link>
          ))}
        </>
      )}
    </section>
  );
}
