import { useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Alert, StyleSheet, ActivityIndicator } from 'react-native';
import { Dog, HealthLog, PoopConsistency, PoopColor, VomitSeverity, VomitCause } from '../types';
import { useTheme } from '../lib/ThemeContext';
import { ThemeTokens } from '../lib/themes';
// Report export always renders in the fixed sage_clay palette regardless of the
// active in-app theme (see lib/reportTheme.ts) — reports are documents, not live UI.
import { colors as reportColors } from '../lib/reportTheme';
import { useProfile } from '../lib/hooks/useProfile';
import { computeAge } from '../lib/petAge';
import { buildReportHtml } from '../lib/pdfReport';
import { shareHtmlAsPdf } from '../lib/pdfExport';
import SwipeBackWrapper from '../components/SwipeBackWrapper';

type Props = {
  dog: Dog;
  logs: HealthLog[];
  vomitLogs: HealthLog[];
  onSelectPoop: (log: HealthLog) => void;
  onSelectVomit: (log: HealthLog) => void;
  onBack: () => void;
};

type DayStatus = 'none' | 'poop' | 'vomit' | 'both';

const DAY_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

export const CONSISTENCY_LABEL: Record<PoopConsistency, string> = {
  solid: 'Solid',
  soft: 'Soft',
  liquid: 'Liquid',
  mucus: 'Mucus',
};

export const SEVERITY_LABEL: Record<VomitSeverity, string> = {
  mild: 'Mild',
  moderate: 'Moderate',
  severe: 'Severe',
};

export const CAUSE_LABEL: Record<VomitCause, string> = {
  food: 'Food',
  motion: 'Motion',
  ate_too_fast: 'Ate too fast',
  hairball: 'Hairball',
  foreign_object: 'Foreign object',
  unknown: 'Unknown',
};

export function formatLongDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export function dateKey(iso: string): string {
  return iso.split('T')[0];
}

