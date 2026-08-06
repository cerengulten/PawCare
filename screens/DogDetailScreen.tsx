import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Image, ScrollView, Alert, StyleSheet } from 'react-native';
import { Dog, Habit, HabitType, DogMood, VaccineRecord } from '../types';
import { useHabits, getHabitTarget } from '../lib/hooks/useHabits';
import { useVaccines } from '../lib/hooks/useVaccines';
import { useDogMood } from '../lib/hooks/useDogMood';
import { usePetStreak } from '../lib/hooks/usePetStreak';
import { useDogs } from '../lib/hooks/useDogs';
import HabitRow from '../components/HabitRow';
import WaterIncrementRow from '../components/WaterIncrementRow';
import VaccineCard from '../components/VaccineCard';
import HabitFormScreen from './HabitFormScreen';
import HabitQuickAddScreen from './HabitQuickAddScreen';
import HabitHistoryScreen from './HabitHistoryScreen';
import VaccineFormScreen from './VaccineFormScreen';
import MoodHistoryScreen from './MoodHistoryScreen';
import { colors, radii } from '../lib/theme';

type Props = {
  dog: Dog;
  updateDog: ReturnType<typeof useDogs>['updateDog'];
  onEdit: () => void;
  onDelete: () => void;
};

type Mode = 'detail' | 'habit-quick-add' | 'habit-form' | 'vaccine-list' | 'vaccine-form' | 'history' | 'mood-history';

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

function computeAge(birthDate: string | null): string {
  if (!birthDate) return '';
  const dob = new Date(birthDate);
  const now = new Date();
  let years = now.getFullYear() - dob.getFullYear();
  let months = now.getMonth() - dob.getMonth();
  if (now.getDate() < dob.getDate()) months -= 1;
  if (months < 0) { years -= 1; months += 12; }
  if (years <= 0) return `${Math.max(months, 0)}m`;
  return months > 0 ? `${years}y ${months}m` : `${years}y`;
}

