import { useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, Image, ScrollView, Alert, StyleSheet, ActivityIndicator } from 'react-native';
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
import { useProfile } from '../lib/hooks/useProfile';
import HabitRow from '../components/HabitRow';
import WaterIncrementRow from '../components/WaterIncrementRow';
import MealDetailLink from '../components/MealDetailLink';
import MealDetailSheet from '../components/MealDetailSheet';
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
import SymptomHistoryScreen from './SymptomHistoryScreen';
import MealHistoryScreen from './MealHistoryScreen';
import { useTheme } from '../lib/ThemeContext';
import { ThemeTokens } from '../lib/themes';
import { computeAge } from '../lib/petAge';
import { shareHtmlAsPdf } from '../lib/pdfExport';
import { buildReportHtml } from '../lib/pdfReport';
import { buildDogInfoRows, buildVaccineReport } from '../lib/reportBuilders';

type Props = {
  dog: Dog;
  updateDog: ReturnType<typeof useDogs>['updateDog'];
  onEdit: () => void;
  onDelete: () => void;
};

type Mode = 'detail' | 'habit-quick-add' | 'habit-form' | 'vaccine-list' | 'vaccine-form' | 'history' | 'mood-history' | 'allergen-form' | 'health-list' | 'poop-form' | 'vomit-list' | 'vomit-form' | 'symptom-history' | 'meal-history';

const MOOD_OPTIONS: { value: DogMood['mood']; emoji: string; label: string }[] = [
  { value: 'sleepy', emoji: '😴', label: 'Sleepy' },
  { value: 'off', emoji: '😟', label: 'Off' },
  { value: 'good', emoji: '😊', label: 'Good' },
  { value: 'great', emoji: '🤩', label: 'Great' },
  { value: 'sick', emoji: '🤒', label: 'Sick' },
];

function subtitleFor(h: Habit, count: number, target: number, done: boolean): string {
  if (h.habit_type === 'water') return `${count}/${target} ml`;
  if (done) return 'Done';
  if (count > 0) return `${count} of ${target} today`;
  if (target > 1) return `0 of ${target} today`;
  return h.reminder_times && h.reminder_times.length > 0 ? `Due at ${h.reminder_times[0]}` : 'Not logged yet';
}

