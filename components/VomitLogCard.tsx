import { useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { HealthLog, VomitLogDetails, VomitSeverity } from '../types';
import { useTheme } from '../lib/ThemeContext';
import { useT } from '../lib/LanguageContext';
import { localeTag } from '../lib/i18n';
import { ThemeTokens } from '../lib/themes';

type Props = {
  log: HealthLog;
  onPress: () => void;
};

function severityStyle(theme: ThemeTokens, severity: VomitSeverity) {
  if (severity === 'mild') {
    return { dot: theme.done, chipBg: theme.moodSelBg, chipText: theme.primary };
  }
  if (severity === 'moderate') {
    return { dot: theme.pending, chipBg: theme.pendingAmberBg, chipText: theme.pendingAmberText };
  }
  return { dot: theme.allergenText, chipBg: theme.allergenBg, chipText: theme.allergenText };
}

function formatLoggedAt(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString(localeTag(), { month: 'short', day: 'numeric' })
    + ' · ' + d.toLocaleTimeString(localeTag(), { hour: 'numeric', minute: '2-digit' });
}

export default function VomitLogCard({ log, onPress }: Props) {
  const { theme } = useTheme();
  const { t } = useT();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const details = (log.details || {}) as Partial<VomitLogDetails>;
  const severity = details.severity ?? 'mild';
  const possibleCause = details.possibleCause ?? 'unknown';
  const frequency = details.frequency ?? 1;
  const { dot, chipBg, chipText } = severityStyle(theme, severity);

  return (
    <TouchableOpacity style={styles.row} onPress={onPress}>
      <View style={[styles.dot, { backgroundColor: dot }]} />
      <View style={styles.info}>
        <Text style={styles.title}>🤮 {formatLoggedAt(log.logged_at)}</Text>
        <Text style={styles.meta} numberOfLines={1}>
          {t('vomit.causeOpt.' + possibleCause)} · {frequency}x{log.notes ? ` · ${log.notes}` : ''}
        </Text>
      </View>
      <View style={[styles.chip, { backgroundColor: chipBg }]}>
        <Text style={[styles.chipText, { color: chipText }]}>{t('vomit.severityOpt.' + severity)}</Text>
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
    title: {
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
    chipText: {
      fontSize: 12,
      fontWeight: '500',
    },
  });
}
