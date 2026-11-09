import React, { useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Alert,
  StyleSheet,
  Modal,
  Pressable,
} from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';
import { Feather } from '@expo/vector-icons';
import { Habit } from '../types';
import ProgressRing from './ProgressRing';
import { useTheme } from '../lib/ThemeContext';
import { useT } from '../lib/LanguageContext';
import { ThemeTokens } from '../lib/themes';
import { renderHabitVectorIcon } from '../lib/habitIcons';
import { triggerLightHaptic } from '../lib/haptics';

type Props = {
  habit: Habit;
  count: number;
  target: number;
  done: boolean;
  inProgress: boolean;
  subtitle: string;
  actionDisabled?: boolean;
  onPressAction: () => void;
  onUndoOne?: () => void;
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
  onUndoOne,
  onResetToday,
  onLongPressAction,
  onEdit,
  onDelete,
  onViewHistory,
}: Props) {
  const { theme, isDarkMode } = useTheme();
  const { t } = useT();
  const styles = useMemo(() => makeStyles(theme, isDarkMode), [theme, isDarkMode]);
  const swipeableRef = useRef<Swipeable>(null);
  const [menuVisible, setMenuVisible] = useState(false);

  const progress = target > 0 ? count / target : 0;
  const ringColor = done ? theme.done : inProgress ? theme.pending : theme.border;
  const loggable = !done && !actionDisabled;
  const undoable = done;

  const handlePressRow = () => {
    triggerLightHaptic();
    onPressAction();
  };

  const confirmDelete = () => {
    setMenuVisible(false);
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
          onPress={() => {
            swipeableRef.current?.close();
            onResetToday();
          }}
        >
          <Text style={styles.actionText}>{t('habitRow.resetToday')}</Text>
        </TouchableOpacity>
      ) : null}
      <TouchableOpacity
        style={[styles.actionButton, styles.historyAction]}
        onPress={() => {
          swipeableRef.current?.close();
          onViewHistory();
        }}
      >
        <Text style={styles.actionText}>{t('habitRow.history')}</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.actionButton, styles.editAction]}
        onPress={() => {
          swipeableRef.current?.close();
          onEdit();
        }}
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
      <View style={[styles.iconBadge, done && styles.iconBadgeDone]}>
        {renderHabitVectorIcon(habit.habit_type, done ? theme.done : theme.primary, 15)}
      </View>
      <View style={styles.info}>
        <Text style={[styles.name, done && styles.nameDone]} numberOfLines={1}>
          {habit.title}
        </Text>
        <Text style={styles.subtitle} numberOfLines={1}>
          {subtitle}
        </Text>
      </View>
      {done ? (
        <View style={styles.checkWrap}>
          <Feather name="check" size={15} color={theme.done} />
        </View>
      ) : null}
    </>
  );

  return (
    <>
      <Swipeable ref={swipeableRef} renderRightActions={renderRightActions} overshootRight={false}>
        <View style={styles.row}>
          {loggable || undoable ? (
            <TouchableOpacity
              style={styles.rowContent}
              onPress={handlePressRow}
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
          <TouchableOpacity
            style={styles.moreBtn}
            onPress={() => {
              triggerLightHaptic();
              setMenuVisible(true);
            }}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            accessibilityLabel={`${habit.title} options`}
          >
            <Feather name="more-horizontal" size={18} color={theme.textMuted} />
          </TouchableOpacity>
        </View>
      </Swipeable>

      <Modal
        visible={menuVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setMenuVisible(false)}
      >
        <Pressable style={styles.modalBackdrop} onPress={() => setMenuVisible(false)}>
          <Pressable style={styles.modalSheet} onPress={(e) => e.stopPropagation()}>
            <View style={styles.modalHeader}>
              <View style={[styles.iconBadge, done && styles.iconBadgeDone]}>
                {renderHabitVectorIcon(habit.habit_type, done ? theme.done : theme.primary, 16)}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.modalTitle} numberOfLines={1}>
                  {habit.title}
                </Text>
                <Text style={styles.modalSub} numberOfLines={1}>
                  {subtitle}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setMenuVisible(false)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Feather name="x" size={18} color={theme.textMuted} />
              </TouchableOpacity>
            </View>

            <View style={styles.menuList}>
              {!done && !actionDisabled ? (
                <TouchableOpacity
                  style={styles.menuItem}
                  onPress={() => {
                    setMenuVisible(false);
                    triggerLightHaptic();
                    onPressAction();
                  }}
                >
                  <Feather name="check-circle" size={17} color={theme.done} />
                  <Text style={styles.menuItemText}>
                    {target > 1 && count < target - 1
                      ? `${t('common.done') || 'Mark as Done'} (+1)`
                      : t('common.done') || 'Mark as Done'}
                  </Text>
                </TouchableOpacity>
              ) : null}

              {count > 0 && target > 1 && onUndoOne ? (
                <TouchableOpacity
                  style={styles.menuItem}
                  onPress={() => {
                    setMenuVisible(false);
                    triggerLightHaptic();
                    onUndoOne();
                  }}
                >
                  <Feather name="minus-circle" size={17} color={theme.pending} />
                  <Text style={styles.menuItemText}>
                    {t('habitRow.undoOne') || 'Undo (-1)'}
                  </Text>
                </TouchableOpacity>
              ) : null}

              {count > 0 && onResetToday ? (
                <TouchableOpacity
                  style={styles.menuItem}
                  onPress={() => {
                    setMenuVisible(false);
                    triggerLightHaptic();
                    onResetToday();
                  }}
                >
                  <Feather name="rotate-ccw" size={17} color="#D97706" />
                  <Text style={styles.menuItemText}>
                    {t('habitRow.resetToZero') || 'Reset to 0'}
                  </Text>
                </TouchableOpacity>
              ) : null}

              <TouchableOpacity
                style={styles.menuItem}
                onPress={() => {
                  setMenuVisible(false);
                  onViewHistory();
                }}
              >
                <Feather name="clock" size={17} color={theme.primary} />
                <Text style={styles.menuItemText}>{t('habitRow.history')}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.menuItem}
                onPress={() => {
                  setMenuVisible(false);
                  onEdit();
                }}
              >
                <Feather name="edit-2" size={17} color={theme.textDark} />
                <Text style={styles.menuItemText}>{t('common.edit')}</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.menuItem} onPress={confirmDelete}>
                <Feather name="trash-2" size={17} color={theme.allergenText} />
                <Text style={[styles.menuItemText, { color: theme.allergenText }]}>
                  {t('common.delete')}
                </Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

