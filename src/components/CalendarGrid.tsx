import { useRef } from 'react';
import { addDaysISO, addMonthsISO, fromISO, monthKey, type ISODate } from '../logic/dates';
import { fmtFull, fmtMonth } from '../logic/format';
import type { PlanItem } from '../logic/plan';
import { Icon } from './Icon';

interface CalendarGridProps {
  month: ISODate; // first day of the shown month
  today: ISODate;
  selected: ISODate;
  items: PlanItem[];
  onSelect: (day: ISODate) => void;
  onMonthChange: (month: ISODate) => void;
}

const weekdays = ['Man', 'Tir', 'Ons', 'Tor', 'Fre', 'Lør', 'Søn'];

/** Month grid (weeks start Monday) with dots for days that have items; swipe or arrows to change month. */
export function CalendarGrid({ month, today, selected, items, onSelect, onMonthChange }: CalendarGridProps) {
  const touchX = useRef<number | null>(null);
  const offset = (fromISO(month).getDay() + 6) % 7;
  const start = addDaysISO(month, -offset);
  const nextMonth = addMonthsISO(month, 1);
  const totalDays = Math.ceil((offset + Math.round((fromISO(nextMonth).getTime() - fromISO(month).getTime()) / 86_400_000)) / 7) * 7;
  const days = Array.from({ length: totalDays }, (_, i) => addDaysISO(start, i));

  const byDay = new Map<ISODate, PlanItem[]>();
  for (const it of items) byDay.set(it.date, [...(byDay.get(it.date) ?? []), it]);

  return (
    <div
      onTouchStart={(e) => (touchX.current = e.touches[0].clientX)}
      onTouchEnd={(e) => {
        if (touchX.current === null) return;
        const dx = e.changedTouches[0].clientX - touchX.current;
        touchX.current = null;
        if (Math.abs(dx) > 50) onMonthChange(addMonthsISO(month, dx < 0 ? 1 : -1));
      }}
    >
      <div className="cal-head">
        <button type="button" className="icon-btn" aria-label="Forrige måned" onClick={() => onMonthChange(addMonthsISO(month, -1))}>
          <Icon name="chevronLeft" />
        </button>
        <b aria-live="polite">{fmtMonth(month)}</b>
        <button type="button" className="icon-btn" aria-label="Næste måned" onClick={() => onMonthChange(nextMonth)}>
          <Icon name="chevron" />
        </button>
      </div>
      <div className="cal-grid" role="grid" aria-label={fmtMonth(month)}>
        {weekdays.map((d) => (
          <div key={d} className="dow" aria-hidden="true">
            {d}
          </div>
        ))}
        {days.map((d) => {
          const dayItems = byDay.get(d) ?? [];
          const other = monthKey(d) !== monthKey(month);
          return (
            <button
              key={d}
              type="button"
              className={`cal-day${other ? ' other' : ''}${d === today ? ' today' : ''}`}
              aria-pressed={d === selected}
              aria-label={`${fmtFull(d)}${dayItems.length ? `, ${dayItems.length} ting` : ''}`}
              onClick={() => onSelect(d)}
            >
              {Number(d.slice(8))}
              <span className="cal-dots" aria-hidden="true">
                {dayItems.slice(0, 3).map((it) => (
                  <i key={it.key} className={it.tone} />
                ))}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