export default function DogDetailScreen({ dog, updateDog, onEdit, onDelete }: Props) {
  const [mode, setMode] = useState<Mode>('detail');
  const [editingHabit, setEditingHabit] = useState<Habit | null>(null);
  const [presetType, setPresetType] = useState<HabitType | undefined>(undefined);
  const [editingVaccine, setEditingVaccine] = useState<VaccineRecord | null>(null);
  const [historyTarget, setHistoryTarget] = useState<Habit | null>(null);
  const [addingAllergen, setAddingAllergen] = useState(false);
  const [newAllergen, setNewAllergen] = useState('');
  const [allergenError, setAllergenError] = useState('');

  const {
    habits,
    completedToday,
    completedCounts,
    logHabitToday,
    undoHabitToday,
    logWaterAmount,
    resetWaterToday,
    addHabit,
    updateHabit,
    deleteHabit,
  } = useHabits(dog.id);
  const { upcoming, overdue, addVaccine, updateVaccine, deleteVaccine } = useVaccines(dog.id);
  const { mood, setTodayMood } = useDogMood(dog.id);
  const { streak } = usePetStreak(dog.id, habits.map(h => h.id));

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
    return (
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <TouchableOpacity onPress={() => setMode('detail')} style={styles.backRow}>
          <Text style={styles.backText}>‹ Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Vaccines</Text>
        <Text style={styles.subtitle}>{dog.name}</Text>

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

  async function submitAllergen() {
    const trimmed = newAllergen.trim();
    if (!trimmed) return;
    const existing = dog.allergens ?? [];
    if (existing.some(a => a.toLowerCase() === trimmed.toLowerCase())) {
      setNewAllergen('');
      return;
    }
    setAllergenError('');
    const { error } = await updateDog(dog.id, { allergens: [...existing, trimmed] });
    if (error) {
      setAllergenError(error.message);
      return;
    }
    setNewAllergen('');
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
              `This permanently deletes ${dog.name} and all of their habits and vaccine records.`,
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
                  {idx < habits.length - 1 ? <View style={styles.divider} /> : null}
                </View>
              );
            })}
          </View>
        )}
      </View>

      <View style={styles.section}>
        <View style={styles.sectionTitleRow}>
          <Text style={styles.sectionTitle}>Food sensitivities</Text>
          <TouchableOpacity
            style={styles.addChip}
            onPress={() => {
              setAddingAllergen(v => !v);
              setNewAllergen('');
              setAllergenError('');
            }}
          >
            <Text style={styles.addChipText}>{addingAllergen ? '× Close' : '＋ Add'}</Text>
          </TouchableOpacity>
        </View>
        {dog.allergens && dog.allergens.length > 0 ? (
          <View style={styles.allergenRow}>
            {dog.allergens.map(a => (
              <View key={a} style={styles.allergenChip}>
                <Text style={styles.allergenChipText}>🚫 {a}</Text>
              </View>
            ))}
          </View>
        ) : !addingAllergen ? (
          <Text style={styles.emptyText}>No known sensitivities.</Text>
        ) : null}
        {addingAllergen ? (
          <View style={styles.allergenInputRow}>
            <TextInput
              style={styles.allergenInput}
              placeholder="e.g. Chicken"
              placeholderTextColor={colors.textMuted}
              value={newAllergen}
              onChangeText={setNewAllergen}
              onSubmitEditing={submitAllergen}
              returnKeyType="done"
              autoFocus
            />
            <TouchableOpacity style={styles.allergenAddButton} onPress={submitAllergen}>
              <Text style={styles.allergenAddButtonText}>Add</Text>
            </TouchableOpacity>
          </View>
        ) : null}
        {allergenError ? <Text style={styles.allergenErrorText}>{allergenError}</Text> : null}
      </View>

      <TouchableOpacity
        style={styles.vaccineLink}
        onPress={() => setMode('vaccine-list')}
      >
        <Text style={styles.vaccineLinkText}>{vaccineLabel}</Text>
      </TouchableOpacity>
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
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.textDark,
  },
  subtitle: {
    fontSize: 13,
    color: colors.textMuted,
    marginTop: 2,
    marginBottom: 16,
  },
  heroBand: {
    backgroundColor: colors.moodSelectedBg,
    borderTopLeftRadius: radii.card,
    borderTopRightRadius: radii.card,
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
    backgroundColor: colors.card,
    borderWidth: 1.5,
    borderColor: '#A8C89A',
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
    color: colors.textDark,
  },
  meta: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 2,
  },
  streakChip: {
    backgroundColor: colors.streakAccentBg,
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  streakChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.streakAccent,
  },
  statStrip: {
    flexDirection: 'row',
    backgroundColor: colors.card,
    borderBottomLeftRadius: radii.card,
    borderBottomRightRadius: radii.card,
    borderWidth: 0.5,
    borderColor: colors.cardBorder,
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
    borderColor: colors.cardBorder,
  },
  statValue: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textDark,
  },
  statLabel: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 2,
  },
  headerButtons: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  editButton: {
    flex: 1,
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: colors.primaryGreen,
    paddingVertical: 8,
    alignItems: 'center',
  },
  editButtonText: {
    color: colors.primaryGreen,
    fontSize: 13,
    fontWeight: '600',
  },
  deleteButton: {
    flex: 1,
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: colors.allergenText,
    paddingVertical: 8,
    alignItems: 'center',
  },
  deleteButtonText: {
    color: colors.allergenText,
    fontSize: 13,
    fontWeight: '600',
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: radii.card,
    borderWidth: 0.5,
    borderColor: colors.cardBorder,
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
    color: colors.textMuted,
    fontWeight: '500',
  },
  moodHistoryIcon: {
    fontSize: 14,
    color: colors.textMuted,
  },
  moodGrid: {
    flexDirection: 'row',
    gap: 5,
  },
  moodBtn: {
    flex: 1,
    backgroundColor: colors.background,
    borderWidth: 0.5,
    borderColor: colors.cardBorder,
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 2,
    alignItems: 'center',
  },
  moodBtnSelected: {
    backgroundColor: colors.moodSelectedBg,
    borderColor: colors.moodSelectedBorder,
  },
  moodEmoji: {
    fontSize: 15,
  },
  moodBtnLabel: {
    fontSize: 11,
    color: colors.textMuted,
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
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  addIcon: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.primaryGreen,
  },
  addChip: {
    backgroundColor: colors.notStartedBg,
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  addChipText: {
    fontSize: 11,
    fontWeight: '500',
    color: colors.notStartedText,
  },
  allergenRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  allergenInputRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 10,
  },
  allergenInput: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: radii.card,
    paddingVertical: 10,
    paddingHorizontal: 14,
    fontSize: 14,
    color: colors.textDark,
    borderWidth: 0.5,
    borderColor: colors.cardBorder,
  },
  allergenAddButton: {
    backgroundColor: colors.moodSelectedBg,
    borderRadius: radii.card,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  allergenAddButtonText: {
    color: colors.primaryGreen,
    fontSize: 13,
    fontWeight: '600',
  },
  allergenErrorText: {
    fontSize: 12,
    color: colors.allergenText,
    marginTop: 6,
  },
  allergenChip: {
    backgroundColor: colors.allergenBg,
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  allergenChipText: {
    fontSize: 11,
    fontWeight: '500',
    color: colors.allergenText,
  },
  emptyText: {
    fontSize: 13,
    color: colors.textMuted,
  },
  divider: {
    height: 0.5,
    backgroundColor: '#EAF3E4',
    marginVertical: 4,
  },
  vaccineLink: {
    marginTop: 20,
    backgroundColor: colors.card,
    borderRadius: radii.card,
    borderWidth: 0.5,
    borderColor: colors.cardBorder,
    padding: 14,
    alignItems: 'center',
  },
  vaccineLinkText: {
    color: colors.primaryGreen,
    fontSize: 14,
    fontWeight: '600',
  },
});