function makeStyles(theme: ThemeTokens, isDarkMode: boolean) {
  return StyleSheet.create({
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 8,
      backgroundColor: theme.surface,
    },
    rowContent: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 9,
    },
    iconBadge: {
      width: 28,
      height: 28,
      borderRadius: 9,
      backgroundColor: theme.primaryLight,
      alignItems: 'center',
      justifyContent: 'center',
    },
    iconBadgeDone: {
      backgroundColor: isDarkMode ? '#1B2721' : '#EAF3ED',
    },
    info: {
      flex: 1,
      minWidth: 0,
    },
    name: {
      fontSize: 14,
      fontWeight: '600',
      color: theme.textDark,
    },
    nameDone: {
      color: theme.textMuted,
    },
    subtitle: {
      fontSize: 12,
      color: theme.textMuted,
      marginTop: 1,
    },
    checkWrap: {
      width: 22,
      height: 22,
      borderRadius: 11,
      backgroundColor: isDarkMode ? '#1B2721' : '#EAF3ED',
      alignItems: 'center',
      justifyContent: 'center',
    },
    moreBtn: {
      paddingLeft: 8,
      paddingRight: 2,
      paddingVertical: 4,
      alignItems: 'center',
      justifyContent: 'center',
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
      fontSize: 13,
      fontWeight: '600',
    },
    modalBackdrop: {
      flex: 1,
      backgroundColor: isDarkMode ? 'rgba(0,0,0,0.75)' : 'rgba(0,0,0,0.45)',
      justifyContent: 'flex-end',
    },
    modalSheet: {
      backgroundColor: theme.surface,
      borderTopLeftRadius: 22,
      borderTopRightRadius: 22,
      paddingHorizontal: 20,
      paddingTop: 18,
      paddingBottom: 30,
      borderTopWidth: 1,
      borderColor: theme.border,
    },
    modalHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      paddingBottom: 14,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
      marginBottom: 8,
    },
    modalTitle: {
      fontSize: 16,
      fontWeight: '700',
      color: theme.textDark,
    },
    modalSub: {
      fontSize: 12,
      color: theme.textMuted,
      marginTop: 2,
    },
    menuList: {
      gap: 2,
    },
    menuItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      paddingVertical: 12,
      paddingHorizontal: 6,
      borderRadius: 10,
    },
    menuItemText: {
      fontSize: 15,
      fontWeight: '600',
      color: theme.textDark,
    },
  });
}
