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
} from 'react-native';
import DateTimePicker, {
  DateTimePickerAndroid,
  DateTimePickerEvent,
} from '@react-native-community/datetimepicker';
import { VaccineRecord } from '../types';
import { useVaccines } from '../lib/hooks/useVaccines';

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

function parseDateOnly(s: string): Date {
  const [y, m, day] = s.split('-').map(Number);
  return new Date(y, m - 1, day);
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
  const [dateGiven, setDateGiven] = useState<Date | null>(
    vaccine?.date_given ? parseDateOnly(vaccine.date_given) : null
  );
  const [nextDueDate, setNextDueDate] = useState<Date | null>(
    vaccine?.next_due_date ? parseDateOnly(vaccine.next_due_date) : null
  );
  const [notes, setNotes] = useState(vaccine?.notes ?? '');
  const [showIosPicker, setShowIosPicker] = useState<'given' | 'due' | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  function openDateGivenPicker() {
    if (Platform.OS === 'android') {
      DateTimePickerAndroid.open({
        value: dateGiven ?? new Date(),
        mode: 'date',
        maximumDate: new Date(),
        onChange: (_event: DateTimePickerEvent, selected?: Date) => {
          if (selected) setDateGiven(selected);
        },
      });
    } else {
      setShowIosPicker('given');
    }
  }

  function openNextDuePicker() {
    if (Platform.OS === 'android') {
      DateTimePickerAndroid.open({
        value: nextDueDate ?? new Date(),
        mode: 'date',
        onChange: (_event: DateTimePickerEvent, selected?: Date) => {
          if (selected) setNextDueDate(selected);
        },
      });
    } else {
      setShowIosPicker('due');
    }
  }

  async function handleSave() {
    const trimmedName = vaccineName.trim();
    if (!trimmedName) {
      setError('Vaccine name is required.');
      return;
    }
    if (!nextDueDate) {
      setError('Due date is required.');
      return;
    }

    setLoading(true);
    setError('');

    const payload = {
      vaccine_name: trimmedName,
      date_given: dateGiven ? toDateOnlyString(dateGiven) : null,
      next_due_date: toDateOnlyString(nextDueDate),
      notes: notes.trim() || null,
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

        <TouchableOpacity style={styles.input} onPress={openDateGivenPicker}>
          <Text style={dateGiven ? styles.inputText : styles.placeholderText}>
            {dateGiven ? toDateOnlyString(dateGiven) : 'Date given (optional)'}
          </Text>
        </TouchableOpacity>

        {Platform.OS === 'ios' && showIosPicker === 'given' && (
          <View>
            <DateTimePicker
              value={dateGiven ?? new Date()}
              mode="date"
              display="spinner"
              maximumDate={new Date()}
              onChange={(_e: DateTimePickerEvent, selected?: Date) => {
                if (selected) setDateGiven(selected);
              }}
            />
            <TouchableOpacity onPress={() => setShowIosPicker(null)}>
              <Text style={styles.switchLink}>Done</Text>
            </TouchableOpacity>
          </View>
        )}

        <TouchableOpacity style={styles.input} onPress={openNextDuePicker}>
          <Text style={nextDueDate ? styles.inputText : styles.placeholderText}>
            {nextDueDate ? toDateOnlyString(nextDueDate) : 'Next due date'}
          </Text>
        </TouchableOpacity>

        {Platform.OS === 'ios' && showIosPicker === 'due' && (
          <View>
            <DateTimePicker
              value={nextDueDate ?? new Date()}
              mode="date"
              display="spinner"
              onChange={(_e: DateTimePickerEvent, selected?: Date) => {
                if (selected) setNextDueDate(selected);
              }}
            />
            <TouchableOpacity onPress={() => setShowIosPicker(null)}>
              <Text style={styles.switchLink}>Done</Text>
            </TouchableOpacity>
          </View>
        )}

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
  inputText: {
    fontSize: 15,
    color: '#5C3D22',
  },
  placeholderText: {
    fontSize: 15,
    color: '#B8926A',
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
