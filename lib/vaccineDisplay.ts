export const SOON_THRESHOLD_DAYS = 30;

export function daysAway(dueDateStr: string): number {
  const due = new Date(dueDateStr);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  due.setHours(0, 0, 0, 0);
  return Math.round((due.getTime() - today.getTime()) / 86400000);
}

export function formatDaysAway(days: number, isOverdue: boolean): string {
  if (isOverdue) {
    const overdueDays = Math.abs(days);
    return overdueDays === 0 ? 'Due today' : `${overdueDays} day${overdueDays === 1 ? '' : 's'} overdue`;
  }
  if (days === 0) return 'Due today';
  if (days < 30) return `${days} day${days === 1 ? '' : 's'}`;
  const months = Math.round(days / 30);
  return `${months} month${months === 1 ? '' : 's'}`;
}

export function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}
