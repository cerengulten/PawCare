import { useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { HealthLog, PoopColor, PoopConsistency, PoopLogDetails } from '../types';
import { useTheme } from '../lib/ThemeContext';
import { useT } from '../lib/LanguageContext';
import { localeTag } from '../lib/i18n';
import { ThemeTokens } from '../lib/themes';

type Props = {
  log: HealthLog;
  onPress: () => void;
};

const COLOR_SWATCH_HEX: Record<PoopColor, string> = {
  brown: '#6D4C41',
  yellow: '#D4A037',
  green: '#558B2F',
  black: '#262626',
  red: '#C62828',
};

function severityStyle(theme: ThemeTokens, consistency: PoopConsistency, color: PoopColor) {
  if (color === 'black' || color === 'red' || consistency === 'liquid') {
    return { dot: theme.allergenText, chipBg: theme.allergenBg, chipText: theme.allergenText };
  }
  if (consistency === 'soft' || consistency === 'mucus') {
    return { dot: theme.pending, chipBg: theme.pendingAmberBg, chipText: theme.pendingAmberText };
  }
  return { dot: theme.done, chipBg: theme.moodSelBg, chipText: theme.primary };
}

function formatLoggedAt(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString(localeTag(), { month: 'short', day: 'numeric' })
    + ' · ' + d.toLocaleTimeString(localeTag(), { hour: 'numeric', minute: '2-digit' });
}

export default function PoopLogCard({ log, onPress }: Props) {
  const { theme } = useTheme();
  const { t } = useT();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const details = (log.details || {}) as Partial<PoopLogDetails>;
  const consistency = details.consistency ?? 'solid';
  const color = details.color ?? 'brown';
  const frequency = details.frequency ?? 1;
  const { dot, chipBg, chipText } = severityStyle(theme, consistency, color);
  const swatchHex = COLOR_SWATCH_HEX[color] ?? '#6D4C41';

  return (
    <TouchableOpacity style={styles.row} onPress={onPress} activeOpacity={0.75}>
      <View style={styles.iconCircle}>
        <Text style={styles.iconEmoji}>💩</Text>
        <View style={[styles.statusBadgeDot, { backgroundColor: dot }]} />
      </View>
      <View style={styles.info}>
        <Text style={styles.title}>{formatLoggedAt(log.logged_at)}</Text>
        <View style={styles.metaRow}>
          <View style={[styles.colorSwatchDot, { backgroundColor: swatchHex }]} />
          <Text style={styles.meta} numberOfLines={1}>
            {t('poop.colorOpt.' + color)} · {frequency}x{log.notes ? ` · ${log.notes}` : ''}
          </Text>
        </View>
      </View>
      <View style={[styles.chip, { backgroundColor: chipBg }]}>
        <Text style={[styles.chipText, { color: chipText }]}>
          {t('poop.bristolBadge.' + consistency)}
        </Text>
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
    metaRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      marginTop: 2,
    },
    colorSwatchDot: {
      width: 9,
      height: 9,
      borderRadius: 5,
      borderWidth: 1,
      borderColor: 'rgba(0,0,0,0.15)',
    },
    meta: {
      fontSize: 12,
      color: theme.textMuted,
      flex: 1,
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
