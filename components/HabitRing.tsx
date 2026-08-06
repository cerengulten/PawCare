import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Habit } from '../types';
import ProgressRing from './ProgressRing';
import { colors } from '../lib/theme';

type Props = {
  habit: Habit;
  count: number;
  target: number;
  done: boolean;
  size: 'large' | 'small';
  onPress: () => void;
  interactive?: boolean;
};

const HABIT_TYPE_ICONS: Record<Habit['habit_type'], string> = {
  feeding: '🍖',
  water: '💧',
  walking: '🐾',
  medication: '💊',
  vitamin: '💊',
  dental: '🦷',
  custom: '📝',
};

const SIZES = {
  large: { ring: 72, stroke: 5, icon: 24, badge: 20, badgeIcon: 10 },
  small: { ring: 32, stroke: 3, icon: 13, badge: 0, badgeIcon: 0 },
};

export default function HabitRing({ habit, count, target, done, size, onPress, interactive = true }: Props) {
  const dims = SIZES[size];
  const icon = HABIT_TYPE_ICONS[habit.habit_type];
  const progress = target > 0 ? count / target : 0;
  const ringColor = done ? colors.doneGreen : colors.pendingAmber;

  const ring = (
    <View style={styles.wrap}>
      <ProgressRing size={dims.ring} strokeWidth={dims.stroke} progress={progress} color={ringColor} trackColor={colors.notStartedBg}>
        <Text style={{ fontSize: dims.icon }}>{icon}</Text>
      </ProgressRing>
      {done && dims.badge > 0 ? (
        <View
          style={[
            styles.badge,
            { width: dims.badge, height: dims.badge, borderRadius: dims.badge / 2 },
          ]}
        >
          <Text style={[styles.badgeIcon, { fontSize: dims.badgeIcon }]}>✓</Text>
        </View>
      ) : null}
    </View>
  );

  if (!interactive) return ring;

  return (
    <TouchableOpacity onPress={onPress} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
      {ring}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    backgroundColor: colors.doneGreen,
    borderWidth: 1.5,
    borderColor: 'white',
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeIcon: {
    color: 'white',
    fontWeight: '700',
  },
});
