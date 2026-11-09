import { RefObject, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useVetAppointments } from '../lib/hooks/useVetAppointments';
import { View, Text, TouchableOpacity, Image, ScrollView, Alert, BackHandler, StyleSheet } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Dog, Habit, HabitType, DogMood, VaccineRecord, Allergen, HealthLog, PoopLogDetails } from '../types';
import { useHabits, getHabitTarget } from '../lib/hooks/useHabits';
import { useVaccines } from '../lib/hooks/useVaccines';
import { useDogMood } from '../lib/hooks/useDogMood';
import { useAllergens } from '../lib/hooks/useAllergens';
import { useHealthLogs } from '../lib/hooks/useHealthLogs';
import { useVomitLogs } from '../lib/hooks/useVomitLogs';
import { useMealDetails } from '../lib/hooks/useMealDetails';
import { usePetStreak } from '../lib/hooks/usePetStreak';
import { useDogs } from '../lib/hooks/useDogs';
import HabitRow from '../components/HabitRow';
import WaterIncrementRow from '../components/WaterIncrementRow';
import MealDetailLink from '../components/MealDetailLink';
import MealDetailSheet from '../components/MealDetailSheet';
import WaterLogSheet from '../components/WaterLogSheet';
import VaccineCard from '../components/VaccineCard';
import PoopLogCard from '../components/PoopLogCard';
import VomitLogCard from '../components/VomitLogCard';
import SwipeBackWrapper from '../components/SwipeBackWrapper';
import HabitFormScreen from './HabitFormScreen';
import HabitQuickAddScreen from './HabitQuickAddScreen';
import HabitHistoryScreen from './HabitHistoryScreen';
import VaccineFormScreen from './VaccineFormScreen';
import AllergenFormScreen from './AllergenFormScreen';
import MoodHistoryScreen from './MoodHistoryScreen';
import PoopFormScreen from './PoopFormScreen';
import VomitFormScreen from './VomitFormScreen';
import MealHistoryScreen from './MealHistoryScreen';
import CycleHistoryScreen from './CycleHistoryScreen';
import ReportPickerScreen from './ReportPickerScreen';
import HeatCycleSection from '../components/HeatCycleSection';
import TabTour from '../components/TabTour';
import CycleStartSheet from '../components/CycleStartSheet';
import { useCycleTracking } from '../lib/hooks/useCycleTracking';
import { mapDogSpeciesToCycleSpecies } from '../lib/cycleLogic';
import { useTheme } from '../lib/ThemeContext';
import { useT } from '../lib/LanguageContext';
import { localeTag } from '../lib/i18n';
import { ThemeTokens } from '../lib/themes';
import { computeAge } from '../lib/petAge';
import { checkAndCreateHealthAlert } from '../lib/notificationService';
import { detectTreatmentType } from '../lib/treatmentLogic';
import { formatDate } from '../lib/vaccineDisplay';
import { toLocalDateString } from '../lib/dateUtils';

type Props = {
  dog: Dog;
  updateDog: ReturnType<typeof useDogs>['updateDog'];
  onEdit: () => void;
  onDelete: () => void;
  initialAction?: 'parasite' | 'vaccine' | null;
  onClearInitialAction?: () => void;
  tourRefs?: {
    switcherRef: RefObject<View | null>;
  };
};

type Mode =
  | 'detail'
  | 'habit-quick-add'
  | 'habit-form'
  | 'vaccine-list'
  | 'vaccine-form'
  | 'history'
  | 'mood-history'
  | 'allergen-form'
  | 'digestive-journal'
  | 'poop-form'
  | 'vomit-form'
  | 'meal-history'
  | 'cycle-history'
  | 'report-picker';

type SubTab = 'daily' | 'tummy' | 'immunity';
type JournalFilter = 'all' | 'stool' | 'vomit';

const MOOD_OPTIONS: { value: DogMood['mood']; emoji: string }[] = [
  { value: 'sleepy', emoji: '😴' },
  { value: 'off', emoji: '😟' },
  { value: 'good', emoji: '😊' },
  { value: 'great', emoji: '🤩' },
  { value: 'sick', emoji: '🤒' },
];

