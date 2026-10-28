import { RefObject, useCallback, useMemo, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, Image, ScrollView, Alert, BackHandler, StyleSheet } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Dog, Habit, HabitType, DogMood, VaccineRecord, Allergen, HealthLog } from '../types';
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
import HeatCycleSection from '../components/HeatCycleSection';
import TabTour from '../components/TabTour';
import CycleStartSheet from '../components/CycleStartSheet';
import { useCycleTracking } from '../lib/hooks/useCycleTracking';
import { mapDogSpeciesToCycleSpecies } from '../lib/cycleLogic';
import { useTheme } from '../lib/ThemeContext';
import { useT } from '../lib/LanguageContext';
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
  tourRefs?: {
    switcherRef: RefObject<View | null>;
  };
};

type Mode = 'detail' | 'habit-quick-add' | 'habit-form' | 'vaccine-list' | 'vaccine-form' | 'history' | 'mood-history' | 'allergen-form' | 'health-list' | 'poop-form' | 'vomit-list' | 'vomit-form' | 'meal-history' | 'cycle-history';

const MOOD_OPTIONS: { value: DogMood['mood']; emoji: string }[] = [
  { value: 'sleepy', emoji: '😴' },
  { value: 'off', emoji: '😟' },
  { value: 'good', emoji: '😊' },
  { value: 'great', emoji: '🤩' },
  { value: 'sick', emoji: '🤒' },
];

