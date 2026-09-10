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
  ScrollView,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { useTheme } from '../lib/ThemeContext';
import { useT } from '../lib/LanguageContext';
import { ThemeTokens } from '../lib/themes';
import { CycleSpecies, CycleIntensity, CycleSymptom } from '../types';
import { SYMPTOMS_BY_SPECIES, symptomLabel } from '../lib/cycleLogic';

type Props = {
  visible: boolean;
  species: CycleSpecies;
  dogName: string;
  dayOfCycle: number | null;
  initial: CycleSymptom | null;
  onClose: () => void;
  onSave: (symptoms: string[], intensity: CycleIntensity | null, notes: string | null) => Promise<{ error: Error | null }>;
};

const INTENSITY_OPTIONS: CycleIntensity[] = ['mild', 'moderate', 'severe'];

const SHEET_HEIGHT = Math.round(Dimensions.get('window').height * 0.7);
const DISMISS_THRESHOLD = 100;

export default function SymptomLogSheet({ visible, species, dogName, dayOfCycle, initial, onClose, onSave }: Props) {
  const { theme } = useTheme();
  const { t } = useT();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const [selectedSymptoms, setSelectedSymptoms] = useState<string[]>(initial?.symptoms ?? []);
  const [intensity, setIntensity] = useState<CycleIntensity | null>(initial?.intensity ?? null);
  const [notes, setNotes] = useState(initial?.notes ?? '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const translateY = useRef(new Animated.Value(SHEET_HEIGHT)).current;

  useEffect(() => {
    if (visible) {
      setSelectedSymptoms(initial?.symptoms ?? []);
      setIntensity(initial?.intensity ?? null);
      setNotes(initial?.notes ?? '');
      setError('');
      translateY.setValue(SHEET_HEIGHT);
      Animated.spring(translateY, { toValue: 0, useNativeDriver: true, bounciness: 4 }).start();
    }
  }, [visible, initial]);

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

  function toggleSymptom(key: string) {
    setSelectedSymptoms(prev => (prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]));
  }

  async function handleSave() {
    if (selectedSymptoms.length === 0) {
      setError(t('cycle.selectAtLeastOne'));
      return;
    }
    setLoading(true);
    setError('');
    const { error } = await onSave(selectedSymptoms, intensity, notes.trim() || null);
    setLoading(false);
    if (error) setError(error.message);
  }

  const symptomKeys = SYMPTOMS_BY_SPECIES[species];

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

          <Text style={styles.title}>
            {dayOfCycle != null
              ? t('cycle.symptomSheetTitleDay', { name: dogName, day: dayOfCycle })
              : t('cycle.symptomSheetTitle', { name: dogName })}
          </Text>
          {error ? <Text style={styles.error}>{error}</Text> : null}

          <ScrollView showsVerticalScrollIndicator={false}>
            <Text style={styles.fieldLabel}>{t('cycle.symptomsField')}</Text>
            <View style={styles.chipGrid}>
              {symptomKeys.map(key => {
                const selected = selectedSymptoms.includes(key);
                return (
                  <TouchableOpacity
                    key={key}
                    style={[styles.chipBtn, selected && styles.chipBtnSelected]}
                    onPress={() => toggleSymptom(key)}
                  >
                    <Text style={styles.chipBtnLabel}>{symptomLabel(key)}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <Text style={styles.fieldLabel}>{t('cycle.intensityField')}</Text>
            <View style={styles.chipGrid}>
              {INTENSITY_OPTIONS.map(opt => {
                const selected = intensity === opt;
                return (
                  <TouchableOpacity
                    key={opt}
                    style={[styles.chipBtn, selected && styles.chipBtnSelected]}
                    onPress={() => setIntensity(opt)}
                  >
                    <Text style={styles.chipBtnLabel}>{t('cycle.intensity.' + opt)}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <TextInput
              style={styles.input}
              placeholder={t('tracker.notesOptional')}
              placeholderTextColor={theme.textMuted}
              value={notes}
              onChangeText={setNotes}
            />
          </ScrollView>

          <TouchableOpacity style={styles.button} onPress={handleSave} disabled={loading}>
            {loading ? <ActivityIndicator color="white" /> : <Text style={styles.buttonText}>{t('common.save')}</Text>}
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
      maxHeight: SHEET_HEIGHT,
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
    fieldLabel: {
      fontSize: 12,
      fontWeight: '600',
      color: theme.textMuted,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
      marginBottom: 8,
      marginTop: 8,
    },
    chipGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      marginBottom: 4,
    },
    chipBtn: {
      paddingVertical: 10,
      paddingHorizontal: 14,
      borderRadius: 12,
      backgroundColor: theme.background,
      borderWidth: 1,
      borderColor: theme.border,
      marginRight: 8,
      marginBottom: 8,
    },
    chipBtnSelected: {
      backgroundColor: theme.moodSelBg,
      borderColor: theme.moodSelBorder,
    },
    chipBtnLabel: {
      fontSize: 13,
      fontWeight: '600',
      color: theme.textDark,
    },
    input: {
      backgroundColor: theme.background,
      borderRadius: theme.radiiCard,
      padding: 14,
      fontSize: 15,
      color: theme.textDark,
      marginTop: 8,
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
  });
}
