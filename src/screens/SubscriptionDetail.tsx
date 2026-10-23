import { useLiveQuery } from 'dexie-react-hooks';
import { useState, type FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Icon } from '../components/Icon';
import { Modal } from '../components/Modal';
import { SubscriptionEditor } from '../components/SubscriptionEditor';
import { useToast } from '../components/toastContext';
import { TopBar } from '../components/TopBar';
import { useToday } from '../db/hooks';
import { db } from '../db/schema';
import {
  cancelSubscription,
  clearUpcomingPrice,
  confirmStillUsed,
  deleteSubscription,
  reactivateSubscription,
  saveSubscription,
  setUpcomingPrice,
} from '../db/subscriptions';
import type { Subscription } from '../db/types';
import { categoryLabel } from '../logic/categories';
import { addMonthsISO, daysBetween } from '../logic/dates';
import { fmtDate, fmtFull, kr, parseAmount, relDays } from '../logic/format';
import { cycleLabel, monthlyAmount } from '../logic/recurring';
import { serviceTint } from '../logic/services';

export default function SubscriptionDetail() {
  const { id } = useParams();
  const sub = useLiveQuery(async () => (id ? ((await db.subscriptions.get(id)) ?? null) : null), [id]);
  const payments = useLiveQuery(async () => (id ? db.subPayments.where('subscriptionId').equals(id).reverse().sortBy('date') : []), [id]);
  const today = useToday();

  if (sub === undefined) return null;
  if (!sub) {
    return (
      <section className="page">
        <TopBar back="/abonnementer" />
        <h1>Abonnementet findes ikke</h1>
      </section>
    );
  }
  return <Detail s={sub} today={today} paymentCount={payments?.length ?? 0} lastPaid={payments?.[0]?.date} />;
}

type ModalKind = 'edit' | 'price' | 'cancel' | 'delete' | null;

