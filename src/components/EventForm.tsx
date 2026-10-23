import { useState, type FormEvent } from 'react';
import type { PlanEvent } from '../db/types';
import { Icon } from './Icon';

interface EventFormProps {
  initial?: PlanEvent;
  defaultDate: string;
  onSave: (input: Omit<PlanEvent, 'id'>) => void;
  onDelete?: () => void;
}

export function EventForm({ initial, defaultDate, onSave, onDelete }: EventFormProps) {
  const [title, setTitle] = useState(initial?.title ?? '');
  const [date, setDate] = useState(initial?.date ?? defaultDate);
  const [time, setTime] = useState(initial?.time?.replace('.', ':') ?? '');
  const [place, setPlace] = useState(initial?.place ?? '');
  const valid = title.trim() && /^\d{4}-\d{2}-\d{2}$/.test(date);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!valid) return;
    onSave({ title: title.trim(), date, time: time ? time.replace(':', '.') : undefined, place: place.trim() || undefined });
  };

  return (
    <form className="form" onSubmit={submit} noValidate>
      <label className="field">
        <span>Hvad skal du?</span>
        <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Fx Studiegruppe" required />
      </label>
      <div className="field-row">
        <label className="field">
          <span>Dato</span>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
        </label>
        <label className="field">
          <span>Tidspunkt (valgfrit)</span>
          <input type="time" value={time} onChange={(e) => setTime(e.target.value)} />
        </label>
      </div>
      <label className="field">
        <span>Sted (valgfrit)</span>
        <input value={place} onChange={(e) => setPlace(e.target.value)} placeholder="Fx CBS Bibliotek" />
      </label>
      <button type="submit" className="action" disabled={!valid}>
        Gem begivenhed
      </button>
      {onDelete && (
        <button type="button" className="action ghost" onClick={onDelete}>
          <Icon name="trash" size={18} /> Slet begivenhed
        </button>
      )}
    </form>
  );
}
