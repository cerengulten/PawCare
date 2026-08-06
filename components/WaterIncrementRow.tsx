import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { colors } from '../lib/theme';

type Props = {
  onAdd: (amountMl: number) => void;
  onReset: () => void;
};

const INCREMENTS = [50, 100, 250];

export default function WaterIncrementRow({ onAdd, onReset }: Props) {
  return (
    <View style={styles.row}>
      {INCREMENTS.map(amount => (
        <TouchableOpacity key={amount} style={styles.pill} onPress={() => onAdd(amount)}>
          <Text style={styles.pillText}>+{amount}</Text>
        </TouchableOpacity>
      ))}
      <TouchableOpacity onPress={onReset} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
        <Text style={styles.resetText}>↺ reset</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
    marginTop: 2,
    marginBottom: 4,
    paddingLeft: 34,
  },
  pill: {
    backgroundColor: colors.background,
    borderWidth: 0.5,
    borderColor: colors.cardBorder,
    borderRadius: 10,
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  pillText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.primaryGreen,
  },
  resetText: {
    fontSize: 12,
    color: colors.textMuted,
  },
});
