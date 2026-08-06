import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { VaccineRecord } from '../types';
import { colors, radii } from '../lib/theme';
import { daysAway, formatDaysAway, formatDate, SOON_THRESHOLD_DAYS } from '../lib/vaccineDisplay';

type Props = {
  vaccine: VaccineRecord;
  isOverdue: boolean;
  onPress: () => void;
  dogName?: string;
};

export default function VaccineCard({ vaccine, isOverdue, onPress, dogName }: Props) {
  const days = daysAway(vaccine.next_due_date);
  const isSoon = !isOverdue && days <= SOON_THRESHOLD_DAYS;
  const dotColor = isOverdue ? colors.allergenText : isSoon ? colors.pendingAmber : colors.doneGreen;
  const chipStyle = isOverdue ? styles.chipRed : isSoon ? styles.chipAmber : styles.chipGreen;
  const chipTextStyle = isOverdue ? styles.chipTextRed : isSoon ? styles.chipTextAmber : styles.chipTextGreen;
  const chipLabel = isOverdue ? 'Overdue' : isSoon ? 'Soon' : 'Scheduled';

  return (
    <TouchableOpacity style={styles.row} onPress={onPress}>
      <View style={[styles.dot, { backgroundColor: dotColor }]} />
      <View style={styles.info}>
        <Text style={styles.name}>{vaccine.vaccine_name}{dogName ? ` · ${dogName}` : ''}</Text>
        <Text style={styles.meta}>
          Due {formatDate(vaccine.next_due_date)} · {formatDaysAway(days, isOverdue)}
        </Text>
      </View>
      <View style={[styles.chip, chipStyle]}>
        <Text style={[styles.chipText, chipTextStyle]}>{chipLabel}</Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 5,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    flexShrink: 0,
  },
  info: {
    flex: 1,
    minWidth: 0,
  },
  name: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.textDark,
  },
  meta: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 1,
  },
  chip: {
    borderRadius: 20,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  chipAmber: {
    backgroundColor: colors.pendingAmberBg,
  },
  chipGreen: {
    backgroundColor: colors.moodSelectedBg,
  },
  chipRed: {
    backgroundColor: colors.allergenBg,
  },
  chipText: {
    fontSize: 12,
    fontWeight: '500',
  },
  chipTextAmber: {
    color: colors.pendingAmberText,
  },
  chipTextGreen: {
    color: colors.primaryGreen,
  },
  chipTextRed: {
    color: colors.allergenText,
  },
});
