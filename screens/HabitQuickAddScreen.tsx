import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { HabitType } from '../types';
import { colors, radii } from '../lib/theme';

type Props = {
  onSelect: (habitType: HabitType) => void;
  onCancel: () => void;
};

const PRESETS: { type: HabitType; label: string; icon: string; description: string }[] = [
  { type: 'feeding', label: 'Feeding', icon: '🍖', description: 'Meals per day, portion size, wet/dry ratio, and food brand' },
  { type: 'water', label: 'Water Intake', icon: '💧', description: 'Daily water goal' },
  { type: 'walking', label: 'Walking', icon: '🐾', description: 'A walk with a target duration' },
  { type: 'medication', label: 'Medication', icon: '💊', description: 'Dosage amount and unit' },
  { type: 'vitamin', label: 'Vitamins', icon: '💊', description: 'Dosage amount and unit' },
  { type: 'dental', label: 'Tooth Brushing', icon: '🦷', description: 'Brushings per day' },
  { type: 'custom', label: 'Custom habit', icon: '📝', description: 'Anything else — just a title and schedule' },
];

export default function HabitQuickAddScreen({ onSelect, onCancel }: Props) {
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Add a habit</Text>
      <Text style={styles.subtitle}>Choose a type to get started</Text>

      {PRESETS.map((preset) => (
        <TouchableOpacity
          key={preset.type}
          style={styles.card}
          onPress={() => onSelect(preset.type)}
        >
          <Text style={styles.icon}>{preset.icon}</Text>
          <View style={styles.info}>
            <Text style={styles.label}>{preset.label}</Text>
            <Text style={styles.description}>{preset.description}</Text>
          </View>
        </TouchableOpacity>
      ))}

      <TouchableOpacity onPress={onCancel} style={styles.cancelRow}>
        <Text style={styles.cancelLink}>Cancel</Text>
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
    padding: 24,
    paddingTop: 60,
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: colors.textDark,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: colors.textMuted,
    marginBottom: 20,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: radii.card,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  icon: {
    fontSize: 24,
    marginRight: 14,
  },
  info: {
    flex: 1,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textDark,
  },
  description: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 2,
  },
  cancelRow: {
    marginTop: 12,
    alignItems: 'center',
  },
  cancelLink: {
    color: colors.primaryGreen,
    fontSize: 14,
    fontWeight: '600',
  },
});
