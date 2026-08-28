import { useMemo, useRef } from 'react';
import { View, Text, TouchableOpacity, Alert, StyleSheet } from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';
import { Habit } from '../types';
import ProgressRing from './ProgressRing';
import { useTheme } from '../lib/ThemeContext';
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
  onEdit,
  onDelete,
  onViewHistory,
}: Props) {
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const swipeableRef = useRef<Swipeable>(null);
  const progress = target > 0 ? count / target : 0;
  const ringColor = done ? theme.done : inProgress ? theme.pending : theme.border;
  const loggable = !done && !actionDisabled;
  const undoable = done;

  const confirmDelete = () => {
    Alert.alert(
      'Delete habit?',
      `This permanently deletes "${habit.title}".`,
      [
        { text: 'Cancel', style: 'cancel', onPress: () => swipeableRef.current?.close() },
        {
          text: 'Delete',
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
      <TouchableOpacity
        style={[styles.actionButton, styles.historyAction]}
        onPress={() => { swipeableRef.current?.close(); onViewHistory(); }}
      >
        <Text style={styles.actionText}>History</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.actionButton, styles.editAction]}
        onPress={() => { swipeableRef.current?.close(); onEdit(); }}
      >
        <Text style={styles.actionText}>Edit</Text>
      </TouchableOpacity>
      <TouchableOpacity style={[styles.actionButton, styles.deleteAction]} onPress={confirmDelete}>
        <Text style={styles.actionText}>Delete</Text>
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
          <TouchableOpacity style={styles.rowContent} onPress={onPressAction} activeOpacity={0.7}>
            {content}
          </TouchableOpacity>
        ) : undoable ? (
          <TouchableOpacity style={styles.rowContent} onLongPress={onPressAction} activeOpacity={0.7}>
            {content}
          </TouchableOpacity>
        ) : (
          <View style={styles.rowContent}>{content}</View>
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