export default function DogDetailScreen({
  dog,
  updateDog: _updateDog,
  onEdit,
  onDelete,
  initialAction,
  onClearInitialAction,
  tourRefs,
}: Props) {
  const { theme, isDarkMode } = useTheme();
  const { t } = useT();
  const styles = useMemo(() => makeStyles(theme, isDarkMode), [theme, isDarkMode]);

  const subtitleFor = (h: Habit, count: number, target: number, done: boolean): string => {
    if (h.schedule_type === 'weekly_target') {
      const wCount = weeklyCounts.get(h.id) ?? 0;
      const wTarget = h.weekly_target_count ?? 1;
      if (wCount >= wTarget) {
        return t('habits.goalReached');
      }
      return t('habits.weeklyProgress', { count: wCount, target: wTarget });
    }

    if (h.schedule_type === 'specific_days' && h.target_days_of_week && h.target_days_of_week.length > 0) {
      const todayWeekday = new Date().getDay() + 1;
      const isDueToday = h.target_days_of_week.includes(todayWeekday);
      if (!isDueToday) {
        const map: Record<number, string> = {
          1: 'habits.weekday.sun',
          2: 'habits.weekday.mon',
          3: 'habits.weekday.tue',
          4: 'habits.weekday.wed',
          5: 'habits.weekday.thu',
          6: 'habits.weekday.fri',
          7: 'habits.weekday.sat',
        };
        const dayNames = h.target_days_of_week
          .map((v) => (map[v] ? t(map[v]) : ''))
          .filter(Boolean)
          .join(', ');
        return t('habits.scheduledForDays', { days: dayNames });
      }
    }

    if (h.schedule_type === 'interval_days' && h.interval_days) {
      if (done) return t('dogDetail.doneSubtitle');
      return t('habits.everyDaysLabel', { count: h.interval_days });
    }

    if (h.schedule_type === 'monthly') {
      if (done) return t('dogDetail.doneSubtitle');
      return t('habits.monthlyLabel');
    }

    if (h.habit_type === 'water') return t('dogDetail.mlProgress', { count, target });
    if (done) return t('dogDetail.doneSubtitle');
    if (count > 0) return t('dogDetail.countOfTarget', { count, target });
    if (target > 1) return t('dogDetail.countOfTarget', { count: 0, target });
    return h.reminder_times && h.reminder_times.length > 0
      ? t('dogDetail.dueAt', { time: h.reminder_times[0] })
      : t('dogDetail.notLoggedYet');
  };

  const [mode, setMode] = useState<Mode>('detail');
  const [activeSubTab, setActiveSubTab] = useState<SubTab>('daily');
  const [journalFilter, setJournalFilter] = useState<JournalFilter>('all');
  const [returnModeAfterForm, setReturnModeAfterForm] = useState<'detail' | 'digestive-journal'>('detail');
  const [editingHabit, setEditingHabit] = useState<Habit | null>(null);
  const [presetType, setPresetType] = useState<HabitType | undefined>(undefined);
  const [editingVaccine, setEditingVaccine] = useState<VaccineRecord | null>(null);
  const [treatmentSegment, setTreatmentSegment] = useState<'parasites' | 'vaccines'>('parasites');
  const [historyTarget, setHistoryTarget] = useState<Habit | null>(null);
  const [editingAllergen, setEditingAllergen] = useState<Allergen | null>(null);
  const [editingLog, setEditingLog] = useState<HealthLog | null>(null);
  const [editingVomitLog, setEditingVomitLog] = useState<HealthLog | null>(null);
  const [mealDetailHabitId, setMealDetailHabitId] = useState<string | null>(null);
  const [waterSheetHabitId, setWaterSheetHabitId] = useState<string | null>(null);
  const [cycleStartSheetVisible, setCycleStartSheetVisible] = useState(false);

  useFocusEffect(
    useCallback(() => {
      const sub = BackHandler.addEventListener('hardwareBackPress', () => {
        if (waterSheetHabitId !== null) {
          setWaterSheetHabitId(null);
          return true;
        }
        if (mealDetailHabitId !== null) {
          setMealDetailHabitId(null);
          return true;
        }
        if (cycleStartSheetVisible) {
          setCycleStartSheetVisible(false);
          return true;
        }
        if (mode === 'poop-form') {
          setMode(returnModeAfterForm);
          setEditingLog(null);
          return true;
        }
        if (mode === 'vomit-form') {
          setMode(returnModeAfterForm);
          setEditingVomitLog(null);
          return true;
        }
        if (mode !== 'detail') {
          setMode('detail');
          setEditingHabit(null);
          setPresetType(undefined);
          setEditingVaccine(null);
          setHistoryTarget(null);
          setEditingAllergen(null);
          return true;
        }
        return false;
      });
      return () => sub.remove();
    }, [waterSheetHabitId, mealDetailHabitId, cycleStartSheetVisible, mode, returnModeAfterForm])
  );

  const scrollRef = useRef<ScrollView>(null);
  const habitsSectionRef = useRef<View>(null);
  const addHabitRef = useRef<View>(null);
  const cycleSectionRef = useRef<View>(null);
  const poopSectionRef = useRef<View>(null);
  const tourY = useRef<{ habits?: number; cycle?: number; poop?: number }>({});
  const scrollToTour = (y?: number) =>
    scrollRef.current?.scrollTo({ y: Math.max(0, (y ?? 0) - 90), animated: true });

  const {
    habits,
    completedToday,
    completedCounts,
    completionIds,
    weeklyCounts,
    isWeeklyGoalReached,
    logHabitToday,
    resetHabitToday,
    undoOccurrence,
    logWaterAmount,
    resetWaterToday,
    addHabit,
    updateHabit,
    deleteHabit,
  } = useHabits(dog.id);
  const { upcoming, overdue, addVaccine, updateVaccine, deleteVaccine } = useVaccines(dog.id);
  const { allergens, addAllergen, updateAllergen, deleteAllergen } = useAllergens(dog.id);
  const { logs, addLog, updateLog, deleteLog } = useHealthLogs(dog.id);
  const { logs: vomitLogs, addLog: addVomitLog, updateLog: updateVomitLog, deleteLog: deleteVomitLog } = useVomitLogs(dog.id);
  const { mealDetails, getMealDetail, addMealDetail, deleteMealDetail } = useMealDetails(dog.id);
  const { mood, setTodayMood } = useDogMood(dog.id);
  usePetStreak(dog.id, habits.map((h) => h.id));
  const cycleTracking = useCycleTracking(dog.id, dog.breed);

  const { appointments: dogAppointments } = useVetAppointments(dog.id);
  const pastVetVisits = useMemo(
    () =>
      dogAppointments
        .filter((a) => a.status === 'completed' || (a.notes && a.notes.trim().length > 0))
        .sort((a, b) => new Date(b.appointmentDate).getTime() - new Date(a.appointmentDate).getTime()),
    [dogAppointments]
  );

  const cycleSpecies = mapDogSpeciesToCycleSpecies(dog.species);
  const showHeatCycle = dog.sex === 'female' && !dog.is_sterilized && (cycleSpecies === 'dog' || cycleSpecies === 'cat');

  useEffect(() => {
    if (initialAction === 'parasite') {
      setActiveSubTab('immunity');
      setTreatmentSegment('parasites');
      setEditingVaccine(null);
      setMode('vaccine-form');
      onClearInitialAction?.();
    } else if (initialAction === 'vaccine') {
      setActiveSubTab('immunity');
      setTreatmentSegment('vaccines');
      setEditingVaccine(null);
      setMode('vaccine-form');
      onClearInitialAction?.();
    }
  }, [initialAction]);

  const todayStr = toLocalDateString(new Date());
  const todayPoopLogs = useMemo(() => logs.filter((l) => l.logged_at?.slice(0, 10) === todayStr), [logs, todayStr]);
  const todayVomitLogs = useMemo(() => vomitLogs.filter((l) => l.logged_at?.slice(0, 10) === todayStr), [vomitLogs, todayStr]);

  // 7-Day Digestive Rhythm computation (last 7 calendar days ending today)
  const sevenDayRhythm = useMemo(() => {
    const days: {
      dateStr: string;
      dayLabel: string;
      status: 'ideal' | 'soft' | 'alert' | 'none';
      isToday: boolean;
    }[] = [];
    const now = new Date();
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(now.getDate() - i);
      const dStr = toLocalDateString(d);
      const dayPoops = logs.filter((l) => l.logged_at?.slice(0, 10) === dStr);
      const dayVomits = vomitLogs.filter((l) => l.logged_at?.slice(0, 10) === dStr);

      let status: 'ideal' | 'soft' | 'alert' | 'none' = 'none';
      const hasSeverePoop = dayPoops.some((p) => {
        const det = (p.details || {}) as Partial<PoopLogDetails>;
        return det.consistency === 'liquid' || det.color === 'black' || det.color === 'red';
      });
      const hasSoftPoop = dayPoops.some((p) => {
        const det = (p.details || {}) as Partial<PoopLogDetails>;
        return det.consistency === 'soft' || det.consistency === 'mucus';
      });

      if (dayVomits.length > 0 || hasSeverePoop) {
        status = 'alert';
      } else if (hasSoftPoop) {
        status = 'soft';
      } else if (dayPoops.length > 0) {
        status = 'ideal';
      }

      const dayLabel =
        i === 0
          ? t('dogDetail.today')
          : d.toLocaleDateString(localeTag(), { weekday: 'short' }).slice(0, 3);

      days.push({
        dateStr: dStr,
        dayLabel,
        status,
        isToday: i === 0,
      });
    }
    return days;
  }, [logs, vomitLogs, t]);

  // 30-Day Digestive Analytics for Hub & Journal
  const digestiveMetrics = useMemo(() => {
    const now = Date.now();
    const ms30d = 30 * 24 * 60 * 60 * 1000;
    const ms7d = 7 * 24 * 60 * 60 * 1000;

    const poops30d = logs.filter((l) => now - new Date(l.logged_at).getTime() <= ms30d);
    const vomits7d = vomitLogs.filter((l) => now - new Date(l.logged_at).getTime() <= ms7d);

    const activePoopDays = new Set(poops30d.map((l) => l.logged_at?.slice(0, 10))).size;
    const avgDailyStool = activePoopDays > 0 ? (poops30d.length / activePoopDays).toFixed(1) : '0.0';

    const idealCount = poops30d.filter((l) => {
      const det = (l.details || {}) as Partial<PoopLogDetails>;
      return (det.consistency ?? 'solid') === 'solid';
    }).length;
    const idealPct = poops30d.length > 0 ? Math.round((idealCount / poops30d.length) * 100) : 100;

    let calmDays = 30;
    if (vomitLogs.length > 0) {
      const latestVomitMs = Math.max(...vomitLogs.map((v) => new Date(v.logged_at).getTime()));
      const diffDays = Math.max(0, Math.floor((now - latestVomitMs) / (24 * 60 * 60 * 1000)));
      calmDays = Math.min(30, diffDays);
    }

    const latestPoop = logs[0] ?? null;
    const latestPoopConsistency = ((latestPoop?.details || {}) as Partial<PoopLogDetails>).consistency ?? 'solid';

    const needsAttention =
      vomits7d.length > 0 ||
      todayPoopLogs.some((p) => {
        const det = (p.details || {}) as Partial<PoopLogDetails>;
        return det.consistency === 'liquid' || det.color === 'black' || det.color === 'red';
      });

    return {
      avgDailyStool,
      idealPct,
      calmDays,
      vomits7dCount: vomits7d.length,
      latestPoop,
      latestPoopConsistency,
      needsAttention,
    };
  }, [logs, vomitLogs, todayPoopLogs]);

  // Combined date-grouped logs for Digestive Journal
  const groupedDigestiveLogs = useMemo(() => {
    const items: { kind: 'stool' | 'vomit'; log: HealthLog; ts: number; dateStr: string }[] = [];
    if (journalFilter === 'all' || journalFilter === 'stool') {
      for (const l of logs) {
        items.push({
          kind: 'stool',
          log: l,
          ts: new Date(l.logged_at).getTime(),
          dateStr: l.logged_at?.slice(0, 10) ?? '',
        });
      }
    }
    if (journalFilter === 'all' || journalFilter === 'vomit') {
      for (const v of vomitLogs) {
        items.push({
          kind: 'vomit',
          log: v,
          ts: new Date(v.logged_at).getTime(),
          dateStr: v.logged_at?.slice(0, 10) ?? '',
        });
      }
    }
    items.sort((a, b) => b.ts - a.ts);

    const yesterdayDate = new Date();
    yesterdayDate.setDate(yesterdayDate.getDate() - 1);
    const yesterdayStr = toLocalDateString(yesterdayDate);

    const groups: { dateKey: string; label: string; entries: typeof items }[] = [];
    for (const item of items) {
      let group = groups.find((g) => g.dateKey === item.dateStr);
      if (!group) {
        let label = item.dateStr;
        if (item.dateStr === todayStr) {
          label = t('mealHistory.today');
        } else if (item.dateStr === yesterdayStr) {
          label = t('mealHistory.yesterday');
        } else if (item.dateStr) {
          const parsed = new Date(item.log.logged_at);
          label = parsed.toLocaleDateString(localeTag(), {
            weekday: 'short',
            month: 'short',
            day: 'numeric',
          });
        }
        group = { dateKey: item.dateStr, label, entries: [] };
        groups.push(group);
      }
      group.entries.push(item);
    }
    return groups;
  }, [logs, vomitLogs, journalFilter, todayStr, t]);

  const mealDetailCompletionId = mealDetailHabitId ? completionIds.get(mealDetailHabitId) ?? null : null;
  const mealDetailInitial = mealDetailCompletionId ? getMealDetail(mealDetailCompletionId) ?? null : null;

  if (mode === 'habit-quick-add') {
    return (
      <HabitQuickAddScreen
        existingTypes={habits.map((h) => h.habit_type)}
        onSelect={(type) => {
          setPresetType(type);
          setMode('habit-form');
        }}
        onCancel={() => setMode('detail')}
      />
    );
  }

  if (mode === 'habit-form') {
    return (
      <HabitFormScreen
        habit={editingHabit}
        presetType={presetType}
        existingHabits={habits}
        weightKg={dog.weight_kg}
        feedingWetDryRatio={habits.find((h) => h.habit_type === 'feeding')?.wet_dry_ratio ?? null}
        addHabit={addHabit}
        updateHabit={updateHabit}
        deleteHabit={deleteHabit}
        onDone={() => {
          setMode('detail');
          setEditingHabit(null);
          setPresetType(undefined);
        }}
        onCancel={() => {
          setMode('detail');
          setEditingHabit(null);
          setPresetType(undefined);
        }}
      />
    );
  }

  if (mode === 'vaccine-list') {
    const allVaccines = [...overdue, ...upcoming];
    const vaccineList = allVaccines.filter((v) => detectTreatmentType(v.vaccine_name, v.notes) === 'vaccine');
    const parasiteList = allVaccines.filter((v) => detectTreatmentType(v.vaccine_name, v.notes) !== 'vaccine');
    const shownList = treatmentSegment === 'vaccines' ? vaccineList : parasiteList;

    async function handleAdministerToday(v: VaccineRecord, nextDueDate: string) {
      const today = toLocalDateString();
      const { error: adminErr } = await updateVaccine(v.id, {
        date_given: today,
        next_due_date: nextDueDate,
      });
      if (!adminErr) {
        Alert.alert(
          t('treatments.administeredTitle') || 'Dose Logged! 🎉',
          t('treatments.administeredBody', { name: v.vaccine_name, date: formatDate(nextDueDate) }) ||
            `${v.vaccine_name} recorded! Next dose set for ${formatDate(nextDueDate)}. 🐾`
        );
      }
    }

    return (
      <SwipeBackWrapper onBack={() => setMode('detail')}>
        <ScrollView style={styles.container} contentContainerStyle={styles.content}>
          <TouchableOpacity onPress={() => setMode('detail')} style={styles.backRow}>
            <Text style={styles.backText}>‹ {t('common.back')}</Text>
          </TouchableOpacity>

          <View style={styles.listHeader}>
            <View style={styles.listHeaderLeft}>
              <Text style={styles.listHeaderDogName}>{dog.name}</Text>
              <Text style={styles.title}>{t('treatments.immunityTitle') || 'Preventive Care & Immunity'}</Text>
            </View>
          </View>

          <View style={styles.segmentSwitcher}>
            <TouchableOpacity
              style={[styles.segmentTab, treatmentSegment === 'parasites' && styles.segmentTabActive]}
              onPress={() => setTreatmentSegment('parasites')}
              activeOpacity={0.8}
            >
              <Text style={[styles.segmentTabText, treatmentSegment === 'parasites' && styles.segmentTabTextActive]}>
                🛡️ {t('treatments.tabs.parasiteShield') || 'Parasite Shield'} ({parasiteList.length})
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.segmentTab, treatmentSegment === 'vaccines' && styles.segmentTabActive]}
              onPress={() => setTreatmentSegment('vaccines')}
              activeOpacity={0.8}
            >
              <Text style={[styles.segmentTabText, treatmentSegment === 'vaccines' && styles.segmentTabTextActive]}>
                💉 {t('treatments.tabs.vaccines') || 'Vaccines'} ({vaccineList.length})
              </Text>
            </TouchableOpacity>
          </View>

          {shownList.length === 0 ? (
            <View style={styles.emptyTreatmentCard}>
              <Text style={styles.emptyTreatmentEmoji}>
                {treatmentSegment === 'parasites' ? '🛡️' : '💉'}
              </Text>
              <Text style={styles.emptyTreatmentTitle}>
                {treatmentSegment === 'parasites'
                  ? t('treatments.noParasiteTracked') || 'No parasite shield active'
                  : t('dogDetail.noVaccinesTracked') || 'No clinical vaccines tracked'}
              </Text>
              <Text style={styles.emptyTreatmentSubtitle}>
                {treatmentSegment === 'parasites'
                  ? t('treatments.parasiteEmptyHint')
                  : t('treatments.vaccineEmptyHint')}
              </Text>
            </View>
          ) : (
            <View style={styles.treatmentList}>
              {shownList.map((v) => (
                <VaccineCard
                  key={v.id}
                  vaccine={v}
                  isOverdue={overdue.includes(v)}
                  onPress={() => {
                    setEditingVaccine(v);
                    setMode('vaccine-form');
                  }}
                  onAdministerToday={(item, nextDate) => handleAdministerToday(item, nextDate)}
                />
              ))}
            </View>
          )}

          <TouchableOpacity
            style={styles.addTreatmentBtn}
            onPress={() => {
              setEditingVaccine(null);
              setMode('vaccine-form');
            }}
            activeOpacity={0.85}
          >
            <Text style={styles.addTreatmentBtnText}>
              ＋ {treatmentSegment === 'parasites' ? t('treatments.addParasite') : t('treatments.addVaccine')}
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </SwipeBackWrapper>
    );
  }

  if (mode === 'vaccine-form') {
    return (
      <VaccineFormScreen
        vaccine={editingVaccine}
        initialType={treatmentSegment === 'parasites' ? 'parasite' : 'vaccine'}
        addVaccine={addVaccine}
        updateVaccine={updateVaccine}
        deleteVaccine={deleteVaccine}
        onDone={() => {
          setMode('detail');
          setEditingVaccine(null);
        }}
        onCancel={() => {
          setMode('detail');
          setEditingVaccine(null);
        }}
      />
    );
  }

  if (mode === 'history' && historyTarget) {
    return (
      <HabitHistoryScreen
        habit={historyTarget}
        dog={dog}
        onBack={() => {
          setMode('detail');
          setHistoryTarget(null);
        }}
      />
    );
  }

  if (mode === 'mood-history') {
    return <MoodHistoryScreen dog={dog} onBack={() => setMode('detail')} />;
  }

  if (mode === 'allergen-form') {
    return (
      <AllergenFormScreen
        allergen={editingAllergen}
        addAllergen={addAllergen}
        updateAllergen={updateAllergen}
        deleteAllergen={deleteAllergen}
        onDone={() => {
          setMode('detail');
          setEditingAllergen(null);
        }}
        onCancel={() => {
          setMode('detail');
          setEditingAllergen(null);
        }}
      />
    );
  }

  if (mode === 'digestive-journal') {
    return (
      <SwipeBackWrapper onBack={() => setMode('detail')}>
        <View style={styles.container}>
          <ScrollView style={styles.container} contentContainerStyle={styles.content}>
            <TouchableOpacity onPress={() => setMode('detail')} style={styles.backRow}>
              <Text style={styles.backText}>‹ {t('common.back')}</Text>
            </TouchableOpacity>

            <Text style={styles.title}>{t('dogDetail.digestiveJournal.title')}</Text>
            <Text style={styles.subtitle}>
              {t('dogDetail.digestiveJournal.subtitle', { name: dog.name })}
            </Text>

            {/* 30-Day Gut Health KPI Ribbon */}
            <View style={styles.journalKpiRibbon}>
              <View style={styles.journalKpiCard}>
                <Text style={styles.journalKpiVal}>{digestiveMetrics.avgDailyStool}x</Text>
                <Text style={styles.journalKpiLabel}>{t('dogDetail.digestiveJournal.kpiAvgDaily')}</Text>
              </View>
              <View style={[styles.journalKpiCard, styles.journalKpiCardCenter]}>
                <Text style={[styles.journalKpiVal, { color: theme.done }]}>{digestiveMetrics.idealPct}%</Text>
                <Text style={styles.journalKpiLabel}>{t('dogDetail.digestiveJournal.kpiIdealPct')}</Text>
              </View>
              <View style={styles.journalKpiCard}>
                <Text style={styles.journalKpiVal}>
                  {t('dogDetail.digestiveJournal.kpiDaysUnit', { count: digestiveMetrics.calmDays })}
                </Text>
                <Text style={styles.journalKpiLabel}>{t('dogDetail.digestiveJournal.kpiCalmDays')}</Text>
              </View>
            </View>

            {/* Bisco AI Care Insight Card */}
            <View style={styles.journalInsightCard}>
              <Text style={styles.journalInsightTitle}>
                ✨{' '}
                {digestiveMetrics.needsAttention
                  ? t('dogDetail.digestiveJournal.insightWatchTitle')
                  : t('dogDetail.digestiveJournal.insightStableTitle')}
              </Text>
              <Text style={styles.journalInsightBody}>
                {digestiveMetrics.needsAttention
                  ? t('dogDetail.digestiveJournal.insightWatchBody')
                  : t('dogDetail.digestiveJournal.insightStableBody', {
                      name: dog.name,
                      pct: digestiveMetrics.idealPct,
                      days: digestiveMetrics.calmDays,
                    })}
              </Text>
            </View>

            {/* Filter Pills */}
            <View style={styles.journalFilterRow}>
              {(
                [
                  { key: 'all', label: `${t('dogDetail.digestiveJournal.filterAll')} (${logs.length + vomitLogs.length})` },
                  { key: 'stool', label: `💩 ${t('dogDetail.digestiveJournal.filterStool')} (${logs.length})` },
                  { key: 'vomit', label: `🧪 ${t('dogDetail.digestiveJournal.filterVomit')} (${vomitLogs.length})` },
                ] as { key: JournalFilter; label: string }[]
              ).map((f) => {
                const active = journalFilter === f.key;
                return (
                  <TouchableOpacity
                    key={f.key}
                    style={[styles.journalFilterPill, active && styles.journalFilterPillActive]}
                    onPress={() => setJournalFilter(f.key)}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.journalFilterPillText, active && styles.journalFilterPillTextActive]}>
                      {f.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Date-Grouped Chronological Stream */}
            {groupedDigestiveLogs.length === 0 ? (
              <View style={styles.emptyTreatmentCard}>
                <Text style={styles.emptyTreatmentEmoji}>🩺</Text>
                <Text style={styles.emptyTreatmentSubtitle}>
                  {t('dogDetail.digestiveJournal.emptyFilter')}
                </Text>
              </View>
            ) : (
              groupedDigestiveLogs.map((group) => (
                <View key={group.dateKey} style={styles.journalDateSection}>
                  <Text style={styles.journalDateHeader}>{group.label}</Text>
                  <View style={styles.card}>
                    {group.entries.map((entry, idx) => (
                      <View key={entry.log.id}>
                        {entry.kind === 'stool' ? (
                          <PoopLogCard
                            log={entry.log}
                            onPress={() => {
                              setReturnModeAfterForm('digestive-journal');
                              setEditingLog(entry.log);
                              setMode('poop-form');
                            }}
                          />
                        ) : (
                          <VomitLogCard
                            log={entry.log}
                            onPress={() => {
                              setReturnModeAfterForm('digestive-journal');
                              setEditingVomitLog(entry.log);
                              setMode('vomit-form');
                            }}
                          />
                        )}
                        {idx < group.entries.length - 1 ? <View style={styles.divider} /> : null}
                      </View>
                    ))}
                  </View>
                </View>
              ))
            )}
          </ScrollView>

          {/* Bottom Dual Quick-Add Bar */}
          <View style={styles.journalBottomBar}>
            <TouchableOpacity
              style={styles.journalPrimaryBtn}
              onPress={() => {
                setReturnModeAfterForm('digestive-journal');
                setEditingLog(null);
                setMode('poop-form');
              }}
              activeOpacity={0.85}
            >
              <Text style={styles.journalPrimaryBtnText}>💩 {t('dogDetail.digestiveHub.logStoolBtn')}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.journalSecondaryBtn}
              onPress={() => {
                setReturnModeAfterForm('digestive-journal');
                setEditingVomitLog(null);
                setMode('vomit-form');
              }}
              activeOpacity={0.85}
            >
              <Text style={styles.journalSecondaryBtnText}>🧪 {t('dogDetail.digestiveHub.logIncidentBtn')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </SwipeBackWrapper>
    );
  }

  if (mode === 'poop-form') {
    return (
      <PoopFormScreen
        log={editingLog}
        addLog={addLog}
        updateLog={updateLog}
        deleteLog={deleteLog}
        onDone={() => {
          setMode(returnModeAfterForm);
          setEditingLog(null);
        }}
        onCancel={() => {
          setMode(returnModeAfterForm);
          setEditingLog(null);
        }}
      />
    );
  }

  if (mode === 'vomit-form') {
    return (
      <VomitFormScreen
        log={editingVomitLog}
        addLog={addVomitLog}
        updateLog={updateVomitLog}
        deleteLog={deleteVomitLog}
        onDone={() => {
          setMode(returnModeAfterForm);
          setEditingVomitLog(null);
        }}
        onCancel={() => {
          setMode(returnModeAfterForm);
          setEditingVomitLog(null);
        }}
      />
    );
  }

  if (mode === 'meal-history') {
    return (
      <MealHistoryScreen
        dog={dog}
        mealDetails={mealDetails}
        addMealDetail={addMealDetail}
        deleteMealDetail={deleteMealDetail}
        onBack={() => setMode('detail')}
      />
    );
  }

  if (mode === 'cycle-history') {
    return (
      <CycleHistoryScreen
        dog={dog}
        tracking={cycleTracking}
        onBack={() => setMode('detail')}
        onStartCycle={() => setCycleStartSheetVisible(true)}
      />
    );
  }

  if (mode === 'report-picker') {
    return <ReportPickerScreen dog={dog} onBack={() => setMode('detail')} />;
  }

  const sexLabel = dog.sex === 'male' ? t('dogDetail.male') : dog.sex === 'female' ? t('dogDetail.female') : null;
  const sterilizedLabel =
    dog.sex === 'male'
      ? dog.is_sterilized
        ? t('dogDetail.neutered')
        : t('dogDetail.notNeutered')
      : dog.is_sterilized
        ? t('dogDetail.sterilized')
        : t('dogDetail.notSterilized');
  const age = computeAge(dog.birth_date);
  const metaLine = [dog.species, dog.breed, sexLabel, sterilizedLabel, age].filter(Boolean).join(' · ');
  const allVaccineRecords = [...overdue, ...upcoming];
  const vaccineList = allVaccineRecords.filter((v) => detectTreatmentType(v.vaccine_name, v.notes) === 'vaccine');
  const parasiteList = allVaccineRecords.filter((v) => detectTreatmentType(v.vaccine_name, v.notes) !== 'vaccine');
  const vaccineOverdueCount = vaccineList.filter((v) => overdue.includes(v)).length;
  const parasiteOverdueCount = parasiteList.filter((v) => overdue.includes(v)).length;
  const nextVaccine = vaccineList[0] || null;
  const nextParasite = parasiteList[0] || null;

  const latestStoolLabel = !digestiveMetrics.latestPoop
    ? t('dogDetail.digestiveHub.stoolNoneToday')
    : digestiveMetrics.latestPoopConsistency === 'solid'
      ? t('dogDetail.digestiveHub.stoolLatestIdeal')
      : digestiveMetrics.latestPoopConsistency === 'soft'
        ? t('dogDetail.digestiveHub.stoolLatestSoft')
        : digestiveMetrics.latestPoopConsistency === 'liquid'
          ? t('dogDetail.digestiveHub.stoolLatestLiquid')
          : t('dogDetail.digestiveHub.stoolLatestMucus');

  return (
    <>
      <ScrollView ref={scrollRef} style={styles.container} contentContainerStyle={styles.content}>
        {/* 1. Unified Pet Health Passport Card */}
        <View style={styles.passportCard}>
          <View style={styles.passportHeader}>
            {dog.photo_url ? (
              <Image source={{ uri: dog.photo_url }} style={styles.photo} />
            ) : (
              <View style={styles.photoPlaceholder}>
                <Text style={styles.emoji}>🐾</Text>
              </View>
            )}
            <View style={styles.heroInfo}>
              <View style={styles.heroTitleRow}>
                <Text style={styles.name} numberOfLines={1}>
                  {dog.name}
                </Text>
                <View style={styles.stampBadge}>
                  <View style={styles.stampDot} />
                  <Text style={styles.stampText}>
                    {mood?.mood === 'sick' ? 'Needs Care' : mood?.mood === 'off' ? 'A Bit Off' : 'Thriving'}
                  </Text>
                </View>
              </View>
              {metaLine ? (
                <Text style={styles.meta} numberOfLines={1}>
                  {metaLine}
                </Text>
              ) : null}
            </View>
          </View>

          <View style={styles.statStrip}>
            <View style={styles.statCell}>
              <Text style={styles.statValue}>{dog.weight_kg != null ? `${dog.weight_kg} kg` : '—'}</Text>
              <Text style={styles.statLabel}>{t('dogDetail.weight')}</Text>
            </View>
            <View style={[styles.statCell, styles.statCellBorder]}>
              <Text style={styles.statValue}>
                {completedToday.size}/{habits.length}
              </Text>
              <Text style={styles.statLabel}>{t('dogDetail.today')}</Text>
            </View>
            <View style={styles.statCell}>
              <Text style={styles.statValue}>{habits.length}</Text>
              <Text style={styles.statLabel}>{t('dogDetail.habits')}</Text>
            </View>
          </View>
        </View>

        <View style={styles.headerButtons}>
          <TouchableOpacity style={styles.editButton} onPress={onEdit} activeOpacity={0.8}>
            <Text style={styles.editButtonText}>✏️ {t('dogDetail.editPet')}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.deleteButton}
            onPress={() => {
              Alert.alert(
                t('dogDetail.deletePetTitle'),
                t('dogDetail.deletePetMessage', { name: dog.name }),
                [
                  { text: t('common.cancel'), style: 'cancel' },
                  { text: t('common.delete'), style: 'destructive', onPress: onDelete },
                ]
              );
            }}
            activeOpacity={0.8}
          >
            <Text style={styles.deleteButtonText}>{t('dogDetail.deletePet')}</Text>
          </TouchableOpacity>
        </View>

        {/* 2. 3-Tab Segmented Pill Switcher (Section 11 Architecture) */}
        <View style={styles.subTabBar}>
          <TouchableOpacity
            style={[styles.subTabPill, activeSubTab === 'daily' && styles.subTabPillActive]}
            onPress={() => setActiveSubTab('daily')}
            activeOpacity={0.85}
          >
            <Text
              style={[styles.subTabText, activeSubTab === 'daily' && styles.subTabTextActive]}
              numberOfLines={1}
            >
              🌿 {t('dogDetail.tabs.dailyCare')}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.subTabPill, activeSubTab === 'tummy' && styles.subTabPillActive]}
            onPress={() => setActiveSubTab('tummy')}
            activeOpacity={0.85}
          >
            <Text
              style={[styles.subTabText, activeSubTab === 'tummy' && styles.subTabTextActive]}
              numberOfLines={1}
            >
              🩺 {t('dogDetail.tabs.tummyHealth')}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.subTabPill, activeSubTab === 'immunity' && styles.subTabPillActive]}
            onPress={() => setActiveSubTab('immunity')}
            activeOpacity={0.85}
          >
            <Text
              style={[styles.subTabText, activeSubTab === 'immunity' && styles.subTabTextActive]}
              numberOfLines={1}
            >
              🛡️ {t('dogDetail.tabs.immunityRecords')}
            </Text>
          </TouchableOpacity>
        </View>

        {/* ============================================================ */}
        {/* SUB-TAB 1: DAILY CARE (Mood, Habits, Water, Meals)           */}
        {/* ============================================================ */}
        {activeSubTab === 'daily' ? (
          <>
            <View style={styles.moodCard}>
              <View style={styles.moodLabelRow}>
                <View style={styles.moodTitleGroup}>
                  <Text style={styles.moodCardHeader}>TODAY'S WELL-BEING</Text>
                  <Text style={styles.moodLabel}>{t('mood.question', { name: dog.name })}</Text>
                </View>
                <TouchableOpacity
                  onPress={() => setMode('mood-history')}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  style={styles.moodHistoryBtn}
                >
                  <Text style={styles.moodHistoryIcon}>🕒 {t('habitRow.history')}</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.moodGrid}>
                {MOOD_OPTIONS.map((opt) => {
                  const selected = mood?.mood === opt.value;
                  return (
                    <TouchableOpacity
                      key={opt.value}
                      style={[styles.moodBtn, selected && styles.moodBtnSelected]}
                      onPress={async () => {
                        await setTodayMood(opt.value);
                        checkAndCreateHealthAlert(dog.id, dog.owner_id);
                      }}
                      activeOpacity={0.75}
                    >
                      <Text style={styles.moodEmoji}>{opt.emoji}</Text>
                      <Text style={[styles.moodBtnLabel, selected && styles.moodBtnLabelSelected]}>
                        {t('mood.' + opt.value)}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            <View
              ref={habitsSectionRef}
              collapsable={false}
              onLayout={(e) => {
                tourY.current.habits = e.nativeEvent.layout.y;
              }}
              style={styles.section}
            >
              <View style={styles.sectionTitleRow}>
                <Text style={styles.sectionTitle}>{t('dogDetail.todaysHabits')}</Text>
                <View ref={addHabitRef} collapsable={false}>
                  <TouchableOpacity
                    onPress={() => {
                      setEditingHabit(null);
                      setMode('habit-quick-add');
                    }}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Text style={styles.addIcon}>+</Text>
                  </TouchableOpacity>
                </View>
              </View>
              {habits.length === 0 ? (
                <Text style={styles.emptyText}>{t('dogDetail.noHabitsAddOne')}</Text>
              ) : (
                <View style={styles.card}>
                  {habits.map((h, idx) => {
                    const isWeekly = h.schedule_type === 'weekly_target';
                    const target = isWeekly ? (h.weekly_target_count ?? 1) : getHabitTarget(h);
                    const done = isWeekly ? isWeeklyGoalReached(h) : completedToday.has(h.id);
                    const count = isWeekly
                      ? (weeklyCounts.get(h.id) ?? 0)
                      : (completedCounts.get(h.id) ?? (done && target <= 1 ? 1 : 0));
                    const inProgress = !done && count > 0;
                    const isWater = h.habit_type === 'water';

                    return (
                      <View key={h.id}>
                        <HabitRow
                          habit={h}
                          count={count}
                          target={target}
                          done={done}
                          inProgress={inProgress}
                          subtitle={subtitleFor(h, count, target, done)}
                          actionDisabled={isWater}
                          onPressAction={() => {
                            if (isWeekly) {
                              if (!done) {
                                logHabitToday(h.id);
                              } else {
                                resetHabitToday(h.id);
                              }
                              return;
                            }
                            if (!done) {
                              logHabitToday(h.id);
                              return;
                            }
                            isWater ? resetWaterToday(h.id) : resetHabitToday(h.id);
                          }}
                          onResetToday={() => {
                            isWater ? resetWaterToday(h.id) : resetHabitToday(h.id);
                          }}
                          onLongPressAction={() => {
                            if (count <= 0) return;
                            Alert.alert(
                              h.title,
                              t('habitRow.manageProgress', { count, target }) ||
                                `${t('home.today') || 'Today'}: ${count}/${target}`,
                              [
                                { text: t('common.cancel'), style: 'cancel' },
                                target > 1 && count > 1
                                  ? {
                                      text: t('habitRow.undoOne') || 'Undo one (-1)',
                                      onPress: () => undoOccurrence(h.id),
                                    }
                                  : null,
                                {
                                  text: t('habitRow.resetToZero') || 'Reset to 0',
                                  style: 'destructive',
                                  onPress: () => (isWater ? resetWaterToday(h.id) : resetHabitToday(h.id)),
                                },
                              ].filter(Boolean) as any
                            );
                          }}
                          onEdit={() => {
                            setEditingHabit(h);
                            setPresetType(undefined);
                            setMode('habit-form');
                          }}
                          onDelete={() => deleteHabit(h.id)}
                          onViewHistory={() => {
                            setHistoryTarget(h);
                            setMode('history');
                          }}
                        />
                        {isWater && !done ? (
                          <WaterIncrementRow
                            onAdd={(amount) => logWaterAmount(h.id, amount)}
                            onReset={() => resetWaterToday(h.id)}
                            onCustom={() => setWaterSheetHabitId(h.id)}
                          />
                        ) : null}
                        {h.habit_type === 'feeding' && (done || count > 0) && completionIds.get(h.id) ? (
                          <MealDetailLink
                            detail={getMealDetail(completionIds.get(h.id)!)}
                            onPress={() => setMealDetailHabitId(h.id)}
                          />
                        ) : null}
                        {idx < habits.length - 1 ? <View style={styles.divider} /> : null}
                      </View>
                    );
                  })}
                </View>
              )}
            </View>

            {mealDetails.length > 0 ? (
              <TouchableOpacity style={styles.vaccineLink} onPress={() => setMode('meal-history')}>
                <Text style={styles.vaccineLinkText}>{t('dogDetail.mealHistory')}</Text>
              </TouchableOpacity>
            ) : null}
          </>
        ) : null}

        {/* ============================================================ */}
        {/* SUB-TAB 2: TUMMY & HEALTH (Unified Digestive Hub, Allergens) */}
        {/* ============================================================ */}
        {activeSubTab === 'tummy' ? (
          <>
            <View
              ref={poopSectionRef}
              collapsable={false}
              onLayout={(e) => {
                tourY.current.poop = e.nativeEvent.layout.y;
              }}
              style={styles.digestiveHubCard}
            >
              {/* Header & Gut Balance Status Badge */}
              <View style={styles.digestiveHubHeader}>
                <Text style={styles.digestiveHubBadge}>{t('dogDetail.digestiveHub.badge')}</Text>
                <Text style={styles.digestiveHubTitle}>🩺 {t('dogDetail.digestiveHub.title')}</Text>
                <View
                  style={[
                    styles.gutStatusBanner,
                    digestiveMetrics.needsAttention ? styles.gutStatusWarning : styles.gutStatusGood,
                  ]}
                >
                  <Text
                    style={[
                      styles.gutStatusText,
                      { color: digestiveMetrics.needsAttention ? theme.pendingAmberText : theme.done },
                    ]}
                  >
                    {digestiveMetrics.needsAttention
                      ? `🟡 ${t('dogDetail.digestiveHub.statusAttention')}`
                      : `🟢 ${t('dogDetail.digestiveHub.statusStable', { days: digestiveMetrics.calmDays })}`}
                  </Text>
                </View>
              </View>

              {/* 7-Day Consistency Rhythm Strip */}
              <View style={styles.rhythmBox}>
                <View style={styles.rhythmHeaderRow}>
                  <Text style={styles.rhythmLabel}>{t('dogDetail.digestiveHub.rhythmLabel')}</Text>
                  <View style={styles.rhythmLegendRow}>
                    <View style={[styles.legendDot, { backgroundColor: theme.done }]} />
                    <Text style={styles.legendText}>{t('dogDetail.digestiveHub.legendIdeal')}</Text>
                    <View style={[styles.legendDot, { backgroundColor: theme.pending }]} />
                    <Text style={styles.legendText}>{t('dogDetail.digestiveHub.legendSoft')}</Text>
                    <View style={[styles.legendDot, { backgroundColor: theme.allergenText }]} />
                    <Text style={styles.legendText}>{t('dogDetail.digestiveHub.legendAlert')}</Text>
                  </View>
                </View>

                <View style={styles.rhythmDaysRow}>
                  {sevenDayRhythm.map((day) => {
                    const dotBg =
                      day.status === 'ideal'
                        ? theme.done
                        : day.status === 'soft'
                          ? theme.pending
                          : day.status === 'alert'
                            ? theme.allergenText
                            : theme.border;
                    return (
                      <TouchableOpacity
                        key={day.dateStr}
                        style={[styles.rhythmDayCol, day.isToday && styles.rhythmDayColToday]}
                        onPress={() => {
                          setJournalFilter('all');
                          setMode('digestive-journal');
                        }}
                        activeOpacity={0.75}
                      >
                        <Text style={[styles.rhythmDayText, day.isToday && styles.rhythmDayTextToday]}>
                          {day.dayLabel}
                        </Text>
                        <View
                          style={[
                            styles.rhythmStatusCircle,
                            { backgroundColor: dotBg },
                            day.status === 'none' && styles.rhythmStatusCircleEmpty,
                          ]}
                        >
                          {day.status === 'ideal' ? (
                            <Text style={styles.rhythmCircleCheck}>✓</Text>
                          ) : day.status === 'alert' ? (
                            <Text style={styles.rhythmCircleCheck}>!</Text>
                          ) : null}
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              {/* Side-by-Side Quick Log Cards */}
              <View style={styles.quickCardsRow}>
                {/* Left Card: Stool Quality */}
                <View style={styles.quickActionCard}>
                  <TouchableOpacity
                    onPress={() => {
                      setJournalFilter('stool');
                      setMode('digestive-journal');
                    }}
                    activeOpacity={0.75}
                  >
                    <Text style={styles.quickCardCap}>💩 {t('dogDetail.digestiveHub.stoolCardTitle')}</Text>
                    <Text style={styles.quickCardMain} numberOfLines={1}>
                      {latestStoolLabel}
                    </Text>
                    <Text style={styles.quickCardSub} numberOfLines={1}>
                      {todayPoopLogs.length > 0
                        ? `${todayPoopLogs.length}x ${t('dogDetail.today').toLowerCase()}`
                        : t('dogDetail.noPoopToday')}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.quickCardPrimaryBtn}
                    onPress={() => {
                      setReturnModeAfterForm('detail');
                      setEditingLog(null);
                      setMode('poop-form');
                    }}
                    activeOpacity={0.85}
                  >
                    <Text style={styles.quickCardPrimaryBtnText}>{t('dogDetail.digestiveHub.logStoolBtn')}</Text>
                  </TouchableOpacity>
                </View>

                {/* Right Card: Tummy & Emesis */}
                <View style={styles.quickActionCard}>
                  <TouchableOpacity
                    onPress={() => {
                      setJournalFilter('vomit');
                      setMode('digestive-journal');
                    }}
                    activeOpacity={0.75}
                  >
                    <Text style={styles.quickCardCap}>🧪 {t('dogDetail.digestiveHub.tummyCardTitle')}</Text>
                    <Text style={styles.quickCardMain} numberOfLines={1}>
                      {digestiveMetrics.vomits7dCount === 0
                        ? t('dogDetail.digestiveHub.tummyCalmWeek')
                        : t('dogDetail.digestiveHub.tummyEpisodesWeek', {
                            count: digestiveMetrics.vomits7dCount,
                          })}
                    </Text>
                    <Text style={styles.quickCardSub} numberOfLines={1}>
                      {digestiveMetrics.vomits7dCount === 0
                        ? t('dogDetail.digestiveHub.tummyCalmSub')
                        : t('dogDetail.digestiveHub.tummyRecentSub')}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.quickCardSecondaryBtn}
                    onPress={() => {
                      setReturnModeAfterForm('detail');
                      setEditingVomitLog(null);
                      setMode('vomit-form');
                    }}
                    activeOpacity={0.85}
                  >
                    <Text style={styles.quickCardSecondaryBtnText}>
                      {t('dogDetail.digestiveHub.logIncidentBtn')}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Today's Digestive Logs Inline Preview */}
              {todayPoopLogs.length > 0 || todayVomitLogs.length > 0 ? (
                <View style={styles.todayDigestiveBox}>
                  <Text style={styles.todayDigestiveLabel}>
                    {t('dogDetail.digestiveHub.todayLogsHeader')}
                  </Text>
                  {todayPoopLogs.map((l) => (
                    <PoopLogCard
                      key={l.id}
                      log={l}
                      onPress={() => {
                        setReturnModeAfterForm('detail');
                        setEditingLog(l);
                        setMode('poop-form');
                      }}
                    />
                  ))}
                  {todayVomitLogs.map((v) => (
                    <VomitLogCard
                      key={v.id}
                      log={v}
                      onPress={() => {
                        setReturnModeAfterForm('detail');
                        setEditingVomitLog(v);
                        setMode('vomit-form');
                      }}
                    />
                  ))}
                </View>
              ) : null}

              {/* Open Unified Digestive Journal CTA */}
              <TouchableOpacity
                style={styles.openJournalBtn}
                onPress={() => {
                  setJournalFilter('all');
                  setMode('digestive-journal');
                }}
                activeOpacity={0.8}
              >
                <Text style={styles.openJournalBtnText}>
                  {t('dogDetail.digestiveHub.openJournalBtn')} ({logs.length + vomitLogs.length})
                </Text>
              </TouchableOpacity>
            </View>

            {/* Food Sensitivities / Allergens Card */}
            <View style={styles.section}>
              <View style={styles.sectionTitleRow}>
                <Text style={styles.sectionTitle}>{t('dogDetail.foodSensitivities')}</Text>
                <TouchableOpacity
                  style={styles.addChip}
                  onPress={() => {
                    setEditingAllergen(null);
                    setMode('allergen-form');
                  }}
                >
                  <Text style={styles.addChipText}>{t('dogDetail.addShort')}</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.card}>
                {allergens.length > 0 ? (
                  <View style={styles.allergenRow}>
                    {allergens.map((a) => (
                      <TouchableOpacity
                        key={a.id}
                        style={styles.allergenChip}
                        onPress={() => {
                          setEditingAllergen(a);
                          setMode('allergen-form');
                        }}
                      >
                        <Text style={styles.allergenChipText}>🚫 {a.allergen}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                ) : (
                  <Text style={styles.emptyText}>{t('dogDetail.noSensitivities')}</Text>
                )}
              </View>
            </View>

            {/* Weight & Body Condition Card */}
            <View style={styles.protectionWidget}>
              <View style={styles.protectionHeaderRow}>
                <View style={styles.protectionTitleCol}>
                  <Text style={styles.protectionBadge}>{t('dogDetail.weightCard.badge')}</Text>
                  <Text style={styles.protectionTitle}>⚖️ {t('dogDetail.weightCard.title')}</Text>
                </View>
                <TouchableOpacity style={styles.protectionAddBtn} onPress={onEdit} activeOpacity={0.8}>
                  <Text style={styles.protectionAddBtnText}>{t('dogDetail.weightCard.updateBtn')}</Text>
                </TouchableOpacity>
              </View>
              <Text style={styles.weightBigValue}>
                {dog.weight_kg != null ? `${dog.weight_kg} kg` : t('dogDetail.weightCard.notSet')}
              </Text>
              <Text style={styles.emptyText}>{t('dogDetail.weightCard.clinicalHint')}</Text>
            </View>
          </>
        ) : null}

        {/* ============================================================ */}
        {/* SUB-TAB 3: IMMUNITY & RECORDS (Vaccines, Cycle, Vet, PDF)    */}
        {/* ============================================================ */}
        {activeSubTab === 'immunity' ? (
          <>
            <View style={[styles.protectionWidget, { marginTop: 0 }]}>
              <View style={styles.protectionHeaderRow}>
                <View style={styles.protectionTitleCol}>
                  <Text style={styles.protectionBadge}>IMMUNITY & PROTECTION</Text>
                  <Text style={styles.protectionTitle}>
                    🛡️ {t('treatments.immunityTitle') || 'Immunity & Protection'}
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.protectionAddBtn}
                  onPress={() => {
                    setEditingVaccine(null);
                    setMode('vaccine-form');
                  }}
                  activeOpacity={0.75}
                >
                  <Text style={styles.protectionAddBtnText}>＋ {t('common.add') || 'Add'}</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.protectionGrid}>
                <TouchableOpacity
                  style={styles.protectionSubCard}
                  onPress={() => {
                    setTreatmentSegment('vaccines');
                    setMode('vaccine-list');
                  }}
                  activeOpacity={0.8}
                >
                  <View style={styles.subCardTopRow}>
                    <Text style={styles.subCardEmoji}>💉</Text>
                    <Text style={[styles.subCardStatus, vaccineOverdueCount > 0 ? styles.statusBad : styles.statusGood]}>
                      {vaccineOverdueCount > 0
                        ? `${vaccineOverdueCount} Overdue`
                        : vaccineList.length > 0
                          ? 'Up to date'
                          : 'Not set'}
                    </Text>
                  </View>
                  <Text style={styles.subCardTitle}>{t('treatments.types.vaccine') || 'Vaccines'}</Text>
                  <Text style={styles.subCardMeta} numberOfLines={1}>
                    {nextVaccine ? `Next: ${nextVaccine.vaccine_name}` : 'No upcoming shots'}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.protectionSubCard}
                  onPress={() => {
                    setTreatmentSegment('parasites');
                    setMode('vaccine-list');
                  }}
                  activeOpacity={0.8}
                >
                  <View style={styles.subCardTopRow}>
                    <Text style={styles.subCardEmoji}>🛡️</Text>
                    <Text
                      style={[styles.subCardStatus, parasiteOverdueCount > 0 ? styles.statusBad : styles.statusGood]}
                    >
                      {parasiteOverdueCount > 0
                        ? `${parasiteOverdueCount} Overdue`
                        : parasiteList.length > 0
                          ? 'Protected'
                          : 'Not set'}
                    </Text>
                  </View>
                  <Text style={styles.subCardTitle}>{t('treatments.tabs.parasiteShield') || 'Parasite Shield'}</Text>
                  <Text style={styles.subCardMeta} numberOfLines={1}>
                    {nextParasite ? `Next: ${nextParasite.vaccine_name}` : 'Tap to protect'}
                  </Text>
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                style={styles.protectionManageBtn}
                onPress={() => setMode('vaccine-list')}
                activeOpacity={0.8}
              >
                <Text style={styles.protectionManageBtnText}>
                  {t('treatments.managePlan') || 'Manage Preventive Care Plan →'}
                </Text>
              </TouchableOpacity>
            </View>

            {showHeatCycle && cycleSpecies ? (
              <View
                ref={cycleSectionRef}
                collapsable={false}
                onLayout={(e) => {
                  tourY.current.cycle = e.nativeEvent.layout.y;
                }}
              >
                <HeatCycleSection
                  dog={dog}
                  tracking={cycleTracking}
                  onStartCycle={() => setCycleStartSheetVisible(true)}
                  onViewHistory={() => setMode('cycle-history')}
                />
              </View>
            ) : null}

            {/* Past Vet Visits & Clinical Notes Section */}
            <View style={styles.section}>
              <View style={styles.sectionTitleRow}>
                <Text style={styles.sectionTitle}>🏥 {t('dogDetail.pastVetVisits')}</Text>
              </View>
              {pastVetVisits.length > 0 ? (
                <View style={styles.card}>
                  {pastVetVisits.map((visit, idx) => (
                    <View key={visit.id} style={{ paddingVertical: 10, paddingHorizontal: 4 }}>
                      <View
                        style={{
                          flexDirection: 'row',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          marginBottom: 4,
                        }}
                      >
                        <Text style={{ fontSize: 15, fontWeight: '700', color: theme.textDark }}>{visit.title}</Text>
                        <Text style={{ fontSize: 12, color: theme.textMuted, fontWeight: '600' }}>
                          {visit.appointmentDate}
                        </Text>
                      </View>
                      {visit.clinicName ? (
                        <Text style={{ fontSize: 13, color: theme.primary, fontWeight: '600', marginBottom: 4 }}>
                          📍 {visit.clinicName}
                        </Text>
                      ) : null}
                      {visit.notes ? (
                        <View
                          style={{
                            backgroundColor: theme.background,
                            borderRadius: 10,
                            padding: 10,
                            marginTop: 4,
                            borderWidth: 1,
                            borderColor: theme.border,
                          }}
                        >
                          <Text style={{ fontSize: 13, color: theme.textDark, lineHeight: 18 }}>{visit.notes}</Text>
                        </View>
                      ) : null}
                      {idx < pastVetVisits.length - 1 ? <View style={[styles.divider, { marginTop: 10 }]} /> : null}
                    </View>
                  ))}
                </View>
              ) : (
                <View style={styles.card}>
                  <Text style={styles.emptyText}>{t('dogDetail.noPastVetVisits')}</Text>
                </View>
              )}
            </View>

            {/* 1-Tap Clinical PDF Vet Dossier Export Card */}
            <View style={styles.protectionWidget}>
              <Text style={styles.protectionBadge}>{t('dogDetail.dossierCard.badge')}</Text>
              <Text style={[styles.protectionTitle, { marginBottom: 6 }]}>
                📄 {t('dogDetail.dossierCard.title')}
              </Text>
              <Text style={[styles.emptyText, { marginBottom: 14, lineHeight: 18 }]}>
                {t('dogDetail.dossierCard.subtitle')}
              </Text>
              <TouchableOpacity
                style={styles.protectionManageBtn}
                onPress={() => setMode('report-picker')}
                activeOpacity={0.85}
              >
                <Text style={styles.protectionManageBtnText}>{t('dogDetail.dossierCard.exportBtn')}</Text>
              </TouchableOpacity>
            </View>
          </>
        ) : null}
      </ScrollView>

      {tourRefs ? (
        <TabTour
          tab="pets"
          enabled
          steps={[
            {
              targetRef: tourRefs.switcherRef,
              position: 'bottom',
              title: t('tour.pets.s1Title'),
              body: t('tour.pets.s1Body'),
              ensureVisible: () => {
                setActiveSubTab('daily');
                scrollRef.current?.scrollTo({ y: 0, animated: false });
              },
            },
            {
              targetRef: habitsSectionRef,
              position: 'bottom',
              title: t('tour.pets.s2Title'),
              body: t('tour.pets.s2Body'),
              ensureVisible: () => {
                setActiveSubTab('daily');
                scrollToTour(tourY.current.habits);
              },
            },
            {
              targetRef: addHabitRef,
              position: 'bottom',
              title: t('tour.pets.s3Title'),
              body: t('tour.pets.s3Body'),
              ensureVisible: () => {
                setActiveSubTab('daily');
                scrollToTour(tourY.current.habits);
              },
            },
          ]}
        />
      ) : null}

      <MealDetailSheet
        visible={mealDetailHabitId !== null}
        initial={mealDetailInitial}
        onClose={() => setMealDetailHabitId(null)}
        onSave={async (details) => {
          if (!mealDetailCompletionId) return { error: new Error(t('dogDetail.noCompletionFound')) };
          const { error } = await addMealDetail(mealDetailCompletionId, dog.id, details);
          if (!error) setMealDetailHabitId(null);
          return { error };
        }}
      />
      <WaterLogSheet
        visible={waterSheetHabitId !== null}
        onClose={() => setWaterSheetHabitId(null)}
        onSave={async (amountMl, notes) => {
          if (!waterSheetHabitId) return;
          await logWaterAmount(waterSheetHabitId, amountMl, notes);
          setWaterSheetHabitId(null);
        }}
      />
      {cycleSpecies ? (
        <CycleStartSheet
          visible={cycleStartSheetVisible}
          species={cycleSpecies}
          onClose={() => setCycleStartSheetVisible(false)}
          onSave={async (startDate, notes) => {
            await cycleTracking.startCycle(cycleSpecies, startDate, notes ?? undefined);
            setCycleStartSheetVisible(false);
          }}
        />
      ) : null}
    </>
  );
}

function makeStyles(theme: ThemeTokens, isDarkMode = false) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.background,
    },
    content: {
      padding: 16,
      paddingTop: 20,
      paddingBottom: 36,
    },
    backRow: {
      marginBottom: 16,
    },
    backText: {
      color: theme.primary,
      fontSize: 16,
      fontWeight: '600',
    },
    title: {
      fontSize: 22,
      fontWeight: '800',
      color: theme.textDark,
    },
    subtitle: {
      fontSize: 13,
      color: theme.textMuted,
      marginTop: 2,
      marginBottom: 16,
    },
    listHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 16,
    },
    listHeaderLeft: {
      flex: 1,
      minWidth: 0,
    },
    listHeaderDogName: {
      fontSize: 12,
      color: theme.textMuted,
      marginBottom: 1,
    },
    passportCard: {
      backgroundColor: theme.surface,
      borderRadius: 24,
      borderWidth: 1.5,
      borderColor: theme.border,
      padding: 16,
      marginBottom: 12,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: isDarkMode ? 0.25 : 0.05,
      shadowRadius: 12,
      elevation: 3,
    },
    passportHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 14,
      marginBottom: 14,
    },
    photo: {
      width: 58,
      height: 58,
      borderRadius: 20,
      borderWidth: 1.5,
      borderColor: theme.border,
    },
    photoPlaceholder: {
      width: 58,
      height: 58,
      borderRadius: 20,
      backgroundColor: theme.surfaceAlt,
      borderWidth: 1.5,
      borderColor: theme.border,
      alignItems: 'center',
      justifyContent: 'center',
    },
    emoji: {
      fontSize: 26,
    },
    heroInfo: {
      flex: 1,
      minWidth: 0,
    },
    heroTitleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 8,
      marginBottom: 3,
    },
    name: {
      fontSize: 20,
      fontWeight: '800',
      color: theme.textDark,
      letterSpacing: -0.3,
    },
    meta: {
      fontSize: 12,
      color: theme.textMuted,
      fontWeight: '500',
    },
    stampBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      backgroundColor: isDarkMode ? '#1F3327' : '#EAF3ED',
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: isDarkMode ? '#2F523D' : '#C6DFCE',
    },
    stampDot: {
      width: 6,
      height: 6,
      borderRadius: 3,
      backgroundColor: theme.done,
    },
    stampText: {
      fontSize: 10,
      fontWeight: '800',
      color: theme.done,
      letterSpacing: 0.3,
    },
    statStrip: {
      flexDirection: 'row',
      backgroundColor: theme.surfaceAlt,
      borderRadius: 16,
      paddingVertical: 10,
      borderWidth: 1,
      borderColor: theme.border,
    },
    statCell: {
      flex: 1,
      alignItems: 'center',
    },
    statCellBorder: {
      borderLeftWidth: 1,
      borderRightWidth: 1,
      borderColor: theme.border,
    },
    statValue: {
      fontSize: 14,
      fontWeight: '800',
      color: theme.textDark,
    },
    statLabel: {
      fontSize: 11,
      fontWeight: '600',
      color: theme.textMuted,
      marginTop: 2,
    },
    headerButtons: {
      flexDirection: 'row',
      gap: 10,
      marginBottom: 14,
    },
    editButton: {
      flex: 1,
      borderRadius: 14,
      borderWidth: 1.5,
      borderColor: theme.primary,
      backgroundColor: isDarkMode ? '#2E1E19' : '#FFF7F4',
      paddingVertical: 10,
      alignItems: 'center',
    },
    editButtonText: {
      color: theme.primary,
      fontSize: 13,
      fontWeight: '700',
    },
    deleteButton: {
      flex: 1,
      borderRadius: 14,
      borderWidth: 1.5,
      borderColor: isDarkMode ? '#552224' : '#FAD4D4',
      backgroundColor: isDarkMode ? '#2D1B1C' : '#FFF5F5',
      paddingVertical: 10,
      alignItems: 'center',
    },
    deleteButtonText: {
      color: theme.allergenText,
      fontSize: 13,
      fontWeight: '700',
    },
    // 3-Tab Segmented Pill Switcher
    subTabBar: {
      flexDirection: 'row',
      backgroundColor: theme.surfaceAlt,
      borderRadius: 18,
      padding: 4,
      marginBottom: 16,
      borderWidth: 1,
      borderColor: theme.border,
      gap: 4,
    },
    subTabPill: {
      flex: 1,
      paddingVertical: 10,
      paddingHorizontal: 6,
      borderRadius: 14,
      alignItems: 'center',
      justifyContent: 'center',
    },
    subTabPillActive: {
      backgroundColor: theme.surface,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: isDarkMode ? 0.25 : 0.08,
      shadowRadius: 4,
      elevation: 2,
    },
    subTabText: {
      fontSize: 11.5,
      fontWeight: '600',
      color: theme.textMuted,
    },
    subTabTextActive: {
      color: theme.primary,
      fontWeight: '800',
    },
    // Unified Digestive & Tummy Wellness Hub Card
    digestiveHubCard: {
      backgroundColor: theme.surface,
      borderRadius: 24,
      borderWidth: 1.5,
      borderColor: theme.border,
      padding: 16,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: isDarkMode ? 0.22 : 0.05,
      shadowRadius: 10,
      elevation: 2,
    },
    digestiveHubHeader: {
      marginBottom: 14,
    },
    digestiveHubBadge: {
      fontSize: 10,
      fontWeight: '800',
      letterSpacing: 0.8,
      color: theme.primary,
      marginBottom: 2,
    },
    digestiveHubTitle: {
      fontSize: 18,
      fontWeight: '800',
      color: theme.textDark,
      marginBottom: 8,
    },
    gutStatusBanner: {
      alignSelf: 'flex-start',
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: 12,
      borderWidth: 1,
    },
    gutStatusGood: {
      backgroundColor: isDarkMode ? '#1F3327' : '#EAF3ED',
      borderColor: isDarkMode ? '#2F523D' : '#C6DFCE',
    },
    gutStatusWarning: {
      backgroundColor: theme.pendingAmberBg,
      borderColor: theme.pending,
    },
    gutStatusText: {
      fontSize: 11.5,
      fontWeight: '700',
    },
    rhythmBox: {
      backgroundColor: theme.surfaceAlt,
      borderRadius: 18,
      padding: 12,
      borderWidth: 1,
      borderColor: theme.border,
      marginBottom: 14,
    },
    rhythmHeaderRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 10,
    },
    rhythmLabel: {
      fontSize: 10,
      fontWeight: '800',
      color: theme.textMuted,
      letterSpacing: 0.6,
    },
    rhythmLegendRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    legendDot: {
      width: 6,
      height: 6,
      borderRadius: 3,
      marginLeft: 4,
    },
    legendText: {
      fontSize: 10,
      color: theme.textMuted,
      fontWeight: '600',
    },
    rhythmDaysRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      gap: 4,
    },
    rhythmDayCol: {
      flex: 1,
      alignItems: 'center',
      paddingVertical: 6,
      borderRadius: 12,
    },
    rhythmDayColToday: {
      backgroundColor: theme.surface,
      borderWidth: 1,
      borderColor: theme.border,
    },
    rhythmDayText: {
      fontSize: 10,
      fontWeight: '600',
      color: theme.textMuted,
      marginBottom: 6,
    },
    rhythmDayTextToday: {
      color: theme.primary,
      fontWeight: '800',
    },
    rhythmStatusCircle: {
      width: 22,
      height: 22,
      borderRadius: 11,
      alignItems: 'center',
      justifyContent: 'center',
    },
    rhythmStatusCircleEmpty: {
      backgroundColor: 'transparent',
      borderWidth: 1.5,
      borderStyle: 'dashed',
      borderColor: theme.textMuted,
    },
    rhythmCircleCheck: {
      color: '#FFFFFF',
      fontSize: 11,
      fontWeight: '800',
    },
    quickCardsRow: {
      flexDirection: 'row',
      gap: 10,
      marginBottom: 14,
    },
    quickActionCard: {
      flex: 1,
      backgroundColor: theme.surfaceAlt,
      borderRadius: 18,
      padding: 12,
      borderWidth: 1,
      borderColor: theme.border,
      justifyContent: 'space-between',
    },
    quickCardCap: {
      fontSize: 10,
      fontWeight: '800',
      color: theme.textMuted,
      letterSpacing: 0.5,
      marginBottom: 4,
    },
    quickCardMain: {
      fontSize: 14,
      fontWeight: '800',
      color: theme.textDark,
    },
    quickCardSub: {
      fontSize: 11.5,
      color: theme.textMuted,
      marginTop: 2,
      marginBottom: 10,
    },
    quickCardPrimaryBtn: {
      backgroundColor: theme.primary,
      borderRadius: 12,
      paddingVertical: 9,
      alignItems: 'center',
    },
    quickCardPrimaryBtnText: {
      color: '#FFFFFF',
      fontSize: 12,
      fontWeight: '700',
    },
    quickCardSecondaryBtn: {
      backgroundColor: theme.surface,
      borderRadius: 12,
      paddingVertical: 9,
      alignItems: 'center',
      borderWidth: 1.5,
      borderColor: theme.primary,
    },
    quickCardSecondaryBtnText: {
      color: theme.primary,
      fontSize: 12,
      fontWeight: '700',
    },
    todayDigestiveBox: {
      backgroundColor: theme.surfaceAlt,
      borderRadius: 16,
      padding: 12,
      borderWidth: 1,
      borderColor: theme.border,
      marginBottom: 14,
    },
    todayDigestiveLabel: {
      fontSize: 10,
      fontWeight: '800',
      color: theme.textMuted,
      letterSpacing: 0.6,
      marginBottom: 6,
    },
    openJournalBtn: {
      backgroundColor: isDarkMode ? '#2E1E19' : '#FFF7F4',
      borderRadius: 14,
      paddingVertical: 12,
      paddingHorizontal: 14,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: theme.primary,
    },
    openJournalBtnText: {
      color: theme.primary,
      fontSize: 12.5,
      fontWeight: '700',
    },
    weightBigValue: {
      fontSize: 22,
      fontWeight: '800',
      color: theme.textDark,
      marginBottom: 4,
    },
    // Digestive Journal & Trends Sheet styles
    journalKpiRibbon: {
      flexDirection: 'row',
      backgroundColor: theme.surface,
      borderRadius: 20,
      borderWidth: 1.5,
      borderColor: theme.border,
      paddingVertical: 14,
      marginBottom: 14,
    },
    journalKpiCard: {
      flex: 1,
      alignItems: 'center',
      paddingHorizontal: 6,
    },
    journalKpiCardCenter: {
      borderLeftWidth: 1,
      borderRightWidth: 1,
      borderColor: theme.border,
    },
    journalKpiVal: {
      fontSize: 17,
      fontWeight: '800',
      color: theme.textDark,
    },
    journalKpiLabel: {
      fontSize: 11,
      fontWeight: '600',
      color: theme.textMuted,
      marginTop: 3,
      textAlign: 'center',
    },
    journalInsightCard: {
      backgroundColor: isDarkMode ? '#2E1E19' : '#FFF7F4',
      borderRadius: 18,
      borderWidth: 1,
      borderColor: theme.primary,
      padding: 14,
      marginBottom: 16,
    },
    journalInsightTitle: {
      fontSize: 13,
      fontWeight: '800',
      color: theme.primary,
      marginBottom: 4,
    },
    journalInsightBody: {
      fontSize: 12.5,
      color: theme.textDark,
      lineHeight: 18,
    },
    journalFilterRow: {
      flexDirection: 'row',
      gap: 8,
      marginBottom: 16,
    },
    journalFilterPill: {
      flex: 1,
      paddingVertical: 9,
      paddingHorizontal: 8,
      borderRadius: 14,
      backgroundColor: theme.surface,
      borderWidth: 1,
      borderColor: theme.border,
      alignItems: 'center',
    },
    journalFilterPillActive: {
      backgroundColor: theme.primary,
      borderColor: theme.primary,
    },
    journalFilterPillText: {
      fontSize: 11.5,
      fontWeight: '700',
      color: theme.textMuted,
    },
    journalFilterPillTextActive: {
      color: '#FFFFFF',
    },
    journalDateSection: {
      marginBottom: 16,
    },
    journalDateHeader: {
      fontSize: 12,
      fontWeight: '800',
      color: theme.textMuted,
      textTransform: 'uppercase',
      letterSpacing: 0.6,
      marginBottom: 8,
    },
    journalBottomBar: {
      flexDirection: 'row',
      gap: 10,
      paddingHorizontal: 16,
      paddingVertical: 12,
      backgroundColor: theme.surface,
      borderTopWidth: 1,
      borderTopColor: theme.border,
    },
    journalPrimaryBtn: {
      flex: 1,
      backgroundColor: theme.primary,
      borderRadius: 14,
      paddingVertical: 13,
      alignItems: 'center',
    },
    journalPrimaryBtnText: {
      color: '#FFFFFF',
      fontSize: 13,
      fontWeight: '700',
    },
    journalSecondaryBtn: {
      flex: 1,
      backgroundColor: theme.surfaceAlt,
      borderRadius: 14,
      paddingVertical: 13,
      alignItems: 'center',
      borderWidth: 1.5,
      borderColor: theme.primary,
    },
    journalSecondaryBtnText: {
      color: theme.primary,
      fontSize: 13,
      fontWeight: '700',
    },
    // Mood Card
    moodCard: {
      backgroundColor: theme.surface,
      borderRadius: 22,
      borderWidth: 1.5,
      borderColor: theme.border,
      padding: 16,
      marginBottom: 16,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.04,
      shadowRadius: 6,
      elevation: 2,
    },
    moodLabelRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 12,
    },
    moodTitleGroup: {
      flex: 1,
    },
    moodCardHeader: {
      fontSize: 10,
      fontWeight: '800',
      letterSpacing: 0.8,
      color: theme.textMuted,
      marginBottom: 2,
    },
    moodLabel: {
      fontSize: 14,
      fontWeight: '700',
      color: theme.textDark,
    },
    moodHistoryBtn: {
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 10,
      backgroundColor: theme.surfaceAlt,
      borderWidth: 1,
      borderColor: theme.border,
    },
    moodHistoryIcon: {
      fontSize: 11,
      fontWeight: '700',
      color: theme.textMuted,
    },
    moodGrid: {
      flexDirection: 'row',
      gap: 6,
    },
    moodBtn: {
      flex: 1,
      backgroundColor: theme.surfaceAlt,
      borderWidth: 1.5,
      borderColor: theme.border,
      borderRadius: 14,
      paddingVertical: 9,
      paddingHorizontal: 2,
      alignItems: 'center',
    },
    moodBtnSelected: {
      backgroundColor: isDarkMode ? '#332019' : '#FDF1EB',
      borderColor: theme.primary,
    },
    moodEmoji: {
      fontSize: 20,
    },
    moodBtnLabel: {
      fontSize: 10,
      fontWeight: '600',
      color: theme.textMuted,
      marginTop: 3,
      textAlign: 'center',
    },
    moodBtnLabelSelected: {
      color: theme.primary,
      fontWeight: '800',
    },
    card: {
      backgroundColor: theme.surface,
      borderRadius: 22,
      borderWidth: 1.5,
      borderColor: theme.border,
      padding: 16,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.04,
      shadowRadius: 6,
      elevation: 2,
    },
    section: {
      marginTop: 20,
    },
    sectionTitleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 8,
    },
    sectionTitle: {
      fontSize: 11,
      fontWeight: '600',
      color: theme.textMuted,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    addIcon: {
      fontSize: 18,
      fontWeight: '600',
      color: theme.primary,
    },
    addChip: {
      backgroundColor: theme.notStartedBg,
      borderRadius: 20,
      paddingHorizontal: 10,
      paddingVertical: 3,
    },
    addChipText: {
      fontSize: 11,
      fontWeight: '500',
      color: theme.notStartedText,
    },
    allergenRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 6,
    },
    allergenChip: {
      backgroundColor: theme.allergenBg,
      borderRadius: 20,
      paddingHorizontal: 10,
      paddingVertical: 5,
    },
    allergenChipText: {
      fontSize: 11,
      fontWeight: '500',
      color: theme.allergenText,
    },
    emptyText: {
      fontSize: 13,
      color: theme.textMuted,
    },
    divider: {
      height: 0.5,
      backgroundColor: theme.divider,
      marginVertical: 4,
    },
    vaccineLink: {
      marginTop: 20,
      backgroundColor: theme.surface,
      borderRadius: theme.radiiCard,
      borderWidth: 0.5,
      borderColor: theme.border,
      padding: 14,
      alignItems: 'center',
    },
    vaccineLinkText: {
      color: theme.primary,
      fontSize: 14,
      fontWeight: '600',
    },
    segmentSwitcher: {
      flexDirection: 'row',
      backgroundColor: theme.surfaceAlt,
      borderRadius: 16,
      padding: 4,
      marginBottom: 16,
      borderWidth: 1,
      borderColor: theme.border,
    },
    segmentTab: {
      flex: 1,
      paddingVertical: 10,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 12,
    },
    segmentTabActive: {
      backgroundColor: theme.surface,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.08,
      shadowRadius: 4,
      elevation: 2,
    },
    segmentTabText: {
      fontSize: 13,
      fontWeight: '600',
      color: theme.textMuted,
    },
    segmentTabTextActive: {
      color: theme.primary,
      fontWeight: '700',
    },
    emptyTreatmentCard: {
      backgroundColor: theme.surface,
      borderRadius: 20,
      padding: 24,
      alignItems: 'center',
      borderWidth: 1.5,
      borderColor: theme.border,
      marginBottom: 16,
    },
    emptyTreatmentEmoji: {
      fontSize: 36,
      marginBottom: 10,
    },
    emptyTreatmentTitle: {
      fontSize: 16,
      fontWeight: '700',
      color: theme.textDark,
      marginBottom: 6,
    },
    emptyTreatmentSubtitle: {
      fontSize: 13,
      color: theme.textMuted,
      textAlign: 'center',
      lineHeight: 18,
    },
    treatmentList: {
      marginBottom: 12,
    },
    addTreatmentBtn: {
      backgroundColor: theme.primary,
      borderRadius: 16,
      paddingVertical: 15,
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: theme.primary,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.25,
      shadowRadius: 8,
      elevation: 3,
      marginBottom: 20,
    },
    addTreatmentBtnText: {
      color: '#FFFFFF',
      fontSize: 15,
      fontWeight: '700',
    },
    protectionWidget: {
      backgroundColor: theme.surface,
      borderRadius: 22,
      padding: 16,
      marginTop: 20,
      borderWidth: 1.5,
      borderColor: theme.border,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.04,
      shadowRadius: 6,
      elevation: 2,
    },
    protectionHeaderRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 12,
    },
    protectionTitleCol: {
      flex: 1,
    },
    protectionBadge: {
      fontSize: 10,
      fontWeight: '800',
      color: theme.primary,
      letterSpacing: 0.8,
      marginBottom: 2,
    },
    protectionTitle: {
      fontSize: 16,
      fontWeight: '700',
      color: theme.textDark,
    },
    protectionAddBtn: {
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 12,
      backgroundColor: theme.surfaceAlt,
      borderWidth: 1,
      borderColor: theme.border,
    },
    protectionAddBtnText: {
      fontSize: 12,
      fontWeight: '700',
      color: theme.primary,
    },
    protectionGrid: {
      flexDirection: 'row',
      gap: 10,
      marginBottom: 12,
    },
    protectionSubCard: {
      flex: 1,
      backgroundColor: theme.surfaceAlt,
      borderRadius: 16,
      padding: 12,
      borderWidth: 1,
      borderColor: theme.border,
    },
    subCardTopRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 6,
    },
    subCardEmoji: {
      fontSize: 20,
    },
    subCardStatus: {
      fontSize: 10,
      fontWeight: '800',
      paddingHorizontal: 7,
      paddingVertical: 2,
      borderRadius: 8,
      overflow: 'hidden',
    },
    statusGood: {
      backgroundColor: isDarkMode ? '#1F3327' : '#EAF3ED',
      color: theme.done,
    },
    statusBad: {
      backgroundColor: theme.allergenBg,
      color: theme.allergenText,
    },
    subCardTitle: {
      fontSize: 14,
      fontWeight: '700',
      color: theme.textDark,
      marginBottom: 2,
    },
    subCardMeta: {
      fontSize: 11,
      color: theme.textMuted,
    },
    protectionManageBtn: {
      backgroundColor: isDarkMode ? '#2E1E19' : '#FFF7F4',
      borderRadius: 14,
      paddingVertical: 11,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: theme.primary,
    },
    protectionManageBtnText: {
      color: theme.primary,
      fontSize: 13,
      fontWeight: '700',
    },
  });
}
