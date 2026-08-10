import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { HealthLog, PoopConsistency, PoopLogDetails } from '../types';
import { colors } from '../lib/theme';

type Props = {
  log: HealthLog;
  onPress: () => void;
};

const CONSISTENCY_LABEL: Record<PoopConsistency, string> = {
  solid: 'Solid',
  soft: 'Soft',
  liquid: 'Liquid',
  mucus: 'Mucus',
};

function severityStyle(consistency: PoopConsistency) {
  if (consistency === 'solid') {
    return { dot: colors.doneGreen, chipBg: colors.moodSelectedBg, chipText: colors.primaryGreen };
  }
  if (consistency === 'soft') {
    return { dot: colors.pendingAmber, chipBg: colors.pendingAmberBg, chipText: colors.pendingAmberText };
  }
  return { dot: colors.allergenText, chipBg: colors.allergenBg, chipText: colors.allergenText };
}

function formatLoggedAt(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
    + ' · ' + d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
}

export default function PoopLogCard({ log, onPress }: Props) {
  const details = log.details as PoopLogDetails;
  const { dot, chipBg, chipText } = severityStyle(details.consistency);

  return (
    <TouchableOpacity style={styles.row} onPress={onPress}>
      <View style={[styles.dot, { backgroundColor: dot }]} />
      <View style={styles.info}>
        <Text style={styles.title}>💩 {formatLoggedAt(log.logged_at)}</Text>
        <Text style={styles.meta} numberOfLines={1}>
          {details.color} · {details.frequency}x{log.notes ? ` · ${log.notes}` : ''}
        </Text>
      </View>
      <View style={[styles.chip, { backgroundColor: chipBg }]}>
        <Text style={[styles.chipText, { color: chipText }]}>{CONSISTENCY_LABEL[details.consistency]}</Text>
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
  title: {
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
  chipText: {
    fontSize: 12,
    fontWeight: '500',
  },
});
