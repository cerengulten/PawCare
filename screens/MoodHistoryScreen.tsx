import { useMemo, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { Dog, DogMood } from '../types';
import { useMoodHistory } from '../lib/hooks/useMoodHistory';
import { useTheme } from '../lib/ThemeContext';
import { useT } from '../lib/LanguageContext';
import { monthYearLabel, weekdayLetters, shortDate } from '../lib/i18n/calendar';
import { ThemeTokens } from '../lib/themes';
// MOOD_COLOR below always uses the fixed sage_clay-derived report palette (see
// lib/reportTheme.ts), not the active in-app theme — it's exported for lib/reportBuilders.ts's
// PDF report use, which stays fixed regardless of live theme, even though this screen no
// longer builds its own report here (export moved to the More tab, see CLAUDE.md).
import { colors as reportColors } from '../lib/reportTheme';
import SwipeBackWrapper from '../components/SwipeBackWrapper';

type Props = {
  dog: Dog;
  onBack: () => void;
};

export const MOOD_EMOJI: Record<DogMood['mood'], string> = {
  sleepy: '😴',
  off: '😟',
  good: '😊',
  great: '🤩',
  sick: '🤒',
};

export const MOOD_LABEL: Record<DogMood['mood'], string> = {
  sleepy: 'Sleepy',
  off: 'Off',
  good: 'Good',
  great: 'Great',
  sick: 'Sick',
};

export const MOOD_COLOR: Record<DogMood['mood'], string> = {
  good: reportColors.primaryGreen,
  great: reportColors.communityBlueText,
  sleepy: reportColors.communityBlueText,
  off: reportColors.pendingAmberText,
  sick: reportColors.allergenText,
};

const HISTORY_DAYS = 90;

function toDateStr(y: number, m: number, d: number): string {
  return `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

export function formatLongDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export function formatWeekday(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', { weekday: 'long' });
}

export default function MoodHistoryScreen({ dog, onBack }: Props) {
  const { theme } = useTheme();
  const { t } = useT();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const DAY_LABELS = weekdayLetters();
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
    const formatted = shortDate(selectedDate);
    return selectedDate === today ? `${formatted} · ${t('moodHistory.today')}` : formatted;
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
    <SwipeBackWrapper onBack={onBack}>
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <TouchableOpacity onPress={onBack} style={styles.backRow}>
        <Text style={styles.backText}>‹ {t('common.back')}</Text>
      </TouchableOpacity>

      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.headerDogName}>{dog.name}</Text>
          <Text style={styles.title}>{t('moodHistory.title')}</Text>
        </View>
      </View>

      {!hasAnyHistory ? (
        <Text style={styles.gentleCopy}>
          {t('moodHistory.noneYet', { name: dog.name })}
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
          <Text style={styles.monthLabel}>{monthYearLabel(viewYear, viewMonth)}</Text>
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
            <Text style={styles.entryName}>{t('mood.' + selectedMood)}</Text>
          </View>
        ) : (
          <Text style={styles.emptyDayText}>{t('moodHistory.noMoodThisDay')}</Text>
        )}
      </View>

      <Text style={[styles.sectionLabel, styles.monthStatsLabel]}>{t('moodHistory.thisMonth')}</Text>
      <View style={styles.statStrip}>
        <View style={styles.statBox}>
          <Text style={styles.statNum}>{monthLoggedCount}/{monthElapsedDays}</Text>
          <Text style={styles.statLabel}>{t('moodHistory.daysLogged')}</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={[styles.statNum, styles.statNumGreen]}>
            {mostCommonMood ? `${MOOD_EMOJI[mostCommonMood]} ${t('mood.' + mostCommonMood)}` : '—'}
          </Text>
          <Text style={styles.statLabel}>{t('moodHistory.mostCommon')}</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statNum}>{loggingStreak > 0 ? `🔥${loggingStreak}` : '🌱'}</Text>
          <Text style={styles.statLabel}>{t('moodHistory.dayStreak')}</Text>
        </View>
      </View>
    </ScrollView>
    </SwipeBackWrapper>
  );
}

function makeStyles(theme: ThemeTokens) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.background,
    },
    content: {
      padding: 16,
      paddingTop: 20,
    },
    backRow: {
      marginBottom: 16,
    },
    backText: {
      color: theme.primary,
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
      color: theme.textMuted,
      marginBottom: 1,
    },
    title: {
      fontSize: 20,
      fontWeight: '600',
      color: theme.textDark,
    },
    gentleCopy: {
      fontSize: 13,
      color: theme.textMuted,
      textAlign: 'center',
      marginBottom: 16,
      fontStyle: 'italic',
    },
    calendarCard: {
      backgroundColor: theme.surface,
      borderRadius: theme.radiiCard,
      borderWidth: 0.5,
      borderColor: theme.border,
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
      color: theme.primary,
      paddingHorizontal: 8,
    },
    monthNavArrowDisabled: {
      color: theme.border,
    },
    monthLabel: {
      fontSize: 15,
      fontWeight: '700',
      color: theme.textDark,
    },
    weekdayRow: {
      flexDirection: 'row',
      marginBottom: 4,
    },
    weekdayLabel: {
      flex: 1,
      textAlign: 'center',
      fontSize: 11,
      color: theme.textMuted,
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
      backgroundColor: theme.moodSelBg,
    },
    dayCellSelected: {
      borderWidth: 1.5,
      borderColor: theme.moodSelBorder,
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
      color: theme.textDark,
    },
    dayNumberDisabled: {
      color: theme.textMuted,
    },
    todayDot: {
      position: 'absolute',
      bottom: 3,
      width: 4,
      height: 4,
      borderRadius: 2,
      backgroundColor: theme.primary,
    },
    sectionLabel: {
      fontSize: 11,
      fontWeight: '600',
      color: theme.textMuted,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
      marginBottom: 8,
    },
    monthStatsLabel: {
      marginTop: 20,
    },
    cardFlat: {
      backgroundColor: theme.surface,
      borderRadius: theme.radiiCard,
      borderWidth: 0.5,
      borderColor: theme.border,
      padding: 12,
    },
    emptyDayText: {
      textAlign: 'center',
      fontSize: 13,
      color: theme.textMuted,
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
      color: theme.textDark,
    },
    statStrip: {
      flexDirection: 'row',
      gap: 8,
    },
    statBox: {
      flex: 1,
      backgroundColor: theme.surface,
      borderWidth: 0.5,
      borderColor: theme.border,
      borderRadius: 12,
      paddingVertical: 10,
      alignItems: 'center',
    },
    statNum: {
      fontSize: 16,
      fontWeight: '500',
      color: theme.textDark,
    },
    statNumGreen: {
      color: theme.primary,
      fontSize: 13,
    },
    statLabel: {
      fontSize: 10,
      color: theme.textMuted,
      marginTop: 2,
    },
  });
}
