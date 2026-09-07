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
import { useTheme } from '../lib/ThemeContext';
import { ThemeTokens } from '../lib/themes';

type Props = {
  visible: boolean;
  onClose: () => void;
  onSave: (amountMl: number, notes: string | null) => Promise<void>;
};

const SHEET_HEIGHT = Math.round(Dimensions.get('window').height * 0.4);
const DISMISS_THRESHOLD = 100;

export default function WaterLogSheet({ visible, onClose, onSave }: Props) {
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const [amountText, setAmountText] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const translateY = useRef(new Animated.Value(SHEET_HEIGHT)).current;

  useEffect(() => {
    if (visible) {
      setAmountText('');
      setNotes('');
      setError('');
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

  async function handleSave() {
    const parsed = parseInt(amountText, 10);
    if (Number.isNaN(parsed) || parsed < 1) {
      setError('Amount must be a number of 1 or more.');
      return;
    }
    setLoading(true);
    setError('');
    await onSave(parsed, notes.trim() || null);
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

          <Text style={styles.title}>Log water</Text>
          {error ? <Text style={styles.error}>{error}</Text> : null}

          <TextInput
            style={styles.input}
            placeholder="Amount (ml)"
            placeholderTextColor={theme.textMuted}
            value={amountText}
            onChangeText={setAmountText}
            keyboardType="number-pad"
            autoFocus
          />
          <TextInput
            style={styles.input}
            placeholder="Notes (optional)"
            placeholderTextColor={theme.textMuted}
            value={notes}
            onChangeText={setNotes}
          />

          <TouchableOpacity style={styles.button} onPress={handleSave} disabled={loading}>
            {loading ? <ActivityIndicator color="white" /> : <Text style={styles.buttonText}>Save</Text>}
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
    error: {
      color: theme.allergenText,
      fontSize: 13,
      marginBottom: 10,
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
      marginTop: 6,
    },
    buttonText: {
      color: 'white',
      fontSize: 16,
      fontWeight: '600',
    },
  });
}
