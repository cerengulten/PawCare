import { useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { VaccineRecord } from '../types';
import { useTheme } from '../lib/ThemeContext';
import { useT } from '../lib/LanguageContext';
import { ThemeTokens } from '../lib/themes';
import { daysAway, formatDaysAway, formatDate, SOON_THRESHOLD_DAYS } from '../lib/vaccineDisplay';
import {
  detectTreatmentType,
  detectCadenceMonths,
  treatmentCategoryVisuals,
  cleanTreatmentNotes,
} from '../lib/treatmentLogic';

type Props = {
  vaccine: VaccineRecord;
  isOverdue: boolean;
  onPress: () => void;
  onAdministerToday?: (vaccine: VaccineRecord, nextDueDate: string) => Promise<void> | void;
  dogName?: string;
  compact?: boolean;
};

function formatNextDateQuick(cadenceMonths: number): string {
  const target = new Date();
  target.setMonth(target.getMonth() + cadenceMonths);
  const y = target.getFullYear();
  const m = String(target.getMonth() + 1).padStart(2, '0');
  const d = String(target.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export default function VaccineCard({
  vaccine,
  isOverdue,
  onPress,
  onAdministerToday,
  dogName,
  compact = false,
}: Props) {
  const { theme, isDarkMode } = useTheme();
  const { t } = useT();
  const styles = useMemo(() => makeStyles(theme, isDarkMode), [theme, isDarkMode]);
  const [administering, setAdministering] = useState(false);

  const treatmentType = detectTreatmentType(vaccine.vaccine_name, vaccine.notes);
  const cadenceMonths = detectCadenceMonths(treatmentType, vaccine.notes, vaccine.vaccine_name);
  const categoryVisuals = treatmentCategoryVisuals(treatmentType, isDarkMode);
  const cleanNotes = cleanTreatmentNotes(vaccine.notes);

  const days = daysAway(vaccine.next_due_date);
  const isSoon = !isOverdue && days <= SOON_THRESHOLD_DAYS;

  // Status badge styling
  const statusBadgeStyle = isOverdue
    ? styles.statusBadgeOverdue
    : isSoon
    ? styles.statusBadgeSoon
    : styles.statusBadgeProtected;

  const statusTextStyle = isOverdue
    ? styles.statusTextOverdue
    : isSoon
    ? styles.statusTextSoon
    : styles.statusTextProtected;

  const statusLabel = isOverdue
    ? t('vaccines.overdue') || 'Overdue'
    : isSoon
    ? (days <= 0 ? t('common.today') || 'Today' : `${days}d`)
    : t('vaccines.scheduled') || 'Protected';

  const nextDueQuick = formatNextDateQuick(cadenceMonths);

  async function handleAdministerPress() {
    if (!onAdministerToday || administering) return;
    setAdministering(true);
    try {
      await onAdministerToday(vaccine, nextDueQuick);
    } finally {
      setAdministering(false);
    }
  }

  const categoryLabel = t(categoryVisuals.labelKey) || categoryVisuals.defaultLabel;

  if (compact) {
    return (
      <TouchableOpacity style={styles.compactRow} onPress={onPress} activeOpacity={0.7}>
        <View style={[styles.compactBadge, { backgroundColor: categoryVisuals.bg, borderColor: categoryVisuals.border }]}>
          <Text style={styles.compactBadgeEmoji}>{categoryVisuals.emoji}</Text>
        </View>
        <View style={styles.compactInfo}>
          <Text style={styles.compactName} numberOfLines={1}>
            {vaccine.vaccine_name}{dogName ? ` · ${dogName}` : ''}
          </Text>
          <Text style={styles.compactMeta}>
            {t('vaccines.due', { date: formatDate(vaccine.next_due_date) })} · {formatDaysAway(days, isOverdue)}
          </Text>
        </View>
        <View style={[styles.statusBadge, statusBadgeStyle]}>
          <Text style={[styles.statusText, statusTextStyle]}>{statusLabel}</Text>
        </View>
      </TouchableOpacity>
    );
  }

  return (
    <View style={styles.card}>
      {/* Top Header: Category Pill on left, Urgency Status on right */}
      <View style={styles.headerRow}>
        <View style={[styles.categoryPill, { backgroundColor: categoryVisuals.bg, borderColor: categoryVisuals.border }]}>
          <Text style={styles.categoryEmoji}>{categoryVisuals.emoji}</Text>
          <Text style={[styles.categoryText, { color: categoryVisuals.text }]}>{categoryLabel}</Text>
        </View>

        <View style={[styles.statusBadge, statusBadgeStyle]}>
          <Text style={[styles.statusText, statusTextStyle]}>
            {isOverdue ? `⚠️ ${statusLabel}` : statusLabel}
          </Text>
        </View>
      </View>

      {/* Main Title & Subtitle */}
      <TouchableOpacity onPress={onPress} activeOpacity={0.8}>
        <Text style={styles.title}>
          {vaccine.vaccine_name}{dogName ? ` · ${dogName}` : ''}
        </Text>

        {cleanNotes ? (
          <Text style={styles.notesText} numberOfLines={2}>
            {cleanNotes}
          </Text>
        ) : null}

        {/* Cadence & History Row */}
        <View style={styles.metaRow}>
          <Text style={styles.metaText}>
            ⏱️ {cadenceMonths === 1 ? t('treatments.everyMonth') || 'Monthly' : t('treatments.everyXMonths', { count: cadenceMonths }) || `Every ${cadenceMonths} months`}
          </Text>
          <Text style={styles.metaDot}>·</Text>
          <Text style={styles.metaText}>
            📅 {t('vaccines.due', { date: formatDate(vaccine.next_due_date) })}
          </Text>
        </View>
      </TouchableOpacity>

      {/* Action Buttons: Details / Edit on left, 1-Tap 'Given Today' on right */}
      <View style={styles.actionRow}>
        <TouchableOpacity style={styles.editBtn} onPress={onPress} activeOpacity={0.7}>
          <Text style={styles.editBtnText}>↻ {t('common.edit') || 'Edit'}</Text>
        </TouchableOpacity>

        {onAdministerToday ? (
          <TouchableOpacity
            style={styles.administerBtn}
            onPress={handleAdministerPress}
            disabled={administering}
            activeOpacity={0.8}
          >
            {administering ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text style={styles.administerBtnText}>
                ✓ {t('treatments.givenToday') || 'Given Today'} ({formatDate(nextDueQuick)})
              </Text>
            )}
          </TouchableOpacity>
        ) : null}
      </View>
    </View>
  );
}

function makeStyles(theme: ThemeTokens, isDark = false) {
  return StyleSheet.create({
    card: {
      backgroundColor: theme.surface,
      borderRadius: 20,
      padding: 16,
      marginBottom: 12,
      borderWidth: 1.5,
      borderColor: theme.border,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: isDark ? 0.2 : 0.04,
      shadowRadius: 6,
      elevation: 2,
    },
    headerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 10,
    },
    categoryPill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: 12,
      borderWidth: 1,
    },
    categoryEmoji: {
      fontSize: 13,
    },
    categoryText: {
      fontSize: 12,
      fontWeight: '700',
      letterSpacing: 0.2,
    },
    statusBadge: {
      paddingHorizontal: 9,
      paddingVertical: 4,
      borderRadius: 12,
    },
    statusText: {
      fontSize: 11,
      fontWeight: '700',
    },
    statusBadgeOverdue: {
      backgroundColor: isDark ? '#3E1C1F' : '#FDE8E8',
      borderWidth: 1,
      borderColor: isDark ? '#6B272D' : '#FCA5A5',
    },
    statusTextOverdue: {
      color: isDark ? '#FCA5A5' : '#991B1B',
      fontSize: 11,
      fontWeight: '700',
    },
    statusBadgeSoon: {
      backgroundColor: isDark ? '#362B1A' : '#FEF3C7',
      borderWidth: 1,
      borderColor: isDark ? '#594420' : '#FDE68A',
    },
    statusTextSoon: {
      color: isDark ? '#FBBF24' : '#92400E',
      fontSize: 11,
      fontWeight: '700',
    },
    statusBadgeProtected: {
      backgroundColor: isDark ? '#1C2E24' : '#F0FDF4',
      borderWidth: 1,
      borderColor: isDark ? '#2C4C38' : '#BBF7D0',
    },
    statusTextProtected: {
      color: isDark ? '#86EFAC' : '#166534',
      fontSize: 11,
      fontWeight: '700',
    },
    title: {
      fontSize: 16,
      fontWeight: '700',
      color: theme.textDark,
      marginBottom: 4,
    },
    notesText: {
      fontSize: 13,
      color: theme.textMuted,
      marginBottom: 8,
      lineHeight: 18,
    },
    metaRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      marginTop: 2,
      marginBottom: 14,
    },
    metaText: {
      fontSize: 12,
      color: theme.textMuted,
      fontWeight: '500',
    },
    metaDot: {
      fontSize: 12,
      color: theme.textMuted,
    },
    actionRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    editBtn: {
      paddingVertical: 9,
      paddingHorizontal: 12,
      borderRadius: 12,
      backgroundColor: theme.surfaceAlt,
      borderWidth: 1,
      borderColor: theme.border,
      alignItems: 'center',
      justifyContent: 'center',
    },
    editBtnText: {
      fontSize: 12,
      fontWeight: '600',
      color: theme.textDark,
    },
    administerBtn: {
      flex: 1,
      paddingVertical: 10,
      paddingHorizontal: 14,
      borderRadius: 12,
      backgroundColor: theme.primary,
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: theme.primary,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.25,
      shadowRadius: 4,
      elevation: 2,
    },
    administerBtnText: {
      fontSize: 12,
      fontWeight: '700',
      color: '#FFFFFF',
    },
    // Compact Row Layout for More Screen
    compactRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      paddingVertical: 8,
    },
    compactBadge: {
      width: 38,
      height: 38,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
    },
    compactBadgeEmoji: {
      fontSize: 18,
    },
    compactInfo: {
      flex: 1,
      minWidth: 0,
    },
    compactName: {
      fontSize: 14,
      fontWeight: '700',
      color: theme.textDark,
      marginBottom: 2,
    },
    compactMeta: {
      fontSize: 12,
      color: theme.textMuted,
    },
  });
}
