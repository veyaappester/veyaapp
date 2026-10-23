import { addDaysISO, type ISODate } from './dates';
import type { PlanItem } from './plan';

function escape(text: string): string {
  return text.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n');
}

/** Folds lines longer than 75 octets, as RFC 5545 requires. */
function fold(line: string): string {
  const out: string[] = [];
  let rest = line;
  while (new TextEncoder().encode(rest).length > 75) {
    let cut = 74;
    while (new TextEncoder().encode(rest.slice(0, cut)).length > 74) cut--;
    out.push(rest.slice(0, cut));
    rest = ' ' + rest.slice(cut);
  }
  out.push(rest);
  return out.join('\r\n');
}

const compact = (iso: ISODate) => iso.replace(/-/g, '');

/** Builds an .ics calendar with all deadlines and events (all-day unless a time is set). */
export function buildIcs(items: PlanItem[], stamp = new Date()): string {
  const dtstamp = stamp.toISOString().replace(/[-:]/g, '').replace(/\.\d+Z$/, 'Z');
  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Veya//Dit liv. Et overblik.//DA', 'CALSCALE:GREGORIAN', 'X-WR-CALNAME:Veya'];
  for (const it of items) {
    lines.push('BEGIN:VEVENT', `UID:${it.key.replace(/[^\w:-]/g, '')}-${compact(it.date)}@veya`, `DTSTAMP:${dtstamp}`);
    const time = it.time?.match(/^(\d{1,2})[.:](\d{2})$/);
    if (time) {
      const hh = time[1].padStart(2, '0');
      lines.push(`DTSTART:${compact(it.date)}T${hh}${time[2]}00`, `DURATION:PT1H`);
    } else {
      lines.push(`DTSTART;VALUE=DATE:${compact(it.date)}`, `DTEND;VALUE=DATE:${compact(addDaysISO(it.date, 1))}`);
    }
    lines.push(`SUMMARY:${escape(it.title)}`, `DESCRIPTION:${escape(it.subtitle)}`, 'END:VEVENT');
  }
  lines.push('END:VCALENDAR');
  return lines.map(fold).join('\r\n') + '\r\n';
}
