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
import { ThemeTokens } from '../lib/themes';
import SwipeBackWrapper from '../components/SwipeBackWrapper';

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

// Strict YYYY-MM-DD parser: rejects malformed input and calendar-invalid dates
// (e.g. 2027-02-30) instead of letting the JS Date constructor silently roll them over.
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
  return new Date(base.getFullYear(), base.getMonth() + months, base.getDate());
}

function getMinNextDueDate(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 1);
  return d;
}

export default function VaccineFormScreen({
  vaccine,
  addVaccine,
  updateVaccine,
  deleteVaccine,
  onDone,
  onCancel,
}: Props) {
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const [vaccineName, setVaccineName] = useState(vaccine?.vaccine_name ?? '');
  const [dateGivenText, setDateGivenText] = useState(vaccine?.date_given?.slice(0, 10) ?? '');
  const [nextDueDateText, setNextDueDateText] = useState(vaccine?.next_due_date?.slice(0, 10) ?? '');
  const [notes, setNotes] = useState(vaccine?.notes ?? '');
  const [reminderEnabled, setReminderEnabled] = useState(vaccine?.reminder_enabled ?? false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const minNextDueDate = getMinNextDueDate();
  const parsedNextDueDate = parseUserDateInput(nextDueDateText);
  const nextDuePickerValue =
    parsedNextDueDate && parsedNextDueDate >= minNextDueDate ? parsedNextDueDate : minNextDueDate;

  async function handleToggleReminder(value: boolean) {
    if (value) {
      const granted = await requestNotificationPermissions();
      if (!granted) {
        setError('Enable notifications in your device settings to use vaccine reminders.');
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
        if (selected) setDateGivenText(toDateOnlyString(selected));
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

  function applyQuickDueDate(monthsToAdd: number) {
    const base = parseUserDateInput(dateGivenText) ?? new Date();
    setNextDueDateText(toDateOnlyString(addMonths(base, monthsToAdd)));
    setError('');
  }

  async function handleSave() {
    const trimmedName = vaccineName.trim();
    if (!trimmedName) {
      setError('Vaccine name is required.');
      return;
    }

    let dateGiven: Date | null = null;
    if (dateGivenText.trim()) {
      dateGiven = parseUserDateInput(dateGivenText);
      if (!dateGiven) {
        setError('Date given must be a valid date (YYYY-MM-DD).');
        return;
      }
      if (dateGiven > new Date()) {
        setError('Date given cannot be a future date.');
        return;
      }
    }

    if (!nextDueDateText.trim()) {
      setError('Due date is required.');
      return;
    }
    if (!parsedNextDueDate) {
      setError('Next due date must be a valid date (YYYY-MM-DD).');
      return;
    }
    if (parsedNextDueDate < minNextDueDate) {
      setError('Next due date must be a future date.');
      return;
    }
    const nextDueDate = parsedNextDueDate;

    setLoading(true);
    setError('');

    const payload = {
      vaccine_name: trimmedName,
      date_given: dateGiven ? toDateOnlyString(dateGiven) : null,
      next_due_date: toDateOnlyString(nextDueDate),
      notes: notes.trim() || null,
      reminder_enabled: reminderEnabled,
    };

    const { error } = vaccine
      ? await updateVaccine(vaccine.id, payload)
      : await addVaccine(payload);

    setLoading(false);
    if (error) {
      setError(error.message);
      return;
    }
    onDone();
  }

  async function handleDelete() {
    if (!vaccine) return;
    setLoading(true);
    const { error } = await deleteVaccine(vaccine.id);
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
        <Text style={styles.title}>{vaccine ? 'Edit vaccine' : 'Add vaccine'}</Text>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <TextInput
          style={styles.input}
          placeholder="Vaccine name"
          placeholderTextColor={theme.textMuted}
          value={vaccineName}
          onChangeText={setVaccineName}
        />

        <View style={styles.dateRow}>
          <TextInput
            style={[styles.input, styles.dateInput]}
            placeholder="Date given (optional), YYYY-MM-DD"
            placeholderTextColor={theme.textMuted}
            value={dateGivenText}
            onChangeText={setDateGivenText}
            autoCapitalize="none"
            autoCorrect={false}
          />
          {Platform.OS === 'ios' ? (
            <DateTimePicker
              value={parseUserDateInput(dateGivenText) ?? new Date()}
              mode="date"
              display="compact"
              accentColor={theme.primary}
              maximumDate={new Date()}
              onChange={(_e: DateTimePickerEvent, selected?: Date) => {
                if (selected) setDateGivenText(toDateOnlyString(selected));
              }}
            />
          ) : (
            <TouchableOpacity style={styles.calendarButton} onPress={openAndroidDateGivenPicker}>
              <Text style={styles.calendarButtonText}>📅</Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.quickRow}>
          <TouchableOpacity style={styles.quickChip} onPress={() => applyQuickDueDate(6)}>
            <Text style={styles.quickChipText}>6 months</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.quickChip} onPress={() => applyQuickDueDate(12)}>
            <Text style={styles.quickChipText}>1 year</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.quickChip} onPress={() => applyQuickDueDate(24)}>
            <Text style={styles.quickChipText}>2 years</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.dateRow}>
          <TextInput
            style={[styles.input, styles.dateInput]}
            placeholder="Next due date, YYYY-MM-DD"
            placeholderTextColor={theme.textMuted}
            value={nextDueDateText}
            onChangeText={setNextDueDateText}
            autoCapitalize="none"
            autoCorrect={false}
          />
          {Platform.OS === 'ios' ? (
            <DateTimePicker
              value={nextDuePickerValue}
              mode="date"
              display="compact"
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

        <View style={styles.reminderRow}>
          <Text style={styles.reminderLabel}>Remind me on the due date</Text>
          <Switch
            value={reminderEnabled}
            onValueChange={handleToggleReminder}
            trackColor={{ false: theme.border, true: theme.primary }}
            thumbColor="white"
          />
        </View>

        <TextInput
          style={[styles.input, styles.notesInput]}
          placeholder="Notes (optional)"
          placeholderTextColor={theme.textMuted}
          value={notes}
          onChangeText={setNotes}
          multiline
        />

        <TouchableOpacity style={styles.button} onPress={handleSave} disabled={loading}>
          {loading ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text style={styles.buttonText}>Save</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity onPress={onCancel} style={styles.switchRow}>
          <Text style={styles.switchLink}>Cancel</Text>
        </TouchableOpacity>

        {vaccine ? (
          <TouchableOpacity onPress={handleDelete} style={styles.switchRow} disabled={loading}>
            <Text style={styles.deleteLink}>Delete vaccine</Text>
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
    notesInput: {
      minHeight: 80,
      textAlignVertical: 'top',
    },
    dateRow: {
      width: '100%',
      flexDirection: 'row',
      alignItems: 'flex-start',
    },
    dateInput: {
      flex: 1,
      marginRight: 8,
    },
    calendarButton: {
      width: 48,
      height: 48,
      borderRadius: theme.radiiCard,
      backgroundColor: theme.surface,
      borderWidth: 1,
      borderColor: theme.border,
      alignItems: 'center',
      justifyContent: 'center',
    },
    calendarButtonText: {
      fontSize: 18,
    },
    quickRow: {
      width: '100%',
      flexDirection: 'row',
      flexWrap: 'wrap',
      marginBottom: 12,
    },
    quickChip: {
      paddingVertical: 10,
      paddingHorizontal: 14,
      borderRadius: 12,
      backgroundColor: theme.surface,
      borderWidth: 1,
      borderColor: theme.border,
      marginRight: 8,
      marginBottom: 8,
    },
    quickChipText: {
      fontSize: 13,
      fontWeight: '600',
      color: theme.textDark,
    },
    reminderRow: {
      width: '100%',
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: theme.surface,
      borderRadius: theme.radiiCard,
      padding: 16,
      marginBottom: 12,
      borderWidth: 1,
      borderColor: theme.border,
    },
    reminderLabel: {
      fontSize: 15,
      color: theme.textDark,
      flexShrink: 1,
      marginRight: 12,
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
