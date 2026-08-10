import { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Alert, StyleSheet } from 'react-native';
import { Dog, DogMood } from '../types';
import { useMoodHistory } from '../lib/hooks/useMoodHistory';
import { colors, radii } from '../lib/theme';

type Props = {
  dog: Dog;
  onBack: () => void;
};

const MOOD_EMOJI: Record<DogMood['mood'], string> = {
  sleepy: '😴',
  off: '😟',
  good: '😊',
  great: '🤩',
  sick: '🤒',
};

const MOOD_LABEL: Record<DogMood['mood'], string> = {
  sleepy: 'Sleepy',
  off: 'Off',
  good: 'Good',
  great: 'Great',
  sick: 'Sick',
};

const DAY_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];
const HISTORY_DAYS = 90;

function toDateStr(y: number, m: number, d: number): string {
  return `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

export default function MoodHistoryScreen({ dog, onBack }: Props) {
  const { historyByDate } = useMoodHistory(dog.id, HISTORY_DAYS);

  const now = new Date();
  const today = now.toISOString().split('T')[0];

  const [selectedDate, setSelectedDate] = useState(today);
  const [viewYear, setViewYear] = useState(now.getFullYear());
  const [viewMonth, setViewMonth] = useState(now.getMonth());

  const isCurrentMonth = viewYear === now.getFullYear() && viewMonth === now.getMonth();
  const oldestAllowed = new Date();
  oldestAllowed.setDate(oldestAllowed.getDate() - HISTORY_DAYS);
  const canGoBack = viewYear > oldestAllowed.getFullYear() ||
    (viewYear === oldestAllowed.getFullYear() && viewMonth > oldestAllowed.getMonth());

  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const daysInPrevMonth = new Date(viewYear, viewMonth, 0).getDate();
  const firstWeekday = new Date(viewYear, viewMonth, 1).getDay();

  type Cell = { dateStr: string; dayNum: number; inMonth: boolean };
  const cells: Cell[] = [];
  for (let i = firstWeekday - 1; i >= 0; i--) {
    const d = daysInPrevMonth - i;
    const m = viewMonth === 0 ? 11 : viewMonth - 1;
    const y = viewMonth === 0 ? viewYear - 1 : viewYear;
    cells.push({ dateStr: toDateStr(y, m, d), dayNum: d, inMonth: false });
  }
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({ dateStr: toDateStr(viewYear, viewMonth, d), dayNum: d, inMonth: true });
  }
  let nextDay = 1;
  while (cells.length % 7 !== 0) {
    const m = viewMonth === 11 ? 0 : viewMonth + 1;
    const y = viewMonth === 11 ? viewYear + 1 : viewYear;
    cells.push({ dateStr: toDateStr(y, m, nextDay), dayNum: nextDay, inMonth: false });
    nextDay++;
  }

  const selectedMood = historyByDate.get(selectedDate);
  const selectedLabel = (() => {
    const d = new Date(selectedDate);
    const formatted = d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    return selectedDate === today ? `${formatted} · Today` : formatted;
  })();

  let monthLoggedCount = 0;
  let monthElapsedDays = 0;
  const monthMoodCounts = new Map<DogMood['mood'], number>();
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = toDateStr(viewYear, viewMonth, d);
    if (dateStr > today) continue;
    monthElapsedDays += 1;
    const mood = historyByDate.get(dateStr);
    if (mood) {
      monthLoggedCount += 1;
      monthMoodCounts.set(mood, (monthMoodCounts.get(mood) ?? 0) + 1);
    }
  }
  let mostCommonMood: DogMood['mood'] | null = null;
  let mostCommonCount = 0;
  for (const [mood, count] of monthMoodCounts) {
    if (count > mostCommonCount) { mostCommonMood = mood; mostCommonCount = count; }
  }

  let loggingStreak = 0;
  const cursor = new Date(now);
  while (true) {
    const dateStr = cursor.toISOString().split('T')[0];
    if (!historyByDate.get(dateStr)) break;
    loggingStreak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }

  const hasAnyHistory = historyByDate.size > 0;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <TouchableOpacity onPress={onBack} style={styles.backRow}>
        <Text style={styles.backText}>‹ Back</Text>
      </TouchableOpacity>

      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.headerDogName}>{dog.name}</Text>
          <Text style={styles.title}>Mood History</Text>
        </View>
        <TouchableOpacity
          style={styles.downloadBtn}
          onPress={() => Alert.alert('Export', 'Coming soon!')}
        >
          <Text style={styles.downloadIcon}>⬇</Text>
        </TouchableOpacity>
      </View>

      {!hasAnyHistory ? (
        <Text style={styles.gentleCopy}>
          No moods logged yet — check in on {dog.name} from their profile.
        </Text>
      ) : null}

      <View style={styles.calendarCard}>
        <View style={styles.monthNav}>
          <TouchableOpacity
            onPress={() => {
              if (viewMonth === 0) { setViewYear(y => y - 1); setViewMonth(11); }
              else setViewMonth(m => m - 1);
            }}
            disabled={!canGoBack}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text style={[styles.monthNavArrow, !canGoBack && styles.monthNavArrowDisabled]}>‹</Text>
          </TouchableOpacity>
          <Text style={styles.monthLabel}>{MONTH_NAMES[viewMonth]} {viewYear}</Text>
          <TouchableOpacity
            onPress={() => {
              if (viewMonth === 11) { setViewYear(y => y + 1); setViewMonth(0); }
              else setViewMonth(m => m + 1);
            }}
            disabled={isCurrentMonth}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text style={[styles.monthNavArrow, isCurrentMonth && styles.monthNavArrowDisabled]}>›</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.weekdayRow}>
          {DAY_LABELS.map((label, i) => (
            <Text key={i} style={styles.weekdayLabel}>{label}</Text>
          ))}
        </View>

        <View style={styles.grid}>
          {cells.map((cell, i) => {
            const isFuture = cell.dateStr > today;
            const disabled = !cell.inMonth || isFuture;
            const mood = cell.inMonth ? historyByDate.get(cell.dateStr) : undefined;
            const isSelected = cell.dateStr === selectedDate;
            const isToday = cell.dateStr === today;

            return (
              <View key={i} style={styles.cell}>
                <TouchableOpacity
                  style={[
                    styles.dayCell,
                    mood && styles.dayCellLogged,
                    isSelected && styles.dayCellSelected,
                    disabled && styles.dayCellDisabled,
                  ]}
                  disabled={disabled}
                  onPress={() => setSelectedDate(cell.dateStr)}
                >
                  {mood ? (
                    <Text style={styles.dayMoodEmoji}>{MOOD_EMOJI[mood]}</Text>
                  ) : (
                    <Text style={[styles.dayNumber, disabled && styles.dayNumberDisabled]}>{cell.dayNum}</Text>
                  )}
                  {isToday ? <View style={styles.todayDot} /> : null}
                </TouchableOpacity>
              </View>
            );
          })}
        </View>
      </View>

      <Text style={styles.sectionLabel}>{selectedLabel}</Text>
      <View style={styles.cardFlat}>
        {selectedMood ? (
          <View style={styles.entryRow}>
            <Text style={styles.entryEmoji}>{MOOD_EMOJI[selectedMood]}</Text>
            <Text style={styles.entryName}>{MOOD_LABEL[selectedMood]}</Text>
          </View>
        ) : (
          <Text style={styles.emptyDayText}>No mood logged this day</Text>
        )}
      </View>

      <Text style={[styles.sectionLabel, styles.monthStatsLabel]}>This month</Text>
      <View style={styles.statStrip}>
        <View style={styles.statBox}>
          <Text style={styles.statNum}>{monthLoggedCount}/{monthElapsedDays}</Text>
          <Text style={styles.statLabel}>days logged</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={[styles.statNum, styles.statNumGreen]}>
            {mostCommonMood ? `${MOOD_EMOJI[mostCommonMood]} ${MOOD_LABEL[mostCommonMood]}` : '—'}
          </Text>
          <Text style={styles.statLabel}>most common</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statNum}>{loggingStreak > 0 ? `🔥${loggingStreak}` : '🌱'}</Text>
          <Text style={styles.statLabel}>day streak</Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: 16,
    paddingTop: 20,
  },
  backRow: {
    marginBottom: 16,
  },
  backText: {
    color: colors.primaryGreen,
    fontSize: 16,
    fontWeight: '600',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  headerLeft: {
    flex: 1,
    minWidth: 0,
  },
  headerDogName: {
    fontSize: 12,
    color: colors.textMuted,
    marginBottom: 1,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.textDark,
  },
  downloadBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: colors.moodSelectedBg,
    borderWidth: 0.5,
    borderColor: colors.moodSelectedBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  downloadIcon: {
    fontSize: 15,
  },
  gentleCopy: {
    fontSize: 13,
    color: colors.textMuted,
    textAlign: 'center',
    marginBottom: 16,
    fontStyle: 'italic',
  },
  calendarCard: {
    backgroundColor: colors.card,
    borderRadius: radii.card,
    borderWidth: 0.5,
    borderColor: colors.cardBorder,
    padding: 14,
    marginBottom: 12,
  },
  monthNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  monthNavArrow: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.primaryGreen,
    paddingHorizontal: 8,
  },
  monthNavArrowDisabled: {
    color: colors.cardBorder,
  },
  monthLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textDark,
  },
  weekdayRow: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  weekdayLabel: {
    flex: 1,
    textAlign: 'center',
    fontSize: 11,
    color: colors.textMuted,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  cell: {
    width: `${100 / 7}%`,
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 2,
  },
  dayCell: {
    width: '100%',
    height: '100%',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayCellLogged: {
    backgroundColor: colors.moodSelectedBg,
  },
  dayCellSelected: {
    borderWidth: 1.5,
    borderColor: colors.moodSelectedBorder,
  },
  dayCellDisabled: {
    opacity: 0.35,
  },
  dayMoodEmoji: {
    fontSize: 14,
  },
  dayNumber: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.textDark,
  },
  dayNumberDisabled: {
    color: colors.textMuted,
  },
  todayDot: {
    position: 'absolute',
    bottom: 3,
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.primaryGreen,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  monthStatsLabel: {
    marginTop: 20,
  },
  cardFlat: {
    backgroundColor: colors.card,
    borderRadius: radii.card,
    borderWidth: 0.5,
    borderColor: colors.cardBorder,
    padding: 12,
  },
  emptyDayText: {
    textAlign: 'center',
    fontSize: 13,
    color: colors.textMuted,
    paddingVertical: 8,
  },
  entryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 4,
  },
  entryEmoji: {
    fontSize: 22,
  },
  entryName: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.textDark,
  },
  statStrip: {
    flexDirection: 'row',
    gap: 8,
  },
  statBox: {
    flex: 1,
    backgroundColor: colors.card,
    borderWidth: 0.5,
    borderColor: colors.cardBorder,
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: 'center',
  },
  statNum: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.textDark,
  },
  statNumGreen: {
    color: colors.primaryGreen,
    fontSize: 13,
  },
  statLabel: {
    fontSize: 10,
    color: colors.textMuted,
    marginTop: 2,
  },
});
