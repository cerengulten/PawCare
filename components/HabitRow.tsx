import { useMemo, useRef } from 'react';
import { View, Text, TouchableOpacity, Alert, StyleSheet } from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';
import { Habit } from '../types';
import ProgressRing from './ProgressRing';
import { useTheme } from '../lib/ThemeContext';
import { useT } from '../lib/LanguageContext';
import { ThemeTokens } from '../lib/themes';

type Props = {
  habit: Habit;
  count: number;
  target: number;
  done: boolean;
  inProgress: boolean;
  subtitle: string;
  actionDisabled?: boolean;
  onPressAction: () => void;
  onResetToday?: () => void;
  onLongPressAction?: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onViewHistory: () => void;
};

const RING_SIZE = 26;
const RING_STROKE = 3;

export default function HabitRow({
  habit,
  count,
  target,
  done,
  inProgress,
  subtitle,
  actionDisabled = false,
  onPressAction,
  onResetToday,
  onLongPressAction,
  onEdit,
  onDelete,
  onViewHistory,
}: Props) {
  const { theme } = useTheme();
  const { t } = useT();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const swipeableRef = useRef<Swipeable>(null);
  const progress = target > 0 ? count / target : 0;
  const ringColor = done ? theme.done : inProgress ? theme.pending : theme.border;
  const loggable = !done && !actionDisabled;
  const undoable = done;

  const confirmDelete = () => {
    Alert.alert(
      t('habitRow.deleteTitle'),
      t('habitRow.deleteMessage', { title: habit.title }),
      [
        { text: t('common.cancel'), style: 'cancel', onPress: () => swipeableRef.current?.close() },
        {
          text: t('common.delete'),
          style: 'destructive',
          onPress: () => {
            swipeableRef.current?.close();
            onDelete();
          },
        },
      ]
    );
  };

  const renderRightActions = () => (
    <View style={styles.actions}>
      {count > 0 && onResetToday ? (
        <TouchableOpacity
          style={[styles.actionButton, styles.resetAction]}
          onPress={() => { swipeableRef.current?.close(); onResetToday(); }}
        >
          <Text style={styles.actionText}>{t('habitRow.resetToday')}</Text>
        </TouchableOpacity>
      ) : null}
      <TouchableOpacity
        style={[styles.actionButton, styles.historyAction]}
        onPress={() => { swipeableRef.current?.close(); onViewHistory(); }}
      >
        <Text style={styles.actionText}>{t('habitRow.history')}</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.actionButton, styles.editAction]}
        onPress={() => { swipeableRef.current?.close(); onEdit(); }}
      >
        <Text style={styles.actionText}>{t('common.edit')}</Text>
      </TouchableOpacity>
      <TouchableOpacity style={[styles.actionButton, styles.deleteAction]} onPress={confirmDelete}>
        <Text style={styles.actionText}>{t('common.delete')}</Text>
      </TouchableOpacity>
    </View>
  );

  const content = (
    <>
      <ProgressRing
        size={RING_SIZE}
        strokeWidth={RING_STROKE}
        progress={progress}
        color={ringColor}
        trackColor={theme.notStartedBg}
      />
      <View style={styles.info}>
        <Text style={styles.name} numberOfLines={1}>{habit.title}</Text>
        <Text style={styles.subtitle} numberOfLines={1}>{subtitle}</Text>
      </View>
      {done ? <Text style={styles.checkmark}>✓</Text> : null}
    </>
  );

  return (
    <Swipeable ref={swipeableRef} renderRightActions={renderRightActions} overshootRight={false}>
      <View style={styles.row}>
        {loggable ? (
          <TouchableOpacity
            style={styles.rowContent}
            onPress={onPressAction}
            onLongPress={onLongPressAction}
            activeOpacity={0.7}
          >
            {content}
          </TouchableOpacity>
        ) : undoable ? (
          <TouchableOpacity
            style={styles.rowContent}
            onPress={onPressAction}
            onLongPress={onLongPressAction}
            activeOpacity={0.7}
          >
            {content}
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={styles.rowContent}
            onLongPress={onLongPressAction}
            activeOpacity={0.7}
            disabled={!onLongPressAction || count === 0}
          >
            {content}
          </TouchableOpacity>
        )}
      </View>
    </Swipeable>
  );
}

function makeStyles(theme: ThemeTokens) {
  return StyleSheet.create({
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 6,
      backgroundColor: theme.surface,
    },
    rowContent: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
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
    subtitle: {
      fontSize: 12,
      color: theme.textMuted,
      marginTop: 1,
    },
    checkmark: {
      color: theme.done,
      fontSize: 15,
      fontWeight: '700',
    },
    actions: {
      flexDirection: 'row',
    },
    actionButton: {
      width: 64,
      alignItems: 'center',
      justifyContent: 'center',
    },
    resetAction: {
      backgroundColor: '#D97706',
    },
    historyAction: {
      backgroundColor: theme.textMuted,
    },
    editAction: {
      backgroundColor: theme.primary,
    },
    deleteAction: {
      backgroundColor: theme.allergenText,
    },
    actionText: {
      color: 'white',
      fontSize: 14,
      fontWeight: '600',
    },
  });
}
