import { useMemo } from 'react';
import { Text, TouchableOpacity, StyleSheet } from 'react-native';
import { MealDetail, FoodType } from '../types';
import { useTheme } from '../lib/ThemeContext';
import { ThemeTokens } from '../lib/themes';

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
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
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

function makeStyles(theme: ThemeTokens) {
  return StyleSheet.create({
    row: {
      paddingLeft: 34,
      paddingBottom: 6,
    },
    addText: {
      fontSize: 12,
      fontWeight: '500',
      color: theme.primary,
    },
    summaryText: {
      fontSize: 12,
      fontWeight: '500',
      color: theme.textMuted,
    },
  });
}