function toDateStr(y: number, m: number, d: number): string {
  return `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

export function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
}

function poopColorChipStyle(theme: ThemeTokens, color: PoopColor) {
  if (color === 'brown' || color === 'green') {
    return { bg: theme.moodSelBg, text: theme.primary };
  }
  if (color === 'yellow') {
    return { bg: theme.pendingAmberBg, text: theme.pendingAmberText };
  }
  return { bg: theme.allergenBg, text: theme.allergenText };
}

function vomitSeverityChipStyle(theme: ThemeTokens, severity: VomitSeverity) {
  if (severity === 'mild') return { bg: theme.moodSelBg, text: theme.primary };
  if (severity === 'moderate') return { bg: theme.pendingAmberBg, text: theme.pendingAmberText };
  return { bg: theme.allergenBg, text: theme.allergenText };
}

function dayStatusStyle(theme: ThemeTokens, status: DayStatus) {
  if (status === 'poop') return { bg: theme.pendingAmberBg, text: theme.pendingAmberText };
  if (status === 'vomit') return { bg: theme.allergenBg, text: theme.allergenText };
  if (status === 'both') return { bg: theme.symptomBothBg, text: theme.symptomBothText };
  return null;
}

export default function SymptomHistoryScreen({ dog, logs, vomitLogs, onSelectPoop, onSelectVomit, onBack }: Props) {
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const { profile } = useProfile();
  const [exporting, setExporting] = useState(false);

  const now = new Date();
  const todayKey = dateKey(now.toISOString());

  const [selectedDate, setSelectedDate] = useState(todayKey);
  const [viewYear, setViewYear] = useState(now.getFullYear());
  const [viewMonth, setViewMonth] = useState(now.getMonth());

  const entriesByDate = new Map<string, HealthLog[]>();
  for (const l of [...logs, ...vomitLogs]) {
    const key = dateKey(l.logged_at);
    const list = entriesByDate.get(key);
    if (list) list.push(l);
    else entriesByDate.set(key, [l]);
  }

  function statusFor(key: string): DayStatus {
    const entries = entriesByDate.get(key);
    if (!entries || entries.length === 0) return 'none';
    const hasPoop = entries.some(e => e.type === 'poop');
    const hasVomit = entries.some(e => e.type === 'vomit');
    if (hasPoop && hasVomit) return 'both';
    return hasPoop ? 'poop' : 'vomit';
  }

  const isCurrentMonth = viewYear === now.getFullYear() && viewMonth === now.getMonth();

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

  const selectedEntries = (entriesByDate.get(selectedDate) ?? [])
    .slice()
    .sort((a, b) => a.logged_at.localeCompare(b.logged_at));

  const selectedLabel = (() => {
    const d = new Date(selectedDate);
    const formatted = d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    return selectedDate === todayKey ? `${formatted} · Today` : formatted;
  })();

  const weekStart = new Date(now);
  weekStart.setDate(weekStart.getDate() - weekStart.getDay());
  const weekStartKey = dateKey(weekStart.toISOString());
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 6);
  const weekEndKey = dateKey(weekEnd.toISOString());

  const weekPoopLogs = logs.filter(l => {
    const k = dateKey(l.logged_at);
    return k >= weekStartKey && k <= weekEndKey;
  });
  const weekVomitCount = vomitLogs.filter(l => {
    const k = dateKey(l.logged_at);
    return k >= weekStartKey && k <= weekEndKey;
  }).length;

  const avgStool = (() => {
    if (weekPoopLogs.length === 0) return null;
    const counts = new Map<PoopConsistency, number>();
    for (const l of weekPoopLogs) {
      const c = (l.details as { consistency: PoopConsistency }).consistency;
      counts.set(c, (counts.get(c) ?? 0) + 1);
    }
    let best: PoopConsistency | null = null;
    let bestCount = 0;
    for (const [c, count] of counts) {
      if (count > bestCount) { best = c; bestCount = count; }
    }
    return best;
  })();

  const handleExport = async () => {
    if (logs.length === 0 && vomitLogs.length === 0) {
      Alert.alert('No Data', 'No symptom history to export yet.');
      return;
    }
    setExporting(true);
    try {
      const entriesNewestFirst = [...logs, ...vomitLogs]
        .slice()
        .sort((a, b) => b.logged_at.localeCompare(a.logged_at));
      const newestDate = dateKey(entriesNewestFirst[0].logged_at);
      const oldestDate = dateKey(entriesNewestFirst[entriesNewestFirst.length - 1].logged_at);

      const consistencyCounts = new Map<PoopConsistency, number>();
      for (const l of logs) {
        const c = (l.details as { consistency: PoopConsistency }).consistency;
        consistencyCounts.set(c, (consistencyCounts.get(c) ?? 0) + 1);
      }
      let mostCommonConsistency: PoopConsistency | null = null;
      let mostCommonCount = 0;
      for (const [c, count] of consistencyCounts) {
        if (count > mostCommonCount) { mostCommonConsistency = c; mostCommonCount = count; }
      }

      const sexLabel = dog.sex === 'male' ? 'Male' : dog.sex === 'female' ? 'Female' : 'Unknown';
      const ageLabel = computeAge(dog.birth_date) || 'Unknown';
      const weightLabel = dog.weight_kg != null ? `${dog.weight_kg} kg` : 'Unknown';
      const ownerLabel = `${profile?.full_name ?? 'Unknown'}${profile?.username ? ` (@${profile.username})` : ''}`;
      const periodLabel = oldestDate === newestDate
        ? formatLongDate(newestDate)
        : `${formatLongDate(oldestDate)} – ${formatLongDate(newestDate)}`;
      const exportedLabel = `${formatLongDate(todayKey)} · PawCare app`;

      const tableRows = entriesNewestFirst.map((l, i) => {
        const isPoop = l.type === 'poop';
        const typeColor = isPoop ? reportColors.pendingAmberText : reportColors.allergenText;
        const details = isPoop
          ? `${CONSISTENCY_LABEL[(l.details as { consistency: PoopConsistency }).consistency]} · ${(() => {
              const color = (l.details as { color: PoopColor }).color;
              return color[0].toUpperCase() + color.slice(1);
            })()}`
          : `${SEVERITY_LABEL[(l.details as { severity: VomitSeverity }).severity]} · ${CAUSE_LABEL[(l.details as { possibleCause: VomitCause }).possibleCause]}`;
        const frequency = (l.details as { frequency: number }).frequency;
        return `
          <tr style="background:${i % 2 === 1 ? '#F8FCF6' : '#FFFFFF'};">
            <td>${formatLongDate(dateKey(l.logged_at))}</td>
            <td>${formatTime(l.logged_at)}</td>
            <td style="color:${typeColor};font-weight:600;">${isPoop ? 'Poop' : 'Vomit'}</td>
            <td>${details}</td>
            <td>${frequency}</td>
            <td>${l.notes ?? '—'}</td>
          </tr>
        `;
      }).join('');

      const html = buildReportHtml({
        title: '🐾 PawCare — Symptom History Report',
        infoRows: [
          { key: 'Dog name:', value: dog.name },
          { key: 'Breed:', value: `${dog.breed ?? 'Unknown'} · ${sexLabel}` },
          { key: 'Age / Weight:', value: `${ageLabel} · ${weightLabel}` },
          { key: 'Owner:', value: ownerLabel },
          { key: 'Period:', value: periodLabel },
          { key: 'Exported:', value: exportedLabel },
        ],
        tableHeaders: ['Date', 'Time', 'Type', 'Details', 'Frequency', 'Notes'],
        tableRowsHtml: tableRows,
        summaryRows: [
          { key: 'Poop logs:', value: `${logs.length}` },
          { key: 'Vomit logs:', value: `${vomitLogs.length}` },
          { key: 'Most common stool:', value: mostCommonConsistency ? CONSISTENCY_LABEL[mostCommonConsistency] : '—' },
          { key: 'Generated by:', value: 'PawCare · pawcare.app' },
        ],
      });

      const newest = new Date(newestDate);
      const monthAbbrev = newest.toLocaleDateString('en-US', { month: 'short' });
      const filename = `${dog.name.replace(/\s+/g, '_')}_symptom_history_${monthAbbrev}${newest.getFullYear()}.pdf`;

      await shareHtmlAsPdf(filename, html);
    } catch {
      Alert.alert('Export Failed', 'Could not export symptom history. Please try again.');
    } finally {
      setExporting(false);
    }
  };

  return (
    <SwipeBackWrapper onBack={onBack}>
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <TouchableOpacity onPress={onBack} style={styles.backRow}>
        <Text style={styles.backText}>‹ Back</Text>
      </TouchableOpacity>

      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.headerDogName}>{dog.name}</Text>
          <Text style={styles.title}>Symptom History</Text>
        </View>
        <TouchableOpacity
          style={styles.downloadBtn}
          onPress={handleExport}
          disabled={exporting}
        >
          {exporting ? (
            <ActivityIndicator size="small" color={theme.primary} />
          ) : (
            <Text style={styles.downloadIcon}>⬇</Text>
          )}
        </TouchableOpacity>
      </View>

      <View style={styles.calendarCard}>
        <View style={styles.monthNav}>
          <TouchableOpacity
            onPress={() => {
              if (viewMonth === 0) { setViewYear(y => y - 1); setViewMonth(11); }
              else setViewMonth(m => m - 1);
            }}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text style={styles.monthNavArrow}>‹</Text>
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
            const isFuture = cell.dateStr > todayKey;
            const disabled = !cell.inMonth || isFuture;
            const status = cell.inMonth ? statusFor(cell.dateStr) : 'none';
            const statusStyle = dayStatusStyle(theme, status);
            const isSelected = cell.dateStr === selectedDate;
            const isToday = cell.dateStr === todayKey;

            return (
              <View key={i} style={styles.cell}>
                <TouchableOpacity
                  style={[
                    styles.dayCell,
                    statusStyle ? { backgroundColor: statusStyle.bg } : null,
                    isSelected && styles.dayCellSelected,
                    disabled && styles.dayCellDisabled,
                  ]}
                  disabled={disabled}
                  onPress={() => setSelectedDate(cell.dateStr)}
                >
                  <Text style={[
                    styles.dayNumber,
                    statusStyle ? { color: statusStyle.text } : null,
                    disabled && styles.dayNumberDisabled,
                  ]}>
                    {cell.dayNum}
                  </Text>
                  {status !== 'none' ? (
                    <Text style={styles.dayEmoji}>
                      {status === 'poop' ? '💩' : status === 'vomit' ? '🤢' : '💩🤢'}
                    </Text>
                  ) : null}
                  {isToday ? <View style={styles.todayDot} /> : null}
                </TouchableOpacity>
              </View>
            );
          })}
        </View>

        <View style={styles.legend}>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: theme.pendingAmberBg }]} />
            <Text style={styles.legendText}>Poop</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: theme.allergenBg }]} />
            <Text style={styles.legendText}>Vomit</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: theme.symptomBothBg }]} />
            <Text style={styles.legendText}>Both</Text>
          </View>
        </View>
      </View>

      <Text style={styles.sectionLabel}>{selectedLabel}</Text>
      {selectedEntries.length === 0 ? (
        <View style={styles.cardFlat}>
          <Text style={styles.emptyDayText}>No symptoms logged this day</Text>
        </View>
      ) : (
        <View style={styles.cardFlat}>
          {selectedEntries.map((l, idx) => {
            const isPoop = l.type === 'poop';
            const chip = isPoop
              ? poopColorChipStyle(theme, (l.details as { color: PoopColor }).color)
              : vomitSeverityChipStyle(theme, (l.details as { severity: VomitSeverity }).severity);
            const subtype = isPoop
              ? CONSISTENCY_LABEL[(l.details as { consistency: PoopConsistency }).consistency]
              : SEVERITY_LABEL[(l.details as { severity: VomitSeverity }).severity];
            const chipLabel = isPoop
              ? (l.details as { color: PoopColor }).color[0].toUpperCase() + (l.details as { color: PoopColor }).color.slice(1)
              : SEVERITY_LABEL[(l.details as { severity: VomitSeverity }).severity];
            const frequency = (l.details as { frequency: number }).frequency;

            return (
              <View key={l.id}>
                <TouchableOpacity
                  style={styles.entryRow}
                  onPress={() => (isPoop ? onSelectPoop(l) : onSelectVomit(l))}
                >
                  <Text style={styles.entryEmoji}>{isPoop ? '💩' : '🤢'}</Text>
                  <View style={styles.entryBody}>
                    <Text style={styles.entryName}>{isPoop ? 'Poop' : 'Vomit'} · {subtype}</Text>
                    <Text style={styles.entrySub}>
                      {formatTime(l.logged_at)} · {frequency} occurrence{frequency === 1 ? '' : 's'}
                    </Text>
                    {l.notes ? <Text style={styles.entryNotes}>"{l.notes}"</Text> : null}
                  </View>
                  <View style={[styles.chip, { backgroundColor: chip.bg }]}>
                    <Text style={[styles.chipText, { color: chip.text }]}>{chipLabel}</Text>
                  </View>
                </TouchableOpacity>
                {idx < selectedEntries.length - 1 ? <View style={styles.divider} /> : null}
              </View>
            );
          })}
        </View>
      )}

      <Text style={[styles.sectionLabel, styles.weekLabel]}>This week</Text>
      <View style={styles.statStrip}>
        <View style={styles.statBox}>
          <Text style={styles.statNum}>{weekPoopLogs.length}</Text>
          <Text style={styles.statLabel}>💩 logs</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={[styles.statNum, styles.statNumRed]}>{weekVomitCount}</Text>
          <Text style={styles.statLabel}>🤢 logs</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={[styles.statNum, styles.statNumGreen]}>
            {avgStool ? CONSISTENCY_LABEL[avgStool] : '—'}
          </Text>
          <Text style={styles.statLabel}>avg stool</Text>
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
    downloadBtn: {
      width: 34,
      height: 34,
      borderRadius: 10,
      backgroundColor: theme.moodSelBg,
      borderWidth: 0.5,
      borderColor: theme.moodSelBorder,
      alignItems: 'center',
      justifyContent: 'center',
    },
    downloadIcon: {
      fontSize: 15,
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
    dayCellSelected: {
      borderWidth: 1.5,
      borderColor: theme.primary,
    },
    dayCellDisabled: {
      opacity: 0.35,
    },
    dayNumber: {
      fontSize: 12,
      fontWeight: '500',
      color: theme.textDark,
    },
    dayNumberDisabled: {
      color: theme.textMuted,
    },
    dayEmoji: {
      fontSize: 9,
      lineHeight: 11,
      marginTop: 1,
    },
    todayDot: {
      position: 'absolute',
      bottom: 3,
      width: 4,
      height: 4,
      borderRadius: 2,
      backgroundColor: theme.primary,
    },
    legend: {
      flexDirection: 'row',
      gap: 14,
      justifyContent: 'center',
      marginTop: 10,
      paddingTop: 10,
      borderTopWidth: 0.5,
      borderTopColor: theme.divider,
    },
    legendItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
    },
    legendDot: {
      width: 10,
      height: 10,
      borderRadius: 3,
    },
    legendText: {
      fontSize: 11,
      color: theme.textMuted,
    },
    sectionLabel: {
      fontSize: 11,
      fontWeight: '600',
      color: theme.textMuted,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
      marginBottom: 8,
    },
    weekLabel: {
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
      paddingVertical: 6,
    },
    entryEmoji: {
      fontSize: 20,
    },
    entryBody: {
      flex: 1,
      minWidth: 0,
    },
    entryName: {
      fontSize: 13,
      fontWeight: '500',
      color: theme.textDark,
    },
    entrySub: {
      fontSize: 11,
      color: theme.textMuted,
      marginTop: 1,
    },
    entryNotes: {
      fontSize: 11,
      color: theme.textMuted,
      fontStyle: 'italic',
      marginTop: 2,
    },
    chip: {
      borderRadius: 20,
      paddingHorizontal: 9,
      paddingVertical: 3,
    },
    chipText: {
      fontSize: 11,
      fontWeight: '500',
    },
    divider: {
      height: 0.5,
      backgroundColor: theme.divider,
      marginVertical: 4,
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
      fontSize: 18,
      fontWeight: '500',
      color: theme.textDark,
    },
    statNumRed: {
      color: theme.allergenText,
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
