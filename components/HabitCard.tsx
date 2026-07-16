import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Habit } from '../types';

type Props = {
  habit: Habit;
  done: boolean;
  onToggle: () => void;
  onPress: () => void;
};

const CATEGORY_LABELS: Record<Habit['category'], string> = {
  feeding: 'Feeding',
  health: 'Health',
  grooming: 'Grooming',
  exercise: 'Exercise',
  other: 'Other',
};

export default function HabitCard({ habit, done, onToggle, onPress }: Props) {
  return (
    <TouchableOpacity style={styles.card} onPress={onPress}>
      <TouchableOpacity
        style={[styles.checkbox, done && styles.checkboxDone]}
        onPress={onToggle}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        {done ? <Text style={styles.checkmark}>✓</Text> : null}
      </TouchableOpacity>
      <View style={styles.info}>
        <Text style={styles.name}>{habit.title}</Text>
        <Text style={styles.meta}>{CATEGORY_LABELS[habit.category]} · {habit.frequency}</Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 14,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#DEC9AF',
  },
  checkbox: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#DEC9AF',
    backgroundColor: '#FFF8F0',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  checkboxDone: {
    backgroundColor: '#4A7C4E',
    borderColor: '#4A7C4E',
  },
  checkmark: {
    color: 'white',
    fontSize: 14,
    fontWeight: '700',
  },
  info: {
    flex: 1,
  },
  name: {
    fontSize: 16,
    fontWeight: '600',
    color: '#5C3D22',
  },
  meta: {
    fontSize: 13,
    color: '#8B6343',
  },
});
