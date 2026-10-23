import type { Category } from '../db/types';
import { categoryColor, categoryLabel } from '../logic/categories';
import { fmtMonthShort, kr } from '../logic/format';

/** Compact "1,2k" style label for bar values. */
function shortKr(n: number) {
  if (n >= 1000) return `${(n / 1000).toLocaleString('da-DK', { maximumFractionDigits: 1 })}k`;
  return String(Math.round(n));
}

export function BarChart({ series, budget }: { series: { month: string; total: number }[]; budget: number }) {
  const max = Math.max(budget, ...series.map((s) => s.total), 1);
  const budgetPct = (budget / max) * 100;
  return (
    <figure style={{ margin: 0 }} aria-label="Forbrug pr. måned de sidste 6 måneder">
      <div className="chart" style={{ position: 'relative' }}>
        {budget > 0 && (
          <div
            aria-hidden="true"
            style={{
              position: 'absolute',
              left: 0,
              right: 0,
              bottom: `calc(${budgetPct}% * (150 - 18) / 150)`,
              borderTop: '1.5px dashed var(--muted)',
              opacity: 0.45,
            }}
          />
        )}
        {series.map((s, i) => (
          <div key={s.month} className={`bar-col${i === series.length - 1 ? ' now' : ''}`}>
            <span className="bar-value">{s.total ? shortKr(s.total) : ''}</span>
            <div className="bar" style={{ height: `${(s.total / max) * 100}%` }} title={kr(s.total)} />
          </div>
        ))}
      </div>
      <div className="bar-labels" aria-hidden="true">
        {series.map((s, i) => (
          <span key={s.month} className={i === series.length - 1 ? 'now' : ''}>
            {fmtMonthShort(s.month)}
          </span>
        ))}
      </div>
      <figcaption className="sr-only">
        {series.map((s) => `${fmtMonthShort(s.month)}: ${kr(s.total)}`).join(', ')}
      </figcaption>
    </figure>
  );
}

export function Donut({ parts, total }: { parts: { category: Category; amount: number }[]; total: number }) {
  const r = 46;
  const c = 2 * Math.PI * r;
  let offset = 0;
  return (
    <svg width="124" height="124" viewBox="0 0 120 120" role="img" aria-label={`Forbrug i alt ${kr(total)}`} style={{ flex: 'none' }}>
      <circle cx="60" cy="60" r={r} fill="none" stroke="var(--line)" strokeWidth="18" />
      {total > 0 &&
        parts.map((p) => {
          const len = (p.amount / total) * c;
          const el = (
            <circle
              key={p.category}
              cx="60"
              cy="60"
              r={r}
              fill="none"
              stroke={categoryColor[p.category]}
              strokeWidth="18"
              strokeDasharray={`${Math.max(0, len - 1.5)} ${c}`}
              strokeDashoffset={-offset}
              transform="rotate(-90 60 60)"
            >
              <title>
                {categoryLabel[p.category]}: {kr(p.amount)}
              </title>
            </circle>
          );
          offset += len;
          return el;
        })}
      <text x="60" y="57" textAnchor="middle" fontSize="13" fontWeight="700" fill="var(--ink)" fontFamily="var(--font-heading)">
        {kr(Math.round(total))}
      </text>
      <text x="60" y="73" textAnchor="middle" fontSize="9" fill="var(--muted)">
        i alt
      </text>
    </svg>
  );
}
