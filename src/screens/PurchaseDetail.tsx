import { useLiveQuery } from 'dexie-react-hooks';
import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { CategoryIcon } from '../components/CategoryIcon';
import { Icon } from '../components/Icon';
import { Modal } from '../components/Modal';
import { useToast } from '../components/toastContext';
import { TopBar } from '../components/TopBar';
import { useProfile, useToday } from '../db/hooks';
import { deletePurchase, setPurchaseStatus } from '../db/purchases';
import { db } from '../db/schema';
import type { Purchase, PurchaseStatus } from '../db/types';
import { categoryLabel } from '../logic/categories';
import { complaintText } from '../logic/complaint';
import { daysBetween } from '../logic/dates';
import { returnDaysLeft } from '../logic/deadlines';
import { fmtDate, fmtFull, fmtShort, kr, relDays } from '../logic/format';
import { shareTextAndImage } from '../logic/share';

const statusTag: Record<PurchaseStatus, { text: string; cls: string } | null> = {
  active: null,
  kept: { text: 'Beholdt', cls: 'ok' },
  returned: { text: 'Returneret', cls: 'soft' },
  complaint: { text: 'Reklamation i gang', cls: 'warn' },
};

export default function PurchaseDetail() {
  const { id } = useParams();
  const purchase = useLiveQuery(async () => (id ? ((await db.purchases.get(id)) ?? null) : null), [id]);
  const profile = useProfile();
  const today = useToday();

  if (purchase === undefined || !profile) return null;
  if (!purchase) {
    return (
      <section className="page">
        <TopBar back="/koeb" />
        <h1>Købet findes ikke</h1>
        <p className="muted">Det kan være slettet.</p>
      </section>
    );
  }
  return <Detail p={purchase} today={today} profileName={profile.name} noticeDays={profile.noticeDaysBefore} />;
}

