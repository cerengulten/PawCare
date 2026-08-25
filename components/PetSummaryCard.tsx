import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native';
import { Dog } from '../types';
import { useHabits } from '../lib/hooks/useHabits';
import { useDogMood } from '../lib/hooks/useDogMood';
import { colors, radii } from '../lib/theme';

type Props = {
  dog: Dog;
  onPress: () => void;
};

const MOOD_EMOJI: Record<string, string> = {
  sleepy: '😴',
  off: '😟',
  good: '😊',
  great: '🤩',
  sick: '🤒',
};

const MOOD_LABEL: Record<string, string> = {
  sleepy: 'Sleepy',
  off: 'Off',
  good: 'Good',
  great: 'Great',
  sick: 'Sick',
};

export default function PetSummaryCard({ dog, onPress }: Props) {
  const { habits, completedToday } = useHabits(dog.id);
  const { mood } = useDogMood(dog.id);

  const hasHabits = habits.length > 0;
  const progress = hasHabits ? completedToday.size / habits.length : 0;
  const moodText = mood ? `${MOOD_EMOJI[mood.mood]} ${MOOD_LABEL[mood.mood]}` : null;

  return (
    <TouchableOpacity style={styles.card} onPress={onPress}>
      <View style={styles.header}>
        {dog.photo_url ? (
          <Image source={{ uri: dog.photo_url }} style={styles.photo} />
        ) : (
          <Text style={styles.emoji}>🐾</Text>
        )}
        <Text style={styles.name} numberOfLines={1}>{dog.name}</Text>
      </View>
      {hasHabits ? (
        <>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${Math.round(progress * 100)}%` }]} />
          </View>
          <Text style={styles.subtitle} numberOfLines={1}>
            {completedToday.size}/{habits.length} habits{moodText ? ` · ${moodText}` : ''}
          </Text>
        </>
      ) : (
        <Text style={styles.subtitle}>No habits yet</Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: radii.card,
    borderWidth: 0.5,
    borderColor: colors.cardBorder,
    padding: 14,
    minWidth: 160,
    marginRight: 10,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  photo: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  emoji: {
    fontSize: 22,
  },
  name: {
    fontSize: 15,
    fontWeight: '500',
    color: colors.textDark,
    flexShrink: 1,
  },
  progressTrack: {
    height: 6,
    backgroundColor: colors.cardBorder,
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 6,
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.doneGreen,
    borderRadius: 3,
  },
  subtitle: {
    fontSize: 12,
    color: colors.textMuted,
  },
});
