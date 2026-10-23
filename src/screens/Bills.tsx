import { useState, type FormEvent } from 'react';
import { EmptyState } from '../components/EmptyState';
import { Icon } from '../components/Icon';
import { Modal } from '../components/Modal';
import { useToast } from '../components/toastContext';
import { TopBar } from '../components/TopBar';
import { useAppData, useToday } from '../db/hooks';
import { deleteBill, markBillPaid, markBillUnpaid, saveBill } from '../db/subscriptions';
import type { Bill, BillRecurrence, Category } from '../db/types';
import { categories, categoryLabel } from '../logic/categories';
import { addDaysISO, daysBetween } from '../logic/dates';
import { fmtDate, fmtShort, kr, parseAmount, relDays } from '../logic/format';
import { recurrenceLabel } from '../logic/recurring';

export default function Bills() {
  const data = useAppData();
  const today = useToday();
  const toast = useToast();
  const [editing, setEditing] = useState<Bill | 'new' | null>(null);

  if (!data) return null;
  const unpaid = data.bills.filter((b) => !b.paid).sort((a, b) => a.dueDate.localeCompare(b.dueDate));
  const paid = data.bills
    .filter((b) => b.paid)
    .sort((a, b) => (b.paidAt ?? b.dueDate).localeCompare(a.paidAt ?? a.dueDate))
    .slice(0, 12);
  const dueSoonTotal = unpaid.filter((b) => daysBetween(today, b.dueDate) <= 30).reduce((s, b) => s + b.amount, 0);

  const pay = async (b: Bill) => {
    await markBillPaid(b.id, today);
    toast(b.recurring === 'none' ? `${b.name} er betalt.` : `${b.name} er betalt. Næste regning er oprettet.`);
  };

  return (
    <section className="page">
      <TopBar
        back="/abonnementer"
        right={
          <button type="button" className="icon-btn" aria-label="Tilføj regning" onClick={() => setEditing('new')}>
            <Icon name="plus" />
          </button>
        }
      />
      <h1>Regninger</h1>
      <p className="muted">
        {unpaid.length ? `${kr(dueSoonTotal)} forfalder de næste 30 dage.` : 'Husleje, el, internet og andre faste regninger.'}
      </p>

      {unpaid.length === 0 && data.bills.length > 0 && (
        <div className="notice ok" style={{ marginTop: 16 }}>
          <div className="notice-icon">
            <Icon name="check" />
          </div>
          <div className="notice-body">
            <b>Du har ingen ubetalte regninger</b>
            <span>Alt er håndteret lige nu.</span>
          </div>
        </div>
      )}

      {unpaid.length > 0 && <h2>Skal betales</h2>}
      {unpaid.map((b) => {
        const days = daysBetween(today, b.dueDate);
        const tone = days < 0 ? 'danger' : days <= data.profile.noticeDaysBefore ? 'warn' : '';
        return (
          <div key={b.id} className="info" style={{ margin: '10px 0', padding: '4px 14px 12px' }}>
            <button type="button" className="row" onClick={() => setEditing(b)} aria-label={`Redigér ${b.name}`}>
              <div className="row-icon">
                <Icon name="bill" />
              </div>
              <div className="row-main">
                <b>{b.name}</b>
                <span className={tone ? `text-${tone}` : ''}>
                  {days < 0 ? `Forfaldt ${relDays(days)}` : `Forfalder ${relDays(days)}`} · {fmtShort(b.dueDate)}
                </span>
              </div>
              <div className="row-end">
                {kr(b.amount)}
                <small>{recurrenceLabel[b.recurring]}</small>
              </div>
            </button>
            <button type="button" className="action compact secondary" style={{ width: '100%' }} onClick={() => pay(b)}>
              <Icon name="check" size={18} /> Markér som betalt
            </button>
          </div>
        );
      })}

      {paid.length > 0 && <h2>Betalt</h2>}
      {paid.map((b) => (
        <button key={b.id} type="button" className="row" onClick={() => setEditing(b)}>
          <div className="row-icon" style={{ background: 'var(--ok-icon)', color: 'var(--ok-text)' }}>
            <Icon name="check" />
          </div>
          <div className="row-main">
            <b>{b.name}</b>
            <span>Betalt {fmtDate(b.paidAt ?? b.dueDate)}</span>
          </div>
          <div className="row-end">{kr(b.amount)}</div>
        </button>
      ))}

      {data.bills.length === 0 && (
        <EmptyState icon="bill" title="Ingen regninger endnu">
          <p>Tilføj husleje, el eller internet, så siger Veya til, før de forfalder.</p>
          <button type="button" className="action" onClick={() => setEditing('new')}>
            <Icon name="plus" /> Tilføj regning
          </button>
        </EmptyState>
      )}

      <Modal open={editing !== null} onClose={() => setEditing(null)} title={editing === 'new' ? 'Ny regning' : 'Redigér regning'}>
        {editing !== null && (
          <BillForm
            key={editing === 'new' ? 'new' : editing.id}
            bill={editing === 'new' ? undefined : editing}
            today={today}
            onSave={async (input) => {
              await saveBill(input, editing === 'new' ? undefined : editing.id);
              setEditing(null);
              toast('Regningen er gemt.');
            }}
            onDelete={
              editing === 'new'
                ? undefined
                : async () => {
                    await deleteBill(editing.id);
                    setEditing(null);
                    toast('Regningen er slettet.');
                  }
            }
            onUnpay={
              editing !== 'new' && editing.paid
                ? async () => {
                    await markBillUnpaid(editing.id);
                    setEditing(null);
                  }
                : undefined
            }
          />
        )}
      </Modal>
    </section>
  );
}