function Detail({ s, today, paymentCount, lastPaid }: { s: Subscription; today: string; paymentCount: number; lastPaid?: string }) {
  const toast = useToast();
  const navigate = useNavigate();
  const [modal, setModal] = useState<ModalKind>(null);
  const [newPrice, setNewPrice] = useState('');
  const [from, setFrom] = useState(s.nextPayment);
  const tint = serviceTint(s.name);
  const days = daysBetween(today, s.nextPayment);
  const diff = s.upcomingPrice ? s.upcomingPrice.price - s.price : 0;
  const monthly = monthlyAmount(s);

  const submitPrice = async (e: FormEvent) => {
    e.preventDefault();
    const price = parseAmount(newPrice);
    if (!(price > 0)) return;
    await setUpcomingPrice(s.id, price, from, today);
    setModal(null);
    setNewPrice('');
    toast(from <= today ? `Prisen er opdateret til ${kr(price)}.` : `Veya minder dig om den nye pris fra ${fmtDate(from)}.`);
  };

  return (
    <section className="page">
      <TopBar
        back="/abonnementer"
        right={
          <button type="button" className="icon-btn" aria-label="Redigér abonnement" onClick={() => setModal('edit')}>
            <Icon name="edit" />
          </button>
        }
      />
      <div className="detail-hero">
        <div className="big-icon" style={{ background: tint.bg, color: tint.fg, font: '700 30px var(--font-heading)' }}>
          {s.name.charAt(0).toUpperCase()}
        </div>
        <span className="tag">{categoryLabel[s.category]}</span>{' '}
        {!s.active && <span className="tag soft">Opsagt</span>}
      </div>
      <div className="detail-title">
        <h1>{s.name}</h1>
        <p className="muted">{s.plan ?? `Betales ${cycleLabel[s.cycle]}`}</p>
      </div>

      {s.upcomingPrice && (
        <div className={`notice ${diff > 0 ? '' : 'ok'}`}>
          <div className="notice-icon">
            <Icon name="trendUp" />
          </div>
          <div className="notice-body">
            <b>
              {diff > 0 ? 'Prisen stiger' : 'Prisen falder'} {kr(Math.abs(diff))}
            </b>
            <span>
              {kr(s.upcomingPrice.price)} fra {fmtFull(s.upcomingPrice.from)}
            </span>
          </div>
          <button type="button" className="link" onClick={() => clearUpcomingPrice(s.id)}>
            Fjern
          </button>
        </div>
      )}

      <div className="info">
        <div className="kv">
          <span>Pris</span>
          <b>
            {kr(s.price)} {cycleLabel[s.cycle]}
          </b>
        </div>
        {s.cycle !== 'monthly' && (
          <div className="kv">
            <span>Svarer til</span>
            <b>{kr(Math.round(monthly))} om måneden</b>
          </div>
        )}
        <div className="kv">
          <span>Om året</span>
          <b>{kr(Math.round(monthly * 12))}</b>
        </div>
        {s.active && (
          <div className="kv">
            <span>Næste betaling</span>
            <b className={days <= 2 ? 'text-warn' : ''}>
              {fmtFull(s.nextPayment)} ({relDays(days)})
            </b>
          </div>
        )}
        {lastPaid && (
          <div className="kv">
            <span>Sidst betalt</span>
            <b>
              {fmtDate(lastPaid)} · {paymentCount} betalinger registreret
            </b>
          </div>
        )}
      </div>

      {s.priceHistory.length > 1 && (
        <>
          <h2>Prishistorik</h2>
          <div className="info">
            {[...s.priceHistory].reverse().map((h, i) => (
              <div className="kv" key={`${h.from}-${i}`}>
                <span>Fra {fmtDate(h.from)}</span>
                <b>{kr(h.price)}</b>
              </div>
            ))}
          </div>
        </>
      )}

      {s.active ? (
        <>
          <button
            type="button"
            className="action secondary"
            onClick={() => {
              setFrom(s.upcomingPrice?.from ?? s.nextPayment);
              setModal('price');
            }}
          >
            <Icon name="trendUp" size={18} /> Prisændring
          </button>
          <button
            type="button"
            className="action secondary"
            onClick={async () => {
              await confirmStillUsed(s.id, today);
              toast('Godt! Veya spørger igen om et par måneder.');
            }}
          >
            <Icon name="check" size={18} /> Jeg bruger den stadig
          </button>
          <button type="button" className="action ghost" onClick={() => setModal('cancel')}>
            Opsig
          </button>
        </>
      ) : (
        <button
          type="button"
          className="action"
          onClick={async () => {
            await reactivateSubscription(s.id, today);
            toast(`${s.name} er aktiv igen.`);
          }}
        >
          Genaktivér
        </button>
      )}
      <button type="button" className="action ghost" onClick={() => setModal('delete')}>
        <Icon name="trash" size={18} /> Slet
      </button>

      <Modal open={modal === 'edit'} onClose={() => setModal(null)} title="Redigér abonnement">
        <SubscriptionEditor
          initial={s}
          submitLabel="Gem ændringer"
          onSubmit={async (input) => {
            await saveSubscription(input, today, s.id);
            setModal(null);
            toast('Abonnementet er opdateret.');
          }}
        />
      </Modal>

      <Modal open={modal === 'price'} onClose={() => setModal(null)} title="Prisændring">
        <p className="muted small" style={{ marginTop: 10 }}>
          Har {s.name} varslet en ny pris? Skriv den her, så minder Veya dig om det og bruger den nye pris fra datoen.
        </p>
        <form className="form" onSubmit={submitPrice}>
          <div className="field-row">
            <label className="field">
              <span>Ny pris (kr.)</span>
              <input inputMode="decimal" value={newPrice} onChange={(e) => setNewPrice(e.target.value)} placeholder={String(s.price)} required />
            </label>
            <label className="field">
              <span>Gælder fra</span>
              <input type="date" value={from} min={addMonthsISO(today, -12)} onChange={(e) => setFrom(e.target.value)} required />
            </label>
          </div>
          <button type="submit" className="action" disabled={!(parseAmount(newPrice) > 0)}>
            Gem ny pris
          </button>
        </form>
      </Modal>

      <Modal open={modal === 'cancel'} onClose={() => setModal(null)} title={`Opsig ${s.name}?`}>
        <div className="notice" style={{ margin: '14px 0' }}>
          <div className="notice-icon">
            <Icon name="warning" />
          </div>
          <div className="notice-body">
            <b>Husk også at opsige hos {s.name}</b>
            <span>Veya kan ikke opsige for dig. Log ind hos {s.name} og opsig der, ellers bliver du ved med at betale.</span>
          </div>
        </div>
        <button
          type="button"
          className="action"
          onClick={async () => {
            await cancelSubscription(s.id, today);
            setModal(null);
            toast(`${s.name} er markeret som opsagt.`);
          }}
        >
          Jeg har opsagt den
        </button>
        <button type="button" className="action ghost" onClick={() => setModal(null)}>
          Annullér
        </button>
      </Modal>

      <Modal open={modal === 'delete'} onClose={() => setModal(null)} title="Slet abonnementet?">
        <p className="muted" style={{ margin: '12px 0 16px' }}>
          {s.name} fjernes fra Veya. Tidligere betalinger tæller stadig med i dit forbrug.
        </p>
        <button
          type="button"
          className="action danger"
          onClick={async () => {
            await deleteSubscription(s.id);
            toast(`${s.name} er slettet.`);
            navigate('/abonnementer', { replace: true });
          }}
        >
          Ja, slet
        </button>
        <button type="button" className="action ghost" onClick={() => setModal(null)}>
          Annullér
        </button>
      </Modal>
    </section>
  );
}
