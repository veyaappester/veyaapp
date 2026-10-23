import { useLiveQuery } from 'dexie-react-hooks';
import { useEffect, useRef, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { Icon } from '../components/Icon';
import { useGoBack } from '../components/useGoBack';
import { useReceiptImageUrl } from '../db/hooks';
import { db } from '../db/schema';
import type { Purchase } from '../db/types';
import { fmtFull, kr } from '../logic/format';

export default function ReceiptView() {
  const { id } = useParams();
  const [params] = useSearchParams();
  const storeMode = params.get('butik') === '1';
  const purchase = useLiveQuery(async () => (id ? ((await db.purchases.get(id)) ?? null) : null), [id]);
  const goBack = useGoBack(id ? `/koeb/${id}` : '/koeb');

  if (purchase === undefined) return null;
  if (!purchase) {
    return (
      <div className="fullscreen">
        <div className="fullscreen-head">
          <button type="button" className="back" onClick={goBack} aria-label="Tilbage">
            <Icon name="back" />
          </button>
        </div>
        <p className="center muted">Købet findes ikke.</p>
      </div>
    );
  }
  return storeMode ? <StoreView p={purchase} onBack={goBack} /> : <ZoomView p={purchase} onBack={goBack} />;
}

function ReceiptImage({ p, scale }: { p: Purchase; scale: number }) {
  const url = useReceiptImageUrl(p.receiptImageId);
  if (url) return <img src={url} alt={`Kvittering fra ${p.store}`} style={{ width: `${scale * 100}%` }} draggable={false} />;
  if (p.receiptText) return <pre className="receipt-text">{p.receiptText}</pre>;
  return <p className="muted center" style={{ padding: 30 }}>Der er ikke gemt et billede af kvitteringen.</p>;
}

/** Full receipt image with pinch / double-tap / button zoom. */
function ZoomView({ p, onBack }: { p: Purchase; onBack: () => void }) {
  const [scale, setScale] = useState(1);
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const pinchStart = useRef<{ dist: number; scale: number } | null>(null);
  const clamp = (s: number) => Math.min(4, Math.max(1, s));

  const dist = () => {
    const [a, b] = [...pointers.current.values()];
    return Math.hypot(a.x - b.x, a.y - b.y);
  };

  return (
    <div className="fullscreen">
      <div className="fullscreen-head">
        <button type="button" className="back" onClick={onBack} aria-label="Tilbage">
          <Icon name="back" />
        </button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <b style={{ display: 'block', fontSize: 15 }}>{p.store}</b>
          <span className="muted small">
            {fmtFull(p.date)} · {kr(p.price)}
          </span>
        </div>
        <button type="button" className="icon-btn" aria-label="Zoom ud" onClick={() => setScale((s) => clamp(s - 0.5))} disabled={scale <= 1}>
          <span style={{ fontSize: 22, lineHeight: 1 }}>−</span>
        </button>
        <button type="button" className="icon-btn" aria-label="Zoom ind" onClick={() => setScale((s) => clamp(s + 0.5))}>
          <Icon name="plus" />
        </button>
      </div>
      <div
        className="zoom-area"
        style={{ touchAction: scale > 1 ? 'pan-x pan-y' : 'pan-y' }}
        onDoubleClick={() => setScale((s) => (s > 1 ? 1 : 2.5))}
        onPointerDown={(e) => {
          pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
          if (pointers.current.size === 2) pinchStart.current = { dist: dist(), scale };
        }}
        onPointerMove={(e) => {
          if (!pointers.current.has(e.pointerId)) return;
          pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
          if (pointers.current.size === 2 && pinchStart.current) {
            setScale(clamp((pinchStart.current.scale * dist()) / pinchStart.current.dist));
          }
        }}
        onPointerUp={(e) => {
          pointers.current.delete(e.pointerId);
          if (pointers.current.size < 2) pinchStart.current = null;
        }}
        onPointerCancel={(e) => pointers.current.delete(e.pointerId)}
      >
        <ReceiptImage p={p} scale={scale} />
      </div>
      <p className="muted small center" style={{ padding: '8px 16px calc(10px + var(--safe-bottom))' }}>
        Knib eller dobbelttryk for at zoome.
      </p>
    </div>
  );
}

/** High-contrast "show it at the till" view that keeps the screen awake. */
function StoreView({ p, onBack }: { p: Purchase; onBack: () => void }) {
  const [awake, setAwake] = useState(false);

  useEffect(() => {
    let lock: WakeLockSentinel | null = null;
    let cancelled = false;
    const request = async () => {
      try {
        if (!('wakeLock' in navigator) || document.visibilityState !== 'visible') return;
        lock = await navigator.wakeLock.request('screen');
        if (cancelled) {
          lock.release();
          return;
        }
        setAwake(true);
        lock.addEventListener('release', () => setAwake(false));
      } catch {
        setAwake(false);
      }
    };
    request();
    // The lock is dropped when the app goes to the background; take it again on return.
    const onVisible = () => document.visibilityState === 'visible' && request();
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      cancelled = true;
      document.removeEventListener('visibilitychange', onVisible);
      lock?.release().catch(() => {});
    };
  }, []);

  return (
    <div className="fullscreen store">
      <div className="fullscreen-head">
        <button type="button" className="back" onClick={onBack} aria-label="Luk">
          <Icon name="close" />
        </button>
        <b style={{ flex: 1, fontSize: 16 }}>Vis i butik</b>
        {awake && (
          <span className="tag ok">
            <Icon name="sparkle" size={12} /> Skærmen holdes tændt
          </span>
        )}
      </div>
      <div className="zoom-area" style={{ background: '#fff' }}>
        <ReceiptImage p={p} scale={1} />
      </div>
      <div className="store-info">
        <div className="kv">
          <span>Butik</span>
          <b>
            {p.store}
            {p.storeLocation ? `, ${p.storeLocation}` : ''}
          </b>
        </div>
        <div className="kv">
          <span>Købsdato</span>
          <b>
            {fmtFull(p.date)}
            {p.time ? ` kl. ${p.time}` : ''}
          </b>
        </div>
        {p.receiptNumber && (
          <div className="kv">
            <span>Kassebon nr.</span>
            <b>
              {p.receiptNumber}
              {p.register ? ` · kasse ${p.register}` : ''}
            </b>
          </div>
        )}
        <div className="kv">
          <span>Total</span>
          <b style={{ fontSize: 22 }}>{kr(p.price)}</b>
        </div>
        {p.paymentMethod && (
          <div className="kv">
            <span>Betalt med</span>
            <b>{p.paymentMethod}</b>
          </div>
        )}
      </div>
    </div>
  );
}
