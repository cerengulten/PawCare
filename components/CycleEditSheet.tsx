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
  Alert,
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
import { CycleRecord } from '../types';

type Props = {
  visible: boolean;
  cycle: CycleRecord | null;
  // Defaults to true (closed-cycle editing). When false — editing the still-open/active
  // cycle — the End Date field is hidden entirely and `onSave` is called with `endDate:
  // null`, meaning "leave it alone"; ending a cycle is a deliberate separate action
  // ("End cycle"), not something this sheet should do as a side effect of a date edit.
  allowEndDate?: boolean;
  onClose: () => void;
  onSave: (startDate: Date, endDate: Date | null, notes: string | null) => Promise<void>;
  onDelete: () => void;
};

const SHEET_HEIGHT = Math.round(Dimensions.get('window').height * 0.55);
const DISMISS_THRESHOLD = 100;

function toDateOnlyString(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function parseDateOnly(s: string): Date {
  const [y, m, day] = s.split('-').map(Number);
  return new Date(y, m - 1, day);
}

export default function CycleEditSheet({ visible, cycle, allowEndDate = true, onClose, onSave, onDelete }: Props) {
  const { theme, isDarkMode } = useTheme();
  const { t } = useT();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const [startDate, setStartDate] = useState(new Date());
  const [endDate, setEndDate] = useState(new Date());
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);

  const translateY = useRef(new Animated.Value(SHEET_HEIGHT)).current;

  useEffect(() => {
    if (visible && cycle) {
      setStartDate(parseDateOnly(cycle.start_date));
      setEndDate(cycle.end_date ? parseDateOnly(cycle.end_date) : new Date());
      setNotes(cycle.notes ?? '');
      translateY.setValue(SHEET_HEIGHT);
      Animated.spring(translateY, { toValue: 0, useNativeDriver: true, bounciness: 4 }).start();
    }
  }, [visible, cycle]);

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gesture) => gesture.dy > 4,
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

  function openAndroidStartPicker() {
    DateTimePickerAndroid.open({
      value: startDate,
      mode: 'date',
      maximumDate: new Date(),
      onChange: (_event: DateTimePickerEvent, selected?: Date) => {
        if (selected) setStartDate(selected);
      },
    });
  }

  function openAndroidEndPicker() {
    DateTimePickerAndroid.open({
      value: endDate,
      mode: 'date',
      maximumDate: new Date(),
      onChange: (_event: DateTimePickerEvent, selected?: Date) => {
        if (selected) setEndDate(selected);
      },
    });
  }

  async function handleSave() {
    setLoading(true);
    await onSave(startDate, allowEndDate ? endDate : null, notes.trim() || null);
    setLoading(false);
  }

  function handleDelete() {
    Alert.alert(t('cycle.deleteCycleTitle'), t('cycle.deleteCycleMessage'), [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('common.delete'), style: 'destructive', onPress: onDelete },
    ]);
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

          <Text style={styles.title}>{t('cycle.editSheetTitle')}</Text>

          <Text style={styles.fieldLabel}>{t('cycle.startDateLabel')}</Text>
          {Platform.OS === 'ios' ? (
            <View style={styles.dateFieldRow}>
              <Text style={styles.inputText}>{toDateOnlyString(startDate)}</Text>
              <DateTimePicker
                value={startDate}
                mode="date"
                display="compact"
                themeVariant={isDarkMode ? 'dark' : 'light'}
                accentColor={theme.primary}
                maximumDate={new Date()}
                onChange={(_e: DateTimePickerEvent, selected?: Date) => {
                  if (selected) setStartDate(selected);
                }}
              />
            </View>
          ) : (
            <TouchableOpacity style={styles.dateFieldRow} onPress={openAndroidStartPicker}>
              <Text style={styles.inputText}>{toDateOnlyString(startDate)}</Text>
            </TouchableOpacity>
          )}

          {allowEndDate ? (
            <>
              <Text style={styles.fieldLabel}>{t('cycle.endDateLabel')}</Text>
              {Platform.OS === 'ios' ? (
                <View style={styles.dateFieldRow}>
                  <Text style={styles.inputText}>{toDateOnlyString(endDate)}</Text>
                  <DateTimePicker
                    value={endDate}
                    mode="date"
                    display="compact"
                    themeVariant={isDarkMode ? 'dark' : 'light'}
                    accentColor={theme.primary}
                    maximumDate={new Date()}
                    onChange={(_e: DateTimePickerEvent, selected?: Date) => {
                      if (selected) setEndDate(selected);
                    }}
                  />
                </View>
              ) : (
                <TouchableOpacity style={styles.dateFieldRow} onPress={openAndroidEndPicker}>
                  <Text style={styles.inputText}>{toDateOnlyString(endDate)}</Text>
                </TouchableOpacity>
              )}
            </>
          ) : null}

          <TextInput
            style={styles.input}
            placeholder={t('tracker.notesOptional')}
            placeholderTextColor={theme.textMuted}
            value={notes}
            onChangeText={setNotes}
          />

          <TouchableOpacity style={styles.button} onPress={handleSave} disabled={loading}>
            {loading ? <ActivityIndicator color="white" /> : <Text style={styles.buttonText}>{t('common.save')}</Text>}
          </TouchableOpacity>

          <TouchableOpacity onPress={handleDelete} style={styles.deleteRow}>
            <Text style={styles.deleteText}>{t('cycle.deleteCycle')}</Text>
          </TouchableOpacity>
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function makeStyles(theme: ThemeTokens) {
  return StyleSheet.create({
    backdrop: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: 'rgba(0,0,0,0.35)',
    },
    sheetWrapper: {
      flex: 1,
      justifyContent: 'flex-end',
    },
    sheet: {
      backgroundColor: theme.surface,
      borderTopLeftRadius: theme.radiiCard,
      borderTopRightRadius: theme.radiiCard,
      padding: 20,
      paddingBottom: 32,
    },
    handleArea: {
      alignItems: 'center',
      paddingBottom: 12,
    },
    handle: {
      width: 36,
      height: 4,
      borderRadius: 2,
      backgroundColor: theme.border,
    },
    title: {
      fontSize: 18,
      fontWeight: '700',
      color: theme.textDark,
      marginBottom: 12,
    },
    fieldLabel: {
      fontSize: 12,
      fontWeight: '600',
      color: theme.textMuted,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
      marginBottom: 6,
    },
    dateFieldRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: theme.background,
      borderRadius: theme.radiiCard,
      padding: 14,
      marginBottom: 10,
      borderWidth: 1,
      borderColor: theme.border,
    },
    inputText: {
      fontSize: 15,
      color: theme.textDark,
    },
    input: {
      backgroundColor: theme.background,
      borderRadius: theme.radiiCard,
      padding: 14,
      fontSize: 15,
      color: theme.textDark,
      marginBottom: 10,
      borderWidth: 1,
      borderColor: theme.border,
    },
    button: {
      backgroundColor: theme.primary,
      borderRadius: theme.radiiCard,
      padding: 16,
      alignItems: 'center',
      marginTop: 4,
    },
    buttonText: {
      color: 'white',
      fontSize: 16,
      fontWeight: '600',
    },
    deleteRow: {
      alignItems: 'center',
      marginTop: 14,
    },
    deleteText: {
      fontSize: 13,
      fontWeight: '600',
      color: theme.allergenText,
    },
  });
}
