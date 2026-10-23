import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { EmptyState } from '../components/EmptyState';
import { Icon } from '../components/Icon';
import { PurchaseRow } from '../components/PurchaseRow';
import { TopBar } from '../components/TopBar';
import { useAppData, useToday } from '../db/hooks';
import type { Category } from '../db/types';
import { categories, categoryLabel } from '../logic/categories';

export default function Purchases() {
  const data = useAppData();
  const today = useToday();
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<Category | 'alle'>('alle');

  const purchases = useMemo(() => [...(data?.purchases ?? [])].sort((a, b) => b.date.localeCompare(a.date)), [data]);
  const inUse = categories.filter((c) => purchases.some((p) => p.category === c));

  const q = query.trim().toLowerCase();
  const shown = purchases.filter(
    (p) =>
      (filter === 'alle' || p.category === filter) &&
      (!q || [p.product, p.store, p.receiptText, p.note, p.storeLocation].some((f) => f?.toLowerCase().includes(q))),
  );

  if (!data) return null;
  return (
    <section className="page">
      <TopBar
        right={
          <Link to="/koeb/ny" className="icon-btn" aria-label="Tilføj køb manuelt">
            <Icon name="plus" />
          </Link>
        }
      />
      <h1>Mine køb</h1>
      <p className="muted">Alt du har købt, med styr på det praktiske.</p>

      {purchases.length > 0 && (
        <>
          <div className="search-wrap" style={{ marginTop: 16 }}>
            <Icon name="search" size={18} />
            <input
              className="search"
              type="search"
              placeholder="Søg i dine køb og kvitteringer"
              aria-label="Søg i dine køb"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          {inUse.length > 1 && (
            <div className="tabs scroll" role="tablist" aria-label="Filtrér efter kategori">
              {(['alle', ...inUse] as const).map((c) => (
                <button key={c} type="button" role="tab" aria-selected={filter === c} onClick={() => setFilter(c)}>
                  {c === 'alle' ? 'Alle' : categoryLabel[c]}
                </button>
              ))}
            </div>
          )}
        </>
      )}

      {shown.map((p) => (
        <PurchaseRow key={p.id} purchase={p} today={today} noticeDaysBefore={data.profile.noticeDaysBefore} />
      ))}

      {purchases.length === 0 && (
        <EmptyState icon="bag" title="Ingen køb endnu">
          <p>Scan en kvittering eller tilføj et køb, så holder Veya styr på returfrist og reklamationsret.</p>
          <Link to="/scan" className="action">
            <Icon name="scan" /> Scan kvittering
          </Link>
          <Link to="/koeb/ny" className="action secondary">
            Tilføj manuelt
          </Link>
        </EmptyState>
      )}
      {purchases.length > 0 && shown.length === 0 && (
        <EmptyState icon="search" title="Ingen køb matcher">
          <p>Prøv et andet ord eller en anden kategori.</p>
        </EmptyState>
      )}
    </section>
  );
}
