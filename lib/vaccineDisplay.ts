import { i18n, localeTag } from './i18n';
import { parseLocalDate } from './dateUtils';

export const SOON_THRESHOLD_DAYS = 30;

export function daysAway(dueDateStr: string): number {
  const due = parseLocalDate(dueDateStr);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  due.setHours(0, 0, 0, 0);
  return Math.round((due.getTime() - today.getTime()) / 86400000);
}

// Non-reactive: reads i18n.locale directly. Call sites (VaccineCard, report builders)
// re-render / re-run when the language changes, so the string stays current.
export function formatDaysAway(days: number, isOverdue: boolean): string {
  if (isOverdue) {
    const overdueDays = Math.abs(days);
    return overdueDays === 0 ? i18n.t('vaccines.dueToday') : i18n.t('vaccines.daysOverdue', { count: overdueDays });
  }
  if (days === 0) return i18n.t('vaccines.dueToday');
  if (days < 30) return i18n.t('vaccines.daysAway', { count: days });
  const months = Math.round(days / 30);
  return i18n.t('vaccines.monthsAway', { count: months });
}

export function formatDate(dateStr: string): string {
  const d = parseLocalDate(dateStr);
  return d.toLocaleDateString(localeTag(), { month: 'short', day: 'numeric' });
}
