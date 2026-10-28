import { useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { VaccineRecord } from '../types';
import { useTheme } from '../lib/ThemeContext';
import { useT } from '../lib/LanguageContext';
import { ThemeTokens } from '../lib/themes';
import { daysAway, formatDaysAway, formatDate, SOON_THRESHOLD_DAYS } from '../lib/vaccineDisplay';

type Props = {
  vaccine: VaccineRecord;
  isOverdue: boolean;
  onPress: () => void;
  dogName?: string;
};

function getTreatmentIcon(name: string): string {
  const lower = name.toLowerCase();
  if (lower.includes('iç parazit') || lower.includes('internal parasite') || lower.includes('deworm')) return '🪱';
  if (lower.includes('dış parazit') || lower.includes('external parasite') || lower.includes('flea') || lower.includes('tick')) return '🪲';
  if (lower.includes('kalp kurdu') || lower.includes('heartworm')) return '❤️';
  return '💉';
}

export default function VaccineCard({ vaccine, isOverdue, onPress, dogName }: Props) {
  const { theme } = useTheme();
  const { t } = useT();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const days = daysAway(vaccine.next_due_date);
  const isSoon = !isOverdue && days <= SOON_THRESHOLD_DAYS;
  const dotColor = isOverdue ? theme.allergenText : isSoon ? theme.pending : theme.done;
  const chipStyle = isOverdue ? styles.chipRed : isSoon ? styles.chipAmber : styles.chipGreen;
  const chipTextStyle = isOverdue ? styles.chipTextRed : isSoon ? styles.chipTextAmber : styles.chipTextGreen;
  const chipLabel = isOverdue ? t('vaccines.overdue') : isSoon ? t('vaccines.soon') : t('vaccines.scheduled');

  return (
    <TouchableOpacity style={styles.row} onPress={onPress}>
      <View style={[styles.dot, { backgroundColor: dotColor }]} />
      <View style={styles.info}>
        <Text style={styles.name}>
          {getTreatmentIcon(vaccine.vaccine_name)} {vaccine.vaccine_name}{dogName ? ` · ${dogName}` : ''}
        </Text>
        <Text style={styles.meta}>
          {t('vaccines.due', { date: formatDate(vaccine.next_due_date) })} · {formatDaysAway(days, isOverdue)}
        </Text>
      </View>
      <View style={[styles.chip, chipStyle]}>
        <Text style={[styles.chipText, chipTextStyle]}>{chipLabel}</Text>
      </View>
    </TouchableOpacity>
  );
}

function makeStyles(theme: ThemeTokens) {
  return StyleSheet.create({
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
      color: theme.textDark,
    },
    meta: {
      fontSize: 12,
      color: theme.textMuted,
      marginTop: 1,
    },
    chip: {
      borderRadius: 20,
      paddingHorizontal: 8,
      paddingVertical: 2,
    },
    chipAmber: {
      backgroundColor: theme.pendingAmberBg,
    },
    chipGreen: {
      backgroundColor: theme.moodSelBg,
    },
    chipRed: {
      backgroundColor: theme.allergenBg,
    },
    chipText: {
      fontSize: 12,
      fontWeight: '500',
    },
    chipTextAmber: {
      color: theme.pendingAmberText,
    },
    chipTextGreen: {
      color: theme.primary,
    },
    chipTextRed: {
      color: theme.allergenText,
    },
  });
}
