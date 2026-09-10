import { localeTag } from './index';

/** Localized "September 2026" style label for a calendar month header. */
export function monthYearLabel(year: number, month: number): string {
  return new Date(year, month, 1).toLocaleDateString(localeTag(), { month: 'long', year: 'numeric' });
}

/** Localized full month name, e.g. "September". */
export function monthName(month: number): string {
  return new Date(2020, month, 1).toLocaleDateString(localeTag(), { month: 'long' });
}

/** Seven single-letter weekday labels, Sunday-first (matches this app's calendars). */
export function weekdayLetters(): string[] {
  const fmt = new Intl.DateTimeFormat(localeTag(), { weekday: 'narrow' });
  // 2023-01-01 was a Sunday.
  return Array.from({ length: 7 }, (_, i) => fmt.format(new Date(2023, 0, 1 + i)));
}

/** Localized "Mon", "Tue" style short weekday for a date string. */
export function weekdayShort(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString(localeTag(), { weekday: 'short' });
}

/** Localized "Sep 3, 2026" style long date. */
export function longDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString(localeTag(), { month: 'short', day: 'numeric', year: 'numeric' });
}

/** Localized "Sep 3" style short date. */
export function shortDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString(localeTag(), { month: 'short', day: 'numeric' });
}

/** Seven short weekday labels, Monday-first. */
export function weekdayShortMonFirst(): string[] {
  const fmt = new Intl.DateTimeFormat(localeTag(), { weekday: 'short' });
  // 2023-01-02 was a Monday.
  return Array.from({ length: 7 }, (_, i) => fmt.format(new Date(2023, 0, 2 + i)));
}

/** Localized "Sep 3" style time-of-day, e.g. "2:05 PM". */
export function timeOfDay(iso: string): string {
  return new Date(iso).toLocaleTimeString(localeTag(), { hour: 'numeric', minute: '2-digit' });
}
