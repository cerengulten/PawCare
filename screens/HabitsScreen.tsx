import { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator, StyleSheet } from 'react-native';
import { useDogs } from '../lib/hooks/useDogs';
import { useHabits } from '../lib/hooks/useHabits';
import { Habit } from '../types';
import HabitCard from '../components/HabitCard';
import HabitFormScreen from './HabitFormScreen';

type Mode = 'list' | 'form';

export default function HabitsScreen() {
  const { dogs, loading: dogsLoading } = useDogs();
  const [selectedDogId, setSelectedDogId] = useState<string | null>(null);
  const [mode, setMode] = useState<Mode>('list');
  const [editingHabit, setEditingHabit] = useState<Habit | null>(null);

  useEffect(() => {
    if (dogs.length === 0) {
      if (selectedDogId !== null) setSelectedDogId(null);
      return;
    }
    if (!selectedDogId || !dogs.some((d) => d.id === selectedDogId)) {
      setSelectedDogId(dogs[0].id);
    }
  }, [dogs, selectedDogId]);

  const { habits, completedToday, toggleCompletion, completionRate, addHabit, updateHabit, deleteHabit } =
    useHabits(selectedDogId);

  if (dogsLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#5C3D22" />
      </View>
    );
  }

  if (dogs.length === 0) {
    return (
      <View style={styles.center}>
        <Text style={styles.emptyTitle}>No dogs yet</Text>
        <Text style={styles.emptyText}>Add a dog in the Pets tab to start tracking habits.</Text>
      </View>
    );
  }

  if (mode === 'form') {
    return (
      <HabitFormScreen
        habit={editingHabit}
        addHabit={addHabit}
        updateHabit={updateHabit}
        deleteHabit={deleteHabit}
        onDone={() => { setMode('list'); setEditingHabit(null); }}
        onCancel={() => { setMode('list'); setEditingHabit(null); }}
      />
    );
  }

  const selectedDog = dogs.find((d) => d.id === selectedDogId) ?? dogs[0];

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Habits</Text>

      {dogs.length > 1 && (
        <View style={styles.chipRow}>
          {dogs.map((d) => (
            <TouchableOpacity
              key={d.id}
              style={[styles.chip, selectedDogId === d.id && styles.chipSelected]}
              onPress={() => setSelectedDogId(d.id)}
            >
              <Text style={[styles.chipText, selectedDogId === d.id && styles.chipTextSelected]}>
                {d.name}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {habits.length > 0 ? (
        <Text style={styles.summary}>
          {completedToday.size} of {habits.length} done today ({completionRate}%)
        </Text>
      ) : (
        <Text style={styles.emptyText}>No habits yet for {selectedDog.name}. Add one!</Text>
      )}

      {habits.map((h) => (
        <HabitCard
          key={h.id}
          habit={h}
          done={completedToday.has(h.id)}
          onToggle={() => toggleCompletion(h.id)}
          onPress={() => { setEditingHabit(h); setMode('form'); }}
        />
      ))}

      <TouchableOpacity
        style={styles.addButton}
        onPress={() => { setEditingHabit(null); setMode('form'); }}
      >
        <Text style={styles.addButtonText}>+ Add habit</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF8F0',
  },
  content: {
    padding: 24,
    paddingTop: 60,
  },
  center: {
    flex: 1,
    backgroundColor: '#FFF8F0',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: '#5C3D22',
    marginBottom: 16,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 16,
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
    fontWeight: '600',
  },
  chipTextSelected: {
    color: 'white',
  },
  summary: {
    fontSize: 13,
    color: '#8B6343',
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#5C3D22',
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 13,
    color: '#8B6343',
    marginBottom: 12,
    textAlign: 'center',
  },
  addButton: {
    backgroundColor: 'white',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#DEC9AF',
    padding: 14,
    alignItems: 'center',
    marginTop: 4,
  },
  addButtonText: {
    color: '#5C3D22',
    fontSize: 14,
    fontWeight: '600',
  },
});
