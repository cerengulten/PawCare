import { Text, TouchableOpacity, StyleSheet } from 'react-native';
import { MealDetail, FoodType } from '../types';
import { colors } from '../lib/theme';

type Props = {
  detail: MealDetail | undefined;
  onPress: () => void;
};

const FOOD_TYPE_EMOJI: Record<FoodType, string> = {
  wet: '🥩',
  dry: '🌾',
  mixed: '🥣',
  raw: '🥚',
};

const FOOD_TYPE_LABEL: Record<FoodType, string> = {
  wet: 'Wet',
  dry: 'Dry',
  mixed: 'Mixed',
  raw: 'Raw',
};

export default function MealDetailLink({ detail, onPress }: Props) {
  if (!detail) {
    return (
      <TouchableOpacity onPress={onPress} style={styles.row}>
        <Text style={styles.addText}>+ Add meal detail</Text>
      </TouchableOpacity>
    );
  }

  const summary = (() => {
    const emoji = FOOD_TYPE_EMOJI[detail.food_type];
    const label = FOOD_TYPE_LABEL[detail.food_type];
    if (detail.food_type === 'mixed') {
      if (detail.wet_amount_grams || detail.dry_amount_grams) {
        const wet = detail.wet_amount_grams ? `${detail.wet_amount_grams}g wet` : null;
        const dry = detail.dry_amount_grams ? `${detail.dry_amount_grams}g dry` : null;
        return `${emoji} ${label} · ${[wet, dry].filter(Boolean).join(' + ')}`;
      }
      return 'Detail saved ✓';
    }
    const amount = detail.food_type === 'wet' ? detail.wet_amount_grams
      : detail.food_type === 'dry' ? detail.dry_amount_grams
      : detail.raw_amount_grams;
    return amount ? `${emoji} ${label} · ${amount}g` : 'Detail saved ✓';
  })();

  return (
    <TouchableOpacity onPress={onPress} style={styles.row}>
      <Text style={styles.summaryText}>{summary}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  row: {
    paddingLeft: 34,
    paddingBottom: 6,
  },
  addText: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.primaryGreen,
  },
  summaryText: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.textMuted,
  },
});
