import { useMemo, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { Dog, CycleIntensity } from '../types';
import { useCycleTracking } from '../lib/hooks/useCycleTracking';
import { useTheme } from '../lib/ThemeContext';
import { ThemeTokens } from '../lib/themes';
import { SYMPTOM_LABELS } from '../lib/cycleLogic';
import SwipeBackWrapper from '../components/SwipeBackWrapper';

type Props = {
  dog: Dog;
  tracking: ReturnType<typeof useCycleTracking>;
  onBack: () => void;
  onStartCycle: () => void;
};

const DAY_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

function toDateStr(y: number, m: number, d: number): string {
  return `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

function formatLongDate(dateStr: string): string {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function intensityBg(theme: ThemeTokens, intensity: CycleIntensity | null): { bg: string; text: string } {
  if (intensity === 'mild') return { bg: theme.pendingAmberBg, text: theme.pendingAmberText };
  if (intensity === 'moderate') return { bg: theme.communityBlueBg, text: theme.communityBlueText };
  if (intensity === 'severe') return { bg: theme.allergenBg, text: theme.allergenText };
  return { bg: theme.notStartedBg, text: theme.notStartedText };
}

export default function CycleHistoryScreen({ dog, tracking, onBack, onStartCycle }: Props) {
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const { cycles, symptoms, activeCycle } = tracking;
  const [selectedCycleId, setSelectedCycleId] = useState<string | null>(null);
  const [viewYear, setViewYear] = useState<number | null>(null);
  const [viewMonth, setViewMonth] = useState<number | null>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const closedCycles = cycles.filter(c => c.end_date);

  function selectCycle(cycleId: string, startDateStr: string) {
    if (selectedCycleId === cycleId) {
      setSelectedCycleId(null);
      return;
    }
    setSelectedCycleId(cycleId);
    const [y, m] = startDateStr.split('-').map(Number);
    setViewYear(y);
    setViewMonth(m - 1);
    setSelectedDate(null);
  }

  const selectedCycle = closedCycles.find(c => c.id === selectedCycleId) ?? null;
  const cycleSymptoms = selectedCycle ? symptoms.filter(s => s.cycle_id === selectedCycle.id) : [];
  const symptomsByDate = new Map(cycleSymptoms.map(s => [s.logged_date, s]));

  let cells: { dateStr: string; dayNum: number; inMonth: boolean }[] = [];
  if (selectedCycle && viewYear != null && viewMonth != null) {
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    const daysInPrevMonth = new Date(viewYear, viewMonth, 0).getDate();
    const firstWeekday = new Date(viewYear, viewMonth, 1).getDay();
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
  }

  const selectedEntry = selectedDate ? symptomsByDate.get(selectedDate) ?? null : null;

  return (
    <SwipeBackWrapper onBack={onBack}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <TouchableOpacity onPress={onBack} style={styles.backRow}>
          <Text style={styles.backText}>‹ Back</Text>
        </TouchableOpacity>

        <View style={styles.header}>
          <Text style={styles.headerDogName}>{dog.name}</Text>
          <Text style={styles.title}>Cycle History</Text>
        </View>

        {!activeCycle ? (
          <TouchableOpacity style={styles.startBtn} onPress={onStartCycle}>
            <Text style={styles.startBtnText}>+ Start new cycle</Text>
          </TouchableOpacity>
        ) : null}

        {closedCycles.length === 0 ? (
          <Text style={styles.gentleCopy}>No completed cycles yet.</Text>
        ) : (
          closedCycles.map(cycle => {
            const durationDays = cycle.end_date
              ? Math.round((new Date(cycle.end_date).getTime() - new Date(cycle.start_date).getTime()) / 86400000) + 1
              : null;
            const cycleSymptomRows = symptoms.filter(s => s.cycle_id === cycle.id);
            const tally = new Map<string, number>();
            for (const row of cycleSymptomRows) {
              for (const key of row.symptoms) tally.set(key, (tally.get(key) ?? 0) + 1);
            }
            const topSymptoms = Array.from(tally.entries())
              .sort((a, b) => b[1] - a[1])
              .slice(0, 3)
              .map(([key]) => SYMPTOM_LABELS[key] ?? key);
            const expanded = selectedCycleId === cycle.id;

            return (
              <View key={cycle.id} style={styles.cycleCardWrapper}>
                <TouchableOpacity style={styles.cycleCard} onPress={() => selectCycle(cycle.id, cycle.start_date)}>
                  <Text style={styles.cycleRange}>
                    {formatLongDate(cycle.start_date)} → {cycle.end_date ? formatLongDate(cycle.end_date) : '—'}
                  </Text>
                  <Text style={styles.cycleMeta}>
                    {durationDays != null ? `${durationDays} days` : ''}
                    {topSymptoms.length > 0 ? ` · ${topSymptoms.join(', ')}` : ''}
                  </Text>
                </TouchableOpacity>

                {expanded && selectedCycle && viewYear != null && viewMonth != null ? (
                  <View style={styles.calendarCard}>
                    <View style={styles.monthNav}>
                      <Text style={styles.monthLabel}>{MONTH_NAMES[viewMonth]} {viewYear}</Text>
                    </View>
                    <View style={styles.weekdayRow}>
                      {DAY_LABELS.map((label, i) => (
                        <Text key={i} style={styles.weekdayLabel}>{label}</Text>
                      ))}
                    </View>
                    <View style={styles.grid}>
                      {cells.map((cell, i) => {
                        const inRange = cell.inMonth && cell.dateStr >= selectedCycle.start_date && (!selectedCycle.end_date || cell.dateStr <= selectedCycle.end_date);
                        const entry = inRange ? symptomsByDate.get(cell.dateStr) : undefined;
                        const colors = entry ? intensityBg(theme, entry.intensity) : null;
                        const isSelected = cell.dateStr === selectedDate;
                        return (
                          <View key={i} style={styles.cell}>
                            <TouchableOpacity
                              style={[
                                styles.dayCell,
                                colors && { backgroundColor: colors.bg },
                                isSelected && styles.dayCellSelected,
                                !inRange && styles.dayCellDisabled,
                              ]}
                              disabled={!inRange}
                              onPress={() => setSelectedDate(cell.dateStr)}
                            >
                              <Text style={[styles.dayNumber, colors && { color: colors.text }]}>{cell.dayNum}</Text>
                            </TouchableOpacity>
                          </View>
                        );
                      })}
                    </View>

                    {selectedDate ? (
                      <View style={styles.dayDetailCard}>
                        {selectedEntry ? (
                          <>
                            <View style={styles.dayDetailChipRow}>
                              {selectedEntry.symptoms.map(key => (
                                <View key={key} style={styles.dayDetailChip}>
                                  <Text style={styles.dayDetailChipText}>{SYMPTOM_LABELS[key] ?? key}</Text>
                                </View>
                              ))}
                            </View>
                            {selectedEntry.intensity ? (
                              <Text style={styles.dayDetailIntensity}>
                                Intensity: {selectedEntry.intensity}
                              </Text>
                            ) : null}
                            {selectedEntry.notes ? (
                              <Text style={styles.dayDetailNotes}>{selectedEntry.notes}</Text>
                            ) : null}
                          </>
                        ) : (
                          <Text style={styles.emptyDayText}>No symptoms logged this day</Text>
                        )}
                      </View>
                    ) : null}
                  </View>
                ) : null}
              </View>
            );
          })
        )}
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
      marginBottom: 16,
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
    startBtn: {
      backgroundColor: theme.primary,
      borderRadius: theme.radiiCard,
      paddingVertical: 12,
      alignItems: 'center',
      marginBottom: 16,
    },
    startBtnText: {
      color: 'white',
      fontSize: 14,
      fontWeight: '700',
    },
    gentleCopy: {
      fontSize: 13,
      color: theme.textMuted,
      textAlign: 'center',
      marginTop: 20,
      fontStyle: 'italic',
    },
    cycleCardWrapper: {
      marginBottom: 12,
    },
    cycleCard: {
      backgroundColor: theme.surface,
      borderRadius: theme.radiiCard,
      borderWidth: 0.5,
      borderColor: theme.border,
      padding: 14,
    },
    cycleRange: {
      fontSize: 14,
      fontWeight: '600',
      color: theme.textDark,
      marginBottom: 4,
    },
    cycleMeta: {
      fontSize: 12,
      color: theme.textMuted,
    },
    calendarCard: {
      backgroundColor: theme.surface,
      borderRadius: theme.radiiCard,
      borderWidth: 0.5,
      borderColor: theme.border,
      padding: 14,
      marginTop: 8,
    },
    monthNav: {
      alignItems: 'center',
      marginBottom: 12,
    },
    monthLabel: {
      fontSize: 14,
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
    dayCellSelected: {
      borderWidth: 1.5,
      borderColor: theme.textDark,
    },
    dayCellDisabled: {
      opacity: 0.25,
    },
    dayNumber: {
      fontSize: 12,
      fontWeight: '500',
      color: theme.textDark,
    },
    dayDetailCard: {
      marginTop: 10,
      paddingTop: 10,
      borderTopWidth: 0.5,
      borderTopColor: theme.border,
    },
    dayDetailChipRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 6,
      marginBottom: 6,
    },
    dayDetailChip: {
      backgroundColor: theme.moodSelBg,
      borderRadius: 10,
      paddingHorizontal: 10,
      paddingVertical: 5,
    },
    dayDetailChipText: {
      fontSize: 12,
      fontWeight: '600',
      color: theme.textDark,
    },
    dayDetailIntensity: {
      fontSize: 12,
      color: theme.textMuted,
      marginBottom: 4,
      textTransform: 'capitalize',
    },
    dayDetailNotes: {
      fontSize: 12,
      color: theme.textMuted,
      fontStyle: 'italic',
    },
    emptyDayText: {
      textAlign: 'center',
      fontSize: 13,
      color: theme.textMuted,
      paddingVertical: 8,
    },
  });
}
