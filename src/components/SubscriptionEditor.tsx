import { useState, type FormEvent } from 'react';
import type { SubscriptionInput } from '../db/subscriptions';
import type { Category, Cycle, Subscription } from '../db/types';
import { categories, categoryLabel } from '../logic/categories';
import { addMonthsISO, todayISO } from '../logic/dates';
import { parseAmount } from '../logic/format';
import { commonServices } from '../logic/services';

interface SubscriptionEditorProps {
  initial?: Subscription;
  submitLabel: string;
  onSubmit: (input: SubscriptionInput) => void;
}

const cycles: { value: Cycle; label: string }[] = [
  { value: 'monthly', label: 'Hver måned' },
  { value: 'yearly', label: 'Hvert år' },
  { value: 'weekly', label: 'Hver uge' },
];

export function SubscriptionEditor({ initial, submitLabel, onSubmit }: SubscriptionEditorProps) {
  const [name, setName] = useState(initial?.name ?? '');
  const [plan, setPlan] = useState(initial?.plan ?? '');
  const [price, setPrice] = useState(initial ? String(initial.price).replace('.', ',') : '');
  const [cycle, setCycle] = useState<Cycle>(initial?.cycle ?? 'monthly');
  const [nextPayment, setNextPayment] = useState(initial?.nextPayment ?? addMonthsISO(todayISO(), 1));
  const [category, setCategory] = useState<Category>(initial?.category ?? 'fritid');

  const amount = parseAmount(price);
  const valid = name.trim() && amount > 0 && /^\d{4}-\d{2}-\d{2}$/.test(nextPayment);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!valid) return;
    onSubmit({ name: name.trim(), plan: plan.trim() || undefined, price: amount, cycle, nextPayment, category });
  };

  return (
    <form className="form" onSubmit={submit} noValidate>
      {!initial && (
        <div className="chip-row" aria-label="Hurtigvalg">
          {commonServices.map((s) => (
            <button
              key={s.name}
              type="button"
              className="chip-btn"
              aria-pressed={name === s.name}
              onClick={() => {
                setName(s.name);
                setCategory(s.category);
                if (s.plan && !plan) setPlan(s.plan);
              }}
            >
              {s.name}
            </button>
          ))}
        </div>
      )}
      <label className="field">
        <span>Navn</span>
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Fx Netflix" required />
      </label>
      <label className="field">
        <span>Abonnement / plan (valgfrit)</span>
        <input value={plan} onChange={(e) => setPlan(e.target.value)} placeholder="Fx Premium Student" />
      </label>
      <div className="field-row">
        <label className="field">
          <span>Pris (kr.)</span>
          <input inputMode="decimal" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="0" required />
        </label>
        <label className="field">
          <span>Næste betaling</span>
          <input type="date" value={nextPayment} onChange={(e) => setNextPayment(e.target.value)} required />
        </label>
      </div>
      <fieldset className="field">
        <legend>Betales</legend>
        <div className="chip-row" style={{ margin: '4px 0 0' }}>
          {cycles.map((c) => (
            <button key={c.value} type="button" className="chip-btn" aria-pressed={cycle === c.value} onClick={() => setCycle(c.value)}>
              {c.label}
            </button>
          ))}
        </div>
      </fieldset>
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
      <button type="submit" className="action" disabled={!valid}>
        {submitLabel}
      </button>
    </form>
  );
}
