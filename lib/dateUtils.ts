/**
 * Local-timezone YYYY-MM-DD date formatting and parsing helpers.
 * Never use `new Date().toISOString().split('T')[0]` for local calendar dates —
 * `.toISOString()` converts to UTC first, which shifts the date backward or
 * forward depending on the user's local timezone and time of day.
 */

export function toLocalDateString(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function localDateDaysAgo(days: number, from: Date = new Date()): string {
  const d = new Date(from);
  d.setDate(d.getDate() - days);
  return toLocalDateString(d);
}

export function parseLocalDate(dateStr: string): Date {
  const [y, m, day] = dateStr.slice(0, 10).split('-').map(Number);
  return new Date(y, m - 1, day);
}

export function isoToLocalDateString(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso.slice(0, 10);
  return toLocalDateString(d);
}

export function getStartOfWeekDateString(d: Date = new Date()): string {
  const date = new Date(d);
  const day = date.getDay(); // 0 is Sun, 1 is Mon...
  const diff = (day === 0 ? -6 : 1) - day; // Monday as day 1
  date.setDate(date.getDate() + diff);
  return toLocalDateString(date);
}

export function getEndOfWeekDateString(d: Date = new Date()): string {
  const date = new Date(d);
  const day = date.getDay();
  const diff = (day === 0 ? 0 : 7 - day); // Sunday as day 7
  date.setDate(date.getDate() + diff);
  return toLocalDateString(date);
}
