import React, { useEffect, useMemo, useRef, useState } from 'react';
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
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../lib/ThemeContext';
import { useT } from '../lib/LanguageContext';
import { ThemeTokens } from '../lib/themes';
import { triggerLightHaptic } from '../lib/haptics';

type Props = {
  visible: boolean;
  onClose: () => void;
  onSave: (amountMl: number, notes: string | null) => Promise<void>;
};

const SHEET_HEIGHT = Math.round(Dimensions.get('window').height * 0.42);
const DISMISS_THRESHOLD = 100;

export default function WaterLogSheet({ visible, onClose, onSave }: Props) {
  const { theme, isDarkMode } = useTheme();
  const { t } = useT();
  const styles = useMemo(() => makeStyles(theme, isDarkMode), [theme, isDarkMode]);
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
          Animated.timing(translateY, {
            toValue: SHEET_HEIGHT,
            duration: 150,
            useNativeDriver: true,
          }).start(() => onClose());
        } else {
          Animated.spring(translateY, { toValue: 0, useNativeDriver: true, bounciness: 4 }).start();
        }
      },
    })
  ).current;

  async function handleSave() {
    const parsed = parseInt(amountText, 10);
    if (Number.isNaN(parsed) || parsed < 1) {
      setError(t('water.amountError'));
      return;
    }
    triggerLightHaptic();
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

          <View style={styles.headerRow}>
            <View style={styles.iconBadge}>
              <Ionicons name="water-outline" size={18} color={theme.primary} />
            </View>
            <Text style={styles.title}>{t('water.logTitle')}</Text>
          </View>
          {error ? <Text style={styles.error}>{error}</Text> : null}

          <TextInput
            style={styles.input}
            placeholder={t('water.amountMl')}
            placeholderTextColor={theme.textMuted}
            value={amountText}
            onChangeText={setAmountText}
            keyboardType="number-pad"
            autoFocus
          />
          <TextInput
            style={styles.input}
            placeholder={t('water.notesOptional')}
            placeholderTextColor={theme.textMuted}
            value={notes}
            onChangeText={setNotes}
          />

          <TouchableOpacity style={styles.button} onPress={handleSave} disabled={loading}>
            {loading ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text style={styles.buttonText}>{t('common.save')}</Text>
            )}
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
      backgroundColor: isDarkMode ? 'rgba(0,0,0,0.75)' : 'rgba(0,0,0,0.45)',
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
      paddingBottom: 32,
      borderTopWidth: 1,
      borderColor: theme.border,
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
    headerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      marginBottom: 14,
    },
    iconBadge: {
      width: 34,
      height: 34,
      borderRadius: 11,
      backgroundColor: theme.primaryLight,
      alignItems: 'center',
      justifyContent: 'center',
    },
    title: {
      fontSize: 18,
      fontWeight: '700',
      color: theme.textDark,
    },
    error: {
      color: theme.allergenText,
      fontSize: 13,
      marginBottom: 10,
    },
    input: {
      backgroundColor: theme.surfaceAlt,
      borderRadius: 14,
      padding: 14,
      fontSize: 15,
      color: theme.textDark,
      marginBottom: 10,
      borderWidth: 1,
      borderColor: theme.border,
    },
    button: {
      backgroundColor: theme.primary,
      borderRadius: 14,
      padding: 16,
      alignItems: 'center',
      marginTop: 6,
    },
    buttonText: {
      color: '#FFFFFF',
      fontSize: 16,
      fontWeight: '700',
    },
  });
}
