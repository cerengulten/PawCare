import { useMemo, useRef } from 'react';
import { View, Text, TouchableOpacity, Alert, StyleSheet } from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';
import { AppNotification } from '../types';
import { NOTIF_META } from '../lib/notificationService';
import { formatDate } from '../lib/vaccineDisplay';
import { useTheme } from '../lib/ThemeContext';
import { useT } from '../lib/LanguageContext';
import { i18n } from '../lib/i18n';
import { ThemeTokens } from '../lib/themes';

type Props = {
  notification: AppNotification;
  onPress: () => void;
  onDelete: () => void;
};

// Fixed, not theme-driven — matches the literal fixed timestamp color from the mockup
// rather than theme.textMuted, which varies per palette.
const TIME_COLOR = '#A09080';

function relativeTime(createdAt: string): string {
  const created = new Date(createdAt);
  const now = new Date();
  const diffMs = now.getTime() - created.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return i18n.t('notifications.justNow');
  if (diffMin < 60) return i18n.t('notifications.minutesAgo', { count: diffMin });
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return i18n.t('notifications.hoursAgo', { count: diffHours });

  const createdDay = new Date(created); createdDay.setHours(0, 0, 0, 0);
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const dayDiff = Math.round((today.getTime() - createdDay.getTime()) / 86400000);
  if (dayDiff === 1) return i18n.t('notifications.yesterdayShort');
  return formatDate(createdAt);
}

export default function NotificationCard({ notification, onPress, onDelete }: Props) {
  const { theme } = useTheme();
  const { t } = useT();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const swipeableRef = useRef<Swipeable>(null);
  const meta = NOTIF_META[notification.type];

  const confirmDelete = () => {
    Alert.alert(
      t('notifications.deleteTitle'),
      t('notifications.deleteMessage'),
      [
        { text: t('common.cancel'), style: 'cancel', onPress: () => swipeableRef.current?.close() },
        {
          text: t('common.delete'),
          style: 'destructive',
          onPress: () => { swipeableRef.current?.close(); onDelete(); },
        },
      ]
    );
  };

  const renderRightActions = () => (
    <TouchableOpacity style={styles.deleteAction} onPress={confirmDelete}>
      <Text style={styles.deleteActionText}>{t('common.delete')}</Text>
    </TouchableOpacity>
  );

  return (
    <Swipeable ref={swipeableRef} renderRightActions={renderRightActions} overshootRight={false}>
      <TouchableOpacity
        style={[
          styles.card,
          { borderLeftColor: theme[meta.borderToken] },
          notification.is_read ? styles.read : null,
        ]}
        onPress={onPress}
        activeOpacity={0.7}
      >
        <View style={[styles.iconBox, { backgroundColor: theme[meta.bgToken] }]}>
          <Text style={styles.iconEmoji}>{meta.emoji}</Text>
        </View>
        <View style={styles.body}>
          <View style={styles.titleRow}>
            <Text style={styles.title} numberOfLines={1}>{notification.title}</Text>
            {!notification.is_read ? <View style={styles.unreadDot} /> : null}
          </View>
          <Text style={styles.bodyText} numberOfLines={2}>{notification.body}</Text>
          <Text style={styles.time}>{relativeTime(notification.created_at)}</Text>
        </View>
      </TouchableOpacity>
    </Swipeable>
  );
}

function makeStyles(theme: ThemeTokens) {
  return StyleSheet.create({
    card: {
      flexDirection: 'row',
      gap: 10,
      backgroundColor: theme.surface,
      borderRadius: theme.radiiCard,
      borderWidth: 0.5,
      borderColor: theme.border,
      borderLeftWidth: 3,
      padding: 12,
    },
    read: {
      opacity: 0.6,
    },
    iconBox: {
      width: 30,
      height: 30,
      borderRadius: 9,
      alignItems: 'center',
      justifyContent: 'center',
    },
    iconEmoji: {
      fontSize: 14,
    },
    body: {
      flex: 1,
      minWidth: 0,
    },
    titleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    title: {
      flex: 1,
      fontSize: 11,
      fontWeight: '500',
      color: theme.textDark,
    },
    unreadDot: {
      width: 6,
      height: 6,
      borderRadius: 3,
      backgroundColor: theme.primary,
    },
    bodyText: {
      fontSize: 10,
      color: theme.textMuted,
      lineHeight: 14,
      marginTop: 2,
    },
    time: {
      fontSize: 9,
      color: TIME_COLOR,
      marginTop: 4,
    },
    deleteAction: {
      width: 72,
      borderRadius: 14,
      marginLeft: 8,
      backgroundColor: theme.allergenText,
      alignItems: 'center',
      justifyContent: 'center',
    },
    deleteActionText: {
      color: 'white',
      fontSize: 13,
      fontWeight: '600',
    },
  });
}
