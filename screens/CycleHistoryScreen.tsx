import { useMemo, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Alert, StyleSheet } from 'react-native';
import { Dog, CycleIntensity } from '../types';
import { useCycleTracking } from '../lib/hooks/useCycleTracking';
import { useTheme } from '../lib/ThemeContext';
import { useT } from '../lib/LanguageContext';
import { monthYearLabel, weekdayLetters, longDate as i18nLongDate, shortDate as i18nShortDate } from '../lib/i18n/calendar';
import { ThemeTokens } from '../lib/themes';
import { symptomLabel, phaseLabel, predictPhases, phaseColorToken, matchBreedSizeTier } from '../lib/cycleLogic';
import SwipeBackWrapper from '../components/SwipeBackWrapper';
import CycleEditSheet from '../components/CycleEditSheet';
import SymptomLogSheet from '../components/SymptomLogSheet';

type Props = {
  dog: Dog;
  tracking: ReturnType<typeof useCycleTracking>;
  onBack: () => void;
  onStartCycle: () => void;
};

function toDateStr(y: number, m: number, d: number): string {
  return `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

function parseDateOnly(s: string): Date {
  const [y, m, day] = s.split('-').map(Number);
  return new Date(y, m - 1, day);
}

function formatLongDate(dateStr: string): string {
  return i18nLongDate(dateStr);
}

function shortDate(d: Date): string {
  return i18nShortDate(toDateStr(d.getFullYear(), d.getMonth(), d.getDate()));
}

function intensityBg(theme: ThemeTokens, intensity: CycleIntensity | null): { bg: string; text: string } {
  if (intensity === 'mild') return { bg: theme.pendingAmberBg, text: theme.pendingAmberText };
  if (intensity === 'moderate') return { bg: theme.communityBlueBg, text: theme.communityBlueText };
  if (intensity === 'severe') return { bg: theme.allergenBg, text: theme.allergenText };
  return { bg: theme.notStartedBg, text: theme.notStartedText };
}

export default function CycleHistoryScreen({ dog, tracking, onBack, onStartCycle }: Props) {
  const { theme } = useTheme();
  const { t } = useT();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const DAY_LABELS = weekdayLetters();
  const {
    cycles, symptoms, activeCycle, currentPhase, predictedPhases, nextCycleDate,
    updateCycle, deleteCycle, endCycle, logSymptoms, deleteSymptomLog,
  } = tracking;
  const [selectedCycleId, setSelectedCycleId] = useState<string | null>(null);
  const [viewYear, setViewYear] = useState<number | null>(null);
  const [viewMonth, setViewMonth] = useState<number | null>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [editSheetVisible, setEditSheetVisible] = useState(false);
  const [symptomEditVisible, setSymptomEditVisible] = useState(false);
  const [todaySymptomSheetVisible, setTodaySymptomSheetVisible] = useState(false);

  const closedCycles = cycles.filter(c => c.end_date);

  function openEditSheet(cycleId: string) {
    setSelectedCycleId(cycleId);
    setEditSheetVisible(true);
  }

  function toggleCalendar(cycleId: string, startDateStr: string) {
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

  // Includes the active (open) cycle, not just closed ones — its dates/symptoms are now
  // editable too via the same sheet/calendar, see the active-cycle card below.
  const selectedCycle = cycles.find(c => c.id === selectedCycleId) ?? null;
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
  const selectedDayOfCycle = selectedCycle && selectedDate
    ? Math.floor((parseDateOnly(selectedDate).getTime() - parseDateOnly(selectedCycle.start_date).getTime()) / 86400000) + 1
    : null;

  const todayStr = new Date().toISOString().split('T')[0];
  const todaySymptomLog = activeCycle
    ? symptoms.find(s => s.cycle_id === activeCycle.id && s.logged_date === todayStr) ?? null
    : null;

  const avgDurationDays = closedCycles.length > 0
    ? Math.round(
        closedCycles.reduce((sum, c) => sum + (Math.round((parseDateOnly(c.end_date!).getTime() - parseDateOnly(c.start_date).getTime()) / 86400000) + 1), 0)
        / closedCycles.length
      )
    : null;

  function handleEndCycle() {
    if (!activeCycle) return;
    Alert.alert(t('cycle.endCycleTitle'), t('cycle.endCycleMessage', { name: dog.name }), [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('cycle.endCycle'), style: 'destructive', onPress: () => endCycle(activeCycle.id, new Date()) },
    ]);
  }

  const activeSegments = activeCycle && predictedPhases
    ? predictedPhases.map(p => ({
        phase: p.phase,
        days: Math.max(1, Math.round((p.endDate.getTime() - p.startDate.getTime()) / 86400000)),
      }))
    : [];
  const activeTotalDays = activeSegments.reduce((sum, s) => sum + s.days, 0);

  // Shared by both the active-cycle card and each closed-cycle card below — only one
  // cycle can be expanded/selected at a time (selectedCycleId), so each call site guards
  // with `selectedCycleId === thisCard'sCycleId` before rendering it.
  function renderCalendarBlock() {
    if (!selectedCycle || viewYear == null || viewMonth == null) return null;
    return (
      <View style={styles.calendarCard}>
        <Text style={styles.monthLabel}>{monthYearLabel(viewYear, viewMonth)}</Text>
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
                      <Text style={styles.dayDetailChipText}>{symptomLabel(key)}</Text>
                    </View>
                  ))}
                </View>
                {selectedEntry.intensity ? (
                  <Text style={styles.dayDetailIntensity}>
                    {t('cycle.intensityLabel', { value: t('cycle.intensity.' + selectedEntry.intensity) })}
                  </Text>
                ) : null}
                {selectedEntry.notes ? (
                  <Text style={styles.dayDetailNotes}>{selectedEntry.notes}</Text>
                ) : null}
                <View style={styles.dayDetailActionsRow}>
                  <TouchableOpacity onPress={() => setSymptomEditVisible(true)}>
                    <Text style={styles.dayDetailActionText}>{t('common.edit')}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => {
                      Alert.alert(t('cycle.deleteEntryTitle'), t('cycle.deleteEntryMessage'), [
                        { text: t('common.cancel'), style: 'cancel' },
                        {
                          text: t('common.delete'),
                          style: 'destructive',
                          onPress: async () => {
                            await deleteSymptomLog(selectedEntry.id);
                            setSelectedDate(null);
                          },
                        },
                      ]);
                    }}
                  >
                    <Text style={[styles.dayDetailActionText, styles.dayDetailActionDelete]}>{t('common.delete')}</Text>
                  </TouchableOpacity>
                </View>
              </>
            ) : (
              <Text style={styles.emptyDayText}>{t('cycle.noSymptomsThisDay')}</Text>
            )}
          </View>
        ) : null}
      </View>
    );
  }

  return (
    <SwipeBackWrapper onBack={onBack}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <TouchableOpacity onPress={onBack} style={styles.backRow}>
          <Text style={styles.backText}>‹ {t('common.back')}</Text>
        </TouchableOpacity>

        <View style={styles.header}>
          <Text style={styles.headerDogName}>{dog.name}</Text>
          <Text style={styles.title}>{t('cycle.historyTitle')}</Text>
        </View>

        <View style={styles.statStrip}>
          <View style={styles.statBox}>
            <Text style={styles.statNum}>{cycles.length}</Text>
            <Text style={styles.statLabel}>{cycles.length === 1 ? t('cycle.cycleLogged') : t('cycle.cyclesLogged')}</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statNum}>{avgDurationDays != null ? `${avgDurationDays}d` : '—'}</Text>
            <Text style={styles.statLabel}>{t('cycle.avgDuration')}</Text>
          </View>
          <View style={[styles.statBox, styles.statBoxAccent]}>
            <Text style={[styles.statNum, styles.statNumAccent]}>{nextCycleDate ? shortDate(nextCycleDate.predictedDate) : '—'}</Text>
            <Text style={styles.statLabel}>{t('cycle.nextEst')}</Text>
          </View>
        </View>

        {activeCycle && currentPhase && predictedPhases ? (
          <View style={styles.cycleCardWrapper}>
            <View style={styles.activeCard}>
              <Text style={styles.activeHeading}>
                {t('cycle.phaseDay', { phase: phaseLabel(currentPhase.phaseName), day: currentPhase.dayOfPhase })}
              </Text>
              <Text style={styles.activeSubtext}>
                {t('cycle.startedEnds', { start: formatLongDate(activeCycle.start_date), end: shortDate(currentPhase.phaseEndDate) })}
              </Text>
              <View style={styles.timelineBar}>
                {activeSegments.map((seg, i) => (
                  <View key={`${seg.phase}-${i}`} style={[styles.timelineSegment, { flex: seg.days, backgroundColor: theme[phaseColorToken(seg.phase)] }]} />
                ))}
              </View>
              <Text style={styles.timelineCaption}>{t('cycle.todayCaption', { day: currentPhase.dayOfCycle, total: activeTotalDays })}</Text>

              <TouchableOpacity style={styles.primaryBtn} onPress={() => setTodaySymptomSheetVisible(true)}>
                <Text style={styles.primaryBtnText}>{t('cycle.logTodaySymptoms')}</Text>
              </TouchableOpacity>

              <View style={styles.cardActionsRow}>
                <TouchableOpacity onPress={() => toggleCalendar(activeCycle.id, activeCycle.start_date)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <Text style={styles.dayByDayLink}>
                    {selectedCycleId === activeCycle.id ? t('cycle.hideDayLog') : t('cycle.viewDayLog')}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => openEditSheet(activeCycle.id)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <Text style={styles.editDatesLink}>{t('cycle.editDates')}</Text>
                </TouchableOpacity>
              </View>

              <TouchableOpacity onPress={handleEndCycle} style={styles.endCycleRow}>
                <Text style={styles.endCycleText}>{t('cycle.endCycle')}</Text>
              </TouchableOpacity>
            </View>

            {selectedCycleId === activeCycle.id ? renderCalendarBlock() : null}
          </View>
        ) : null}

        {!activeCycle ? (
          <TouchableOpacity style={styles.startBtn} onPress={onStartCycle}>
            <Text style={styles.startBtnText}>{t('cycle.startNewCycle')}</Text>
          </TouchableOpacity>
        ) : null}

        <Text style={styles.sectionLabel}>{t('cycle.pastCycles')}</Text>

        {closedCycles.length === 0 ? (
          <Text style={styles.gentleCopy}>{t('cycle.noCompletedCycles')}</Text>
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
            const sortedKeys = Array.from(tally.keys()).sort((a, b) => (tally.get(b) ?? 0) - (tally.get(a) ?? 0));
            const shownSymptoms = sortedKeys.slice(0, 3).map(key => symptomLabel(key));
            const moreCount = sortedKeys.length - shownSymptoms.length;
            const cycleSegments = predictPhases(parseDateOnly(cycle.start_date), cycle.species).map(p => ({
              phase: p.phase,
              days: Math.max(1, Math.round((p.endDate.getTime() - p.startDate.getTime()) / 86400000)),
            }));
            const expanded = selectedCycleId === cycle.id;

            return (
              <View key={cycle.id} style={styles.cycleCardWrapper}>
                <View style={styles.cycleCard}>
                  <View style={styles.cycleCardTopRow}>
                    <Text style={styles.cycleRange}>
                      {formatLongDate(cycle.start_date)} → {cycle.end_date ? formatLongDate(cycle.end_date) : '—'}
                    </Text>
                    <View style={styles.completeBadge}>
                      <Text style={styles.completeBadgeText}>{t('cycle.complete')}</Text>
                    </View>
                  </View>
                  <Text style={styles.cycleMeta}>{durationDays != null ? t('cycle.daysTotal', { count: durationDays }) : ''}</Text>

                  <View style={styles.timelineBar}>
                    {cycleSegments.map((seg, i) => (
                      <View key={`${seg.phase}-${i}`} style={[styles.timelineSegment, { flex: seg.days, backgroundColor: theme[phaseColorToken(seg.phase)] }]} />
                    ))}
                  </View>
                  <View style={styles.legendRow}>
                    {cycleSegments.map((seg, i) => (
                      <View key={`${seg.phase}-legend-${i}`} style={styles.legendItem}>
                        <View style={[styles.legendDot, { backgroundColor: theme[phaseColorToken(seg.phase)] }]} />
                        <Text style={styles.legendText}>{t('cycle.phaseDays', { phase: phaseLabel(seg.phase), days: seg.days })}</Text>
                      </View>
                    ))}
                  </View>

                  {shownSymptoms.length > 0 ? (
                    <>
                      <Text style={styles.symptomsLabel}>{t('cycle.symptomsLogged')}</Text>
                      <View style={styles.symptomChipRow}>
                        {shownSymptoms.map(label => (
                          <View key={label} style={styles.symptomChip}>
                            <Text style={styles.symptomChipText}>{label}</Text>
                          </View>
                        ))}
                        {moreCount > 0 ? (
                          <View style={styles.symptomChip}>
                            <Text style={styles.symptomChipText}>{t('cycle.moreCount', { count: moreCount })}</Text>
                          </View>
                        ) : null}
                      </View>
                    </>
                  ) : null}

                  <View style={styles.cardActionsRow}>
                    <TouchableOpacity onPress={() => toggleCalendar(cycle.id, cycle.start_date)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                      <Text style={styles.dayByDayLink}>{expanded ? t('cycle.hideDayLog') : t('cycle.viewDayLog')}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => openEditSheet(cycle.id)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                      <Text style={styles.editDatesLink}>{t('cycle.editDates')}</Text>
                    </TouchableOpacity>
                  </View>
                </View>

                {expanded ? renderCalendarBlock() : null}
              </View>
            );
          })
        )}

        {cycles.length === 1 ? (
          <View style={styles.tipCard}>
            <Text style={styles.tipText}>
              {matchBreedSizeTier(dog.breed) ? t('cycle.tipBreed') : t('cycle.tipSpecies')}
            </Text>
          </View>
        ) : null}
      </ScrollView>
      <CycleEditSheet
        visible={editSheetVisible}
        cycle={selectedCycle}
        // The active/open cycle has no end_date yet — editing it should only ever touch
        // start_date/notes; ending a cycle deliberately goes through "End cycle" instead.
        allowEndDate={!!selectedCycle?.end_date}
        onClose={() => setEditSheetVisible(false)}
        onSave={async (startDate, endDate, notes) => {
          if (!selectedCycle) return;
          const { error } = await updateCycle(selectedCycle.id, {
            start_date: toDateStr(startDate.getFullYear(), startDate.getMonth(), startDate.getDate()),
            ...(endDate ? { end_date: toDateStr(endDate.getFullYear(), endDate.getMonth(), endDate.getDate()) } : {}),
            notes,
          });
          if (!error) setEditSheetVisible(false);
        }}
        onDelete={async () => {
          if (!selectedCycle) return;
          await deleteCycle(selectedCycle.id);
          setEditSheetVisible(false);
          setSelectedCycleId(null);
        }}
      />
      {selectedCycle ? (
        <SymptomLogSheet
          visible={symptomEditVisible}
          species={selectedCycle.species}
          dogName={dog.name}
          dayOfCycle={selectedDayOfCycle}
          initial={selectedEntry}
          onClose={() => setSymptomEditVisible(false)}
          onSave={async (syms, intensity, notes) => {
            if (!selectedDate) return { error: new Error(t('cycle.noDaySelected')) };
            const { error } = await logSymptoms(
              selectedCycle.id,
              dog.id,
              parseDateOnly(selectedDate),
              syms,
              intensity,
              notes ?? undefined
            );
            if (!error) setSymptomEditVisible(false);
            return { error };
          }}
        />
      ) : null}
      {activeCycle ? (
        <SymptomLogSheet
          visible={todaySymptomSheetVisible}
          species={activeCycle.species}
          dogName={dog.name}
          dayOfCycle={currentPhase?.dayOfCycle ?? null}
          initial={todaySymptomLog}
          onClose={() => setTodaySymptomSheetVisible(false)}
          onSave={async (syms, intensity, notes) => {
            const { error } = await logSymptoms(activeCycle.id, dog.id, new Date(), syms, intensity, notes ?? undefined);
            if (!error) setTodaySymptomSheetVisible(false);
            return { error };
          }}
        />
      ) : null}
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
    statStrip: {
      flexDirection: 'row',
      gap: 8,
      marginBottom: 16,
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
    statBoxAccent: {
      borderColor: theme.primary,
    },
    statNum: {
      fontSize: 16,
      fontWeight: '600',
      color: theme.textDark,
    },
    statNumAccent: {
      color: theme.primary,
    },
    statLabel: {
      fontSize: 10,
      color: theme.textMuted,
      marginTop: 2,
      textAlign: 'center',
    },
    activeCard: {
      backgroundColor: theme.surface,
      borderRadius: theme.radiiCard,
      borderWidth: 0.5,
      borderColor: theme.border,
      padding: 16,
      marginBottom: 16,
    },
    activeHeading: {
      fontSize: 15,
      fontWeight: '700',
      color: theme.textDark,
      marginBottom: 2,
    },
    activeSubtext: {
      fontSize: 12,
      color: theme.textMuted,
      marginBottom: 12,
    },
    timelineBar: {
      flexDirection: 'row',
      height: 8,
      borderRadius: 4,
      overflow: 'hidden',
    },
    timelineSegment: {
      height: 8,
    },
    timelineCaption: {
      fontSize: 11,
      color: theme.textMuted,
      marginTop: 6,
    },
    primaryBtn: {
      backgroundColor: theme.primary,
      borderRadius: theme.radiiCard,
      paddingVertical: 12,
      alignItems: 'center',
      marginTop: 14,
    },
    primaryBtnText: {
      color: 'white',
      fontSize: 14,
      fontWeight: '700',
    },
    endCycleRow: {
      alignItems: 'center',
      marginTop: 10,
    },
    endCycleText: {
      fontSize: 13,
      fontWeight: '600',
      color: theme.textMuted,
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
    sectionLabel: {
      fontSize: 11,
      fontWeight: '600',
      color: theme.textMuted,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
      marginBottom: 8,
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
    cycleCardTopRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
    },
    cycleRange: {
      fontSize: 14,
      fontWeight: '600',
      color: theme.textDark,
      marginBottom: 4,
      flex: 1,
      marginRight: 8,
    },
    completeBadge: {
      backgroundColor: theme.primaryLight,
      borderRadius: 20,
      paddingHorizontal: 9,
      paddingVertical: 3,
    },
    completeBadgeText: {
      fontSize: 10,
      fontWeight: '700',
      color: theme.primaryDark,
    },
    cycleMeta: {
      fontSize: 12,
      color: theme.textMuted,
      marginBottom: 10,
    },
    legendRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 12,
      marginTop: 8,
    },
    legendItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    legendDot: {
      width: 7,
      height: 7,
      borderRadius: 4,
    },
    legendText: {
      fontSize: 11,
      color: theme.textMuted,
    },
    symptomsLabel: {
      fontSize: 10,
      fontWeight: '600',
      color: theme.textMuted,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
      marginTop: 12,
      marginBottom: 6,
    },
    symptomChipRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 6,
    },
    symptomChip: {
      backgroundColor: theme.moodSelBg,
      borderRadius: 10,
      paddingHorizontal: 10,
      paddingVertical: 5,
    },
    symptomChipText: {
      fontSize: 12,
      fontWeight: '600',
      color: theme.textDark,
    },
    cardActionsRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginTop: 12,
    },
    dayByDayLink: {
      fontSize: 12,
      fontWeight: '600',
      color: theme.primary,
    },
    calendarCard: {
      backgroundColor: theme.surface,
      borderRadius: theme.radiiCard,
      borderWidth: 0.5,
      borderColor: theme.border,
      padding: 14,
      marginTop: 8,
    },
    monthLabel: {
      fontSize: 14,
      fontWeight: '700',
      color: theme.textDark,
      marginBottom: 12,
    },
    editDatesLink: {
      fontSize: 12,
      fontWeight: '600',
      color: theme.primary,
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
    dayDetailActionsRow: {
      flexDirection: 'row',
      gap: 16,
      marginTop: 8,
    },
    dayDetailActionText: {
      fontSize: 12,
      fontWeight: '600',
      color: theme.primary,
    },
    dayDetailActionDelete: {
      color: theme.allergenText,
    },
    emptyDayText: {
      textAlign: 'center',
      fontSize: 13,
      color: theme.textMuted,
      paddingVertical: 8,
    },
    tipCard: {
      backgroundColor: theme.moodSelBg,
      borderRadius: theme.radiiCard,
      padding: 14,
      marginTop: 8,
    },
    tipText: {
      fontSize: 12,
      color: theme.textDark,
      lineHeight: 18,
    },
  });
}
