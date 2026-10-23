import { useState } from 'react';
import { Link } from 'react-router-dom';
import { EmptyState } from '../components/EmptyState';
import { Icon } from '../components/Icon';
import { Modal } from '../components/Modal';
import { SubIcon } from '../components/SubIcon';
import { SubscriptionEditor } from '../components/SubscriptionEditor';
import { useToast } from '../components/toastContext';
import { TopBar } from '../components/TopBar';
import { useAppData, useToday } from '../db/hooks';
import { saveSubscription } from '../db/subscriptions';
import type { Subscription } from '../db/types';
import { daysBetween } from '../logic/dates';
import { fmtShort, kr, relDays } from '../logic/format';
import { cycleUnit, monthlyTotal } from '../logic/recurring';

export default function Subscriptions() {
  const data = useAppData();
  const today = useToday();
  const toast = useToast();
  const [adding, setAdding] = useState(false);

  if (!data) return null;
  const active = data.subscriptions.filter((s) => s.active).sort((a, b) => a.nextPayment.localeCompare(b.nextPayment));
  const inactive = data.subscriptions.filter((s) => !s.active);
  const total = monthlyTotal(active);
  const changes = active.filter((s) => s.upcomingPrice);
  const unpaidBills = data.bills.filter((b) => !b.paid).sort((a, b) => a.dueDate.localeCompare(b.dueDate));

  return (
    <section className="page">
      <TopBar
        right={
          <button type="button" className="icon-btn" aria-label="Tilføj abonnement" onClick={() => setAdding(true)}>
            <Icon name="plus" />
          </button>
        }
      />
      <h1>Abonnementer</h1>
      <p className="muted">
        Du bruger <b style={{ color: 'var(--ink)' }}>{kr(total)}</b> hver måned.
      </p>

      {changes.map((s) => (
        <Link key={s.id} to={`/abonnementer/${s.id}`} className="notice info" style={{ marginTop: 14 }}>
          <div className="notice-icon">
            <Icon name="trendUp" />
          </div>
          <div className="notice-body">
            <b>Veya har fundet en ændring</b>
            <span>
              {s.name} {s.upcomingPrice!.price >= s.price ? 'stiger' : 'falder'} {kr(Math.abs(s.upcomingPrice!.price - s.price))} fra{' '}
              {fmtShort(s.upcomingPrice!.from)}
            </span>
          </div>
        </Link>
      ))}

      {active.length > 0 ? (
        <>
          <div className="hero" style={{ marginTop: 18 }}>
            <small>Faste udgifter pr. måned</small>
            <strong>{kr(total)}</strong>
            <small>
              {active.length} {active.length === 1 ? 'aktivt abonnement' : 'aktive abonnementer'}
            </small>
          </div>
          <p className="muted small" style={{ marginTop: 10 }}>
            <Icon name="sparkle" size={14} /> Du bruger {kr(total * 12)} om året på abonnementer.
          </p>

          <h2>Kommende betalinger</h2>
          {active.map((s) => (
            <SubRow key={s.id} sub={s} today={today} />
          ))}
        </>
      ) : (
        <EmptyState icon="repeat" title="Ingen abonnementer endnu">
          <p>Tilføj Netflix, Spotify, mobil og fitness, så kan Veya vise, hvad du bruger hver måned, og sige til før de fornyes.</p>
          <button type="button" className="action" onClick={() => setAdding(true)}>
            <Icon name="plus" /> Tilføj abonnement
          </button>
        </EmptyState>
      )}

      <div className="section-head">
        <h2>Regninger</h2>
        <Link to="/regninger" className="link">
          Se alle
        </Link>
      </div>
      <Link to="/regninger" className="row">
        <div className="row-icon">
          <Icon name="bill" />
        </div>
        <div className="row-main">
          <b>{unpaidBills.length ? `${unpaidBills.length} ubetalte regninger` : 'Ingen ubetalte regninger'}</b>
          <span>
            {unpaidBills.length
              ? `Næste: ${unpaidBills[0].name} · ${relDays(daysBetween(today, unpaidBills[0].dueDate))}`
              : 'Husleje, el, internet og andre faste regninger'}
          </span>
        </div>
        <Icon name="chevron" className="chev" />
      </Link>

      {inactive.length > 0 && (
        <>
          <h2>Opsagte</h2>
          {inactive.map((s) => (
            <Link key={s.id} to={`/abonnementer/${s.id}`} className="row" style={{ opacity: 0.65 }}>
              <SubIcon name={s.name} />
              <div className="row-main">
                <b>{s.name}</b>
                <span>Opsagt{s.cancelledAt ? ` ${fmtShort(s.cancelledAt)}` : ''}</span>
              </div>
              <div className="row-end">{kr(s.price)}</div>
            </Link>
          ))}
        </>
      )}

      <Modal open={adding} onClose={() => setAdding(false)} title="Nyt abonnement">
        <SubscriptionEditor
          submitLabel="Gem abonnement"
          onSubmit={async (input) => {
            await saveSubscription(input, today);
            setAdding(false);
            toast(`${input.name} er tilføjet.`);
          }}
        />
      </Modal>
    </section>
  );
}

function SubRow({ sub: s, today }: { sub: Subscription; today: string }) {
  const days = daysBetween(today, s.nextPayment);
  const diff = s.upcomingPrice ? s.upcomingPrice.price - s.price : 0;
  return (
    <Link to={`/abonnementer/${s.id}`} className="row">
      <SubIcon name={s.name} />
      <div className="row-main">
        <b>
          {s.name}{' '}
          {diff !== 0 && (
            <span className={`tag ${diff > 0 ? 'warn' : 'ok'}`} style={{ display: 'inline', padding: '2px 7px', fontSize: 10 }}>
              {diff > 0 ? '+' : '−'}
              {kr(Math.abs(diff))}
            </span>
          )}
        </b>
        <span>{days <= 2 ? `Fornyes ${relDays(days)}` : (s.plan ?? `Fornyes ${relDays(days)}`)}</span>
      </div>
      <div className="row-end">
        {kr(s.price)}
        <small className={days <= 2 ? 'warn' : ''}>
          {fmtShort(s.nextPayment)} · {cycleUnit[s.cycle]}
        </small>
      </div>
    </Link>
  );
}
