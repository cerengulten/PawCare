import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  Animated,
  PanResponder,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  StyleSheet,
  Dimensions,
} from 'react-native';
import DateTimePicker, {
  DateTimePickerAndroid,
  DateTimePickerEvent,
} from '@react-native-community/datetimepicker';
import { useTheme } from '../lib/ThemeContext';
import { useT } from '../lib/LanguageContext';
import { ThemeTokens } from '../lib/themes';
import { CycleSpecies } from '../types';
import { cycleStartTip } from '../lib/cycleLogic';
import { longDate } from '../lib/i18n/calendar';
import { toLocalDateString } from '../lib/dateUtils';

type Props = {
  visible: boolean;
  species: CycleSpecies;
  onClose: () => void;
  onSave: (startDate: Date, notes: string | null) => Promise<void>;
};

const SHEET_HEIGHT = Math.round(Dimensions.get('window').height * 0.65);
const DISMISS_THRESHOLD = 100;

function toDateOnlyString(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export default function CycleStartSheet({ visible, species, onClose, onSave }: Props) {
  const { theme, isDarkMode } = useTheme();
  const { t } = useT();
  const styles = useMemo(() => makeStyles(theme, isDarkMode), [theme, isDarkMode]);
  const [startDate, setStartDate] = useState(new Date());
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [showIOSPicker, setShowIOSPicker] = useState(false);

  const translateY = useRef(new Animated.Value(SHEET_HEIGHT)).current;

  useEffect(() => {
    if (visible) {
      setStartDate(new Date());
      setNotes('');
      setShowIOSPicker(false);
      translateY.setValue(SHEET_HEIGHT);
      Animated.spring(translateY, { toValue: 0, useNativeDriver: true, bounciness: 4 }).start();
    }
  }, [visible]);

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gesture) => gesture.dy > 6,
      onPanResponderMove: (_, gesture) => {
        if (gesture.dy > 0) translateY.setValue(gesture.dy);
      },
      onPanResponderRelease: (_, gesture) => {
        if (gesture.dy > DISMISS_THRESHOLD) {
          Animated.timing(translateY, { toValue: SHEET_HEIGHT, duration: 150, useNativeDriver: true })
            .start(() => onClose());
        } else {
          Animated.spring(translateY, { toValue: 0, useNativeDriver: true, bounciness: 4 }).start();
        }
      },
    })
  ).current;

  const todayStr = toLocalDateString(new Date());
  const yesterdayObj = new Date();
  yesterdayObj.setDate(yesterdayObj.getDate() - 1);
  const yesterdayStr = toLocalDateString(yesterdayObj);
  const currentSelectedStr = toDateOnlyString(startDate);

  const isToday = currentSelectedStr === todayStr;
  const isYesterday = currentSelectedStr === yesterdayStr;
  const isCustom = !isToday && !isYesterday;

  function selectToday() {
    setStartDate(new Date());
    setShowIOSPicker(false);
  }

  function selectYesterday() {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    setStartDate(d);
    setShowIOSPicker(false);
  }

  function openDatePicker() {
    if (Platform.OS === 'android') {
      DateTimePickerAndroid.open({
        value: startDate,
        mode: 'date',
        maximumDate: new Date(),
        onChange: (_event: DateTimePickerEvent, selected?: Date) => {
          if (selected) setStartDate(selected);
        },
      });
    } else {
      setShowIOSPicker(prev => !prev);
    }
  }

  async function handleSave() {
    setLoading(true);
    await onSave(startDate, notes.trim() || null);
    setLoading(false);
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.backdrop} />
      </TouchableWithoutFeedback>

      <KeyboardAvoidingView
        style={styles.sheetWrapper}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        pointerEvents="box-none"
      >
        <Animated.View style={[styles.sheet, { transform: [{ translateY }] }]}>
          <View {...panResponder.panHandlers} style={styles.handleArea}>
            <View style={styles.handle} />
          </View>

          <View style={styles.headerRow}>
            <View style={styles.iconCircle}>
              <Text style={styles.headerEmoji}>🌸</Text>
            </View>
            <View style={styles.headerTextGroup}>
              <Text style={styles.title}>{t('cycle.startSheetTitle')}</Text>
              <Text style={styles.subtitle}>
                {t('cycle.startDateLabel')}
              </Text>
            </View>
          </View>

          <View style={styles.presetRow}>
            <TouchableOpacity
              style={[styles.presetChip, isToday && styles.presetChipActive]}
              onPress={selectToday}
              activeOpacity={0.7}
            >
              <Text style={[styles.presetChipText, isToday && styles.presetChipTextActive]}>
                {t('mealHistory.today')}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.presetChip, isYesterday && styles.presetChipActive]}
              onPress={selectYesterday}
              activeOpacity={0.7}
            >
              <Text style={[styles.presetChipText, isYesterday && styles.presetChipTextActive]}>
                {t('mealHistory.yesterday')}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.presetChip, isCustom && styles.presetChipActive]}
              onPress={() => {
                if (Platform.OS === 'android') {
                  openDatePicker();
                } else {
                  setShowIOSPicker(true);
                }
              }}
              activeOpacity={0.7}
            >
              <Text style={[styles.presetChipText, isCustom && styles.presetChipTextActive]}>
                📅 {t('common.edit')}
              </Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={styles.dateDisplayCard}
            onPress={openDatePicker}
            activeOpacity={0.8}
          >
            <View style={styles.dateDisplayLeft}>
              <Text style={styles.dateDisplayLabel}>{t('cycle.startDateLabel')}</Text>
              <Text style={styles.dateDisplayValue}>
                {longDate(currentSelectedStr)}
              </Text>
            </View>
            <View style={styles.dateActionPill}>
              <Text style={styles.dateActionText}>
                {Platform.OS === 'ios' && showIOSPicker ? '▲' : '▼'}
              </Text>
            </View>
          </TouchableOpacity>

          {Platform.OS === 'ios' && showIOSPicker ? (
            <View style={styles.iosPickerContainer}>
              <DateTimePicker
                value={startDate}
                mode="date"
                display="inline"
                themeVariant={isDarkMode ? 'dark' : 'light'}
                accentColor={theme.primary}
                maximumDate={new Date()}
                onChange={(_e: DateTimePickerEvent, selected?: Date) => {
                  if (selected) setStartDate(selected);
                }}
              />
            </View>
          ) : null}

          <TextInput
            style={styles.input}
            placeholder={t('tracker.notesOptional')}
            placeholderTextColor={theme.textMuted}
            value={notes}
            onChangeText={setNotes}
            multiline
          />

          <View style={styles.tipCard}>
            <Text style={styles.tipText}>💡 {cycleStartTip(species)}</Text>
          </View>

          <TouchableOpacity style={styles.button} onPress={handleSave} disabled={loading} activeOpacity={0.85}>
            {loading ? <ActivityIndicator color="white" /> : <Text style={styles.buttonText}>{t('cycle.startSheetButton')}</Text>}
          </TouchableOpacity>
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function makeStyles(theme: ThemeTokens, isDarkMode = false) {
  return StyleSheet.create({
    backdrop: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: 'rgba(0,0,0,0.45)',
    },
    sheetWrapper: {
      flex: 1,
      justifyContent: 'flex-end',
    },
    sheet: {
      backgroundColor: theme.surface,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      padding: 20,
      paddingBottom: Platform.OS === 'ios' ? 36 : 24,
      borderTopWidth: 1,
      borderColor: theme.border,
      maxHeight: Dimensions.get('window').height * 0.85,
    },
    handleArea: {
      alignItems: 'center',
      paddingBottom: 12,
    },
    handle: {
      width: 40,
      height: 4,
      borderRadius: 2,
      backgroundColor: theme.border,
    },
    headerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      marginBottom: 16,
    },
    iconCircle: {
      width: 42,
      height: 42,
      borderRadius: 21,
      backgroundColor: theme.moodSelBg,
      alignItems: 'center',
      justifyContent: 'center',
    },
    headerEmoji: {
      fontSize: 22,
    },
    headerTextGroup: {
      flex: 1,
    },
    title: {
      fontSize: 18,
      fontWeight: '700',
      color: theme.textDark,
    },
    subtitle: {
      fontSize: 12,
      color: theme.textMuted,
      marginTop: 2,
    },
    presetRow: {
      flexDirection: 'row',
      gap: 8,
      marginBottom: 12,
    },
    presetChip: {
      flex: 1,
      paddingVertical: 10,
      borderRadius: theme.radiiCard,
      backgroundColor: theme.background,
      borderWidth: 1,
      borderColor: theme.border,
      alignItems: 'center',
      justifyContent: 'center',
    },
    presetChipActive: {
      backgroundColor: theme.moodSelBg,
      borderColor: theme.primary,
    },
    presetChipText: {
      fontSize: 13,
      fontWeight: '500',
      color: theme.textDark,
    },
    presetChipTextActive: {
      color: theme.primary,
      fontWeight: '700',
    },
    dateDisplayCard: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: theme.background,
      borderRadius: theme.radiiCard,
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderWidth: 1,
      borderColor: theme.border,
      marginBottom: 12,
    },
    dateDisplayLeft: {
      flex: 1,
    },
    dateDisplayLabel: {
      fontSize: 11,
      fontWeight: '600',
      color: theme.textMuted,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
      marginBottom: 2,
    },
    dateDisplayValue: {
      fontSize: 16,
      fontWeight: '600',
      color: theme.textDark,
    },
    dateActionPill: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: theme.surface,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: theme.border,
    },
    dateActionText: {
      fontSize: 12,
      color: theme.primary,
      fontWeight: '600',
    },
    iosPickerContainer: {
      backgroundColor: isDarkMode ? '#221B26' : '#FFFFFF',
      borderRadius: theme.radiiCard,
      padding: 8,
      marginBottom: 12,
      borderWidth: 1,
      borderColor: theme.border,
    },
    input: {
      backgroundColor: theme.background,
      borderRadius: theme.radiiCard,
      padding: 14,
      fontSize: 14,
      color: theme.textDark,
      marginBottom: 12,
      borderWidth: 1,
      borderColor: theme.border,
      minHeight: 48,
    },
    tipCard: {
      backgroundColor: theme.moodSelBg,
      borderRadius: theme.radiiCard,
      padding: 12,
      marginBottom: 16,
      borderWidth: 0.5,
      borderColor: theme.primary,
    },
    tipText: {
      fontSize: 12,
      color: theme.primary,
      lineHeight: 17,
    },
    button: {
      backgroundColor: theme.primary,
      borderRadius: theme.radiiCard,
      paddingVertical: 16,
      alignItems: 'center',
      justifyContent: 'center',
    },
    buttonText: {
      color: 'white',
      fontSize: 16,
      fontWeight: '600',
    },
  });
}
