import { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
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
  const [viewYear, setViewYear] = useState(now.getFullYear());
  const [viewMonth, setViewMonth] = useState(now.getMonth());

  const today = now.toISOString().split('T')[0];

  const isCurrentMonth = viewYear === now.getFullYear() && viewMonth === now.getMonth();
  const oldestAllowed = new Date();
  oldestAllowed.setDate(oldestAllowed.getDate() - HISTORY_DAYS);
  const canGoBack = viewYear > oldestAllowed.getFullYear() ||
    (viewYear === oldestAllowed.getFullYear() && viewMonth > oldestAllowed.getMonth());

  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const firstWeekday = new Date(viewYear, viewMonth, 1).getDay();

  const cells: (number | null)[] = [];
  for (let i = 0; i < firstWeekday; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <TouchableOpacity onPress={onBack} style={styles.backRow}>
        <Text style={styles.backText}>‹ Back</Text>
      </TouchableOpacity>

      <View style={styles.header}>
        <Text style={styles.icon}>🐾</Text>
        <Text style={styles.title}>Mood history</Text>
        <Text style={styles.subtitle}>{dog.name}</Text>
      </View>

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
          {cells.map((d, i) => {
            if (d === null) return <View key={i} style={styles.cell} />;
            const dateStr = toDateStr(viewYear, viewMonth, d);
            const isFuture = dateStr > today;
            const mood = historyByDate.get(dateStr);
            return (
              <View key={i} style={styles.cell}>
                <View style={[styles.dayCell, mood && styles.dayCellLogged, isFuture && styles.dayCellDisabled]}>
                  {mood ? (
                    <Text style={styles.dayMoodEmoji}>{MOOD_EMOJI[mood]}</Text>
                  ) : (
                    <Text style={[styles.dayNumber, isFuture && styles.dayNumberDisabled]}>{d}</Text>
                  )}
                </View>
              </View>
            );
          })}
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
    padding: 24,
    paddingTop: 60,
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
    alignItems: 'center',
    marginBottom: 20,
  },
  icon: {
    fontSize: 32,
    marginBottom: 6,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.textDark,
  },
  subtitle: {
    fontSize: 13,
    color: colors.textMuted,
    marginTop: 2,
  },
  calendarCard: {
    backgroundColor: colors.card,
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    padding: 14,
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
    color: colors.textDark,
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
    borderWidth: 1,
    borderColor: colors.notStartedBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayCellLogged: {
    backgroundColor: colors.moodSelectedBg,
    borderColor: colors.moodSelectedBorder,
  },
  dayCellDisabled: {
    borderColor: 'transparent',
  },
  dayMoodEmoji: {
    fontSize: 14,
  },
  dayNumber: {
    fontSize: 12,
    color: colors.textDark,
  },
  dayNumberDisabled: {
    color: colors.cardBorder,
  },
});
