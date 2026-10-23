import { useState, type FormEvent } from 'react';
import { CategoryIcon } from '../components/CategoryIcon';
import { BarChart, Donut } from '../components/Charts';
import { Icon } from '../components/Icon';
import { Modal } from '../components/Modal';
import { useToast } from '../components/toastContext';
import { TopBar } from '../components/TopBar';
import { deleteExpense, saveExpense } from '../db/expenses';
import { useAppData, useToday } from '../db/hooks';
import type { Category, Expense } from '../db/types';
import { budgetStatus, categoryBreakdown, monthSeries } from '../logic/budget';
import { categories, categoryColor, categoryLabel } from '../logic/categories';
import { monthKey } from '../logic/dates';
import { capitalize, fmtMonth, fmtShort, kr, parseAmount } from '../logic/format';

export default function Finance() {
  const data = useAppData();
  const today = useToday();
  const toast = useToast();
  const [editing, setEditing] = useState<Expense | 'new' | null>(null);

  if (!data) return null;
  const status = budgetStatus(data, today);
  const series = monthSeries(data, today, 6);
  const breakdown = categoryBreakdown(data, monthKey(today));
  const total = breakdown.reduce((s, b) => s + b.amount, 0);
  const avg = Math.round(series.slice(0, -1).reduce((s, m) => s + m.total, 0) / Math.max(1, series.slice(0, -1).filter((m) => m.total).length));
  const expenses = data.expenses.filter((e) => monthKey(e.date) === monthKey(today)).sort((a, b) => b.date.localeCompare(a.date));
  const tone = status.pct >= 100 ? 'danger' : status.pct > 80 ? 'warn' : '';

  return (
    <section className="page">
      <TopBar
        back
        right={
          <button type="button" className="icon-btn" aria-label="Tilføj udgift" onClick={() => setEditing('new')}>
            <Icon name="plus" />
          </button>
        }
      />
      <h1>Økonomi</h1>
      <p className="muted">{capitalize(fmtMonth(today))}</p>

      <div className="hero" style={{ marginTop: 16 }}>
        <small>{status.remaining >= 0 ? 'Tilbage af budget' : 'Over budget'}</small>
        <strong className={status.remaining < 0 ? 'text-danger' : ''}>{kr(Math.abs(status.remaining))}</strong>
        <div
          className={`progress ${tone}`}
          role="progressbar"
          aria-valuenow={status.pct}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Budget brugt"
        >
          <i style={{ width: `${Math.min(100, status.pct)}%` }} />
        </div>
        <div className="budgetline" style={{ marginTop: 8 }}>
          <span>
            {kr(status.spent)} brugt · {status.pct}%
          </span>
          <span>{kr(status.budget)} budget</span>
        </div>
      </div>

      <button type="button" className="action secondary" style={{ marginTop: 12 }} onClick={() => setEditing('new')}>
        <Icon name="coffee" size={18} /> Tilføj udgift
      </button>

      <h2>Forbrug pr. måned</h2>
      <BarChart series={series} budget={data.profile.monthlyBudget} />
      <p className="muted small center" style={{ marginTop: 10 }}>
        Stiplet linje = dit budget{avg > 0 ? ` · Snit tidligere måneder: ${kr(avg)}` : ''}
      </p>

      <h2>Fordelt på kategorier</h2>
      {breakdown.length ? (
        <>
          <div className="split">
            <Donut parts={breakdown} total={total} />
            <div className="legend">
              {breakdown.slice(0, 5).map((b) => (
                <div key={b.category}>
                  <i className="dot" style={{ background: categoryColor[b.category] }} />
                  <span>{categoryLabel[b.category]}</span>
                  <b>{kr(Math.round(b.amount))}</b>
                </div>
              ))}
              {breakdown.length > 5 && (
                <div>
                  <i className="dot" style={{ background: 'var(--line)' }} />
                  <span>Øvrige</span>
                  <b>{kr(Math.round(breakdown.slice(5).reduce((s, b) => s + b.amount, 0)))}</b>
                </div>
              )}
            </div>
          </div>
          <h2>Top 3 denne måned</h2>
          {breakdown.slice(0, 3).map((b, i) => (
            <div key={b.category} className="row">
              <CategoryIcon category={b.category} />
              <div className="row-main">
                <b>
                  {i + 1}. {categoryLabel[b.category]}
                </b>
                <span>{Math.round((b.amount / total) * 100)}% af dit forbrug</span>
              </div>
              <div className="row-end">{kr(Math.round(b.amount))}</div>
            </div>
          ))}
        </>
      ) : (
        <p className="muted">Intet forbrug registreret i denne måned endnu.</p>
      )}

      {expenses.length > 0 && (
        <>
          <h2>Udgifter uden kvittering</h2>
          {expenses.map((e) => (
            <button key={e.id} type="button" className="row" onClick={() => setEditing(e)}>
              <CategoryIcon category={e.category} />
              <div className="row-main">
                <b>{e.label}</b>
                <span>{e.date === today ? 'I dag' : fmtShort(e.date)}</span>
              </div>
              <div className="row-end">{kr(e.amount)}</div>
            </button>
          ))}
        </>
      )}

      <Modal open={editing !== null} onClose={() => setEditing(null)} title={editing === 'new' ? 'Ny udgift' : 'Redigér udgift'}>
        {editing !== null && (
          <ExpenseForm
            key={editing === 'new' ? 'new' : editing.id}
            initial={editing === 'new' ? undefined : editing}
            today={today}
            onSave={async (input) => {
              await saveExpense(input, editing === 'new' ? undefined : editing.id);
              setEditing(null);
              toast('Udgiften er gemt — dit budget er opdateret.');
            }}
            onDelete={
              editing === 'new'
                ? undefined
                : async () => {
                    await deleteExpense(editing.id);
                    setEditing(null);
                    toast('Udgiften er slettet.');
                  }
            }
          />
        )}
      </Modal>
    </section>
  );
}

