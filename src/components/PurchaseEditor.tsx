import { useLiveQuery } from 'dexie-react-hooks';
import { useState, type FormEvent, type ReactNode } from 'react';
import type { PurchaseInput } from '../db/purchases';
import { db } from '../db/schema';
import type { Category, Profile } from '../db/types';
import { categories, categoryLabel } from '../logic/categories';
import { todayISO } from '../logic/dates';
import { complaintUntilFor, DEFAULT_COMPLAINT_YEARS, returnDeadlineFor } from '../logic/deadlines';
import { fmtDate, parseAmount } from '../logic/format';
import type { PurchaseDraft } from '../logic/purchaseDraft';
import { purchaseDefaults, type PurchaseDefaults } from '../logic/storeDefaults';

interface PurchaseEditorProps {
  profile: Profile;
  initial: PurchaseDraft;
  /** True when editing an existing purchase: never overwrite the user's saved choices with defaults. */
  editing?: boolean;
  /** Fields the scanner could not find, highlighted until filled in. */
  missing?: (keyof PurchaseDraft)[];
  /** Fields the scanner found but may have misread, flagged until the user edits them. */
  uncertain?: (keyof PurchaseDraft)[];
  submitLabel: string;
  busy?: boolean;
  children?: ReactNode;
  onSubmit: (input: Omit<PurchaseInput, 'receiptImageId' | 'receiptText'>) => void;
}

const RETURN_CHOICES = [14, 30, 60, 100];

