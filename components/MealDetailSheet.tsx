import { useEffect, useRef, useState } from 'react';
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
import { MealDetail, FoodType } from '../types';
import { colors, radii } from '../lib/theme';

type SavePayload = {
  food_type: FoodType;
  wet_amount_grams: number | null;
  brand_wet: string | null;
  dry_amount_grams: number | null;
  brand_dry: string | null;
  raw_amount_grams: number | null;
  brand_raw: string | null;
  notes: string | null;
};

type Props = {
  visible: boolean;
  initial: MealDetail | null;
  onClose: () => void;
  onSave: (details: SavePayload) => Promise<{ error: Error | null }>;
};

const FOOD_TYPE_OPTIONS: { value: FoodType; label: string }[] = [
  { value: 'wet', label: 'Wet' },
  { value: 'dry', label: 'Dry' },
  { value: 'mixed', label: 'Mixed' },
  { value: 'raw', label: 'Raw' },
];

const SHEET_HEIGHT = Math.round(Dimensions.get('window').height * 0.6);
const DISMISS_THRESHOLD = 100;

function amountText(grams: number | null): string {
  return grams != null ? String(grams) : '';
}

function parseAmount(text: string): { value: number | null; error?: string } {
  if (!text.trim()) return { value: null };
  const parsed = parseInt(text, 10);
  if (Number.isNaN(parsed) || parsed < 1) return { value: null, error: 'Amount must be a number of 1 or more.' };
  return { value: parsed };
}

