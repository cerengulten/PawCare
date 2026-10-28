import { useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { VaccineWithDog } from '../lib/hooks/useAllVaccines';
import { detectTreatmentType, treatmentCategoryVisuals } from '../lib/treatmentLogic';
import { daysAway } from '../lib/vaccineDisplay';
import { useTheme } from '../lib/ThemeContext';
import { useT } from '../lib/LanguageContext';
import { ThemeTokens } from '../lib/themes';

type Props = {
  treatment: VaccineWithDog | null;
  onPress: () => void;
  onSchedulePress?: () => void;
};

export default function PreventiveCareCard({
  treatment,
  onPress,
  onSchedulePress,
}: Props) {
  const { theme, isDarkMode } = useTheme();
  const { t } = useT();
  const styles = useMemo(() => makeStyles(theme, isDarkMode), [theme, isDarkMode]);

  if (!treatment) {
    return (
      <View style={styles.emptyCard}>
        <View style={styles.emptyHeaderRow}>
          <View style={styles.iconCircle}>
            <Text style={styles.iconEmoji}>🛡️</Text>
          </View>
          <View style={styles.emptyTextGroup}>
            <Text style={styles.emptyTitle}>
              {t('treatments.shieldSummaryTitle') || 'Immunity & Parasite Shield'}
            </Text>
            <Text style={styles.emptySubtitle}>
              {t('treatments.shieldAllClear') || 'All treatments up to date. Track flea & tick, heartworm & vaccines.'}
            </Text>
          </View>
        </View>
        <TouchableOpacity
          style={styles.scheduleButton}
          onPress={onSchedulePress || onPress}
          activeOpacity={0.8}
        >
          <Text style={styles.scheduleButtonText}>
            + {t('treatments.addTreatment') || 'Add Vaccine or Parasite Shield'}
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  const days = daysAway(treatment.next_due_date);
  const isOverdue = days < 0;
  const isToday = days === 0;
  const isTomorrow = days === 1;

  let relativeBadge = isOverdue
    ? `${Math.abs(days)}d ${t('treatments.overdueBadge') || 'overdue'}`
    : isToday
    ? t('treatments.dueTodayBadge') || 'Due Today'
    : isTomorrow
    ? t('treatments.dueTomorrowBadge') || 'Tomorrow'
    : `${days}d ${t('treatments.awayBadge') || 'away'}`;

  const treatmentType = detectTreatmentType(treatment.vaccine_name, treatment.notes);
  const visual = treatmentCategoryVisuals(treatmentType, isDarkMode);

  return (
    <View style={styles.card}>
      <View style={styles.topRow}>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>
            {visual.emoji} {t('treatments.shieldSummaryTitle') || 'Immunity & Parasite Shield'}
          </Text>
        </View>
        <View style={[styles.timeChip, isOverdue ? styles.timeChipOverdue : isToday ? styles.timeChipToday : null]}>
          <Text style={[styles.timeChipText, isOverdue ? styles.timeChipTextOverdue : isToday ? styles.timeChipTextToday : null]}>
            {relativeBadge}
          </Text>
        </View>
      </View>

      <TouchableOpacity
        activeOpacity={0.75}
        onPress={onPress}
        style={styles.contentRow}
      >
        <View style={styles.infoCol}>
          <Text style={styles.titleText}>
            {treatment.dogName ? `${treatment.dogName} · ` : ''}{treatment.vaccine_name}
          </Text>
          <Text style={styles.detailsText}>
            {visual.emoji} {t(visual.labelKey) || visual.defaultLabel} · Due: {treatment.next_due_date}
          </Text>
          {treatment.notes ? (
            <Text style={styles.notesText} numberOfLines={1}>
              "{treatment.notes}"
            </Text>
          ) : null}
        </View>
        <View style={styles.actionArrow}>
          <Text style={styles.actionArrowText}>›</Text>
        </View>
      </TouchableOpacity>
    </View>
  );
}

function makeStyles(theme: ThemeTokens, isDarkMode = false) {
  return StyleSheet.create({
    card: {
      backgroundColor: isDarkMode ? '#22271E' : '#F4F9F2',
      borderRadius: 22,
      padding: 16,
      marginBottom: 16,
      borderWidth: 1.5,
      borderColor: isDarkMode ? '#3A4833' : '#E2EFE0',
    },
    topRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 12,
    },
    badge: {
      backgroundColor: isDarkMode ? '#2D3827' : '#E8F3E5',
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 12,
    },
    badgeText: {
      fontSize: 12,
      fontWeight: '800',
      color: theme.primary,
      letterSpacing: 0.2,
    },
    timeChip: {
      backgroundColor: isDarkMode ? '#2C3426' : '#E8EFE5',
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 12,
    },
    timeChipToday: {
      backgroundColor: isDarkMode ? '#4A3414' : '#FEF3C7',
    },
    timeChipOverdue: {
      backgroundColor: isDarkMode ? '#4D1D1D' : '#FEE2E2',
    },
    timeChipText: {
      fontSize: 12,
      fontWeight: '700',
      color: theme.textMuted,
    },
    timeChipTextToday: {
      color: '#D97706',
    },
    timeChipTextOverdue: {
      color: '#DC2626',
    },
    contentRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    infoCol: {
      flex: 1,
      paddingRight: 10,
    },
    titleText: {
      fontSize: 16,
      fontWeight: '800',
      color: theme.textDark,
      marginBottom: 4,
    },
    detailsText: {
      fontSize: 13,
      fontWeight: '600',
      color: theme.textMuted,
      marginBottom: 2,
    },
    notesText: {
      fontSize: 12,
      color: theme.textMuted,
      fontStyle: 'italic',
      marginTop: 2,
    },
    actionArrow: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: isDarkMode ? '#2D3827' : '#E2EFE0',
      alignItems: 'center',
      justifyContent: 'center',
    },
    actionArrowText: {
      fontSize: 18,
      fontWeight: '700',
      color: theme.primary,
    },
    emptyCard: {
      backgroundColor: isDarkMode ? '#20241E' : '#F6F9F5',
      borderRadius: 22,
      padding: 16,
      marginBottom: 16,
      borderWidth: 1.5,
      borderColor: isDarkMode ? '#2E382A' : '#E8EFE6',
      borderStyle: 'dashed',
    },
    emptyHeaderRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 12,
      gap: 12,
    },
    iconCircle: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: isDarkMode ? '#2D3827' : '#E2EFE0',
      alignItems: 'center',
      justifyContent: 'center',
    },
    iconEmoji: {
      fontSize: 22,
    },
    emptyTextGroup: {
      flex: 1,
    },
    emptyTitle: {
      fontSize: 15,
      fontWeight: '800',
      color: theme.textDark,
      marginBottom: 2,
    },
    emptySubtitle: {
      fontSize: 12,
      color: theme.textMuted,
      lineHeight: 16,
    },
    scheduleButton: {
      backgroundColor: isDarkMode ? '#2D3827' : '#EAF3E8',
      paddingVertical: 10,
      paddingHorizontal: 14,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
    },
    scheduleButtonText: {
      fontSize: 13,
      fontWeight: '800',
      color: theme.primary,
    },
  });
}