const quick: { label: string; category: Category }[] = [
  { label: 'Café', category: 'mad' },
  { label: 'Frokost', category: 'mad' },
  { label: 'Transport', category: 'transport' },
  { label: 'Biograf', category: 'fritid' },
  { label: 'Byen', category: 'fritid' },
];

function ExpenseForm({
  initial,
  today,
  onSave,
  onDelete,
}: {
  initial?: Expense;
  today: string;
  onSave: (input: Omit<Expense, 'id'>) => void;
  onDelete?: () => void;
}) {
  const [label, setLabel] = useState(initial?.label ?? '');
  const [amount, setAmount] = useState(initial ? String(initial.amount).replace('.', ',') : '');
  const [date, setDate] = useState(initial?.date ?? today);
  const [category, setCategory] = useState<Category>(initial?.category ?? 'mad');
  const value = parseAmount(amount);
  const valid = label.trim() && value > 0 && /^\d{4}-\d{2}-\d{2}$/.test(date);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (valid) onSave({ label: label.trim(), amount: value, date, category });
  };

  return (
    <form className="form" onSubmit={submit} noValidate>
      {!initial && (
        <div className="chip-row">
          {quick.map((q) => (
            <button
              key={q.label}
              type="button"
              className="chip-btn"
              aria-pressed={label === q.label}
              onClick={() => {
                setLabel(q.label);
                setCategory(q.category);
              }}
            >
              {q.label}
            </button>
          ))}
        </div>
      )}
      <label className="field">
        <span>Hvad?</span>
        <input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Fx Joe & The Juice" required />
      </label>
      <div className="field-row">
        <label className="field">
          <span>Beløb (kr.)</span>
          <input inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0" required autoFocus={!initial} />
        </label>
        <label className="field">
          <span>Dato</span>
          <input type="date" value={date} max={today} onChange={(e) => setDate(e.target.value)} required />
        </label>
      </div>
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
        Gem udgift
      </button>
      {onDelete && (
        <button type="button" className="action ghost" onClick={onDelete}>
          <Icon name="trash" size={18} /> Slet udgift
        </button>
      )}
    </form>
  );
}