function Detail({ p, today, profileName, noticeDays }: { p: Purchase; today: string; profileName: string; noticeDays: number }) {
  const navigate = useNavigate();
  const toast = useToast();
  const [modal, setModal] = useState<'delete' | 'complaint' | null>(null);
  const [text, setText] = useState('');

  const left = returnDaysLeft(p, today);
  const complaintLeft = daysBetween(today, p.complaintUntil);
  const hasReceipt = !!(p.receiptImageId || p.receiptText);
  const tag = statusTag[p.status];

  const setStatus = async (status: PurchaseStatus, message: string) => {
    await setPurchaseStatus(p.id, status);
    toast(message);
  };

  const openComplaint = () => {
    setText(complaintText(p, { name: profileName }));
    setModal('complaint');
  };

  const sendComplaint = async () => {
    const image = p.receiptImageId ? await db.receiptImages.get(p.receiptImageId) : undefined;
    const result = await shareTextAndImage(
      `Reklamation: ${p.product}`,
      text,
      image ? { blob: image.blob, filename: `kvittering-${p.store.toLowerCase().replace(/\W+/g, '-')}-${p.date}.jpg` } : undefined,
    );
    if (result === 'cancelled') return;
    await setPurchaseStatus(p.id, 'complaint');
    setModal(null);
    toast(
      result === 'shared'
        ? 'Reklamationen er klar. Veya har markeret købet.'
        : image
          ? 'Teksten er kopieret, og kvitteringen er downloadet.'
          : 'Teksten er kopieret. Indsæt den i en mail til butikken.',
    );
  };

  let returnRow: { value: string; end: string; tone: string };
  if (p.returnDeadline === null) returnRow = { value: 'Ingen returret', end: '', tone: '' };
  else if (p.status === 'returned') returnRow = { value: 'Returneret', end: fmtShort(p.returnDeadline), tone: '' };
  else if (left !== null && left >= 0)
    returnRow = {
      value: left === 0 ? 'Udløber i dag' : `Udløber ${relDays(left)}`,
      end: fmtShort(p.returnDeadline),
      tone: left <= noticeDays ? 'text-warn' : '',
    };
  else returnRow = { value: 'Udløbet', end: fmtShort(p.returnDeadline), tone: '' };

  return (
    <section className="page">
      <TopBar
        back="/koeb"
        right={
          <Link to={`/koeb/${p.id}/rediger`} className="icon-btn" aria-label="Redigér køb">
            <Icon name="edit" />
          </Link>
        }
      />
      <div className="detail-hero">
        <CategoryIcon category={p.category} size={36} className="big-icon" />
        <span className="tag">{categoryLabel[p.category]}</span>{' '}
        {tag && <span className={`tag ${tag.cls}`}>{tag.text}</span>}
      </div>
      <div className="detail-title">
        <h1>{p.product}</h1>
        <p className="muted">
          Købt hos {p.store}
          {p.storeLocation ? `, ${p.storeLocation}` : ''}
          {p.boughtOnline ? ' · på nettet' : ''}
        </p>
      </div>

      <div className="info">
        <div className="row">
          <div className="row-main">
            <span>Købsdato</span>
            <b>{fmtFull(p.date)}</b>
          </div>
          <div className="row-main" style={{ textAlign: 'right' }}>
            <span>Pris</span>
            <b>{kr(p.price)}</b>
          </div>
        </div>
        <div className="row">
          <div className="row-main">
            <span>Returfrist</span>
            <b className={returnRow.tone}>{returnRow.value}</b>
          </div>
          <div className={`row-end ${returnRow.tone}`}>{returnRow.end}</div>
        </div>
        <div className="row">
          <div className="row-main">
            <span>Garanti ({p.complaintYears} år reklamationsret)</span>
            <b className={complaintLeft >= 0 && complaintLeft <= 30 ? 'text-warn' : ''}>
              {complaintLeft >= 0 ? `Til ${fmtFull(p.complaintUntil)}` : `Udløb ${fmtFull(p.complaintUntil)}`}
            </b>
          </div>
          {complaintLeft >= 0 && complaintLeft <= 30 && <div className="row-end text-warn">{relDays(complaintLeft)}</div>}
        </div>
        {p.extraWarrantyUntil && (
          <div className="row">
            <div className="row-main">
              <span>Ekstra garanti</span>
              <b>Til {fmtFull(p.extraWarrantyUntil)}</b>
            </div>
          </div>
        )}
        {(p.paymentMethod || p.receiptNumber) && (
          <div className="row">
            {p.paymentMethod && (
              <div className="row-main">
                <span>Betalt med</span>
                <b>{p.paymentMethod}</b>
              </div>
            )}
            {p.receiptNumber && (
              <div className="row-main" style={{ textAlign: p.paymentMethod ? 'right' : 'left' }}>
                <span>Kassebon nr.</span>
                <b>{p.receiptNumber}</b>
              </div>
            )}
          </div>
        )}
        {p.note && (
          <div className="row">
            <div className="row-main wrap">
              <span>Note</span>
              <b style={{ fontWeight: 500 }}>{p.note}</b>
            </div>
          </div>
        )}
      </div>

      <h2>Dette køb holder Veya styr på</h2>
      <div className="cards">
        <div className="mini">
          <div className="label">Dokumentation</div>
          <strong>{hasReceipt ? 'Kvittering gemt' : 'Ingen kvittering'}</strong>
          <span className="muted">{hasReceipt ? 'Klar til butik og reklamation' : 'Tilføj via Scan'}</span>
        </div>
        <div className="mini">
          <div className="label">Næste mulighed</div>
          {left !== null && left >= 0 ? (
            <>
              <strong>Returnér</strong>
              <span className="muted">Inden {fmtDate(p.returnDeadline!)}</span>
            </>
          ) : complaintLeft >= 0 ? (
            <>
              <strong>Reklamér</strong>
              <span className="muted">Indtil {fmtDate(p.complaintUntil)}</span>
            </>
          ) : (
            <>
              <strong>Ingen</strong>
              <span className="muted">Frister er udløbet</span>
            </>
          )}
        </div>
      </div>

      <div className="spacer" />
      {hasReceipt && (
        <div className="button-row">
          <Link to={`/koeb/${p.id}/kvittering`} className="action">
            <Icon name="receipt" /> Se kvittering
          </Link>
          <Link to={`/koeb/${p.id}/kvittering?butik=1`} className="action">
            <Icon name="store" /> Vis i butik
          </Link>
        </div>
      )}

      {p.status === 'active' && left !== null && left >= 0 && (
        <div className="button-row">
          <button type="button" className="action secondary" onClick={() => setStatus('returned', 'Markeret som returneret. Købet tæller ikke længere med i dit forbrug.')}>
            Jeg har returneret den
          </button>
          <button type="button" className="action secondary" onClick={() => setStatus('kept', 'Fint! Veya holder stadig øje med reklamationsretten.')}>
            Jeg beholder den
          </button>
        </div>
      )}
      {p.status !== 'returned' && complaintLeft >= 0 && p.status !== 'complaint' && (
        <button type="button" className="action secondary" onClick={openComplaint}>
          Jeg vil reklamere
        </button>
      )}
      {p.status === 'complaint' && (
        <>
          <button type="button" className="action secondary" onClick={openComplaint}>
            Send reklamation igen
          </button>
          <button type="button" className="action ghost" onClick={() => setStatus('kept', 'Godt, at det er løst!')}>
            Reklamationen er løst
          </button>
        </>
      )}
      {p.status === 'returned' && (
        <button type="button" className="action ghost" onClick={() => setStatus('active', 'Købet er aktivt igen.')}>
          Fortryd: jeg har ikke returneret den
        </button>
      )}
      {p.status === 'kept' && left !== null && left >= 0 && (
        <button type="button" className="action ghost" onClick={() => setStatus('active', 'Veya minder dig om returfristen igen.')}>
          Fortryd: jeg er ikke sikker endnu
        </button>
      )}

      <button type="button" className="action ghost" onClick={() => setModal('delete')} style={{ marginTop: 18 }}>
        <Icon name="trash" size={18} /> Slet køb
      </button>

      <Modal open={modal === 'delete'} onClose={() => setModal(null)} title="Slet købet?">
        <p className="muted" style={{ margin: '12px 0 16px' }}>
          {p.product} og kvitteringen bliver slettet fra Veya. Det kan ikke fortrydes.
        </p>
        <button
          type="button"
          className="action danger"
          onClick={async () => {
            await deletePurchase(p.id);
            toast('Købet er slettet.');
            navigate('/koeb', { replace: true });
          }}
        >
          Ja, slet købet
        </button>
        <button type="button" className="action ghost" onClick={() => setModal(null)}>
          Annullér
        </button>
      </Modal>

      <Modal open={modal === 'complaint'} onClose={() => setModal(null)} title="Din reklamation">
        <p className="muted small" style={{ margin: '10px 0' }}>
          Veya har skrevet en reklamation med dine købsoplysninger. Beskriv fejlen, og send den til butikken
          {p.receiptImageId ? ' sammen med kvitteringen' : ''}.
        </p>
        <label className="field">
          <span className="sr-only">Reklamationstekst</span>
          <textarea value={text} onChange={(e) => setText(e.target.value)} style={{ minHeight: 260, fontSize: 13 }} />
        </label>
        <button type="button" className="action" onClick={sendComplaint} style={{ marginTop: 12 }}>
          <Icon name="share" size={18} /> Del reklamation{p.receiptImageId ? ' + kvittering' : ''}
        </button>
      </Modal>
    </section>
  );
}
