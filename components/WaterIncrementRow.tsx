import { useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useTheme } from '../lib/ThemeContext';
import { ThemeTokens } from '../lib/themes';

type Props = {
  onAdd: (amountMl: number) => void;
  onReset: () => void;
  onCustom: () => void;
};

const INCREMENTS = [50, 100, 250];

export default function WaterIncrementRow({ onAdd, onReset, onCustom }: Props) {
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  return (
    <View style={styles.row}>
      {INCREMENTS.map(amount => (
        <TouchableOpacity key={amount} style={styles.pill} onPress={() => onAdd(amount)}>
          <Text style={styles.pillText}>+{amount}</Text>
        </TouchableOpacity>
      ))}
      <TouchableOpacity style={styles.pill} onPress={onCustom}>
        <Text style={styles.pillText}>+ Custom</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={onReset} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
        <Text style={styles.resetText}>↺ reset</Text>
      </TouchableOpacity>
    </View>
  );
}

function makeStyles(theme: ThemeTokens) {
  return StyleSheet.create({
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
      backgroundColor: theme.background,
      borderWidth: 0.5,
      borderColor: theme.border,
      borderRadius: 10,
      paddingVertical: 4,
      paddingHorizontal: 8,
    },
    pillText: {
      fontSize: 12,
      fontWeight: '600',
      color: theme.primary,
    },
    resetText: {
      fontSize: 12,
      color: theme.textMuted,
    },
  });
}
