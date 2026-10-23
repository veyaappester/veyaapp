import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { CalendarGrid } from '../components/CalendarGrid';
import { EmptyState } from '../components/EmptyState';
import { EventForm } from '../components/EventForm';
import { Icon } from '../components/Icon';
import { Modal } from '../components/Modal';
import { useToast } from '../components/toastContext';
import { TopBar } from '../components/TopBar';
import { downloadBlob } from '../db/backup';
import { deleteEvent, saveEvent } from '../db/events';
import { useAppData, useToday } from '../db/hooks';
import type { AppData, PlanEvent } from '../db/types';
import { addDaysISO, addMonthsISO, daysBetween, monthKey, startOfMonthISO } from '../logic/dates';
import { capitalize, fmtDate, fmtLong, fmtMonth, fmtShort, kr } from '../logic/format';
import { buildIcs } from '../logic/ics';
import { planItems, timelineItems, type PlanItem } from '../logic/plan';

export default function Plan() {
  const data = useAppData();
  const today = useToday();
  const toast = useToast();
  const [params, setParams] = useSearchParams();
  const view = params.get('vis') === 'kalender' ? 'calendar' : 'timeline';
  const [horizon, setHorizon] = useState(60);
  const [month, setMonth] = useState(startOfMonthISO(today));
  const [selected, setSelected] = useState(today);
  const [editing, setEditing] = useState<PlanEvent | 'new' | null>(null);

  if (!data) return null;

  const setView = (v: 'timeline' | 'calendar') => setParams(v === 'calendar' ? { vis: 'kalender' } : {}, { replace: true });

  const exportIcs = () => {
    const items = planItems(data, today, today, addDaysISO(today, 365));
    downloadBlob(new Blob([buildIcs(items)], { type: 'text/calendar;charset=utf-8' }), 'veya-frister.ics');
    toast(`${items.length} frister og begivenheder er eksporteret.`);
  };

  return (
    <section className="page">
      <TopBar
        right={
          <button type="button" className="icon-btn" aria-label="Tilføj begivenhed" onClick={() => setEditing('new')}>
            <Icon name="plus" />
          </button>
        }
      />
      <h1>Plan</h1>
      <p className="muted">Dit liv — samlet ét sted.</p>

      <div className="tabs" role="tablist" aria-label="Visning">
        <button type="button" role="tab" aria-selected={view === 'timeline'} onClick={() => setView('timeline')}>
          Tidslinje
        </button>
        <button type="button" role="tab" aria-selected={view === 'calendar'} onClick={() => setView('calendar')}>
          Kalender
        </button>
      </div>

      {view === 'timeline' ? (
        <Timeline
          items={timelineItems(data, today, horizon)}
          today={today}
          onEvent={(id) => setEditing(data.events.find((e) => e.id === id) ?? null)}
          onMore={() => setHorizon((h) => h + 60)}
          horizon={horizon}
        />
      ) : (
        <CalendarView
          data={data}
          today={today}
          month={month}
          selected={selected}
          onMonth={(m) => setMonth(m)}
          onSelect={(d) => {
            setSelected(d);
            if (monthKey(d) !== monthKey(month)) setMonth(startOfMonthISO(d));
          }}
          onEvent={(id) => setEditing(data.events.find((e) => e.id === id) ?? null)}
        />
      )}

      <button type="button" className="action secondary" onClick={() => setEditing('new')} style={{ marginTop: 14 }}>
        <Icon name="plus" size={18} /> Tilføj begivenhed
      </button>

      <AlsoWatching data={data} today={today} />

      <button type="button" className="action ghost" onClick={exportIcs} style={{ marginTop: 16 }}>
        <Icon name="download" size={18} /> Eksportér til kalender (.ics)
      </button>

      <Modal open={editing !== null} onClose={() => setEditing(null)} title={editing === 'new' ? 'Ny begivenhed' : 'Redigér begivenhed'}>
        {editing !== null && (
          <EventForm
            key={editing === 'new' ? 'new' : editing.id}
            initial={editing === 'new' ? undefined : editing}
            defaultDate={view === 'calendar' && selected >= today ? selected : today}
            onSave={async (input) => {
              await saveEvent(input, editing === 'new' ? undefined : editing.id);
              setEditing(null);
              toast('Begivenheden er gemt i din plan.');
            }}
            onDelete={
              editing === 'new'
                ? undefined
                : async () => {
                    await deleteEvent(editing.id);
                    setEditing(null);
                    toast('Begivenheden er slettet.');
                  }
            }
          />
        )}
      </Modal>
    </section>
  );
}

function dateLabel(date: string, today: string) {
  const days = daysBetween(today, date);
  if (days < 0) return `Forfaldet · ${fmtShort(date)}`;
  if (days === 0) return `I dag · ${fmtShort(date)}`;
  if (days === 1) return `I morgen · ${fmtShort(date)}`;
  if (days < 7) return `${capitalize(fmtLong(date).split(' ')[0])} · ${fmtShort(date)}`;
  return fmtLong(date).split(' ').slice(1).join(' ');
}

function ItemContent({ it, today }: { it: PlanItem; today: string }) {
  return (
    <>
      <div className="date">{dateLabel(it.date, today)}</div>
      <b>{it.title}</b>
      <span>{it.subtitle}</span>
    </>
  );
}

