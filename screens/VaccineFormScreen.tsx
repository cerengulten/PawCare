import { useMemo, useState } from 'react';
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
  Switch,
} from 'react-native';
import DateTimePicker, {
  DateTimePickerAndroid,
  DateTimePickerEvent,
} from '@react-native-community/datetimepicker';
import { VaccineRecord } from '../types';
import { useVaccines } from '../lib/hooks/useVaccines';
import { requestNotificationPermissions } from '../lib/notifications';
import { useTheme } from '../lib/ThemeContext';
import { useT } from '../lib/LanguageContext';
import { ThemeTokens } from '../lib/themes';
import SwipeBackWrapper from '../components/SwipeBackWrapper';
import {
  TreatmentType,
  TREATMENT_PRESETS,
  detectTreatmentType,
  detectCadenceMonths,
  cleanTreatmentNotes,
  encodeTreatmentMeta,
} from '../lib/treatmentLogic';

type UseVaccinesReturn = ReturnType<typeof useVaccines>;

type Props = {
  vaccine: VaccineRecord | null;
  addVaccine: UseVaccinesReturn['addVaccine'];
  updateVaccine: UseVaccinesReturn['updateVaccine'];
  deleteVaccine: UseVaccinesReturn['deleteVaccine'];
  onDone: () => void;
  onCancel: () => void;
};

function toDateOnlyString(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function parseUserDateInput(s: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s.trim());
  if (!match) return null;
  const y = Number(match[1]);
  const m = Number(match[2]);
  const day = Number(match[3]);
  const d = new Date(y, m - 1, day);
  if (d.getFullYear() !== y || d.getMonth() !== m - 1 || d.getDate() !== day) return null;
  return d;
}

function addMonths(base: Date, months: number): Date {
  const d = new Date(base.getTime());
  d.setMonth(d.getMonth() + months);
  return d;
}

function getMinNextDueDate(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 1);
  return d;
}

const CATEGORIES: { type: TreatmentType; labelKey: string; defaultLabel: string; emoji: string }[] = [
  { type: 'vaccine', labelKey: 'treatments.types.vaccine', defaultLabel: 'Vaccine', emoji: '💉' },
  { type: 'external_parasite', labelKey: 'treatments.types.external', defaultLabel: 'Flea & Tick', emoji: '🪲' },
  { type: 'internal_parasite', labelKey: 'treatments.types.internal', defaultLabel: 'Deworming', emoji: '🪱' },
  { type: 'heartworm', labelKey: 'treatments.types.heartworm', defaultLabel: 'Heartworm', emoji: '❤️' },
];

const CADENCE_OPTIONS = [
  { months: 1, labelKey: 'treatments.cadence.oneMonth', defaultLabel: '1 Month' },
  { months: 3, labelKey: 'treatments.cadence.threeMonths', defaultLabel: '3 Months' },
  { months: 6, labelKey: 'treatments.cadence.sixMonths', defaultLabel: '6 Months' },
  { months: 12, labelKey: 'treatments.cadence.oneYear', defaultLabel: '1 Year' },
];

