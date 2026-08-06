import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Allergen } from '../types';
import { useAllergens } from '../lib/hooks/useAllergens';
import { colors, radii } from '../lib/theme';

type UseAllergensReturn = ReturnType<typeof useAllergens>;

type Props = {
  allergen: Allergen | null;
  addAllergen: UseAllergensReturn['addAllergen'];
  updateAllergen: UseAllergensReturn['updateAllergen'];
  deleteAllergen: UseAllergensReturn['deleteAllergen'];
  onDone: () => void;
  onCancel: () => void;
};

export default function AllergenFormScreen({
  allergen,
  addAllergen,
  updateAllergen,
  deleteAllergen,
  onDone,
  onCancel,
}: Props) {
  const [name, setName] = useState(allergen?.allergen ?? '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSave() {
    const trimmed = name.trim();
    if (!trimmed) {
      setError('Allergen name is required.');
      return;
    }

    setLoading(true);
    setError('');

    const { error } = allergen
      ? await updateAllergen(allergen.id, trimmed)
      : await addAllergen(trimmed);

    setLoading(false);
    if (error) {
      setError(error.message);
      return;
    }
    onDone();
  }

  async function handleDelete() {
    if (!allergen) return;
    setLoading(true);
    const { error } = await deleteAllergen(allergen.id);
    setLoading(false);
    if (error) {
      setError(error.message);
      return;
    }
    onDone();
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.title}>{allergen ? 'Edit sensitivity' : 'Add sensitivity'}</Text>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <TextInput
          style={styles.input}
          placeholder="e.g. Chicken"
          placeholderTextColor={colors.textMuted}
          value={name}
          onChangeText={setName}
          autoFocus
        />

        <TouchableOpacity style={styles.button} onPress={handleSave} disabled={loading}>
          {loading ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text style={styles.buttonText}>Save</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity onPress={onCancel} style={styles.switchRow}>
          <Text style={styles.switchLink}>Cancel</Text>
        </TouchableOpacity>

        {allergen ? (
          <TouchableOpacity onPress={handleDelete} style={styles.switchRow} disabled={loading}>
            <Text style={styles.deleteLink}>Delete sensitivity</Text>
          </TouchableOpacity>
        ) : null}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    padding: 24,
    alignItems: 'center',
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: colors.textDark,
    marginBottom: 20,
  },
  error: {
    color: colors.allergenText,
    fontSize: 13,
    marginBottom: 12,
    textAlign: 'center',
  },
  input: {
    width: '100%',
    backgroundColor: colors.card,
    borderRadius: radii.card,
    padding: 16,
    fontSize: 15,
    color: colors.textDark,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  button: {
    width: '100%',
    backgroundColor: colors.primaryGreen,
    borderRadius: radii.card,
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  switchRow: {
    flexDirection: 'row',
    marginTop: 20,
  },
  switchLink: {
    color: colors.primaryGreen,
    fontSize: 14,
    fontWeight: '600',
  },
  deleteLink: {
    color: colors.allergenText,
    fontSize: 14,
    fontWeight: '600',
  },
});
