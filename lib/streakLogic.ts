// Pure streak math, no React/hook dependencies — split out of lib/hooks/useHabitHistory.ts
// (which re-exports it for backward compatibility) so lib/notificationService.ts can use it
// without creating a require cycle: notificationService -> useHabitHistory -> useHabits ->
// notificationService (useHabits.ts calls checkAndCreateWaterGoalNotif). computeStreak has
// no dependency on Habit/getHabitTarget, so it can live somewhere both sides can import.

export function computeStreak(dates: Map<string, number>, target: number, todayStr: string): number {
  const isDone = (dateStr: string) => (dates.get(dateStr) ?? 0) >= target;

  const cursor = new Date(todayStr);
  if (!isDone(todayStr)) {
    cursor.setDate(cursor.getDate() - 1);
    if (!isDone(cursor.toISOString().split('T')[0])) return 0;
  }

  let streak = 0;
  while (isDone(cursor.toISOString().split('T')[0])) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}