export default function VaccineFormScreen({
  vaccine,
  addVaccine,
  updateVaccine,
  deleteVaccine,
  onDone,
  onCancel,
}: Props) {
  const { theme, isDarkMode } = useTheme();
  const { t } = useT();
  const styles = useMemo(() => makeStyles(theme, isDarkMode), [theme, isDarkMode]);

  const initialType = vaccine ? detectTreatmentType(vaccine.vaccine_name, vaccine.notes) : 'vaccine';
  const initialCadence = vaccine ? detectCadenceMonths(initialType, vaccine.notes, vaccine.vaccine_name) : 12;

  const [treatmentType, setTreatmentType] = useState<TreatmentType>(initialType);
  const [cadenceMonths, setCadenceMonths] = useState<number>(initialCadence);
  const [vaccineName, setVaccineName] = useState(vaccine?.vaccine_name ?? '');
  const [dateGivenText, setDateGivenText] = useState(
    vaccine?.date_given?.slice(0, 10) ?? toDateOnlyString(new Date())
  );
  const [nextDueDateText, setNextDueDateText] = useState(
    vaccine?.next_due_date?.slice(0, 10) ?? toDateOnlyString(addMonths(new Date(), initialCadence))
  );
  const [userNotes, setUserNotes] = useState(cleanTreatmentNotes(vaccine?.notes));
  const [reminderEnabled, setReminderEnabled] = useState(vaccine?.reminder_enabled ?? true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const minNextDueDate = getMinNextDueDate();
  const parsedNextDueDate = parseUserDateInput(nextDueDateText);
  const nextDuePickerValue =
    parsedNextDueDate && parsedNextDueDate >= minNextDueDate ? parsedNextDueDate : minNextDueDate;

  function handleSelectCategory(type: TreatmentType) {
    setTreatmentType(type);
    let defaultCadence = 12;
    if (type === 'external_parasite' || type === 'heartworm') defaultCadence = 1;
    if (type === 'internal_parasite') defaultCadence = 3;

    setCadenceMonths(defaultCadence);
    const base = parseUserDateInput(dateGivenText) ?? new Date();
    setNextDueDateText(toDateOnlyString(addMonths(base, defaultCadence)));
  }

  function handleSelectPreset(preset: typeof TREATMENT_PRESETS['vaccine'][0]) {
    setVaccineName(preset.defaultName);
    setTreatmentType(preset.type);
    setCadenceMonths(preset.cadenceMonths);
    const base = parseUserDateInput(dateGivenText) ?? new Date();
    setNextDueDateText(toDateOnlyString(addMonths(base, preset.cadenceMonths)));
    setReminderEnabled(true);
  }

  function handleSelectCadence(months: number) {
    setCadenceMonths(months);
    const base = parseUserDateInput(dateGivenText) ?? new Date();
    setNextDueDateText(toDateOnlyString(addMonths(base, months)));
  }

  async function handleToggleReminder(value: boolean) {
    if (value) {
      const granted = await requestNotificationPermissions();
      if (!granted) {
        setError(t('vaccineForm.notifPermission') || 'Please enable notifications in device settings');
        return;
      }
    }
    setError('');
    setReminderEnabled(value);
  }

  function openAndroidDateGivenPicker() {
    DateTimePickerAndroid.open({
      value: parseUserDateInput(dateGivenText) ?? new Date(),
      mode: 'date',
      maximumDate: new Date(),
      onChange: (_event: DateTimePickerEvent, selected?: Date) => {
        if (selected) {
          const selectedStr = toDateOnlyString(selected);
          setDateGivenText(selectedStr);
          setNextDueDateText(toDateOnlyString(addMonths(selected, cadenceMonths)));
        }
      },
    });
  }

  function openAndroidNextDuePicker() {
    DateTimePickerAndroid.open({
      value: nextDuePickerValue,
      mode: 'date',
      minimumDate: minNextDueDate,
      onChange: (_event: DateTimePickerEvent, selected?: Date) => {
        if (selected) setNextDueDateText(toDateOnlyString(selected));
      },
    });
  }

  async function handleSave() {
    const trimmedName = vaccineName.trim();
    if (!trimmedName) {
      setError(t('vaccineForm.nameRequired') || 'Treatment name is required.');
      return;
    }

    let dateGiven: Date | null = null;
    if (dateGivenText.trim()) {
      dateGiven = parseUserDateInput(dateGivenText);
      if (!dateGiven) {
        setError(t('vaccineForm.dateGivenInvalid') || 'Invalid given date format.');
        return;
      }
      if (dateGiven > new Date()) {
        setError(t('vaccineForm.dateGivenFuture') || 'Given date cannot be in the future.');
        return;
      }
    }

    if (!nextDueDateText.trim()) {
      setError(t('vaccineForm.dueDateRequired') || 'Next due date is required.');
      return;
    }
    if (!parsedNextDueDate) {
      setError(t('vaccineForm.nextDueInvalid') || 'Invalid next due date format.');
      return;
    }
    if (parsedNextDueDate < minNextDueDate) {
      setError(t('vaccineForm.nextDueFuture') || 'Due date must be in the future.');
      return;
    }

    setLoading(true);
    setError('');

    const encodedNotes = encodeTreatmentMeta(treatmentType, cadenceMonths, userNotes);

    const payload = {
      vaccine_name: trimmedName,
      date_given: dateGiven ? toDateOnlyString(dateGiven) : null,
      next_due_date: toDateOnlyString(parsedNextDueDate),
      notes: encodedNotes || null,
      reminder_enabled: reminderEnabled,
    };

    const { error: saveError } = vaccine
      ? await updateVaccine(vaccine.id, payload)
      : await addVaccine(payload);

    setLoading(false);
    if (saveError) {
      setError(saveError.message);
      return;
    }
    onDone();
  }

  async function handleDelete() {
    if (!vaccine) return;
    setLoading(true);
    const { error: delError } = await deleteVaccine(vaccine.id);
    setLoading(false);
    if (delError) {
      setError(delError.message);
      return;
    }
    onDone();
  }

  const presetsForCategory = TREATMENT_PRESETS[treatmentType] || [];

  return (
    <SwipeBackWrapper onBack={onCancel}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          <View style={styles.topBar}>
            <TouchableOpacity onPress={onCancel} style={styles.backBtn} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Text style={styles.backBtnText}>‹ {t('common.cancel') || 'Cancel'}</Text>
            </TouchableOpacity>
            <Text style={styles.headerTitle}>
              {vaccine ? (t('vaccineForm.editTitle') || 'Edit Care Plan') : (t('treatments.addTitle') || 'Add Preventive Care')}
            </Text>
            <View style={{ width: 60 }} />
          </View>

          {error ? <Text style={styles.error}>{error}</Text> : null}

          {/* STEP 1: WHAT ARE YOU LOGGING? */}
          <View style={styles.sectionCard}>
            <Text style={styles.stepBadge}>STEP 1 · CATEGORY</Text>
            <Text style={styles.sectionHeader}>{t('treatments.whatAreYouLogging') || 'What are you logging?'}</Text>
            <View style={styles.categoryGrid}>
              {CATEGORIES.map((cat) => {
                const isSelected = treatmentType === cat.type;
                return (
                  <TouchableOpacity
                    key={cat.type}
                    style={[styles.categoryCard, isSelected && styles.categoryCardSelected]}
                    onPress={() => handleSelectCategory(cat.type)}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.categoryCardEmoji}>{cat.emoji}</Text>
                    <Text style={[styles.categoryCardText, isSelected && styles.categoryCardTextSelected]}>
                      {t(cat.labelKey) || cat.defaultLabel}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* STEP 2: POPULAR PRESETS & BRANDS */}
          <View style={styles.sectionCard}>
            <Text style={styles.stepBadge}>STEP 2 · TREATMENT & BRAND</Text>
            <Text style={styles.sectionHeader}>{t('treatments.popularPresets') || 'Popular Brands & Types'}</Text>
            <View style={styles.presetsRow}>
              {presetsForCategory.map((preset, idx) => {
                const isSelected = vaccineName.trim().toLowerCase() === preset.defaultName.toLowerCase();
                return (
                  <TouchableOpacity
                    key={idx}
                    style={[styles.presetChip, isSelected && styles.presetChipSelected]}
                    onPress={() => handleSelectPreset(preset)}
                    activeOpacity={0.75}
                  >
                    <Text style={[styles.presetChipText, isSelected && styles.presetChipTextSelected]}>
                      {preset.emoji} {preset.defaultName}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <TextInput
              style={styles.nameInput}
              placeholder={t('treatments.namePlaceholder') || 'e.g. Bravecto, Rabies, NexGard...'}
              placeholderTextColor={theme.textMuted}
              value={vaccineName}
              onChangeText={setVaccineName}
            />
          </View>

          {/* STEP 3: REPEAT CADENCE */}
          <View style={styles.sectionCard}>
            <Text style={styles.stepBadge}>STEP 3 · REPEAT CADENCE</Text>
            <Text style={styles.sectionHeader}>{t('treatments.cadenceHeader') || 'How often does this repeat?'}</Text>
            <View style={styles.cadenceRow}>
              {CADENCE_OPTIONS.map((opt) => {
                const isSelected = cadenceMonths === opt.months;
                return (
                  <TouchableOpacity
                    key={opt.months}
                    style={[styles.cadenceChip, isSelected && styles.cadenceChipSelected]}
                    onPress={() => handleSelectCadence(opt.months)}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.cadenceChipText, isSelected && styles.cadenceChipTextSelected]}>
                      {t(opt.labelKey) || opt.defaultLabel}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* STEP 4: SCHEDULE & REMINDERS */}
          <View style={styles.sectionCard}>
            <Text style={styles.stepBadge}>STEP 4 · SCHEDULE & REMINDER</Text>
            <Text style={styles.sectionHeader}>{t('treatments.datesAndReminders') || 'Schedule'}</Text>

            {/* Date Given */}
            <Text style={styles.fieldLabel}>{t('treatments.lastGivenLabel') || 'Date administered (optional)'}</Text>
            <View style={styles.dateRow}>
              <TextInput
                style={[styles.input, styles.dateInput]}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={theme.textMuted}
                value={dateGivenText}
                onChangeText={(val) => {
                  setDateGivenText(val);
                  const parsed = parseUserDateInput(val);
                  if (parsed) setNextDueDateText(toDateOnlyString(addMonths(parsed, cadenceMonths)));
                }}
                autoCapitalize="none"
              />
              {Platform.OS === 'ios' ? (
                <DateTimePicker
                  value={parseUserDateInput(dateGivenText) ?? new Date()}
                  mode="date"
                  display="compact"
                  themeVariant={isDarkMode ? 'dark' : 'light'}
                  accentColor={theme.primary}
                  maximumDate={new Date()}
                  onChange={(_e: DateTimePickerEvent, selected?: Date) => {
                    if (selected) {
                      setDateGivenText(toDateOnlyString(selected));
                      setNextDueDateText(toDateOnlyString(addMonths(selected, cadenceMonths)));
                    }
                  }}
                />
              ) : (
                <TouchableOpacity style={styles.calendarButton} onPress={openAndroidDateGivenPicker}>
                  <Text style={styles.calendarButtonText}>📅</Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Next Due Date */}
            <Text style={styles.fieldLabel}>{t('treatments.nextDueLabel') || 'Next dose due date'}</Text>
            <View style={styles.dateRow}>
              <TextInput
                style={[styles.input, styles.dateInput]}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={theme.textMuted}
                value={nextDueDateText}
                onChangeText={setNextDueDateText}
                autoCapitalize="none"
              />
              {Platform.OS === 'ios' ? (
                <DateTimePicker
                  value={nextDuePickerValue}
                  mode="date"
                  display="compact"
                  themeVariant={isDarkMode ? 'dark' : 'light'}
                  accentColor={theme.primary}
                  minimumDate={minNextDueDate}
                  onChange={(_e: DateTimePickerEvent, selected?: Date) => {
                    if (selected) setNextDueDateText(toDateOnlyString(selected));
                  }}
                />
              ) : (
                <TouchableOpacity style={styles.calendarButton} onPress={openAndroidNextDuePicker}>
                  <Text style={styles.calendarButtonText}>📅</Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Reminder Toggle */}
            <View style={styles.reminderRow}>
              <View style={styles.reminderInfo}>
                <Text style={styles.reminderLabel}>{t('vaccineForm.remindOnDueDate') || 'Remind on due date'}</Text>
                <Text style={styles.reminderSubtitle}>
                  {t('treatments.reminderDesc') || 'Push alert when booster or next chew is due'}
                </Text>
              </View>
              <Switch
                value={reminderEnabled}
                onValueChange={handleToggleReminder}
                trackColor={{ false: theme.border, true: theme.primary }}
                thumbColor="#FFFFFF"
              />
            </View>

            {/* Notes */}
            <TextInput
              style={[styles.input, styles.notesInput]}
              placeholder={t('vaccineForm.notesOptional') || 'Notes, clinic, or dosage instructions (optional)...'}
              placeholderTextColor={theme.textMuted}
              value={userNotes}
              onChangeText={setUserNotes}
              multiline
            />
          </View>

          {/* Action Buttons */}
          <TouchableOpacity
            style={styles.saveBtn}
            onPress={handleSave}
            disabled={loading}
            activeOpacity={0.85}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.saveBtnText}>
                {vaccine ? (t('common.save') || 'Save Changes') : (t('treatments.saveToPlan') || 'Save to Care Plan →')}
              </Text>
            )}
          </TouchableOpacity>

          {vaccine ? (
            <TouchableOpacity onPress={handleDelete} style={styles.deleteRow} disabled={loading}>
              <Text style={styles.deleteText}>{t('common.delete') || 'Delete from plan'}</Text>
            </TouchableOpacity>
          ) : null}
        </ScrollView>
      </KeyboardAvoidingView>
    </SwipeBackWrapper>
  );
}

function makeStyles(theme: ThemeTokens, isDark = false) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.background,
    },
    scrollContent: {
      padding: 16,
      paddingTop: Platform.OS === 'ios' ? 54 : 40,
      paddingBottom: 40,
    },
    topBar: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 16,
    },
    backBtn: {
      paddingVertical: 6,
      paddingHorizontal: 10,
    },
    backBtnText: {
      fontSize: 15,
      color: theme.primary,
      fontWeight: '600',
    },
    headerTitle: {
      fontSize: 18,
      fontWeight: '700',
      color: theme.textDark,
    },
    error: {
      color: theme.allergenText,
      fontSize: 13,
      marginBottom: 12,
      textAlign: 'center',
      backgroundColor: theme.allergenBg,
      padding: 10,
      borderRadius: 12,
    },
    sectionCard: {
      backgroundColor: theme.surface,
      borderRadius: 20,
      padding: 16,
      marginBottom: 16,
      borderWidth: 1.5,
      borderColor: theme.border,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: isDark ? 0.2 : 0.04,
      shadowRadius: 6,
      elevation: 2,
    },
    stepBadge: {
      fontSize: 11,
      fontWeight: '800',
      color: theme.primary,
      letterSpacing: 0.6,
      marginBottom: 4,
    },
    sectionHeader: {
      fontSize: 16,
      fontWeight: '700',
      color: theme.textDark,
      marginBottom: 12,
    },
    categoryGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 10,
    },
    categoryCard: {
      width: '48%',
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      paddingVertical: 12,
      paddingHorizontal: 12,
      borderRadius: 14,
      backgroundColor: theme.surfaceAlt,
      borderWidth: 1.5,
      borderColor: theme.border,
    },
    categoryCardSelected: {
      backgroundColor: theme.moodSelBg,
      borderColor: theme.primary,
    },
    categoryCardEmoji: {
      fontSize: 18,
    },
    categoryCardText: {
      fontSize: 13,
      fontWeight: '600',
      color: theme.textDark,
      flex: 1,
    },
    categoryCardTextSelected: {
      color: theme.primary,
      fontWeight: '700',
    },
    presetsRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
      marginBottom: 12,
    },
    presetChip: {
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 12,
      backgroundColor: theme.surfaceAlt,
      borderWidth: 1,
      borderColor: theme.border,
    },
    presetChipSelected: {
      backgroundColor: theme.moodSelBg,
      borderColor: theme.primary,
    },
    presetChipText: {
      fontSize: 12,
      fontWeight: '600',
      color: theme.textDark,
    },
    presetChipTextSelected: {
      color: theme.primary,
      fontWeight: '700',
    },
    nameInput: {
      width: '100%',
      backgroundColor: theme.background,
      borderRadius: 14,
      padding: 14,
      fontSize: 15,
      color: theme.textDark,
      borderWidth: 1,
      borderColor: theme.border,
    },
    cadenceRow: {
      flexDirection: 'row',
      gap: 8,
    },
    cadenceChip: {
      flex: 1,
      paddingVertical: 10,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 12,
      backgroundColor: theme.surfaceAlt,
      borderWidth: 1,
      borderColor: theme.border,
    },
    cadenceChipSelected: {
      backgroundColor: theme.moodSelBg,
      borderColor: theme.primary,
    },
    cadenceChipText: {
      fontSize: 12,
      fontWeight: '600',
      color: theme.textDark,
    },
    cadenceChipTextSelected: {
      color: theme.primary,
      fontWeight: '700',
    },
    fieldLabel: {
      fontSize: 12,
      fontWeight: '600',
      color: theme.textMuted,
      marginBottom: 6,
    },
    dateRow: {
      width: '100%',
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 12,
    },
    dateInput: {
      flex: 1,
      marginRight: 8,
      marginBottom: 0,
    },
    input: {
      backgroundColor: theme.background,
      borderRadius: 14,
      padding: 14,
      fontSize: 14,
      color: theme.textDark,
      borderWidth: 1,
      borderColor: theme.border,
    },
    calendarButton: {
      width: 48,
      height: 48,
      borderRadius: 14,
      backgroundColor: theme.surfaceAlt,
      borderWidth: 1,
      borderColor: theme.border,
      alignItems: 'center',
      justifyContent: 'center',
    },
    calendarButtonText: {
      fontSize: 18,
    },
    reminderRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 12,
      borderTopWidth: 1,
      borderTopColor: theme.border,
      marginTop: 4,
      marginBottom: 12,
    },
    reminderInfo: {
      flex: 1,
      paddingRight: 12,
    },
    reminderLabel: {
      fontSize: 14,
      fontWeight: '600',
      color: theme.textDark,
    },
    reminderSubtitle: {
      fontSize: 12,
      color: theme.textMuted,
      marginTop: 2,
    },
    notesInput: {
      minHeight: 64,
      textAlignVertical: 'top',
    },
    saveBtn: {
      backgroundColor: theme.primary,
      borderRadius: 16,
      paddingVertical: 16,
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: 4,
      marginBottom: 12,
      shadowColor: theme.primary,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.25,
      shadowRadius: 8,
      elevation: 3,
    },
    saveBtnText: {
      color: '#FFFFFF',
      fontSize: 16,
      fontWeight: '700',
      letterSpacing: 0.2,
    },
    deleteRow: {
      alignItems: 'center',
      paddingVertical: 12,
    },
    deleteText: {
      color: theme.allergenText,
      fontSize: 14,
      fontWeight: '600',
    },
  });
}
