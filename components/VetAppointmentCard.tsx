import { useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { VetAppointment, getAppointmentDateTime } from '../lib/vetAppointments';
import { useTheme } from '../lib/ThemeContext';
import { useT } from '../lib/LanguageContext';
import { ThemeTokens } from '../lib/themes';

type Props = {
  appointment: VetAppointment | null;
  onSchedulePress: () => void;
  onEditPress?: (appointment: VetAppointment) => void;
  onCompletePress?: (id: string) => void;
};

export default function VetAppointmentCard({
  appointment,
  onSchedulePress,
  onEditPress,
  onCompletePress,
}: Props) {
  const { theme } = useTheme();
  const { t } = useT();
  const styles = useMemo(() => makeStyles(theme), [theme]);

  if (!appointment) {
    return (
      <View style={styles.emptyCard}>
        <View style={styles.emptyHeaderRow}>
          <View style={styles.iconCircle}>
            <Text style={styles.iconEmoji}>🩺</Text>
          </View>
          <View style={styles.emptyTextGroup}>
            <Text style={styles.emptyTitle}>{t('vetAppointments.upcomingTitle') || 'Vet Health & Visits'}</Text>
            <Text style={styles.emptySubtitle}>
              {t('vetAppointments.noUpcoming') || 'Track upcoming wellness checks, exams & booster appointments.'}
            </Text>
          </View>
        </View>
        <TouchableOpacity style={styles.scheduleButton} onPress={onSchedulePress} activeOpacity={0.8}>
          <Text style={styles.scheduleButtonText}>+ {t('vetAppointments.scheduleButton') || 'Schedule Vet Visit'}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const apptDate = getAppointmentDateTime(appointment.appointmentDate, appointment.appointmentTime);
  const now = new Date();
  const isToday =
    apptDate.getFullYear() === now.getFullYear() &&
    apptDate.getMonth() === now.getMonth() &&
    apptDate.getDate() === now.getDate();

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const isTomorrow =
    apptDate.getFullYear() === tomorrow.getFullYear() &&
    apptDate.getMonth() === tomorrow.getMonth() &&
    apptDate.getDate() === tomorrow.getDate();

  const diffDays = Math.ceil((apptDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

  let relativeBadge = isToday
    ? t('vetAppointments.todayBadge') || 'Today'
    : isTomorrow
    ? t('vetAppointments.tomorrowBadge') || 'Tomorrow'
    : diffDays > 0
    ? `${diffDays}d away`
    : t('vetAppointments.overdueBadge') || 'Past';

  const dateFormatted = apptDate.toLocaleDateString([], {
    month: 'short',
    day: 'numeric',
  });

  return (
    <View style={styles.card}>
      <View style={styles.topRow}>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>🩺 {t('vetAppointments.upcomingTitle') || 'Upcoming Vet Visit'}</Text>
        </View>
        <View style={[styles.timeChip, isToday && styles.timeChipToday]}>
          <Text style={[styles.timeChipText, isToday && styles.timeChipTextToday]}>{relativeBadge}</Text>
        </View>
      </View>

      <TouchableOpacity
        activeOpacity={0.7}
        onPress={() => onEditPress && onEditPress(appointment)}
        style={styles.contentRow}
      >
        <View style={styles.infoCol}>
          <Text style={styles.titleText}>
            {appointment.petName} · {appointment.title}
          </Text>
          <Text style={styles.detailsText}>
            📍 {appointment.clinicName || 'Vet Clinic'} · {dateFormatted} at {appointment.appointmentTime}
          </Text>
          {appointment.notes ? (
            <Text style={styles.notesText} numberOfLines={2}>
              "{appointment.notes}"
            </Text>
          ) : null}
        </View>
        <Text style={styles.chevron}>›</Text>
      </TouchableOpacity>

      <View style={styles.actionRow}>
        {onCompletePress ? (
          <TouchableOpacity
            style={styles.doneBtn}
            onPress={() => onCompletePress(appointment.id)}
            activeOpacity={0.8}
          >
            <Text style={styles.doneBtnText}>✓ {t('vetAppointments.markCompleted') || 'Completed'}</Text>
          </TouchableOpacity>
        ) : null}
        <TouchableOpacity
          style={styles.newApptBtn}
          onPress={onSchedulePress}
          activeOpacity={0.8}
        >
          <Text style={styles.newApptBtnText}>+ {t('vetAppointments.scheduleButton') || 'New Visit'}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function makeStyles(theme: ThemeTokens) {
  return StyleSheet.create({
    card: {
      backgroundColor: theme.surface,
      borderRadius: theme.radiiCard,
      borderWidth: 0.5,
      borderColor: theme.border,
      padding: 14,
      marginBottom: 20,
    },
    emptyCard: {
      backgroundColor: theme.surface,
      borderRadius: theme.radiiCard,
      borderWidth: 0.5,
      borderColor: theme.border,
      padding: 14,
      marginBottom: 20,
    },
    emptyHeaderRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      marginBottom: 12,
    },
    iconCircle: {
      width: 42,
      height: 42,
      borderRadius: 21,
      backgroundColor: theme.surfaceAlt,
      alignItems: 'center',
      justifyContent: 'center',
    },
    iconEmoji: {
      fontSize: 20,
    },
    emptyTextGroup: {
      flex: 1,
    },
    emptyTitle: {
      fontSize: 15,
      fontWeight: '600',
      color: theme.textDark,
      marginBottom: 2,
    },
    emptySubtitle: {
      fontSize: 12,
      color: theme.textMuted,
      lineHeight: 16,
    },
    scheduleButton: {
      backgroundColor: theme.surfaceAlt,
      borderWidth: 0.5,
      borderColor: theme.border,
      borderRadius: 10,
      paddingVertical: 9,
      alignItems: 'center',
    },
    scheduleButtonText: {
      fontSize: 13,
      fontWeight: '600',
      color: theme.primary,
    },
    topRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 10,
    },
    badge: {
      backgroundColor: theme.surfaceAlt,
      borderRadius: 12,
      paddingHorizontal: 9,
      paddingVertical: 3,
    },
    badgeText: {
      fontSize: 11,
      fontWeight: '600',
      color: theme.primaryDark,
    },
    timeChip: {
      backgroundColor: theme.notStartedBg,
      borderRadius: 12,
      paddingHorizontal: 9,
      paddingVertical: 3,
    },
    timeChipToday: {
      backgroundColor: theme.streakBg,
    },
    timeChipText: {
      fontSize: 11,
      fontWeight: '600',
      color: theme.notStartedText,
    },
    timeChipTextToday: {
      color: theme.pendingAmberText,
    },
    contentRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 4,
    },
    infoCol: {
      flex: 1,
      paddingRight: 8,
    },
    titleText: {
      fontSize: 15,
      fontWeight: '600',
      color: theme.textDark,
      marginBottom: 3,
    },
    detailsText: {
      fontSize: 13,
      color: theme.textMuted,
      lineHeight: 18,
    },
    notesText: {
      fontSize: 12,
      color: theme.textMuted,
      fontStyle: 'italic',
      marginTop: 4,
    },
    chevron: {
      fontSize: 18,
      color: theme.textMuted,
    },
    actionRow: {
      flexDirection: 'row',
      gap: 10,
      marginTop: 12,
      paddingTop: 10,
      borderTopWidth: 0.5,
      borderTopColor: theme.divider,
    },
    doneBtn: {
      flex: 1,
      backgroundColor: theme.surfaceAlt,
      borderRadius: 9,
      paddingVertical: 7,
      alignItems: 'center',
    },
    doneBtnText: {
      fontSize: 12,
      fontWeight: '600',
      color: theme.done,
    },
    newApptBtn: {
      flex: 1,
      backgroundColor: theme.primaryLight,
      borderRadius: 9,
      paddingVertical: 7,
      alignItems: 'center',
    },
    newApptBtnText: {
      fontSize: 12,
      fontWeight: '600',
      color: theme.primary,
    },
  });
}
