import { useState } from 'react';
import { View, Text, TouchableOpacity, Image, ScrollView, StyleSheet } from 'react-native';
import { Dog, Habit, VaccineRecord } from '../types';
import { useHabits } from '../lib/hooks/useHabits';
import { useVaccines } from '../lib/hooks/useVaccines';
import HabitCard from '../components/HabitCard';
import VaccineCard from '../components/VaccineCard';
import HabitFormScreen from './HabitFormScreen';
import VaccineFormScreen from './VaccineFormScreen';

type Props = {
  dog: Dog;
  onEdit: () => void;
  onBack: () => void;
};

type Mode = 'detail' | 'habit-form' | 'vaccine-form';

export default function DogDetailScreen({ dog, onEdit, onBack }: Props) {
  const [mode, setMode] = useState<Mode>('detail');
  const [editingHabit, setEditingHabit] = useState<Habit | null>(null);
  const [editingVaccine, setEditingVaccine] = useState<VaccineRecord | null>(null);

  const { habits, completedToday, toggleCompletion, completionRate, addHabit, updateHabit, deleteHabit } =
    useHabits(dog.id);
  const { upcoming, overdue, addVaccine, updateVaccine, deleteVaccine } = useVaccines(dog.id);

  if (mode === 'habit-form') {
    return (
      <HabitFormScreen
        habit={editingHabit}
        addHabit={addHabit}
        updateHabit={updateHabit}
        deleteHabit={deleteHabit}
        onDone={() => { setMode('detail'); setEditingHabit(null); }}
        onCancel={() => { setMode('detail'); setEditingHabit(null); }}
      />
    );
  }

  if (mode === 'vaccine-form') {
    return (
      <VaccineFormScreen
        vaccine={editingVaccine}
        addVaccine={addVaccine}
        updateVaccine={updateVaccine}
        deleteVaccine={deleteVaccine}
        onDone={() => { setMode('detail'); setEditingVaccine(null); }}
        onCancel={() => { setMode('detail'); setEditingVaccine(null); }}
      />
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <TouchableOpacity onPress={onBack} style={styles.backRow}>
        <Text style={styles.backText}>‹ Back</Text>
      </TouchableOpacity>

      <View style={styles.header}>
        {dog.photo_url ? (
          <Image source={{ uri: dog.photo_url }} style={styles.photo} />
        ) : (
          <View style={styles.photoPlaceholder}>
            <Text style={styles.emoji}>🐾</Text>
          </View>
        )}
        <Text style={styles.name}>{dog.name}</Text>
        {dog.breed ? <Text style={styles.meta}>{dog.breed}</Text> : null}
        {dog.weight_kg != null ? <Text style={styles.meta}>{dog.weight_kg} kg</Text> : null}

        <TouchableOpacity style={styles.editButton} onPress={onEdit}>
          <Text style={styles.editButtonText}>Edit</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Habits</Text>
        {habits.length > 0 ? (
          <Text style={styles.sectionSummary}>
            {completedToday.size} of {habits.length} done today ({completionRate}%)
          </Text>
        ) : (
          <Text style={styles.emptyText}>No habits yet. Add one!</Text>
        )}
        {habits.map((h) => (
          <HabitCard
            key={h.id}
            habit={h}
            done={completedToday.has(h.id)}
            onToggle={() => toggleCompletion(h.id)}
            onPress={() => { setEditingHabit(h); setMode('habit-form'); }}
          />
        ))}
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => { setEditingHabit(null); setMode('habit-form'); }}
        >
          <Text style={styles.addButtonText}>+ Add habit</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Vaccines</Text>
        {overdue.length === 0 && upcoming.length === 0 ? (
          <Text style={styles.emptyText}>No vaccines tracked yet. Add one!</Text>
        ) : null}
        {overdue.map((v) => (
          <VaccineCard
            key={v.id}
            vaccine={v}
            isOverdue
            onPress={() => { setEditingVaccine(v); setMode('vaccine-form'); }}
          />
        ))}
        {upcoming.map((v) => (
          <VaccineCard
            key={v.id}
            vaccine={v}
            isOverdue={false}
            onPress={() => { setEditingVaccine(v); setMode('vaccine-form'); }}
          />
        ))}
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => { setEditingVaccine(null); setMode('vaccine-form'); }}
        >
          <Text style={styles.addButtonText}>+ Add vaccine</Text>
        </TouchableOpacity>
      </View>
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
  backRow: {
    marginBottom: 16,
  },
  backText: {
    color: '#5C3D22',
    fontSize: 16,
    fontWeight: '600',
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
  },
  photo: {
    width: 96,
    height: 96,
    borderRadius: 48,
    marginBottom: 12,
  },
  photoPlaceholder: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#DEC9AF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  emoji: {
    fontSize: 40,
  },
  name: {
    fontSize: 24,
    fontWeight: '700',
    color: '#5C3D22',
  },
  meta: {
    fontSize: 14,
    color: '#8B6343',
  },
  editButton: {
    marginTop: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#5C3D22',
    paddingVertical: 8,
    paddingHorizontal: 20,
  },
  editButtonText: {
    color: '#5C3D22',
    fontSize: 14,
    fontWeight: '600',
  },
  section: {
    marginBottom: 28,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#5C3D22',
    marginBottom: 8,
  },
  sectionSummary: {
    fontSize: 13,
    color: '#8B6343',
    marginBottom: 12,
  },
  emptyText: {
    fontSize: 13,
    color: '#8B6343',
    marginBottom: 12,
  },
  addButton: {
    backgroundColor: 'white',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#DEC9AF',
    padding: 14,
    alignItems: 'center',
  },
  addButtonText: {
    color: '#5C3D22',
    fontSize: 14,
    fontWeight: '600',
  },
});
