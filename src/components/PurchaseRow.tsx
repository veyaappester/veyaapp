import { Link } from 'react-router-dom';
import type { Purchase } from '../db/types';
import { purchaseHint } from '../logic/deadlines';
import { fmtDate, kr } from '../logic/format';
import { CategoryIcon } from './CategoryIcon';

interface PurchaseRowProps {
  purchase: Purchase;
  today: string;
  noticeDaysBefore: number;
}

export function PurchaseRow({ purchase: p, today, noticeDaysBefore }: PurchaseRowProps) {
  const hint = purchaseHint(p, today, noticeDaysBefore);
  return (
    <Link to={`/koeb/${p.id}`} className="row">
      <CategoryIcon category={p.category} />
      <div className="row-main">
        <b>{p.product}</b>
        <span>
          {p.store} · {fmtDate(p.date)}
        </span>
      </div>
      <div className="row-end">
        <span style={p.status === 'returned' ? { textDecoration: 'line-through', color: 'var(--muted)' } : undefined}>
          {kr(p.price)}
        </span>
        <small className={hint.tone === 'muted' ? '' : hint.tone}>{hint.text}</small>
      </div>
    </Link>
  );
}
