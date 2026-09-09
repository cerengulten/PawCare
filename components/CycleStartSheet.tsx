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
import { ThemeTokens } from '../lib/themes';
import { CycleSpecies } from '../types';
import { CYCLE_START_TIPS } from '../lib/cycleLogic';

type Props = {
  visible: boolean;
  species: CycleSpecies;
  onClose: () => void;
  onSave: (startDate: Date, notes: string | null) => Promise<void>;
};

const SHEET_HEIGHT = Math.round(Dimensions.get('window').height * 0.45);
const DISMISS_THRESHOLD = 100;

function toDateOnlyString(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export default function CycleStartSheet({ visible, species, onClose, onSave }: Props) {
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const [startDate, setStartDate] = useState(new Date());
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);

  const translateY = useRef(new Animated.Value(SHEET_HEIGHT)).current;

  useEffect(() => {
    if (visible) {
      setStartDate(new Date());
      setNotes('');
      translateY.setValue(SHEET_HEIGHT);
      Animated.spring(translateY, { toValue: 0, useNativeDriver: true, bounciness: 4 }).start();
    }
  }, [visible]);

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

  function openAndroidDatePicker() {
    DateTimePickerAndroid.open({
      value: startDate,
      mode: 'date',
      maximumDate: new Date(),
      onChange: (_event: DateTimePickerEvent, selected?: Date) => {
        if (selected) setStartDate(selected);
      },
    });
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

          <Text style={styles.title}>When did the cycle start?</Text>

          {Platform.OS === 'ios' ? (
            <View style={styles.dateFieldRow}>
              <Text style={styles.inputText}>{toDateOnlyString(startDate)}</Text>
              <DateTimePicker
                value={startDate}
                mode="date"
                display="compact"
                accentColor={theme.primary}
                maximumDate={new Date()}
                onChange={(_e: DateTimePickerEvent, selected?: Date) => {
                  if (selected) setStartDate(selected);
                }}
              />
            </View>
          ) : (
            <TouchableOpacity style={styles.dateFieldRow} onPress={openAndroidDatePicker}>
              <Text style={styles.inputText}>{toDateOnlyString(startDate)}</Text>
            </TouchableOpacity>
          )}

          <TextInput
            style={styles.input}
            placeholder="Notes (optional)"
            placeholderTextColor={theme.textMuted}
            value={notes}
            onChangeText={setNotes}
          />

          <Text style={styles.tip}>💡 {CYCLE_START_TIPS[species]}</Text>

          <TouchableOpacity style={styles.button} onPress={handleSave} disabled={loading}>
            {loading ? <ActivityIndicator color="white" /> : <Text style={styles.buttonText}>Start tracking</Text>}
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
    tip: {
      fontSize: 12,
      color: theme.textMuted,
      marginBottom: 16,
    },
    button: {
      backgroundColor: theme.primary,
      borderRadius: theme.radiiCard,
      padding: 16,
      alignItems: 'center',
    },
    buttonText: {
      color: 'white',
      fontSize: 16,
      fontWeight: '600',
    },
  });
}