export default function MealDetailSheet({ visible, initial, onClose, onSave }: Props) {
  const [foodType, setFoodType] = useState<FoodType | null>(initial?.food_type ?? null);
  const [wetAmountText, setWetAmountText] = useState(amountText(initial?.wet_amount_grams ?? null));
  const [brandWet, setBrandWet] = useState(initial?.brand_wet ?? '');
  const [dryAmountText, setDryAmountText] = useState(amountText(initial?.dry_amount_grams ?? null));
  const [brandDry, setBrandDry] = useState(initial?.brand_dry ?? '');
  const [rawAmountText, setRawAmountText] = useState(amountText(initial?.raw_amount_grams ?? null));
  const [brandRaw, setBrandRaw] = useState(initial?.brand_raw ?? '');
  const [notes, setNotes] = useState(initial?.notes ?? '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const translateY = useRef(new Animated.Value(SHEET_HEIGHT)).current;

  useEffect(() => {
    if (visible) {
      setFoodType(initial?.food_type ?? null);
      setWetAmountText(amountText(initial?.wet_amount_grams ?? null));
      setBrandWet(initial?.brand_wet ?? '');
      setDryAmountText(amountText(initial?.dry_amount_grams ?? null));
      setBrandDry(initial?.brand_dry ?? '');
      setRawAmountText(amountText(initial?.raw_amount_grams ?? null));
      setBrandRaw(initial?.brand_raw ?? '');
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

  async function handleSave() {
    if (!foodType) {
      setError('Pick a food type.');
      return;
    }

    let wetAmount: number | null = null;
    let dryAmount: number | null = null;
    let rawAmount: number | null = null;

    if (foodType === 'wet' || foodType === 'mixed') {
      const r = parseAmount(wetAmountText);
      if (r.error) { setError(r.error); return; }
      wetAmount = r.value;
    }
    if (foodType === 'dry' || foodType === 'mixed') {
      const r = parseAmount(dryAmountText);
      if (r.error) { setError(r.error); return; }
      dryAmount = r.value;
    }
    if (foodType === 'raw') {
      const r = parseAmount(rawAmountText);
      if (r.error) { setError(r.error); return; }
      rawAmount = r.value;
    }

    setLoading(true);
    setError('');
    const { error } = await onSave({
      food_type: foodType,
      wet_amount_grams: wetAmount,
      brand_wet: (foodType === 'wet' || foodType === 'mixed') ? (brandWet.trim() || null) : null,
      dry_amount_grams: dryAmount,
      brand_dry: (foodType === 'dry' || foodType === 'mixed') ? (brandDry.trim() || null) : null,
      raw_amount_grams: rawAmount,
      brand_raw: foodType === 'raw' ? (brandRaw.trim() || null) : null,
      notes: notes.trim() || null,
    });
    setLoading(false);
    if (error) setError(error.message);
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

          <Text style={styles.title}>Meal detail</Text>
          {error ? <Text style={styles.error}>{error}</Text> : null}

          <Text style={styles.fieldLabel}>Food type</Text>
          <View style={styles.chipGrid}>
            {FOOD_TYPE_OPTIONS.map(opt => {
              const selected = foodType === opt.value;
              return (
                <TouchableOpacity
                  key={opt.value}
                  style={[styles.chipBtn, selected && styles.chipBtnSelected]}
                  onPress={() => setFoodType(opt.value)}
                >
                  <Text style={styles.chipBtnLabel}>{opt.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {foodType === 'wet' ? (
            <>
              <TextInput
                style={styles.input}
                placeholder="Amount (grams, optional)"
                placeholderTextColor={colors.textMuted}
                value={wetAmountText}
                onChangeText={setWetAmountText}
                keyboardType="number-pad"
              />
              <TextInput
                style={styles.input}
                placeholder="Brand (optional)"
                placeholderTextColor={colors.textMuted}
                value={brandWet}
                onChangeText={setBrandWet}
              />
            </>
          ) : null}

          {foodType === 'dry' ? (
            <>
              <TextInput
                style={styles.input}
                placeholder="Amount (grams, optional)"
                placeholderTextColor={colors.textMuted}
                value={dryAmountText}
                onChangeText={setDryAmountText}
                keyboardType="number-pad"
              />
              <TextInput
                style={styles.input}
                placeholder="Brand (optional)"
                placeholderTextColor={colors.textMuted}
                value={brandDry}
                onChangeText={setBrandDry}
              />
            </>
          ) : null}

          {foodType === 'raw' ? (
            <>
              <TextInput
                style={styles.input}
                placeholder="Amount (grams, optional)"
                placeholderTextColor={colors.textMuted}
                value={rawAmountText}
                onChangeText={setRawAmountText}
                keyboardType="number-pad"
              />
              <TextInput
                style={styles.input}
                placeholder="Brand (optional)"
                placeholderTextColor={colors.textMuted}
                value={brandRaw}
                onChangeText={setBrandRaw}
              />
            </>
          ) : null}

          {foodType === 'mixed' ? (
            <View style={styles.mixedRow}>
              <View style={styles.mixedColumn}>
                <Text style={styles.mixedColumnLabel}>Wet</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Grams"
                  placeholderTextColor={colors.textMuted}
                  value={wetAmountText}
                  onChangeText={setWetAmountText}
                  keyboardType="number-pad"
                />
                <TextInput
                  style={styles.input}
                  placeholder="Brand"
                  placeholderTextColor={colors.textMuted}
                  value={brandWet}
                  onChangeText={setBrandWet}
                />
              </View>
              <View style={styles.mixedColumn}>
                <Text style={styles.mixedColumnLabel}>Dry</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Grams"
                  placeholderTextColor={colors.textMuted}
                  value={dryAmountText}
                  onChangeText={setDryAmountText}
                  keyboardType="number-pad"
                />
                <TextInput
                  style={styles.input}
                  placeholder="Brand"
                  placeholderTextColor={colors.textMuted}
                  value={brandDry}
                  onChangeText={setBrandDry}
                />
              </View>
            </View>
          ) : null}

          <TextInput
            style={styles.input}
            placeholder="Notes (optional)"
            placeholderTextColor={colors.textMuted}
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

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  sheetWrapper: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.card,
    borderTopLeftRadius: radii.card,
    borderTopRightRadius: radii.card,
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
    backgroundColor: colors.cardBorder,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textDark,
    marginBottom: 12,
  },
  error: {
    color: colors.allergenText,
    fontSize: 13,
    marginBottom: 10,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  chipGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 12,
  },
  chipBtn: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    marginRight: 8,
    marginBottom: 8,
  },
  chipBtnSelected: {
    backgroundColor: colors.moodSelectedBg,
    borderColor: colors.moodSelectedBorder,
  },
  chipBtnLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textDark,
  },
  input: {
    backgroundColor: colors.background,
    borderRadius: radii.card,
    padding: 14,
    fontSize: 15,
    color: colors.textDark,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  mixedRow: {
    flexDirection: 'row',
    gap: 10,
  },
  mixedColumn: {
    flex: 1,
  },
  mixedColumnLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textMuted,
    marginBottom: 6,
  },
  button: {
    backgroundColor: colors.primaryGreen,
    borderRadius: radii.card,
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
