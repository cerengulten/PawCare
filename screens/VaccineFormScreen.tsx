import { useState } from 'react';
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
  const [vaccineName, setVaccineName] = useState(vaccine?.vaccine_name ?? '');
  const [dateGivenText, setDateGivenText] = useState(vaccine?.date_given?.slice(0, 10) ?? '');
  const [nextDueDateText, setNextDueDateText] = useState(vaccine?.next_due_date?.slice(0, 10) ?? '');
  const [notes, setNotes] = useState(vaccine?.notes ?? '');
  const [reminderEnabled, setReminderEnabled] = useState(vaccine?.reminder_enabled ?? false);
  const [showIosPicker, setShowIosPicker] = useState<'given' | 'due' | null>(null);
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

  function openDateGivenPicker() {
    const current = parseUserDateInput(dateGivenText) ?? new Date();
    if (Platform.OS === 'android') {
      DateTimePickerAndroid.open({
        value: current,
        mode: 'date',
        maximumDate: new Date(),
        onChange: (_event: DateTimePickerEvent, selected?: Date) => {
          if (selected) setDateGivenText(toDateOnlyString(selected));
        },
      });
    } else {
      setShowIosPicker('given');
    }
  }

  function openNextDuePicker() {
    if (Platform.OS === 'android') {
      DateTimePickerAndroid.open({
        value: nextDuePickerValue,
        mode: 'date',
        minimumDate: minNextDueDate,
        onChange: (_event: DateTimePickerEvent, selected?: Date) => {
          if (selected) setNextDueDateText(toDateOnlyString(selected));
        },
      });
    } else {
      setShowIosPicker('due');
    }
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
          placeholderTextColor="#B8926A"
          value={vaccineName}
          onChangeText={setVaccineName}
        />

        <View style={styles.dateRow}>
          <TextInput
            style={[styles.input, styles.dateInput]}
            placeholder="Date given (optional), YYYY-MM-DD"
            placeholderTextColor="#B8926A"
            value={dateGivenText}
            onChangeText={setDateGivenText}
            autoCapitalize="none"
            autoCorrect={false}
          />
          <TouchableOpacity style={styles.calendarButton} onPress={openDateGivenPicker}>
            <Text style={styles.calendarButtonText}>📅</Text>
          </TouchableOpacity>
        </View>

        {Platform.OS === 'ios' && showIosPicker === 'given' && (
          <View>
            <DateTimePicker
              value={parseUserDateInput(dateGivenText) ?? new Date()}
              mode="date"
              display="spinner"
              maximumDate={new Date()}
              onChange={(_e: DateTimePickerEvent, selected?: Date) => {
                if (selected) setDateGivenText(toDateOnlyString(selected));
              }}
            />
            <TouchableOpacity onPress={() => setShowIosPicker(null)}>
              <Text style={styles.switchLink}>Done</Text>
            </TouchableOpacity>
          </View>
        )}

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
            placeholderTextColor="#B8926A"
            value={nextDueDateText}
            onChangeText={setNextDueDateText}
            autoCapitalize="none"
            autoCorrect={false}
          />
          <TouchableOpacity style={styles.calendarButton} onPress={openNextDuePicker}>
            <Text style={styles.calendarButtonText}>📅</Text>
          </TouchableOpacity>
        </View>

        {Platform.OS === 'ios' && showIosPicker === 'due' && (
          <View>
            <DateTimePicker
              value={nextDuePickerValue}
              mode="date"
              display="spinner"
              minimumDate={minNextDueDate}
              onChange={(_e: DateTimePickerEvent, selected?: Date) => {
                if (selected) setNextDueDateText(toDateOnlyString(selected));
              }}
            />
            <TouchableOpacity onPress={() => setShowIosPicker(null)}>
              <Text style={styles.switchLink}>Done</Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.reminderRow}>
          <Text style={styles.reminderLabel}>Remind me on the due date</Text>
          <Switch
            value={reminderEnabled}
            onValueChange={handleToggleReminder}
            trackColor={{ false: '#DEC9AF', true: '#5C3D22' }}
            thumbColor="white"
          />
        </View>

        <TextInput
          style={[styles.input, styles.notesInput]}
          placeholder="Notes (optional)"
          placeholderTextColor="#B8926A"
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
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF8F0',
  },
  scrollContent: {
    padding: 24,
    alignItems: 'center',
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: '#5C3D22',
    marginBottom: 20,
  },
  error: {
    color: '#B04838',
    fontSize: 13,
    marginBottom: 12,
    textAlign: 'center',
  },
  input: {
    width: '100%',
    backgroundColor: 'white',
    borderRadius: 14,
    padding: 16,
    fontSize: 15,
    color: '#5C3D22',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#DEC9AF',
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
    borderRadius: 14,
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#DEC9AF',
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
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#DEC9AF',
    marginRight: 8,
    marginBottom: 8,
  },
  quickChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#5C3D22',
  },
  reminderRow: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'white',
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#DEC9AF',
  },
  reminderLabel: {
    fontSize: 15,
    color: '#5C3D22',
    flexShrink: 1,
    marginRight: 12,
  },
  button: {
    width: '100%',
    backgroundColor: '#5C3D22',
    borderRadius: 14,
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
    color: '#5C3D22',
    fontSize: 14,
    fontWeight: '600',
  },
  deleteLink: {
    color: '#B04838',
    fontSize: 14,
    fontWeight: '600',
  },
});