function Timeline({
  items,
  today,
  onEvent,
  onMore,
  horizon,
}: {
  items: PlanItem[];
  today: string;
  onEvent: (id: string) => void;
  onMore: () => void;
  horizon: number;
}) {
  if (!items.length) {
    return (
      <EmptyState icon="calendar" title="Intet de næste måneder">
        <p>Returfrister, fornyelser, regninger og dine egne begivenheder dukker op her automatisk.</p>
      </EmptyState>
    );
  }
  const groups = new Map<string, PlanItem[]>();
  for (const it of items) {
    const key = it.date < today ? 'overdue' : monthKey(it.date);
    groups.set(key, [...(groups.get(key) ?? []), it]);
  }
  return (
    <>
      {[...groups.entries()].map(([key, list]) => (
        <div key={key}>
          <h2>{key === 'overdue' ? 'Forfaldet' : capitalize(fmtMonth(`${key}-01`))}</h2>
          <div className="timeline">
            {list.map((it) =>
              it.eventId ? (
                <button
                  key={it.key}
                  type="button"
                  className={`event ${it.tone}`}
                  onClick={() => onEvent(it.eventId!)}
                  style={{ background: 'none', border: 0, padding: '0 0 20px', textAlign: 'left', width: '100%' }}
                >
                  <ItemContent it={it} today={today} />
                </button>
              ) : (
                <Link key={it.key} to={it.link ?? '/plan'} className={`event ${it.tone}`}>
                  <ItemContent it={it} today={today} />
                </Link>
              ),
            )}
          </div>
        </div>
      ))}
      <button type="button" className="link" onClick={onMore}>
        Vis mere (efter {fmtDate(addDaysISO(today, horizon))})
      </button>
    </>
  );
}

function CalendarView({
  data,
  today,
  month,
  selected,
  onMonth,
  onSelect,
  onEvent,
}: {
  data: AppData;
  today: string;
  month: string;
  selected: string;
  onMonth: (m: string) => void;
  onSelect: (d: string) => void;
  onEvent: (id: string) => void;
}) {
  // Include the visible days of neighbouring months.
  const items = planItems(data, today, addDaysISO(month, -7), addDaysISO(addMonthsISO(month, 1), 7), false);
  const dayItems = items.filter((i) => i.date === selected);
  const upcoming = items.filter((i) => i.date > selected && monthKey(i.date) === monthKey(month)).slice(0, 4);

  return (
    <>
      <div className="info" style={{ padding: '10px 4px 12px' }}>
        <CalendarGrid month={month} today={today} selected={selected} items={items} onSelect={onSelect} onMonthChange={onMonth} />
      </div>
      <h2>
        {selected === today ? `I dag · ${fmtLong(selected)}` : capitalize(fmtLong(selected))}
      </h2>
      {dayItems.length ? (
        dayItems.map((it) => <PlanRow key={it.key} it={it} onEvent={onEvent} />)
      ) : (
        <p className="muted">Ingen frister eller begivenheder denne dag.</p>
      )}
      {upcoming.length > 0 && (
        <>
          <h2>Kommende</h2>
          {upcoming.map((it) => (
            <PlanRow key={it.key} it={it} onEvent={onEvent} showDate />
          ))}
        </>
      )}
    </>
  );
}

function PlanRow({ it, onEvent, showDate }: { it: PlanItem; onEvent: (id: string) => void; showDate?: boolean }) {
  const bg = it.tone === 'warn' ? 'var(--warn-icon)' : it.tone === 'danger' ? 'var(--danger-icon)' : undefined;
  const color = it.tone === 'warn' ? 'var(--warn-text)' : it.tone === 'danger' ? 'var(--danger-text)' : undefined;
  const content = (
    <>
      <div className="row-icon" style={{ background: bg, color }}>
        <Icon name={it.icon} />
      </div>
      <div className="row-main">
        <b>{it.title}</b>
        <span>{showDate ? `${capitalize(fmtLong(it.date))} · ${it.subtitle}` : it.subtitle}</span>
      </div>
    </>
  );
  return it.eventId ? (
    <button type="button" className="row" onClick={() => onEvent(it.eventId!)}>
      {content}
    </button>
  ) : (
    <Link to={it.link ?? '/plan'} className="row">
      {content}
    </Link>
  );
}

function AlsoWatching({ data, today }: { data: AppData; today: string }) {
  const nextComplaint = data.purchases
    .filter((p) => p.status !== 'returned' && p.complaintUntil >= today)
    .sort((a, b) => a.complaintUntil.localeCompare(b.complaintUntil))[0];
  const nextBill = data.bills.filter((b) => !b.paid).sort((a, b) => a.dueDate.localeCompare(b.dueDate))[0];
  return (
    <>
      <div className="section-head">
        <h2>Veya holder også styr på</h2>
        <Link to="/regninger" className="link">
          Regninger
        </Link>
      </div>
      <div className="cards">
        {nextComplaint ? (
          <Link to={`/koeb/${nextComplaint.id}`} className="mini">
            <div className="label">Næste garantiudløb</div>
            <strong>{fmtDate(nextComplaint.complaintUntil)}</strong>
            <span className="muted">{nextComplaint.product}</span>
          </Link>
        ) : (
          <Link to="/koeb" className="mini">
            <div className="label">Næste garantiudløb</div>
            <strong>Ingen endnu</strong>
            <span className="muted">Kommer, når du gemmer køb</span>
          </Link>
        )}
        <Link to="/regninger" className="mini">
          <div className="label">Næste regning</div>
          <strong>{nextBill ? kr(nextBill.amount) : 'Ingen'}</strong>
          <span className="muted">{nextBill ? `${nextBill.name} · ${fmtShort(nextBill.dueDate)}` : 'Tilføj husleje, el m.m.'}</span>
        </Link>
      </div>
    </>
  );
}