interface BillFormProps {
  bill?: Bill;
  today: string;
  onSave: (input: Pick<Bill, 'name' | 'amount' | 'dueDate' | 'recurring' | 'category'>) => void;
  onDelete?: () => void;
  onUnpay?: () => void;
}

function BillForm({ bill, today, onSave, onDelete, onUnpay }: BillFormProps) {
  const [name, setName] = useState(bill?.name ?? '');
  const [amount, setAmount] = useState(bill ? String(bill.amount).replace('.', ',') : '');
  const [dueDate, setDueDate] = useState(bill?.dueDate ?? addDaysISO(today, 7));
  const [recurring, setRecurring] = useState<BillRecurrence>(bill?.recurring ?? 'monthly');
  const [category, setCategory] = useState<Category>(bill?.category ?? 'bolig');
  const value = parseAmount(amount);
  const valid = name.trim() && value > 0 && /^\d{4}-\d{2}-\d{2}$/.test(dueDate);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (valid) onSave({ name: name.trim(), amount: value, dueDate, recurring, category });
  };

  return (
    <form className="form" onSubmit={submit} noValidate>
      {!bill && (
        <div className="chip-row">
          {['Husleje', 'El', 'Vand og varme', 'Internet', 'Indboforsikring', 'Studielån'].map((n) => (
            <button key={n} type="button" className="chip-btn" aria-pressed={name === n} onClick={() => setName(n)}>
              {n}
            </button>
          ))}
        </div>
      )}
      <label className="field">
        <span>Navn</span>
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Fx Husleje" required />
      </label>
      <div className="field-row">
        <label className="field">
          <span>Beløb (kr.)</span>
          <input inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0" required />
        </label>
        <label className="field">
          <span>Forfalder</span>
          <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} required />
        </label>
      </div>
      <div className="field-row">
        <label className="field">
          <span>Gentages</span>
          <select value={recurring} onChange={(e) => setRecurring(e.target.value as BillRecurrence)}>
            {(Object.keys(recurrenceLabel) as BillRecurrence[]).map((r) => (
              <option key={r} value={r}>
                {recurrenceLabel[r]}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>Kategori</span>
          <select value={category} onChange={(e) => setCategory(e.target.value as Category)}>
            {categories.map((c) => (
              <option key={c} value={c}>
                {categoryLabel[c]}
              </option>
            ))}
          </select>
        </label>
      </div>
      <button type="submit" className="action" disabled={!valid}>
        Gem regning
      </button>
      {onUnpay && (
        <button type="button" className="action ghost" onClick={onUnpay}>
          Markér som ikke betalt
        </button>
      )}
      {onDelete && (
        <button type="button" className="action ghost" onClick={onDelete}>
          <Icon name="trash" size={18} /> Slet regning
        </button>
      )}
    </form>
  );
}