export default function DogDetailScreen({ dog, updateDog, onEdit, onDelete }: Props) {
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const [mode, setMode] = useState<Mode>('detail');
  const [editingHabit, setEditingHabit] = useState<Habit | null>(null);
  const [presetType, setPresetType] = useState<HabitType | undefined>(undefined);
  const [editingVaccine, setEditingVaccine] = useState<VaccineRecord | null>(null);
  const [historyTarget, setHistoryTarget] = useState<Habit | null>(null);
  const [editingAllergen, setEditingAllergen] = useState<Allergen | null>(null);
  const [editingLog, setEditingLog] = useState<HealthLog | null>(null);
  const [editingVomitLog, setEditingVomitLog] = useState<HealthLog | null>(null);
  const [logSource, setLogSource] = useState<'list' | 'history'>('list');
  const [mealDetailHabitId, setMealDetailHabitId] = useState<string | null>(null);
  const [exportingVaccines, setExportingVaccines] = useState(false);

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
  const { profile } = useProfile();

  const mealDetailCompletionId = mealDetailHabitId ? completionIds.get(mealDetailHabitId) ?? null : null;
  const mealDetailInitial = mealDetailCompletionId ? getMealDetail(mealDetailCompletionId) ?? null : null;

  if (mode === 'habit-quick-add') {
    return (
      <HabitQuickAddScreen
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

    const handleExportVaccines = async () => {
      const report = buildVaccineReport(dog, overdue, upcoming);
      if (!report) {
        Alert.alert('No Data', 'No vaccines to export yet.');
        return;
      }
      setExportingVaccines(true);
      try {
        const html = buildReportHtml({
          title: report.title,
          infoRows: buildDogInfoRows(dog, profile),
          tableHeaders: report.tableHeaders,
          tableRowsHtml: report.tableRowsHtml,
          summaryRows: report.summaryRows,
        });
        await shareHtmlAsPdf(report.filename, html);
      } catch {
        Alert.alert('Export Failed', 'Could not export vaccine history. Please try again.');
      } finally {
        setExportingVaccines(false);
      }
    };

    return (
      <SwipeBackWrapper onBack={() => setMode('detail')}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <TouchableOpacity onPress={() => setMode('detail')} style={styles.backRow}>
          <Text style={styles.backText}>‹ Back</Text>
        </TouchableOpacity>

        <View style={styles.listHeader}>
          <View style={styles.listHeaderLeft}>
            <Text style={styles.listHeaderDogName}>{dog.name}</Text>
            <Text style={styles.title}>Vaccines</Text>
          </View>
          <TouchableOpacity
            style={styles.downloadBtn}
            onPress={handleExportVaccines}
            disabled={exportingVaccines}
          >
            {exportingVaccines ? (
              <ActivityIndicator size="small" color={theme.primary} />
            ) : (
              <Text style={styles.downloadIcon}>⬇</Text>
            )}
          </TouchableOpacity>
        </View>

        {allVaccines.length === 0 ? (
          <Text style={styles.emptyText}>No vaccines tracked yet.</Text>
        ) : (
          <View style={styles.card}>
            {allVaccines.map((v, idx) => (
              <View key={v.id}>
                <VaccineCard
                  vaccine={v}
                  isOverdue={overdue.includes(v)}
                  onPress={() => { setEditingVaccine(v); setMode('vaccine-form'); }}
                />
                {idx < allVaccines.length - 1 ? <View style={styles.divider} /> : null}
              </View>
            ))}
          </View>
        )}

        <TouchableOpacity
          style={styles.vaccineLink}
          onPress={() => { setEditingVaccine(null); setMode('vaccine-form'); }}
        >
          <Text style={styles.vaccineLinkText}>+ Add vaccine</Text>
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
          <Text style={styles.backText}>‹ Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Poop Tracker</Text>
        <Text style={styles.subtitle}>{dog.name}</Text>

        {logs.length === 0 ? (
          <Text style={styles.emptyText}>No Poop Logged Yet.</Text>
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
          <Text style={styles.vaccineLinkText}>+ Add</Text>
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
        onDone={() => { setMode(logSource === 'history' ? 'symptom-history' : 'health-list'); setEditingLog(null); setLogSource('list'); }}
        onCancel={() => { setMode(logSource === 'history' ? 'symptom-history' : 'health-list'); setEditingLog(null); setLogSource('list'); }}
      />
    );
  }

  if (mode === 'vomit-list') {
    return (
      <SwipeBackWrapper onBack={() => setMode('detail')}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <TouchableOpacity onPress={() => setMode('detail')} style={styles.backRow}>
          <Text style={styles.backText}>‹ Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Vomit Tracker</Text>
        <Text style={styles.subtitle}>{dog.name}</Text>

        {vomitLogs.length === 0 ? (
          <Text style={styles.emptyText}>No Vomit Logged Yet.</Text>
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
          <Text style={styles.vaccineLinkText}>+ Add</Text>
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
        onDone={() => { setMode(logSource === 'history' ? 'symptom-history' : 'vomit-list'); setEditingVomitLog(null); setLogSource('list'); }}
        onCancel={() => { setMode(logSource === 'history' ? 'symptom-history' : 'vomit-list'); setEditingVomitLog(null); setLogSource('list'); }}
      />
    );
  }

  if (mode === 'symptom-history') {
    return (
      <SymptomHistoryScreen
        dog={dog}
        logs={logs}
        vomitLogs={vomitLogs}
        onSelectPoop={(l) => { setLogSource('history'); setEditingLog(l); setMode('poop-form'); }}
        onSelectVomit={(l) => { setLogSource('history'); setEditingVomitLog(l); setMode('vomit-form'); }}
        onBack={() => setMode('detail')}
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

  const sexLabel = dog.sex === 'male' ? 'Male' : dog.sex === 'female' ? 'Female' : null;
  const age = computeAge(dog.birth_date);
  const metaLine = [dog.breed, sexLabel, age].filter(Boolean).join(' · ');
  const vaccineCount = overdue.length + upcoming.length;
  const vaccineLabel = overdue.length > 0
    ? `🩺 Vaccines · ${overdue.length} overdue`
    : vaccineCount > 0
    ? `🩺 Vaccines · ${vaccineCount} upcoming`
    : '＋ Add vaccine';

  return (
    <>
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.heroBand}>
        {dog.photo_url ? (
          <Image source={{ uri: dog.photo_url }} style={styles.photo} />
        ) : (
          <View style={styles.photoPlaceholder}>
            <Text style={styles.emoji}>🐾</Text>
          </View>
        )}
        <View style={styles.heroInfo}>
          <Text style={styles.name} numberOfLines={1}>{dog.name}</Text>
          {metaLine ? <Text style={styles.meta} numberOfLines={1}>{metaLine}</Text> : null}
        </View>
        {streak > 0 ? (
          <View style={styles.streakChip}>
            <Text style={styles.streakChipText}>🔥 {streak} days</Text>
          </View>
        ) : null}
      </View>

      <View style={styles.statStrip}>
        <View style={styles.statCell}>
          <Text style={styles.statValue}>{dog.weight_kg != null ? `${dog.weight_kg}kg` : '—'}</Text>
          <Text style={styles.statLabel}>Weight</Text>
        </View>
        <View style={[styles.statCell, styles.statCellBorder]}>
          <Text style={styles.statValue}>{completedToday.size}/{habits.length}</Text>
          <Text style={styles.statLabel}>Today</Text>
        </View>
        <View style={styles.statCell}>
          <Text style={styles.statValue}>{habits.length}</Text>
          <Text style={styles.statLabel}>Habits</Text>
        </View>
      </View>

      <View style={styles.headerButtons}>
        <TouchableOpacity style={styles.editButton} onPress={onEdit}>
          <Text style={styles.editButtonText}>Edit pet</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.deleteButton}
          onPress={() => {
            Alert.alert(
              'Delete pet?',
              `This permanently deletes ${dog.name} and all of their habits, vaccine records, and poop/vomit tracker entries.`,
              [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Delete', style: 'destructive', onPress: onDelete },
              ]
            );
          }}
        >
          <Text style={styles.deleteButtonText}>Delete pet</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.card}>
        <View style={styles.moodLabelRow}>
          <Text style={styles.moodLabel}>How is {dog.name} today?</Text>
          <TouchableOpacity
            onPress={() => setMode('mood-history')}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text style={styles.moodHistoryIcon}>🕒</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.moodGrid}>
          {MOOD_OPTIONS.map(opt => {
            const selected = mood?.mood === opt.value;
            return (
              <TouchableOpacity
                key={opt.value}
                style={[styles.moodBtn, selected && styles.moodBtnSelected]}
                onPress={() => setTodayMood(opt.value)}
              >
                <Text style={styles.moodEmoji}>{opt.emoji}</Text>
                <Text style={styles.moodBtnLabel}>{opt.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      <View style={styles.section}>
        <View style={styles.sectionTitleRow}>
          <Text style={styles.sectionTitle}>Today's habits</Text>
          <TouchableOpacity
            onPress={() => { setEditingHabit(null); setMode('habit-quick-add'); }}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text style={styles.addIcon}>+</Text>
          </TouchableOpacity>
        </View>
        {habits.length === 0 ? (
          <Text style={styles.emptyText}>No habits yet. Add one!</Text>
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
                    />
                  ) : null}
                  {h.habit_type === 'feeding' && done && completionIds.get(h.id) ? (
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
          <Text style={styles.vaccineLinkText}>Meal history →</Text>
        </TouchableOpacity>
      ) : null}

      <View style={styles.section}>
        <View style={styles.sectionTitleRow}>
          <Text style={styles.sectionTitle}>Food sensitivities</Text>
          <TouchableOpacity
            style={styles.addChip}
            onPress={() => { setEditingAllergen(null); setMode('allergen-form'); }}
          >
            <Text style={styles.addChipText}>＋ Add</Text>
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
          <Text style={styles.emptyText}>No known sensitivities.</Text>
        )}
      </View>

      <View style={styles.section}>
        <View style={styles.sectionTitleRow}>
          <Text style={styles.sectionTitle}>Poop Tracker</Text>
          <TouchableOpacity
            style={styles.addChip}
            onPress={() => { setEditingLog(null); setMode('poop-form'); }}
          >
            <Text style={styles.addChipText}>＋ Add</Text>
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
          <Text style={styles.emptyText}>No Poop Logged Yet.</Text>
        )}
        {logs.length > 3 ? (
          <TouchableOpacity onPress={() => setMode('health-list')} style={styles.seeAllRow}>
            <Text style={styles.backText}>See all →</Text>
          </TouchableOpacity>
        ) : null}
      </View>

      <View style={styles.section}>
        <View style={styles.sectionTitleRow}>
          <Text style={styles.sectionTitle}>Vomit Tracker</Text>
          <TouchableOpacity
            style={styles.addChip}
            onPress={() => { setEditingVomitLog(null); setMode('vomit-form'); }}
          >
            <Text style={styles.addChipText}>＋ Add</Text>
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
          <Text style={styles.emptyText}>No Vomit Logged Yet.</Text>
        )}
        {vomitLogs.length > 3 ? (
          <TouchableOpacity onPress={() => setMode('vomit-list')} style={styles.seeAllRow}>
            <Text style={styles.backText}>See all →</Text>
          </TouchableOpacity>
        ) : null}
      </View>

      <TouchableOpacity
        style={styles.vaccineLink}
        onPress={() => setMode('symptom-history')}
      >
        <Text style={styles.vaccineLinkText}>🕒 Symptom History</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.vaccineLink}
        onPress={() => setMode('vaccine-list')}
      >
        <Text style={styles.vaccineLinkText}>{vaccineLabel}</Text>
      </TouchableOpacity>
    </ScrollView>
    <MealDetailSheet
      visible={mealDetailHabitId !== null}
      initial={mealDetailInitial}
      onClose={() => setMealDetailHabitId(null)}
      onSave={async (details) => {
        if (!mealDetailCompletionId) return { error: new Error('No completion found for this habit today') };
        const { error } = await addMealDetail(mealDetailCompletionId, dog.id, details);
        if (!error) setMealDetailHabitId(null);
        return { error };
      }}
    />
    </>
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
    heroBand: {
      backgroundColor: theme.moodSelBg,
      borderTopLeftRadius: theme.radiiCard,
      borderTopRightRadius: theme.radiiCard,
      padding: 14,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    photo: {
      width: 48,
      height: 48,
      borderRadius: 24,
    },
    photoPlaceholder: {
      width: 48,
      height: 48,
      borderRadius: 24,
      backgroundColor: theme.surface,
      borderWidth: 1.5,
      borderColor: theme.border,
      alignItems: 'center',
      justifyContent: 'center',
    },
    emoji: {
      fontSize: 22,
    },
    heroInfo: {
      flex: 1,
      minWidth: 0,
    },
    name: {
      fontSize: 17,
      fontWeight: '600',
      color: theme.textDark,
    },
    meta: {
      fontSize: 12,
      color: theme.textMuted,
      marginTop: 2,
    },
    streakChip: {
      backgroundColor: theme.streakBg,
      borderRadius: 20,
      paddingHorizontal: 10,
      paddingVertical: 4,
    },
    streakChipText: {
      fontSize: 12,
      fontWeight: '600',
      color: theme.streakBorder,
    },
    statStrip: {
      flexDirection: 'row',
      backgroundColor: theme.surface,
      borderBottomLeftRadius: theme.radiiCard,
      borderBottomRightRadius: theme.radiiCard,
      borderWidth: 0.5,
      borderColor: theme.border,
      borderTopWidth: 0,
      marginBottom: 16,
    },
    statCell: {
      flex: 1,
      alignItems: 'center',
      paddingVertical: 10,
    },
    statCellBorder: {
      borderLeftWidth: 0.5,
      borderRightWidth: 0.5,
      borderColor: theme.border,
    },
    statValue: {
      fontSize: 14,
      fontWeight: '600',
      color: theme.textDark,
    },
    statLabel: {
      fontSize: 11,
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
      borderRadius: theme.radiiCard,
      borderWidth: 1,
      borderColor: theme.primary,
      paddingVertical: 8,
      alignItems: 'center',
    },
    editButtonText: {
      color: theme.primary,
      fontSize: 13,
      fontWeight: '600',
    },
    deleteButton: {
      flex: 1,
      borderRadius: theme.radiiCard,
      borderWidth: 1,
      borderColor: theme.allergenText,
      paddingVertical: 8,
      alignItems: 'center',
    },
    deleteButtonText: {
      color: theme.allergenText,
      fontSize: 13,
      fontWeight: '600',
    },
    card: {
      backgroundColor: theme.surface,
      borderRadius: theme.radiiCard,
      borderWidth: 0.5,
      borderColor: theme.border,
      padding: 12,
    },
    moodLabelRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 8,
    },
    moodLabel: {
      fontSize: 12,
      color: theme.textMuted,
      fontWeight: '500',
    },
    moodHistoryIcon: {
      fontSize: 14,
      color: theme.textMuted,
    },
    moodGrid: {
      flexDirection: 'row',
      gap: 5,
    },
    moodBtn: {
      flex: 1,
      backgroundColor: theme.background,
      borderWidth: 0.5,
      borderColor: theme.border,
      borderRadius: 8,
      paddingVertical: 6,
      paddingHorizontal: 2,
      alignItems: 'center',
    },
    moodBtnSelected: {
      backgroundColor: theme.moodSelBg,
      borderColor: theme.moodSelBorder,
    },
    moodEmoji: {
      fontSize: 15,
    },
    moodBtnLabel: {
      fontSize: 11,
      color: theme.textMuted,
      marginTop: 2,
      textAlign: 'center',
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
  });
}
