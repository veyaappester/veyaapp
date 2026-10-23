import { useEffect, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { Icon } from '../components/Icon';
import { PurchaseEditor } from '../components/PurchaseEditor';
import { useToast } from '../components/toastContext';
import { TopBar } from '../components/TopBar';
import { useProfile } from '../db/hooks';
import { savePurchase } from '../db/purchases';
import { todayISO } from '../logic/dates';
import { emptyDraft, type PurchaseDraft } from '../logic/purchaseDraft';
import { suggestProduct } from '../logic/receiptParser';
import { getScanSession, setScanSession } from '../ocr/scanSession';

export default function ScanResult() {
  const navigate = useNavigate();
  const toast = useToast();
  const profile = useProfile();
  const [session] = useState(getScanSession);
  const [thumbUrl, setThumbUrl] = useState<string>();
  const [busy, setBusy] = useState(false);
  const [showText, setShowText] = useState(false);

  useEffect(() => {
    if (!session) return;
    const url = URL.createObjectURL(session.thumb);
    setThumbUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [session]);

  if (!session) return <Navigate to="/scan" replace />;
  if (!profile) return null;

  const { parsed } = session;
  // A date in the future is almost certainly misread; let the user fix it.
  const date = parsed.date && parsed.date <= todayISO() ? parsed.date : undefined;
  const product = suggestProduct(parsed);
  const initial: PurchaseDraft = {
    ...emptyDraft(),
    product: product ?? '',
    store: parsed.store ?? '',
    storeLocation: parsed.storeLocation ?? '',
    date: date ?? '',
    price: parsed.total ? String(parsed.total).replace('.', ',') : '',
    boughtOnline: parsed.online,
    paymentMethod: parsed.paymentMethod ?? '',
    receiptNumber: parsed.receiptNumber ?? '',
  };
  const missing = (['product', 'store', 'date', 'price'] as const).filter((k) => !initial[k]);
  const found = [parsed.store && 'butik', date && 'dato', parsed.total && 'pris', product && 'produkt'].filter(Boolean) as string[];

  return (
    <section className="page">
      <TopBar back="/scan" title={<span className="muted">Trin 2 af 2</span>} />
      <div className="center" style={{ margin: '4px 0 12px' }}>
        <div className="slide-art" style={{ width: 64, height: 64, borderRadius: 20, marginBottom: 10 }}>
          <Icon name={missing.length ? 'receipt' : 'check'} size={30} />
        </div>
        <h1 style={{ fontSize: 23 }}>{missing.length === 4 ? 'Tjek kvitteringen' : 'Køb fundet'}</h1>
        <p className="muted">
          {missing.length === 0
            ? 'Tjek detaljerne før du gemmer.'
            : missing.length === 4
              ? 'Veya kunne ikke læse så meget. Udfyld felterne selv.'
              : 'Tjek detaljerne, og udfyld de markerede felter.'}
        </p>
      </div>

      <div className="info row" style={{ padding: 12, gap: 14 }}>
        {thumbUrl && <img src={thumbUrl} alt="Din scannede kvittering" className="thumb" />}
        <div className="row-main wrap">
          <b>{found.length ? `Veya fandt ${found.join(', ')}` : 'Billedet er gemt'}</b>
          <span>Kvitteringen gemmes sammen med købet, så du kan vise den i butikken.</span>
          {session.text.trim() && (
            <button type="button" className="link" style={{ padding: '6px 0 0' }} onClick={() => setShowText((v) => !v)}>
              {showText ? 'Skjul den læste tekst' : 'Se den læste tekst'}
            </button>
          )}
        </div>
      </div>
      {showText && <pre className="receipt-text" style={{ width: 'auto', margin: '0 0 12px' }}>{session.text.trim()}</pre>}

      <PurchaseEditor
        profile={profile}
        initial={initial}
        missing={missing}
        busy={busy}
        submitLabel="Gem køb og opdater overblik"
        onSubmit={async (input) => {
          setBusy(true);
          await savePurchase({ ...input, receiptText: session.text.trim() || undefined }, undefined, {
            blob: session.blob,
            thumb: session.thumb,
          });
          setScanSession(null);
          toast('Købet er gemt — økonomi og plan er opdateret.');
          navigate('/', { replace: true });
        }}
      />
    </section>
  );
}
