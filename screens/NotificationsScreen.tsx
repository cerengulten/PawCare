import { useEffect, useMemo, useRef } from 'react';
import { Animated, View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { AppNotification, NotificationActionType } from '../types';
import { useNotifications } from '../lib/hooks/useNotifications';
import NotificationCard from '../components/NotificationCard';
import SwipeBackWrapper from '../components/SwipeBackWrapper';
import { useTheme } from '../lib/ThemeContext';
import { useT } from '../lib/LanguageContext';
import { ThemeTokens } from '../lib/themes';

type Props = {
  notificationsState: ReturnType<typeof useNotifications>;
  onBack: () => void;
  onNavigateToPet: (dogId: string) => void;
  onOpenVetFinder: () => void;
};

const PET_ACTIONS: NotificationActionType[] = ['open_pet_habits', 'open_pet_profile', 'open_cycle_history'];

function groupByDate(items: AppNotification[], t: (key: string) => string) {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const buckets: { today: AppNotification[]; yesterday: AppNotification[]; week: AppNotification[]; earlier: AppNotification[] } = {
    today: [], yesterday: [], week: [], earlier: [],
  };
  items.forEach(n => {
    const d = new Date(n.created_at); d.setHours(0, 0, 0, 0);
    const diffDays = Math.round((today.getTime() - d.getTime()) / 86400000);
    if (diffDays <= 0) buckets.today.push(n);
    else if (diffDays === 1) buckets.yesterday.push(n);
    else if (diffDays <= 7) buckets.week.push(n);
    else buckets.earlier.push(n);
  });
  return [
    { label: t('notifications.groupToday'), items: buckets.today },
    { label: t('notifications.groupYesterday'), items: buckets.yesterday },
    { label: t('notifications.groupThisWeek'), items: buckets.week },
    { label: t('notifications.groupEarlier'), items: buckets.earlier },
  ].filter(g => g.items.length > 0);
}

function SkeletonRow({ theme, opacity }: { theme: ThemeTokens; opacity: Animated.Value }) {
  return <Animated.View style={[skeletonStyles.row, { backgroundColor: theme.divider, opacity }]} />;
}

const skeletonStyles = StyleSheet.create({
  row: {
    height: 70,
    borderRadius: 14,
    marginBottom: 10,
  },
});

export default function NotificationsScreen({ notificationsState, onBack, onNavigateToPet, onOpenVetFinder }: Props) {
  const { theme } = useTheme();
  const { t } = useT();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const { notifications, loading, unreadCount, markAsRead, markAllAsRead, deleteNotification } = notificationsState;
  const pulse = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 600, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0.4, duration: 600, useNativeDriver: true }),
      ])
    );
    anim.start();
    return () => anim.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const groups = useMemo(() => groupByDate(notifications, t), [notifications, t]);

  async function handlePress(n: AppNotification) {
    if (!n.is_read) await markAsRead(n.id);
    if (n.action_type === 'open_vet_finder') { onOpenVetFinder(); return; }
    if (n.action_type && PET_ACTIONS.includes(n.action_type)) {
      const dogId = n.action_payload?.pet_id;
      if (dogId) onNavigateToPet(dogId);
    }
  }

  return (
    <SwipeBackWrapper onBack={onBack}>
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onBack} style={styles.backRow}>
            <Text style={styles.backText}>‹ {t('common.back')}</Text>
          </TouchableOpacity>
          <View style={styles.headerRow}>
            <Text style={styles.title}>{t('notifications.inboxTitle')}</Text>
            {unreadCount > 0 ? (
              <TouchableOpacity onPress={markAllAsRead}>
                <Text style={styles.markAllRead}>{t('notifications.markAllRead')}</Text>
              </TouchableOpacity>
            ) : null}
          </View>
          {unreadCount > 0 ? (
            <View style={styles.unreadChip}>
              <Text style={styles.unreadChipText}>{t('notifications.unreadCount', { count: unreadCount })}</Text>
            </View>
          ) : null}
        </View>

        {loading ? (
          <View style={styles.content}>
            <SkeletonRow theme={theme} opacity={pulse} />
            <SkeletonRow theme={theme} opacity={pulse} />
            <SkeletonRow theme={theme} opacity={pulse} />
          </View>
        ) : notifications.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyEmoji}>🔔</Text>
            <Text style={styles.emptyTitle}>{t('notifications.emptyTitle')}</Text>
            <Text style={styles.emptyBody}>{t('notifications.emptyBody')}</Text>
          </View>
        ) : (
          <ScrollView contentContainerStyle={styles.content}>
            {groups.map(group => (
              <View key={group.label} style={styles.group}>
                <Text style={styles.groupLabel}>{group.label}</Text>
                {group.items.map(n => (
                  <View key={n.id} style={styles.cardWrap}>
                    <NotificationCard
                      notification={n}
                      onPress={() => handlePress(n)}
                      onDelete={() => deleteNotification(n.id)}
                    />
                  </View>
                ))}
              </View>
            ))}
          </ScrollView>
        )}
      </View>
    </SwipeBackWrapper>
  );
}

function makeStyles(theme: ThemeTokens) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.background,
    },
    header: {
      paddingHorizontal: 16,
    },
    backRow: {
      paddingTop: 56,
      paddingBottom: 8,
    },
    backText: {
      color: theme.primary,
      fontSize: 16,
      fontWeight: '600',
    },
    headerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    title: {
      fontSize: 18,
      fontWeight: '500',
      color: theme.textDark,
    },
    markAllRead: {
      fontSize: 13,
      fontWeight: '600',
      color: theme.primary,
    },
    unreadChip: {
      alignSelf: 'flex-start',
      backgroundColor: theme.surfaceAlt,
      borderRadius: 20,
      paddingHorizontal: 10,
      paddingVertical: 4,
      marginTop: 8,
    },
    unreadChipText: {
      fontSize: 12,
      fontWeight: '600',
      color: theme.primary,
    },
    content: {
      padding: 16,
      paddingBottom: 32,
    },
    group: {
      marginBottom: 16,
    },
    groupLabel: {
      fontSize: 9,
      fontWeight: '600',
      color: theme.textMuted,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
      marginBottom: 8,
    },
    cardWrap: {
      marginBottom: 8,
    },
    emptyState: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      padding: 32,
    },
    emptyEmoji: {
      fontSize: 40,
      marginBottom: 12,
    },
    emptyTitle: {
      fontSize: 16,
      fontWeight: '600',
      color: theme.textDark,
      marginBottom: 4,
      textAlign: 'center',
    },
    emptyBody: {
      fontSize: 13,
      color: theme.textMuted,
      textAlign: 'center',
    },
  });
}