export function PurchaseEditor({ profile, initial, editing, missing = [], uncertain = [], submitLabel, busy, children, onSubmit }: PurchaseEditorProps) {
  const prefsQuery = useLiveQuery(() => db.storePrefs.toArray(), []);
  const prefs = prefsQuery ?? [];
  const [d, setD] = useState<PurchaseDraft>(initial);
  const [touched, setTouched] = useState({ returnDays: !!editing, category: !!editing, online: !!editing });
  const [source, setSource] = useState<PurchaseDefaults['source'] | null>(null);
  const [showMore, setShowMore] = useState(
    !!(initial.extraWarrantyUntil || initial.note || initial.paymentMethod || initial.receiptNumber || initial.storeLocation),
  );
  const [edited, setEdited] = useState<Set<keyof PurchaseDraft>>(new Set());

  const set = <K extends keyof PurchaseDraft>(key: K, value: PurchaseDraft[K]) => {
    setD((prev) => ({ ...prev, [key]: value }));
    setEdited((prev) => (prev.has(key) ? prev : new Set(prev).add(key)));
  };

  /** Re-applies store / online defaults to the fields the user hasn't chosen themselves. */
  const applyDefaults = (store: string, online: boolean | undefined, draft: PurchaseDraft, t = touched) => {
    const def = purchaseDefaults(store, online, prefs, profile.defaultReturnDays);
    const next = { ...draft };
    if (!t.online) next.boughtOnline = def.boughtOnline;
    if (!t.returnDays) {
      next.noReturn = def.returnDays === null;
      next.returnDays = def.returnDays === null ? '' : String(def.returnDays);
      setSource(def.source);
    }
    if (!t.category && def.category) next.category = def.category;
    setD(next);
  };

  // Fill return defaults once on first render for new purchases (e.g. from a scan).
  const [initialised, setInitialised] = useState(!!editing);
  if (!initialised && prefsQuery) {
    setInitialised(true);
    // A scan that looks like an online order keeps "på nettet"; otherwise the store decides.
    if (initial.returnDays === '' && !initial.noReturn) applyDefaults(initial.store, initial.boughtOnline || undefined, initial);
  }

  const price = parseAmount(d.price);
  const returnDays = d.noReturn ? null : d.returnDays === '' ? null : Number(d.returnDays);
  const complaintYears = Number(d.complaintYears) || DEFAULT_COMPLAINT_YEARS;
  const validDate = /^\d{4}-\d{2}-\d{2}$/.test(d.date);
  const valid = d.product.trim() && d.store.trim() && validDate && price > 0;

  const isMissing = (k: keyof PurchaseDraft) => missing.includes(k) && !String(d[k]).trim();
  const isUnsure = (k: keyof PurchaseDraft) => uncertain.includes(k) && !edited.has(k) && !!String(d[k]).trim();
  const cls = (k: keyof PurchaseDraft) => `field${isMissing(k) ? ' missing' : isUnsure(k) ? ' unsure' : ''}`;
  const unsureHint = (k: keyof PurchaseDraft) =>
    isUnsure(k) && <span className="hint">Veya er ikke helt sikker. Tjek det mod kvitteringen.</span>;

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!valid) return;
    onSubmit({
      product: d.product.trim(),
      store: d.store.trim(),
      storeLocation: d.storeLocation.trim() || undefined,
      price,
      date: d.date,
      category: d.category || 'andet',
      boughtOnline: d.boughtOnline,
      returnDays,
      complaintYears,
      extraWarrantyUntil: d.extraWarrantyUntil || undefined,
      paymentMethod: d.paymentMethod.trim() || undefined,
      receiptNumber: d.receiptNumber.trim() || undefined,
      register: d.register.trim() || undefined,
      time: d.time.trim() || undefined,
      note: d.note.trim() || undefined,
    });
  };

  let returnHint: string;
  if (d.noReturn) returnHint = 'Ingen returret registreret. Reklamationsretten gælder stadig.';
  else if (d.boughtOnline) returnHint = 'Fortrydelsesret: mindst 14 dage ved køb på nettet.';
  else returnHint = 'Butikkens returret. Tjek butikkens regler.';
  if (source === 'remembered' && !touched.returnDays) returnHint += ' Husket fra dit sidste køb her.';

  return (
    <form className="form" onSubmit={submit} noValidate>
      {children}
      <label className={cls('product')}>
        <span>Produkt</span>
        <input value={d.product} onChange={(e) => set('product', e.target.value)} placeholder="Fx AirPods Pro 2" required />
        {isMissing('product') && <span className="hint">Veya kunne ikke finde produktet. Skriv det her.</span>}
        {unsureHint('product')}
      </label>
      <label className={cls('store')}>
        <span>Butik</span>
        <input
          value={d.store}
          onChange={(e) => set('store', e.target.value)}
          onBlur={() => applyDefaults(d.store, touched.online ? d.boughtOnline : undefined, d)}
          placeholder="Fx Elgiganten"
          autoComplete="organization"
          required
        />
        {isMissing('store') && <span className="hint">Butikken blev ikke fundet på kvitteringen.</span>}
        {unsureHint('store')}
      </label>
      <div className="field-row">
        <label className={cls('date')}>
          <span>Købsdato</span>
          <input type="date" value={d.date} max={todayISO()} onChange={(e) => set('date', e.target.value)} required />
          {unsureHint('date')}
        </label>
        <label className={cls('price')}>
          <span>Pris (kr.)</span>
          <input inputMode="decimal" value={d.price} onChange={(e) => set('price', e.target.value)} placeholder="0" required />
          {unsureHint('price')}
        </label>
      </div>
      <label className="field">
        <span>Kategori</span>
        <select
          value={d.category}
          onChange={(e) => {
            set('category', e.target.value as Category);
            setTouched((t) => ({ ...t, category: true }));
          }}
        >
          <option value="">Vælg kategori</option>
          {categories.map((c) => (
            <option key={c} value={c}>
              {categoryLabel[c]}
            </option>
          ))}
        </select>
      </label>

      <fieldset className="field">
        <legend>Hvor købte du det?</legend>
        <div className="chip-row" style={{ margin: '4px 0 0' }}>
          {[false, true].map((online) => (
            <button
              key={String(online)}
              type="button"
              className="chip-btn"
              aria-pressed={d.boughtOnline === online}
              onClick={() => {
                const t = { ...touched, online: true };
                setTouched(t);
                applyDefaults(d.store, online, { ...d, boughtOnline: online }, t);
              }}
            >
              {online ? 'På nettet' : 'I butik'}
            </button>
          ))}
        </div>
      </fieldset>

      <fieldset className="field">
        <legend>Returret</legend>
        <div className="chip-row" style={{ margin: '4px 0 0' }}>
          <button
            type="button"
            className="chip-btn"
            aria-pressed={d.noReturn}
            onClick={() => {
              setTouched((t) => ({ ...t, returnDays: true }));
              setD((prev) => ({ ...prev, noReturn: true, returnDays: '' }));
            }}
          >
            Ingen
          </button>
          {RETURN_CHOICES.map((n) => (
            <button
              key={n}
              type="button"
              className="chip-btn"
              aria-pressed={!d.noReturn && d.returnDays === String(n)}
              onClick={() => {
                setTouched((t) => ({ ...t, returnDays: true }));
                setD((prev) => ({ ...prev, noReturn: false, returnDays: String(n) }));
              }}
            >
              {n} dage
            </button>
          ))}
        </div>
        {!d.noReturn && (
          <label className="field" style={{ marginTop: 6 }}>
            <span className="sr-only">Antal dages returret</span>
            <input
              inputMode="numeric"
              value={d.returnDays}
              placeholder="Antal dage"
              onChange={(e) => {
                setTouched((t) => ({ ...t, returnDays: true }));
                set('returnDays', e.target.value.replace(/[^\d]/g, ''));
              }}
            />
          </label>
        )}
        <span className="hint">{returnHint}</span>
      </fieldset>

      {validDate && (
        <div className="info" style={{ margin: 0 }}>
          <div className="kv">
            <span>Returfrist</span>
            <b>{returnDays === null ? 'Ingen' : fmtDate(returnDeadlineFor(d.date, returnDays)!)}</b>
          </div>
          <div className="kv">
            <span>Garanti / reklamationsret ({complaintYears} år)</span>
            <b>{fmtDate(complaintUntilFor(d.date, complaintYears))}</b>
          </div>
        </div>
      )}

      {!showMore ? (
        <button type="button" className="link" style={{ alignSelf: 'flex-start', padding: '6px 0' }} onClick={() => setShowMore(true)}>
          + Flere detaljer (garanti, betaling, note)
        </button>
      ) : (
        <>
          <div className="field-row">
            <label className="field">
              <span>Reklamationsret (år)</span>
              <input inputMode="numeric" value={d.complaintYears} onChange={(e) => set('complaintYears', e.target.value.replace(/[^\d]/g, ''))} />
            </label>
            <label className="field">
              <span>Ekstra garanti til</span>
              <input type="date" value={d.extraWarrantyUntil} onChange={(e) => set('extraWarrantyUntil', e.target.value)} />
            </label>
          </div>
          <label className="field">
            <span>Butikkens adresse / center</span>
            <input value={d.storeLocation} onChange={(e) => set('storeLocation', e.target.value)} placeholder="Fx Frederiksberg Centeret" />
          </label>
          <div className="field-row">
            <label className={cls('paymentMethod')}>
              <span>Betalt med</span>
              <input value={d.paymentMethod} onChange={(e) => set('paymentMethod', e.target.value)} placeholder="Visa •••• 1234" />
              {unsureHint('paymentMethod')}
            </label>
            <label className={cls('receiptNumber')}>
              <span>Kassebon nr.</span>
              <input value={d.receiptNumber} onChange={(e) => set('receiptNumber', e.target.value)} />
            </label>
          </div>
          <div className="field-row">
            <label className="field">
              <span>Kasse nr.</span>
              <input value={d.register} onChange={(e) => set('register', e.target.value)} inputMode="numeric" />
            </label>
            <label className="field">
              <span>Klokkeslæt</span>
              <input value={d.time} onChange={(e) => set('time', e.target.value)} placeholder="17.39" inputMode="decimal" />
            </label>
          </div>
          <label className="field">
            <span>Note</span>
            <textarea value={d.note} onChange={(e) => set('note', e.target.value)} placeholder="Fx farve, størrelse eller serienummer" />
          </label>
        </>
      )}

      <button type="submit" className="action" disabled={!valid || busy}>
        {submitLabel}
      </button>
    </form>
  );
}