export default function DogDetailScreen({ dog, updateDog, onEdit, onDelete, tourRefs }: Props) {
  const { theme, isDarkMode } = useTheme();
  const { t } = useT();
  const styles = useMemo(() => makeStyles(theme, isDarkMode), [theme, isDarkMode]);

  const subtitleFor = (h: Habit, count: number, target: number, done: boolean): string => {
    if (h.habit_type === 'water') return t('dogDetail.mlProgress', { count, target });
    if (done) return t('dogDetail.doneSubtitle');
    if (count > 0) return t('dogDetail.countOfTarget', { count, target });
    if (target > 1) return t('dogDetail.countOfTarget', { count: 0, target });
    return h.reminder_times && h.reminder_times.length > 0
      ? t('dogDetail.dueAt', { time: h.reminder_times[0] })
      : t('dogDetail.notLoggedYet');
  };
  const [mode, setMode] = useState<Mode>('detail');
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
        if (mode === 'habit-quick-add') {
          setMode('detail');
          return true;
        }
        if (mode === 'habit-form') {
          setMode('detail');
          setEditingHabit(null);
          setPresetType(undefined);
          return true;
        }
        if (mode === 'vaccine-form') {
          setMode('vaccine-list');
          setEditingVaccine(null);
          return true;
        }
        if (mode === 'poop-form') {
          setMode('health-list');
          setEditingLog(null);
          return true;
        }
        if (mode === 'vomit-form') {
          setMode('vomit-list');
          setEditingVomitLog(null);
          return true;
        }
        if (mode !== 'detail') {
          setMode('detail');
          setHistoryTarget(null);
          setEditingAllergen(null);
          return true;
        }
        return false;
      });
      return () => sub.remove();
    }, [waterSheetHabitId, mealDetailHabitId, cycleStartSheetVisible, mode])
  );

  // Tour targets on the detail view. The lower sections are usually below the fold, so
  // each tour step scrolls its target into view (via the recorded onLayout Y) first.
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
    logHabitToday,
    undoHabitToday,
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
  const { streak } = usePetStreak(dog.id, habits.map(h => h.id));
  const cycleTracking = useCycleTracking(dog.id, dog.breed);

  const cycleSpecies = mapDogSpeciesToCycleSpecies(dog.species);
  const showHeatCycle = dog.sex === 'female' && !dog.is_sterilized && cycleSpecies !== null;

  const mealDetailCompletionId = mealDetailHabitId ? completionIds.get(mealDetailHabitId) ?? null : null;
  const mealDetailInitial = mealDetailCompletionId ? getMealDetail(mealDetailCompletionId) ?? null : null;

  if (mode === 'habit-quick-add') {
    return (
      <HabitQuickAddScreen
        existingTypes={habits.map(h => h.habit_type)}
        onSelect={(type) => { setPresetType(type); setMode('habit-form'); }}
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
        feedingWetDryRatio={habits.find(h => h.habit_type === 'feeding')?.wet_dry_ratio ?? null}
        addHabit={addHabit}
        updateHabit={updateHabit}
        deleteHabit={deleteHabit}
        onDone={() => { setMode('detail'); setEditingHabit(null); setPresetType(undefined); }}
        onCancel={() => { setMode('detail'); setEditingHabit(null); setPresetType(undefined); }}
      />
    );
  }

  if (mode === 'vaccine-list') {
    const allVaccines = [...overdue, ...upcoming];
    const vaccineList = allVaccines.filter(v => detectTreatmentType(v.vaccine_name, v.notes) === 'vaccine');
    const parasiteList = allVaccines.filter(v => detectTreatmentType(v.vaccine_name, v.notes) !== 'vaccine');
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

          {/* Segmented Switcher: Parasite Shield vs Vaccines */}
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
                  ? (t('treatments.noParasiteTracked') || 'No parasite shield active')
                  : (t('dogDetail.noVaccinesTracked') || 'No clinical vaccines tracked')}
              </Text>
              <Text style={styles.emptyTreatmentSubtitle}>
                {treatmentSegment === 'parasites'
                  ? (t('treatments.parasiteEmptyHint') || 'Protect against fleas, ticks, heartworms & intestinal parasites with automated dose reminders.')
                  : (t('treatments.vaccineEmptyHint') || 'Keep rabies and core vaccine records ready for vet visits and travel.')}
              </Text>
            </View>
          ) : (
            <View style={styles.treatmentList}>
              {shownList.map((v) => (
                <VaccineCard
                  key={v.id}
                  vaccine={v}
                  isOverdue={overdue.includes(v)}
                  onPress={() => { setEditingVaccine(v); setMode('vaccine-form'); }}
                  onAdministerToday={(item, nextDate) => handleAdministerToday(item, nextDate)}
                />
              ))}
            </View>
          )}

          <TouchableOpacity
            style={styles.addTreatmentBtn}
            onPress={() => { setEditingVaccine(null); setMode('vaccine-form'); }}
            activeOpacity={0.85}
          >
            <Text style={styles.addTreatmentBtnText}>
              ＋ {treatmentSegment === 'parasites'
                ? (t('treatments.addParasite') || 'Add Parasite Treatment')
                : (t('treatments.addVaccine') || 'Add Vaccine')}
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
        addVaccine={addVaccine}
        updateVaccine={updateVaccine}
        deleteVaccine={deleteVaccine}
        onDone={() => { setMode('vaccine-list'); setEditingVaccine(null); }}
        onCancel={() => { setMode('vaccine-list'); setEditingVaccine(null); }}
      />
    );
  }

  if (mode === 'history' && historyTarget) {
    return (
      <HabitHistoryScreen
        habit={historyTarget}
        dog={dog}
        onBack={() => { setMode('detail'); setHistoryTarget(null); }}
      />
    );
  }

  if (mode === 'mood-history') {
    return (
      <MoodHistoryScreen
        dog={dog}
        onBack={() => setMode('detail')}
      />
    );
  }

  if (mode === 'allergen-form') {
    return (
      <AllergenFormScreen
        allergen={editingAllergen}
        addAllergen={addAllergen}
        updateAllergen={updateAllergen}
        deleteAllergen={deleteAllergen}
        onDone={() => { setMode('detail'); setEditingAllergen(null); }}
        onCancel={() => { setMode('detail'); setEditingAllergen(null); }}
      />
    );
  }

  if (mode === 'health-list') {
    return (
      <SwipeBackWrapper onBack={() => setMode('detail')}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <TouchableOpacity onPress={() => setMode('detail')} style={styles.backRow}>
          <Text style={styles.backText}>‹ {t('common.back')}</Text>
        </TouchableOpacity>
        <Text style={styles.title}>{t('dogDetail.poopTracker')}</Text>
        <Text style={styles.subtitle}>{dog.name}</Text>

        {logs.length === 0 ? (
          <Text style={styles.emptyText}>{t('dogDetail.noPoopYet')}</Text>
        ) : (
          <View style={styles.card}>
            {logs.map((l, idx) => (
              <View key={l.id}>
                <PoopLogCard
                  log={l}
                  onPress={() => { setEditingLog(l); setMode('poop-form'); }}
                />
                {idx < logs.length - 1 ? <View style={styles.divider} /> : null}
              </View>
            ))}
          </View>
        )}

        <TouchableOpacity
          style={styles.vaccineLink}
          onPress={() => { setEditingLog(null); setMode('poop-form'); }}
        >
          <Text style={styles.vaccineLinkText}>{t('common.add')}</Text>
        </TouchableOpacity>
      </ScrollView>
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
        onDone={() => { setMode('health-list'); setEditingLog(null); }}
        onCancel={() => { setMode('health-list'); setEditingLog(null); }}
      />
    );
  }

  if (mode === 'vomit-list') {
    return (
      <SwipeBackWrapper onBack={() => setMode('detail')}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <TouchableOpacity onPress={() => setMode('detail')} style={styles.backRow}>
          <Text style={styles.backText}>‹ {t('common.back')}</Text>
        </TouchableOpacity>
        <Text style={styles.title}>{t('dogDetail.vomitTracker')}</Text>
        <Text style={styles.subtitle}>{dog.name}</Text>

        {vomitLogs.length === 0 ? (
          <Text style={styles.emptyText}>{t('dogDetail.noVomitYet')}</Text>
        ) : (
          <View style={styles.card}>
            {vomitLogs.map((l, idx) => (
              <View key={l.id}>
                <VomitLogCard
                  log={l}
                  onPress={() => { setEditingVomitLog(l); setMode('vomit-form'); }}
                />
                {idx < vomitLogs.length - 1 ? <View style={styles.divider} /> : null}
              </View>
            ))}
          </View>
        )}

        <TouchableOpacity
          style={styles.vaccineLink}
          onPress={() => { setEditingVomitLog(null); setMode('vomit-form'); }}
        >
          <Text style={styles.vaccineLinkText}>{t('common.add')}</Text>
        </TouchableOpacity>
      </ScrollView>
      </SwipeBackWrapper>
    );
  }

  if (mode === 'vomit-form') {
    return (
      <VomitFormScreen
        log={editingVomitLog}
        addLog={addVomitLog}
        updateLog={updateVomitLog}
        deleteLog={deleteVomitLog}
        onDone={() => { setMode('vomit-list'); setEditingVomitLog(null); }}
        onCancel={() => { setMode('vomit-list'); setEditingVomitLog(null); }}
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

  const sexLabel = dog.sex === 'male' ? t('dogDetail.male') : dog.sex === 'female' ? t('dogDetail.female') : null;
  const sterilizedLabel = dog.sex === 'male'
    ? (dog.is_sterilized ? t('dogDetail.neutered') : t('dogDetail.notNeutered'))
    : (dog.is_sterilized ? t('dogDetail.sterilized') : t('dogDetail.notSterilized'));
  const age = computeAge(dog.birth_date);
  const metaLine = [dog.species, dog.breed, sexLabel, sterilizedLabel, age].filter(Boolean).join(' · ');
  const allVaccineRecords = [...overdue, ...upcoming];
  const vaccineList = allVaccineRecords.filter(v => detectTreatmentType(v.vaccine_name, v.notes) === 'vaccine');
  const parasiteList = allVaccineRecords.filter(v => detectTreatmentType(v.vaccine_name, v.notes) !== 'vaccine');
  const vaccineOverdueCount = vaccineList.filter(v => overdue.includes(v)).length;
  const parasiteOverdueCount = parasiteList.filter(v => overdue.includes(v)).length;
  const nextVaccine = vaccineList[0] || null;
  const nextParasite = parasiteList[0] || null;

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
              <Text style={styles.name} numberOfLines={1}>{dog.name}</Text>
              <View style={styles.stampBadge}>
                <View style={styles.stampDot} />
                <Text style={styles.stampText}>
                  {mood?.mood === 'sick' ? 'Needs Care' : mood?.mood === 'off' ? 'A Bit Off' : 'Thriving'}
                </Text>
              </View>
            </View>
            {metaLine ? <Text style={styles.meta} numberOfLines={1}>{metaLine}</Text> : null}
          </View>
        </View>

        <View style={styles.statStrip}>
          <View style={styles.statCell}>
            <Text style={styles.statValue}>{dog.weight_kg != null ? `${dog.weight_kg} kg` : '—'}</Text>
            <Text style={styles.statLabel}>{t('dogDetail.weight')}</Text>
          </View>
          <View style={[styles.statCell, styles.statCellBorder]}>
            <Text style={styles.statValue}>{completedToday.size}/{habits.length}</Text>
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

      {/* 2. Today's Well-being & Mood Card */}
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
            <Text style={styles.moodHistoryIcon}>🕒 History</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.moodGrid}>
          {MOOD_OPTIONS.map(opt => {
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
        onLayout={(e) => { tourY.current.habits = e.nativeEvent.layout.y; }}
        style={styles.section}
      >
        <View style={styles.sectionTitleRow}>
          <Text style={styles.sectionTitle}>{t('dogDetail.todaysHabits')}</Text>
          <View ref={addHabitRef} collapsable={false}>
            <TouchableOpacity
              onPress={() => { setEditingHabit(null); setMode('habit-quick-add'); }}
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
              const target = getHabitTarget(h);
              const done = completedToday.has(h.id);
              const count = completedCounts.get(h.id) ?? (done && target <= 1 ? 1 : 0);
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
                      if (!done) { logHabitToday(h.id); return; }
                      isWater ? resetWaterToday(h.id) : undoHabitToday(h.id);
                    }}
                    onEdit={() => { setEditingHabit(h); setPresetType(undefined); setMode('habit-form'); }}
                    onDelete={() => deleteHabit(h.id)}
                    onViewHistory={() => { setHistoryTarget(h); setMode('history'); }}
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
        <TouchableOpacity
          style={styles.vaccineLink}
          onPress={() => setMode('meal-history')}
        >
          <Text style={styles.vaccineLinkText}>{t('dogDetail.mealHistory')}</Text>
        </TouchableOpacity>
      ) : null}

      <View style={styles.section}>
        <View style={styles.sectionTitleRow}>
          <Text style={styles.sectionTitle}>{t('dogDetail.foodSensitivities')}</Text>
          <TouchableOpacity
            style={styles.addChip}
            onPress={() => { setEditingAllergen(null); setMode('allergen-form'); }}
          >
            <Text style={styles.addChipText}>{t('dogDetail.addShort')}</Text>
          </TouchableOpacity>
        </View>
        {allergens.length > 0 ? (
          <View style={styles.allergenRow}>
            {allergens.map(a => (
              <TouchableOpacity
                key={a.id}
                style={styles.allergenChip}
                onPress={() => { setEditingAllergen(a); setMode('allergen-form'); }}
              >
                <Text style={styles.allergenChipText}>🚫 {a.allergen}</Text>
              </TouchableOpacity>
            ))}
          </View>
        ) : (
          <Text style={styles.emptyText}>{t('dogDetail.noSensitivities')}</Text>
        )}
      </View>

      {showHeatCycle && cycleSpecies ? (
        <View
          ref={cycleSectionRef}
          collapsable={false}
          onLayout={(e) => { tourY.current.cycle = e.nativeEvent.layout.y; }}
        >
          <HeatCycleSection
            dog={dog}
            tracking={cycleTracking}
            onStartCycle={() => setCycleStartSheetVisible(true)}
            onViewHistory={() => setMode('cycle-history')}
          />
        </View>
      ) : null}

      <View
        ref={poopSectionRef}
        collapsable={false}
        onLayout={(e) => { tourY.current.poop = e.nativeEvent.layout.y; }}
        style={styles.section}
      >
        <View style={styles.sectionTitleRow}>
          <Text style={styles.sectionTitle}>{t('dogDetail.poopTracker')}</Text>
          <TouchableOpacity
            style={styles.addChip}
            onPress={() => { setEditingLog(null); setMode('poop-form'); }}
          >
            <Text style={styles.addChipText}>{t('dogDetail.addShort')}</Text>
          </TouchableOpacity>
        </View>
        {logs.length > 0 ? (
          <View style={styles.card}>
            {logs.slice(0, 3).map((l, idx) => (
              <View key={l.id}>
                <PoopLogCard
                  log={l}
                  onPress={() => { setEditingLog(l); setMode('poop-form'); }}
                />
                {idx < Math.min(logs.length, 3) - 1 ? <View style={styles.divider} /> : null}
              </View>
            ))}
          </View>
        ) : (
          <Text style={styles.emptyText}>{t('dogDetail.noPoopYet')}</Text>
        )}
        {logs.length > 3 ? (
          <TouchableOpacity onPress={() => setMode('health-list')} style={styles.seeAllRow}>
            <Text style={styles.backText}>{t('common.seeAll')} →</Text>
          </TouchableOpacity>
        ) : null}
      </View>

      <View style={styles.section}>
        <View style={styles.sectionTitleRow}>
          <Text style={styles.sectionTitle}>{t('dogDetail.vomitTracker')}</Text>
          <TouchableOpacity
            style={styles.addChip}
            onPress={() => { setEditingVomitLog(null); setMode('vomit-form'); }}
          >
            <Text style={styles.addChipText}>{t('dogDetail.addShort')}</Text>
          </TouchableOpacity>
        </View>
        {vomitLogs.length > 0 ? (
          <View style={styles.card}>
            {vomitLogs.slice(0, 3).map((l, idx) => (
              <View key={l.id}>
                <VomitLogCard
                  log={l}
                  onPress={() => { setEditingVomitLog(l); setMode('vomit-form'); }}
                />
                {idx < Math.min(vomitLogs.length, 3) - 1 ? <View style={styles.divider} /> : null}
              </View>
            ))}
          </View>
        ) : (
          <Text style={styles.emptyText}>{t('dogDetail.noVomitYet')}</Text>
        )}
        {vomitLogs.length > 3 ? (
          <TouchableOpacity onPress={() => setMode('vomit-list')} style={styles.seeAllRow}>
            <Text style={styles.backText}>{t('common.seeAll')} →</Text>
          </TouchableOpacity>
        ) : null}
      </View>

      {/* 4. Immunity & Protection Widget Card (Redesigned per UX Spec) */}
      <View style={styles.protectionWidget}>
        <View style={styles.protectionHeaderRow}>
          <View style={styles.protectionTitleCol}>
            <Text style={styles.protectionBadge}>IMMUNITY & PROTECTION</Text>
            <Text style={styles.protectionTitle}>🛡️ {t('treatments.immunityTitle') || 'Immunity & Protection'}</Text>
          </View>
          <TouchableOpacity
            style={styles.protectionAddBtn}
            onPress={() => { setEditingVaccine(null); setMode('vaccine-form'); }}
            activeOpacity={0.75}
          >
            <Text style={styles.protectionAddBtnText}>＋ {t('common.add') || 'Add'}</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.protectionGrid}>
          {/* Left card: Vaccines */}
          <TouchableOpacity
            style={styles.protectionSubCard}
            onPress={() => { setTreatmentSegment('vaccines'); setMode('vaccine-list'); }}
            activeOpacity={0.8}
          >
            <View style={styles.subCardTopRow}>
              <Text style={styles.subCardEmoji}>💉</Text>
              <Text style={[styles.subCardStatus, vaccineOverdueCount > 0 ? styles.statusBad : styles.statusGood]}>
                {vaccineOverdueCount > 0 ? `${vaccineOverdueCount} Overdue` : vaccineList.length > 0 ? 'Up to date' : 'Not set'}
              </Text>
            </View>
            <Text style={styles.subCardTitle}>{t('treatments.types.vaccine') || 'Vaccines'}</Text>
            <Text style={styles.subCardMeta} numberOfLines={1}>
              {nextVaccine ? `Next: ${nextVaccine.vaccine_name}` : 'No upcoming shots'}
            </Text>
          </TouchableOpacity>

          {/* Right card: Parasite Shield */}
          <TouchableOpacity
            style={styles.protectionSubCard}
            onPress={() => { setTreatmentSegment('parasites'); setMode('vaccine-list'); }}
            activeOpacity={0.8}
          >
            <View style={styles.subCardTopRow}>
              <Text style={styles.subCardEmoji}>🛡️</Text>
              <Text style={[styles.subCardStatus, parasiteOverdueCount > 0 ? styles.statusBad : styles.statusGood]}>
                {parasiteOverdueCount > 0 ? `${parasiteOverdueCount} Overdue` : parasiteList.length > 0 ? 'Protected' : 'Not set'}
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
            ensureVisible: () => scrollRef.current?.scrollTo({ y: 0, animated: false }),
          },
          {
            targetRef: habitsSectionRef,
            position: 'bottom',
            title: t('tour.pets.s2Title'),
            body: t('tour.pets.s2Body'),
            ensureVisible: () => scrollToTour(tourY.current.habits),
          },
          {
            targetRef: addHabitRef,
            position: 'bottom',
            title: t('tour.pets.s3Title'),
            body: t('tour.pets.s3Body'),
            ensureVisible: () => scrollToTour(tourY.current.habits),
          },
          ...(showHeatCycle && cycleSpecies
            ? [{
                targetRef: cycleSectionRef,
                position: 'bottom' as const,
                title: t('tour.pets.s4Title'),
                body: t('tour.pets.s4Body'),
                ensureVisible: () => scrollToTour(tourY.current.cycle),
              }]
            : []),
          {
            targetRef: poopSectionRef,
            position: 'bottom',
            title: t('tour.pets.s5Title'),
            body: t('tour.pets.s5Body'),
            ensureVisible: () => scrollToTour(tourY.current.poop),
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
      fontWeight: '700',
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
    // Centerpiece: The Warm Companion Passport Card
    passportCard: {
      backgroundColor: theme.surface,
      borderRadius: 24,
      borderWidth: 1.5,
      borderColor: theme.border,
      padding: 16,
      marginBottom: 16,
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
      marginBottom: 16,
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
    // Today's Well-being Card
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
    seeAllRow: {
      marginTop: 8,
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
    // Segmented Preventive Care Hub Styles
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
    // Immunity & Protection Status Widget Card
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
      marginBottom: 8,
    },
    subCardEmoji: {
      fontSize: 18,
    },
    subCardStatus: {
      fontSize: 11,
      fontWeight: '700',
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: 8,
    },
    statusGood: {
      backgroundColor: theme.moodSelBg,
      color: theme.primary,
    },
    statusBad: {
      backgroundColor: theme.allergenBg,
      color: theme.allergenText,
    },
    statusSoon: {
      backgroundColor: theme.pendingAmberBg,
      color: theme.pendingAmberText,
    },
    subCardTitle: {
      fontSize: 13,
      fontWeight: '700',
      color: theme.textDark,
      marginBottom: 2,
    },
    subCardMeta: {
      fontSize: 11,
      color: theme.textMuted,
    },
    protectionManageBtn: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 10,
      borderTopWidth: 1,
      borderTopColor: theme.border,
      marginTop: 2,
    },
    protectionManageBtnText: {
      fontSize: 13,
      fontWeight: '700',
      color: theme.primary,
    },
  });
}
