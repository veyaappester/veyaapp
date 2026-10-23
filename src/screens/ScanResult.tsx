import { useEffect, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { Icon } from '../components/Icon';
import { PurchaseEditor } from '../components/PurchaseEditor';
import { useToast } from '../components/toastContext';
import { TopBar } from '../components/TopBar';
import { useProfile } from '../db/hooks';
import { savePurchase } from '../db/purchases';
import { fmtFull, kr } from '../logic/format';
import { emptyDraft, type PurchaseDraft } from '../logic/purchaseDraft';
import { parseReceipt, suggestProduct, type ParsedReceipt } from '../logic/receiptParser';
import { getScanSession, setScanSession } from '../ocr/scanSession';

function draftFrom(parsed: ParsedReceipt): PurchaseDraft {
  return {
    ...emptyDraft(),
    product: suggestProduct(parsed) ?? '',
    store: parsed.store ?? '',
    storeLocation: parsed.storeLocation ?? '',
    category: parsed.category ?? '',
    date: parsed.date ?? '',
    price: parsed.total ? String(parsed.total).replace('.', ',') : '',
    boughtOnline: parsed.online,
    paymentMethod: parsed.paymentMethod ?? '',
    receiptNumber: parsed.receiptNumber ?? '',
    register: parsed.register ?? '',
    time: parsed.time ?? '',
  };
}

export default function ScanResult() {
  const navigate = useNavigate();
  const toast = useToast();
  const profile = useProfile();
  const [session] = useState(getScanSession);
  const [thumbUrl, setThumbUrl] = useState<string>();
  const [busy, setBusy] = useState(false);
  const [text, setText] = useState(session?.text.trim() ?? '');
  const [parsed, setParsed] = useState(session?.parsed);
  const [version, setVersion] = useState(0);

  useEffect(() => {
    if (!session) return;
    const url = URL.createObjectURL(session.thumb);
    setThumbUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [session]);

  if (!session || !parsed) return <Navigate to="/scan" replace />;
  if (!profile) return null;

  const initial = draftFrom(parsed);
  const missing = (['product', 'store', 'date', 'price'] as const).filter((k) => !initial[k]);
  const uncertain = parsed.uncertain.map((f) => f as keyof PurchaseDraft);
  const found = [
    parsed.store,
    parsed.date && `${fmtFull(parsed.date)}${parsed.time ? ` kl. ${parsed.time}` : ''}`,
    parsed.total && kr(parsed.total),
  ].filter(Boolean) as string[];

  const reparse = () => {
    // Re-reads the corrected text and refills the form (keeps the same photo).
    setParsed(parseReceipt(text));
    setVersion((v) => v + 1);
    toast('Veya har læst den rettede tekst.');
  };

  return (
    <section className="page">
      <TopBar back="/scan" title={<span className="muted">Trin 2 af 2</span>} />
      <div className="center" style={{ margin: '4px 0 12px' }}>
        <div className="slide-art" style={{ width: 64, height: 64, borderRadius: 20, marginBottom: 10 }}>
          <Icon name={missing.length ? 'receipt' : 'check'} size={30} />
        </div>
        <h1 style={{ fontSize: 23 }}>{missing.length === 4 ? 'Tjek kvitteringen' : 'Køb fundet'}</h1>
        <p className="muted">
          {missing.length === 0 && uncertain.length === 0
            ? 'Tjek detaljerne før du gemmer.'
            : missing.length === 4
              ? 'Veya kunne ikke læse så meget. Udfyld felterne selv.'
              : 'Tjek de markerede felter mod kvitteringen, før du gemmer.'}
        </p>
      </div>

      <div className="info row" style={{ padding: 12, gap: 14 }}>
        {thumbUrl && <img src={thumbUrl} alt="Din scannede kvittering" className="thumb" />}
        <div className="row-main wrap">
          <b>{found.length ? `Veya fandt ${found.join(' · ')}` : 'Billedet er gemt'}</b>
          <span>
            {parsed.items.length
              ? `${parsed.items.length} ${parsed.items.length === 1 ? 'vare' : 'varer'}: ${parsed.items.map((i) => i.name).join(', ')}`
              : 'Kvitteringen gemmes sammen med købet, så du kan vise den i butikken.'}
          </span>
        </div>
      </div>

      <details className="ocr-text">
        <summary>{text ? 'Se og ret den læste tekst' : 'Skriv kvitteringens tekst selv'}</summary>
        <label className="field">
          <span className="sr-only">Kvitteringens tekst</span>
          <textarea value={text} onChange={(e) => setText(e.target.value)} placeholder="Fx REMA 1000 … AT BETALE 20,00 … 18.10.26 17.39" />
        </label>
        <button type="button" className="action secondary" onClick={reparse} disabled={!text.trim()}>
          <Icon name="repeat" size={18} /> Læs teksten igen
        </button>
      </details>

      <PurchaseEditor
        key={version}
        profile={profile}
        initial={initial}
        missing={missing}
        uncertain={uncertain}
        busy={busy}
        submitLabel="Gem køb og opdater overblik"
        onSubmit={async (input) => {
          setBusy(true);
          await savePurchase({ ...input, receiptText: text.trim() || undefined }, undefined, {
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
