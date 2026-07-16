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
import { Habit } from '../types';
import { useHabits } from '../lib/hooks/useHabits';

type UseHabitsReturn = ReturnType<typeof useHabits>;

type Props = {
  habit: Habit | null;
  addHabit: UseHabitsReturn['addHabit'];
  updateHabit: UseHabitsReturn['updateHabit'];
  deleteHabit: UseHabitsReturn['deleteHabit'];
  onDone: () => void;
  onCancel: () => void;
};

const CATEGORIES: Habit['category'][] = ['feeding', 'health', 'grooming', 'exercise', 'other'];
const FREQUENCIES: Habit['frequency'][] = ['daily', 'weekly', 'custom'];

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

export default function HabitFormScreen({ habit, addHabit, updateHabit, deleteHabit, onDone, onCancel }: Props) {
  const [title, setTitle] = useState(habit?.title ?? '');
  const [category, setCategory] = useState<Habit['category']>(habit?.category ?? 'feeding');
  const [frequency, setFrequency] = useState<Habit['frequency']>(habit?.frequency ?? 'daily');
  const [reminderTime, setReminderTime] = useState<string | null>(habit?.reminder_time ?? null);
  const [showIosPicker, setShowIosPicker] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  function openTimePicker() {
    if (Platform.OS === 'android') {
      DateTimePickerAndroid.open({
        value: reminderTime ? parseTimeString(reminderTime) : new Date(),
        mode: 'time',
        onChange: (_event: DateTimePickerEvent, selected?: Date) => {
          if (selected) setReminderTime(toTimeString(selected));
        },
      });
    } else {
      setShowIosPicker(true);
    }
  }

  async function handleSave() {
    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      setError('Title is required.');
      return;
    }

    setLoading(true);
    setError('');

    const payload = {
      title: trimmedTitle,
      category,
      frequency,
      reminder_time: reminderTime,
      is_active: true,
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
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.title}>{habit ? 'Edit habit' : 'Add habit'}</Text>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <TextInput
          style={styles.input}
          placeholder="Title"
          placeholderTextColor="#B8926A"
          value={title}
          onChangeText={setTitle}
        />

        <Text style={styles.sectionLabel}>Category</Text>
        <View style={styles.chipRow}>
          {CATEGORIES.map((c) => (
            <TouchableOpacity
              key={c}
              style={[styles.chip, category === c && styles.chipSelected]}
              onPress={() => setCategory(c)}
            >
              <Text style={[styles.chipText, category === c && styles.chipTextSelected]}>{c}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.sectionLabel}>Frequency</Text>
        <View style={styles.chipRow}>
          {FREQUENCIES.map((f) => (
            <TouchableOpacity
              key={f}
              style={[styles.chip, frequency === f && styles.chipSelected]}
              onPress={() => setFrequency(f)}
            >
              <Text style={[styles.chipText, frequency === f && styles.chipTextSelected]}>{f}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.sectionLabel}>Reminder time (optional)</Text>
        <TouchableOpacity style={styles.input} onPress={openTimePicker}>
          <Text style={reminderTime ? styles.inputText : styles.placeholderText}>
            {reminderTime ?? 'No reminder time set'}
          </Text>
        </TouchableOpacity>

        {Platform.OS === 'ios' && showIosPicker && (
          <View>
            <DateTimePicker
              value={reminderTime ? parseTimeString(reminderTime) : new Date()}
              mode="time"
              display="spinner"
              onChange={(_e: DateTimePickerEvent, selected?: Date) => {
                if (selected) setReminderTime(toTimeString(selected));
              }}
            />
            <TouchableOpacity onPress={() => setShowIosPicker(false)}>
              <Text style={styles.switchLink}>Done</Text>
            </TouchableOpacity>
          </View>
        )}

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

        {habit ? (
          <TouchableOpacity onPress={handleDelete} style={styles.switchRow} disabled={loading}>
            <Text style={styles.deleteLink}>Delete habit</Text>
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
  inputText: {
    fontSize: 15,
    color: '#5C3D22',
  },
  placeholderText: {
    fontSize: 15,
    color: '#B8926A',
  },
  sectionLabel: {
    width: '100%',
    fontSize: 13,
    fontWeight: '600',
    color: '#8B6343',
    marginBottom: 8,
  },
  chipRow: {
    width: '100%',
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 12,
  },
  chip: {
    borderRadius: 14,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: '#DEC9AF',
    backgroundColor: 'white',
    marginRight: 8,
    marginBottom: 8,
  },
  chipSelected: {
    backgroundColor: '#5C3D22',
    borderColor: '#5C3D22',
  },
  chipText: {
    fontSize: 13,
    color: '#5C3D22',
    textTransform: 'capitalize',
  },
  chipTextSelected: {
    color: 'white',
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
