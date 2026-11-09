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
    <TouchableOpacity style={styles.row} onPress={onPress} activeOpacity={0.75}>
      <View style={styles.iconCircle}>
        <Text style={styles.iconEmoji}>🧪</Text>
        <View style={[styles.statusBadgeDot, { backgroundColor: dot }]} />
      </View>
      <View style={styles.info}>
        <Text style={styles.title}>{formatLoggedAt(log.logged_at)}</Text>
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
      gap: 10,
      paddingVertical: 8,
    },
    iconCircle: {
      width: 36,
      height: 36,
      borderRadius: 12,
      backgroundColor: theme.surfaceAlt,
      borderWidth: 1,
      borderColor: theme.border,
      alignItems: 'center',
      justifyContent: 'center',
      position: 'relative',
      flexShrink: 0,
    },
    iconEmoji: {
      fontSize: 16,
    },
    statusBadgeDot: {
      position: 'absolute',
      bottom: -2,
      right: -2,
      width: 10,
      height: 10,
      borderRadius: 5,
      borderWidth: 1.5,
      borderColor: theme.surface,
    },
    info: {
      flex: 1,
      minWidth: 0,
    },
    title: {
      fontSize: 14,
      fontWeight: '700',
      color: theme.textDark,
    },
    meta: {
      fontSize: 12,
      color: theme.textMuted,
      marginTop: 2,
    },
    chip: {
      borderRadius: 12,
      paddingHorizontal: 9,
      paddingVertical: 4,
    },
    chipText: {
      fontSize: 11,
      fontWeight: '700',
    },
  });
}
