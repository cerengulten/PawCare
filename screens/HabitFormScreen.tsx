import { useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import DateTimePicker, {
  DateTimePickerAndroid,
  DateTimePickerEvent,
} from '@react-native-community/datetimepicker';
import { Habit, HabitType } from '../types';
import { useHabits } from '../lib/hooks/useHabits';
import { requestNotificationPermissions } from '../lib/notifications';
import { useTheme } from '../lib/ThemeContext';
import { useT } from '../lib/LanguageContext';
import { ThemeTokens } from '../lib/themes';
import SwipeBackWrapper from '../components/SwipeBackWrapper';
import { calculateWaterTargetMl } from '../lib/waterIntake';

type UseHabitsReturn = ReturnType<typeof useHabits>;

type Props = {
  habit: Habit | null;
  presetType?: HabitType;
  existingHabits?: Habit[];
  weightKg: number | null;
  feedingWetDryRatio: number | null;
  addHabit: UseHabitsReturn['addHabit'];
  updateHabit: UseHabitsReturn['updateHabit'];
  deleteHabit: UseHabitsReturn['deleteHabit'];
  onDone: () => void;
  onCancel: () => void;
};

const FREQUENCIES: Habit['frequency'][] = ['daily', 'weekly', 'custom'];
const TIMES_PER_DAY_OPTIONS = [1, 2, 3, 4];
const TIMES_PER_DAY_LABEL_KEY: Partial<Record<HabitType, string>> = {
  feeding: 'habits.mealsPerDay',
  walking: 'habits.walksPerDay',
  medication: 'habits.dosesPerDay',
  vitamin: 'habits.dosesPerDay',
  dental: 'habits.brushingsPerDay',
  custom: 'habits.timesPerDayGeneric',
};
const REMINDER_NOUN_KEY: Partial<Record<HabitType, string>> = {
  feeding: 'habits.reminderNoun.feeding',
  walking: 'habits.reminderNoun.walking',
  medication: 'habits.reminderNoun.medication',
  vitamin: 'habits.reminderNoun.vitamin',
  dental: 'habits.reminderNoun.dental',
};
const WET_DRY_OPTIONS = [0, 25, 50, 75, 100];
const WALK_DURATION_PRESETS = [15, 30, 45, 60];
const DOSAGE_UNITS = ['mg', 'ml', 'tablet', 'drop', 'other'];
const WEEKDAYS: { value: number; labelKey: string }[] = [
  { value: 1, labelKey: 'habits.weekday.sun' },
  { value: 2, labelKey: 'habits.weekday.mon' },
  { value: 3, labelKey: 'habits.weekday.tue' },
  { value: 4, labelKey: 'habits.weekday.wed' },
  { value: 5, labelKey: 'habits.weekday.thu' },
  { value: 6, labelKey: 'habits.weekday.fri' },
  { value: 7, labelKey: 'habits.weekday.sat' },
];

const HABIT_TYPE_CATEGORY: Record<HabitType, Habit['category']> = {
  feeding: 'feeding',
  water: 'other',
  walking: 'walk',
  medication: 'medication',
  vitamin: 'medication',
  dental: 'grooming',
  custom: 'other',
};

const HABIT_TYPE_DEFAULT_TITLE_KEY: Partial<Record<HabitType, string>> = {
  feeding: 'habits.defaultTitle.feeding',
  water: 'habits.defaultTitle.water',
  walking: 'habits.defaultTitle.walking',
  medication: 'habits.defaultTitle.medication',
  vitamin: 'habits.defaultTitle.vitamin',
  dental: 'habits.defaultTitle.dental',
};

function toTimeString(d: Date): string {
  const h = String(d.getHours()).padStart(2, '0');
  const m = String(d.getMinutes()).padStart(2, '0');
  return `${h}:${m}`;
}

function parseTimeString(s: string): Date {
  const [h, m] = s.split(':').map(Number);
  const d = new Date();
  d.setHours(h, m, 0, 0);
  return d;
}

function parseNumber(s: string): number | null {
  const n = Number(s);
  return s.trim() !== '' && !Number.isNaN(n) ? n : null;
}

export default function HabitFormScreen({
  habit,
  presetType,
  existingHabits = [],
  weightKg,
  feedingWetDryRatio,
  addHabit,
  updateHabit,
  deleteHabit,
  onDone,
  onCancel,
}: Props) {
  const { theme } = useTheme();
  const { t } = useT();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const habitType: HabitType = habit?.habit_type ?? presetType ?? 'custom';
  const knownDosageUnits = ['mg', 'ml', 'tablet', 'drop'];
  const defaultTitleKey = HABIT_TYPE_DEFAULT_TITLE_KEY[habitType];

  const [title, setTitle] = useState(habit?.title ?? (defaultTitleKey ? t(defaultTitleKey) : ''));
  const [frequency, setFrequency] = useState<Habit['frequency']>(habit?.frequency ?? 'daily');
  const [reminderTimes, setReminderTimes] = useState<(string | null)[]>(habit?.reminder_times ?? []);
  const [iosPickerIndex, setIosPickerIndex] = useState<number | null>(null);
  // The iOS spinner's `value` is read from this ref, not from `reminderTimes` directly —
  // if it were fed a freshly-recomputed Date every render (as it was before this fix), the
  // native UIDatePicker sees "jump to this time" on every keystroke-of-scroll and fights
  // the user's finger, which reads as the wheel being stuck (commonly right on the current
  // hour, since the pre-selection fallback was an inline `new Date()` recomputed each
  // render). Setting this once when the picker opens, and never reassigning it from
  // onChange, makes the spinner behave like an uncontrolled native picker after that —
  // onChange still reports the live selection up into reminderTimes as before.
  const iosPickerValueRef = useRef<Date>(new Date());
  const [reminderWeekday, setReminderWeekday] = useState<number | null>(habit?.reminder_weekday ?? null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [customUsesTimesPerDay, setCustomUsesTimesPerDay] = useState(
    habitType === 'custom' && habit?.times_per_day != null
  );
  const [customUsesAmount, setCustomUsesAmount] = useState(
    habitType === 'custom' && (habit?.dosage_amount != null || !!habit?.dosage_unit)
  );
  const usesTimesPerDay =
    habitType === 'feeding' ||
    habitType === 'walking' ||
    habitType === 'medication' ||
    habitType === 'vitamin' ||
    habitType === 'dental' ||
    (habitType === 'custom' && customUsesTimesPerDay);
  const usesAmount = habitType === 'medication' || habitType === 'vitamin' || (habitType === 'custom' && customUsesAmount);
  const amountLabel = habitType === 'medication' || habitType === 'vitamin' ? t('habits.dosageAmount') : t('habits.amountLabel');
  const unitLabel = habitType === 'medication' || habitType === 'vitamin' ? t('habits.dosageUnit') : t('habits.unitLabel');
  const [timesPerDay, setTimesPerDay] = useState<number | null>(habit?.times_per_day ?? null);
  const reminderSlotCount = usesTimesPerDay && timesPerDay ? timesPerDay : 1;
  const reminderNoun = REMINDER_NOUN_KEY[habitType] ? t(REMINDER_NOUN_KEY[habitType]!) : t('habits.reminderNoun.generic');
  const [portionGrams, setPortionGrams] = useState(
    habit?.portion_grams != null ? String(habit.portion_grams) : ''
  );
  const [foodBrand, setFoodBrand] = useState(habit?.food_brand ?? '');
  const [wetDryRatio, setWetDryRatio] = useState<number | null>(habit?.wet_dry_ratio ?? null);
  // Only suggested when creating a new water habit — an already-saved goal (edit mode)
  // is never silently overwritten by opening the form.
  const suggestedWaterGoalMl = !habit ? calculateWaterTargetMl(weightKg, feedingWetDryRatio) : null;
  const [waterGoalMl, setWaterGoalMl] = useState(
    habit?.water_goal_ml != null
      ? String(habit.water_goal_ml)
      : suggestedWaterGoalMl != null ? String(suggestedWaterGoalMl) : ''
  );
  const [waterGoalManuallyEdited, setWaterGoalManuallyEdited] = useState(false);
  const [walkDuration, setWalkDuration] = useState(
    habit?.walk_duration_minutes != null ? String(habit.walk_duration_minutes) : ''
  );
  const [dosageAmount, setDosageAmount] = useState(
    habit?.dosage_amount != null ? String(habit.dosage_amount) : ''
  );
  const [dosageUnit, setDosageUnit] = useState<string | null>(
    habit?.dosage_unit && knownDosageUnits.includes(habit.dosage_unit) ? habit.dosage_unit : null
  );
  const [showCustomUnit, setShowCustomUnit] = useState(
    !!habit?.dosage_unit && !knownDosageUnits.includes(habit.dosage_unit)
  );
  const [customDosageUnit, setCustomDosageUnit] = useState(
    habit?.dosage_unit && !knownDosageUnits.includes(habit.dosage_unit) ? habit.dosage_unit : ''
  );

  function setReminderTimeAt(index: number, value: string) {
    setReminderTimes(prev => {
      const next = [...prev];
      while (next.length <= index) next.push(null);
      next[index] = value;
      return next;
    });
  }

  function openTimePicker(index: number) {
    const current = reminderTimes[index] ?? null;
    if (Platform.OS === 'android') {
      DateTimePickerAndroid.open({
        value: current ? parseTimeString(current) : new Date(),
        mode: 'time',
        onChange: (_event: DateTimePickerEvent, selected?: Date) => {
          if (selected) setReminderTimeAt(index, toTimeString(selected));
        },
      });
    } else {
      iosPickerValueRef.current = current ? parseTimeString(current) : new Date();
      setIosPickerIndex(index);
    }
  }

  async function handleSave() {
    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      setError(t('habits.titleRequired'));
      return;
    }

    // Don't let the same pet have two of the same habit. Non-custom types are unique by
    // type; custom habits are unique by title. Editing an existing habit is exempt.
    if (!habit) {
      const duplicate = existingHabits.some(h =>
        habitType === 'custom'
          ? h.title.trim().toLowerCase() === trimmedTitle.toLowerCase()
          : h.habit_type === habitType
      );
      if (duplicate) {
        setError(
          habitType === 'custom'
            ? t('habits.duplicateName')
            : t('habits.duplicateType', {
                type: (defaultTitleKey ? t(defaultTitleKey) : habitType).toLowerCase(),
              })
        );
        return;
      }
    }

    // Type-specific amounts must be a real number — otherwise the daily target silently
    // falls back to 1, which is meaningless for a water goal or a meal portion.
    if (usesTimesPerDay && !timesPerDay) {
      const label = TIMES_PER_DAY_LABEL_KEY[habitType]
        ? t(TIMES_PER_DAY_LABEL_KEY[habitType]!)
        : t('habits.timesPerDayGeneric');
      setError(t('habits.chooseTimesPerDay', { label: label.toLowerCase() }));
      return;
    }
    if (habitType === 'water' && !((parseNumber(waterGoalMl) ?? 0) > 0)) {
      setError(t('habits.enterWaterGoal'));
      return;
    }
    if (habitType === 'feeding' && !((parseNumber(portionGrams) ?? 0) > 0)) {
      setError(t('habits.enterPortion'));
      return;
    }
    if (usesAmount && !((parseNumber(dosageAmount) ?? 0) > 0)) {
      setError(t('habits.enterAmount', { label: amountLabel.toLowerCase() }));
      return;
    }

    const resolvedDosageUnit = showCustomUnit ? customDosageUnit.trim() || null : dosageUnit;
    const activeReminderTimes = reminderTimes.slice(0, reminderSlotCount).filter((t): t is string => !!t);

    if (activeReminderTimes.length > 0) {
      const granted = await requestNotificationPermissions();
      if (!granted) {
        setError(t('vaccineForm.notifPermission'));
        return;
      }
    }

    setLoading(true);
    setError('');

    const payload = {
      title: trimmedTitle,
      category: HABIT_TYPE_CATEGORY[habitType],
      habit_type: habitType,
      frequency,
      reminder_times: activeReminderTimes.length > 0 ? activeReminderTimes : null,
      reminder_weekday: frequency === 'weekly' ? reminderWeekday : null,
      is_active: true,
      times_per_day: usesTimesPerDay ? timesPerDay : null,
      portion_grams: habitType === 'feeding' ? parseNumber(portionGrams) : null,
      food_brand: habitType === 'feeding' ? foodBrand.trim() || null : null,
      wet_dry_ratio: habitType === 'feeding' ? wetDryRatio : null,
      water_goal_ml: habitType === 'water' ? parseNumber(waterGoalMl) : null,
      walk_duration_minutes: habitType === 'walking' ? parseNumber(walkDuration) : null,
      dosage_amount: usesAmount ? parseNumber(dosageAmount) : null,
      dosage_unit: usesAmount ? resolvedDosageUnit : null,
    };

    const { error } = habit
      ? await updateHabit(habit.id, payload)
      : await addHabit(payload);

    setLoading(false);
    if (error) {
      setError(error.message);
      return;
    }
    onDone();
  }

  async function handleDelete() {
    if (!habit) return;
    setLoading(true);
    const { error } = await deleteHabit(habit.id);
    setLoading(false);
    if (error) {
      setError(error.message);
      return;
    }
    onDone();
  }

  return (
    <SwipeBackWrapper onBack={onCancel}>
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.title}>{habit ? t('habits.editTitle') : t('habits.addHabit')}</Text>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <TextInput
          style={styles.input}
          placeholder={t('habits.title')}
          placeholderTextColor={theme.textMuted}
          value={title}
          onChangeText={setTitle}
        />

        {habitType === 'custom' && (
          <>
            <Text style={styles.sectionLabel}>{t('habits.addDetailsOptional')}</Text>
            <Text style={styles.helperText}>
              {t('habits.customHint')}
            </Text>
            <View style={styles.chipRow}>
              <TouchableOpacity
                style={[styles.chip, customUsesTimesPerDay && styles.chipSelected]}
                onPress={() => setCustomUsesTimesPerDay(v => !v)}
              >
                <Text style={[styles.chipText, customUsesTimesPerDay && styles.chipTextSelected]}>
                  {t('habits.timesPerDayChip')}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.chip, customUsesAmount && styles.chipSelected]}
                onPress={() => setCustomUsesAmount(v => !v)}
              >
                <Text style={[styles.chipText, customUsesAmount && styles.chipTextSelected]}>
                  {t('habits.amountChip')}
                </Text>
              </TouchableOpacity>
            </View>
          </>
        )}

        {usesTimesPerDay && (
          <>
            <Text style={styles.sectionLabel}>
              {TIMES_PER_DAY_LABEL_KEY[habitType] ? t(TIMES_PER_DAY_LABEL_KEY[habitType]!) : t('habits.timesPerDayGeneric')}
            </Text>
            <View style={styles.chipRow}>
              {TIMES_PER_DAY_OPTIONS.map((n) => (
                <TouchableOpacity
                  key={n}
                  style={[styles.chip, timesPerDay === n && styles.chipSelected]}
                  onPress={() => setTimesPerDay(n)}
                >
                  <Text style={[styles.chipText, timesPerDay === n && styles.chipTextSelected]}>
                    {t('habits.perDay', { count: n })}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </>
        )}

        {habitType === 'feeding' && (
          <>
            <Text style={styles.sectionLabel}>{t('habits.portionGrams')}</Text>
            <TextInput
              style={styles.input}
              placeholder={t('habits.portionPlaceholder')}
              placeholderTextColor={theme.textMuted}
              keyboardType="numeric"
              value={portionGrams}
              onChangeText={setPortionGrams}
            />

            <Text style={styles.sectionLabel}>{t('habits.foodBrandOptional')}</Text>
            <TextInput
              style={styles.input}
              placeholder={t('habits.foodBrandPlaceholder')}
              placeholderTextColor={theme.textMuted}
              value={foodBrand}
              onChangeText={setFoodBrand}
            />

            <Text style={styles.sectionLabel}>{t('habits.wetDryRatio')}</Text>
            <View style={styles.chipRow}>
              {WET_DRY_OPTIONS.map((pct) => (
                <TouchableOpacity
                  key={pct}
                  style={[styles.chip, wetDryRatio === pct && styles.chipSelected]}
                  onPress={() => setWetDryRatio(pct)}
                >
                  <Text style={[styles.chipText, wetDryRatio === pct && styles.chipTextSelected]}>
                    {t('habits.percentWet', { pct })}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </>
        )}

        {habitType === 'water' && (
          <>
            <Text style={styles.sectionLabel}>{t('habits.dailyGoalMl')}</Text>
            <TextInput
              style={styles.input}
              placeholder={t('habits.dailyGoalPlaceholder')}
              placeholderTextColor={theme.textMuted}
              keyboardType="numeric"
              value={waterGoalMl}
              onChangeText={(text) => { setWaterGoalMl(text); setWaterGoalManuallyEdited(true); }}
            />
            {!waterGoalManuallyEdited && suggestedWaterGoalMl != null ? (
              <Text style={styles.helperText}>{t('habits.suggestedByWeight')}</Text>
            ) : null}
          </>
        )}

        {habitType === 'walking' && (
          <>
            <Text style={styles.sectionLabel}>{t('habits.durationMinutes')}</Text>
            <TextInput
              style={styles.input}
              placeholder={t('habits.durationPlaceholder')}
              placeholderTextColor={theme.textMuted}
              keyboardType="numeric"
              value={walkDuration}
              onChangeText={setWalkDuration}
            />
            <View style={styles.chipRow}>
              {WALK_DURATION_PRESETS.map((min) => (
                <TouchableOpacity
                  key={min}
                  style={[styles.chip, walkDuration === String(min) && styles.chipSelected]}
                  onPress={() => setWalkDuration(String(min))}
                >
                  <Text style={[styles.chipText, walkDuration === String(min) && styles.chipTextSelected]}>
                    {t('habits.minutesShort', { count: min })}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </>
        )}

        {usesAmount && (
          <>
            <Text style={styles.sectionLabel}>{amountLabel}</Text>
            <TextInput
              style={styles.input}
              placeholder={t('habits.amountPlaceholder')}
              placeholderTextColor={theme.textMuted}
              keyboardType="numeric"
              value={dosageAmount}
              onChangeText={setDosageAmount}
            />

            <Text style={styles.sectionLabel}>{unitLabel}</Text>
            <View style={styles.chipRow}>
              {DOSAGE_UNITS.map((unit) => (
                <TouchableOpacity
                  key={unit}
                  style={[styles.chip, dosageUnit === unit && styles.chipSelected]}
                  onPress={() => {
                    setDosageUnit(unit);
                    setShowCustomUnit(unit === 'other');
                  }}
                >
                  <Text style={[styles.chipText, dosageUnit === unit && styles.chipTextSelected]}>{unit}</Text>
                </TouchableOpacity>
              ))}
            </View>
            {showCustomUnit && (
              <TextInput
                style={styles.input}
                placeholder={t('habits.customUnit')}
                placeholderTextColor={theme.textMuted}
                value={customDosageUnit}
                onChangeText={setCustomDosageUnit}
              />
            )}
          </>
        )}

        <Text style={styles.sectionLabel}>{t('habits.frequency')}</Text>
        <View style={styles.chipRow}>
          {FREQUENCIES.map((f) => (
            <TouchableOpacity
              key={f}
              style={[styles.chip, frequency === f && styles.chipSelected]}
              onPress={() => setFrequency(f)}
            >
              <Text style={[styles.chipText, frequency === f && styles.chipTextSelected]}>{t('habits.freq.' + f)}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {frequency === 'weekly' && (
          <>
            <Text style={styles.sectionLabel}>{t('habits.dayOfWeek')}</Text>
            <View style={styles.chipRow}>
              {WEEKDAYS.map((d) => (
                <TouchableOpacity
                  key={d.value}
                  style={[styles.chip, reminderWeekday === d.value && styles.chipSelected]}
                  onPress={() => setReminderWeekday(d.value)}
                >
                  <Text style={[styles.chipText, reminderWeekday === d.value && styles.chipTextSelected]}>
                    {t(d.labelKey)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </>
        )}

        <Text style={styles.sectionLabel}>
          {reminderSlotCount > 1 ? t('habits.remindersOptional', { noun: reminderNoun }) : t('habits.reminderTimeOptional')}
        </Text>
        {Array.from({ length: reminderSlotCount }).map((_, index) => {
          const value = reminderTimes[index] ?? null;
          return (
            <View key={index} style={styles.reminderRow}>
              {reminderSlotCount > 1 ? (
                <Text style={styles.reminderRowLabel}>{reminderNoun} {index + 1}</Text>
              ) : null}
              <TouchableOpacity style={styles.input} onPress={() => openTimePicker(index)}>
                <Text style={value ? styles.inputText : styles.placeholderText}>
                  {value ?? t('habits.noReminderTime')}
                </Text>
              </TouchableOpacity>

              {Platform.OS === 'ios' && iosPickerIndex === index && (
                <View>
                  <DateTimePicker
                    value={iosPickerValueRef.current}
                    mode="time"
                    display="spinner"
                    onChange={(_e: DateTimePickerEvent, selected?: Date) => {
                      if (selected) setReminderTimeAt(index, toTimeString(selected));
                    }}
                  />
                  <TouchableOpacity onPress={() => setIosPickerIndex(null)}>
                    <Text style={styles.switchLink}>{t('common.done')}</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          );
        })}

        <TouchableOpacity style={styles.button} onPress={handleSave} disabled={loading}>
          {loading ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text style={styles.buttonText}>{t('common.save')}</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity onPress={onCancel} style={styles.switchRow}>
          <Text style={styles.switchLink}>{t('common.cancel')}</Text>
        </TouchableOpacity>

        {habit ? (
          <TouchableOpacity onPress={handleDelete} style={styles.switchRow} disabled={loading}>
            <Text style={styles.deleteLink}>{t('habits.deleteHabit')}</Text>
          </TouchableOpacity>
        ) : null}
      </ScrollView>
    </KeyboardAvoidingView>
    </SwipeBackWrapper>
  );
}

function makeStyles(theme: ThemeTokens) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.background,
    },
    scrollContent: {
      padding: 24,
      alignItems: 'center',
    },
    title: {
      fontSize: 26,
      fontWeight: '700',
      color: theme.textDark,
      marginBottom: 20,
    },
    error: {
      color: theme.allergenText,
      fontSize: 13,
      marginBottom: 12,
      textAlign: 'center',
    },
    input: {
      width: '100%',
      backgroundColor: theme.surface,
      borderRadius: theme.radiiCard,
      padding: 16,
      fontSize: 15,
      color: theme.textDark,
      marginBottom: 12,
      borderWidth: 1,
      borderColor: theme.border,
    },
    inputText: {
      fontSize: 15,
      color: theme.textDark,
    },
    placeholderText: {
      fontSize: 15,
      color: theme.textMuted,
    },
    sectionLabel: {
      width: '100%',
      fontSize: 13,
      fontWeight: '600',
      color: theme.textMuted,
      marginBottom: 8,
    },
    helperText: {
      width: '100%',
      fontSize: 12,
      color: theme.textMuted,
      marginBottom: 8,
      marginTop: -4,
    },
    reminderRow: {
      width: '100%',
    },
    reminderRowLabel: {
      fontSize: 12,
      fontWeight: '600',
      color: theme.textMuted,
      marginBottom: 4,
    },
    chipRow: {
      width: '100%',
      flexDirection: 'row',
      flexWrap: 'wrap',
      marginBottom: 12,
    },
    chip: {
      borderRadius: theme.radiiCard,
      paddingVertical: 8,
      paddingHorizontal: 14,
      borderWidth: 1,
      borderColor: theme.border,
      backgroundColor: theme.surface,
      marginRight: 8,
      marginBottom: 8,
    },
    chipSelected: {
      backgroundColor: theme.primary,
      borderColor: theme.primary,
    },
    chipText: {
      fontSize: 13,
      color: theme.textDark,
      textTransform: 'capitalize',
    },
    chipTextSelected: {
      color: 'white',
    },
    button: {
      width: '100%',
      backgroundColor: theme.primary,
      borderRadius: theme.radiiCard,
      padding: 16,
      alignItems: 'center',
      marginTop: 8,
    },
    buttonText: {
      color: 'white',
      fontSize: 16,
      fontWeight: '600',
    },
    switchRow: {
      flexDirection: 'row',
      marginTop: 20,
    },
    switchLink: {
      color: theme.primary,
      fontSize: 14,
      fontWeight: '600',
    },
    deleteLink: {
      color: theme.allergenText,
      fontSize: 14,
      fontWeight: '600',
    },
  });
}
