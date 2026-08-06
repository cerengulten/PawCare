import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Image,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import DateTimePicker, {
  DateTimePickerAndroid,
  DateTimePickerEvent,
} from '@react-native-community/datetimepicker';
import * as ImagePicker from 'expo-image-picker';
import { Dog } from '../types';
import { useDogs } from '../lib/hooks/useDogs';
import { colors, radii } from '../lib/theme';

type UseDogsReturn = ReturnType<typeof useDogs>;

type Props = {
  dog: Dog | null;
  addDog: UseDogsReturn['addDog'];
  updateDog: UseDogsReturn['updateDog'];
  onDone: () => void;
  onCancel: () => void;
};

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

export default function PetFormScreen({ dog, addDog, updateDog, onDone, onCancel }: Props) {
  const [name, setName] = useState(dog?.name ?? '');
  const [breed, setBreed] = useState(dog?.breed ?? '');
  const [weightText, setWeightText] = useState(dog?.weight_kg?.toString() ?? '');
  const [birthDate, setBirthDate] = useState<Date | null>(
    dog?.birth_date ? parseDateOnly(dog.birth_date) : null
  );
  const [showIosPicker, setShowIosPicker] = useState(false);
  const [photoUri, setPhotoUri] = useState<string | null>(dog?.photo_url ?? null);
  const [allergens, setAllergens] = useState<string[]>(dog?.allergens ?? []);
  const [allergenInput, setAllergenInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  function addAllergen() {
    const trimmed = allergenInput.trim();
    if (!trimmed) return;
    if (!allergens.some(a => a.toLowerCase() === trimmed.toLowerCase())) {
      setAllergens(prev => [...prev, trimmed]);
    }
    setAllergenInput('');
  }

  function removeAllergen(allergen: string) {
    setAllergens(prev => prev.filter(a => a !== allergen));
  }

  function openDatePicker() {
    if (Platform.OS === 'android') {
      DateTimePickerAndroid.open({
        value: birthDate ?? new Date(),
        mode: 'date',
        maximumDate: new Date(),
        onChange: (_event: DateTimePickerEvent, selected?: Date) => {
          if (selected) setBirthDate(selected);
        },
      });
    } else {
      setShowIosPicker(true);
    }
  }

  async function pickPhoto() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setError('Photo library permission is required to pick a photo.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });
    if (!result.canceled && result.assets.length > 0) {
      setPhotoUri(result.assets[0].uri);
    }
  }

  async function handleSave() {
    const trimmedName = name.trim();
    if (!trimmedName) {
      setError('Name is required.');
      return;
    }

    let weightValue: number | null = null;
    if (weightText.trim()) {
      const parsed = Number(weightText.trim());
      if (!Number.isFinite(parsed) || parsed <= 0) {
        setError('Weight must be a positive number.');
        return;
      }
      weightValue = parsed;
    }

    setLoading(true);
    setError('');

    const payload = {
      name: trimmedName,
      breed: breed.trim() || null,
      birth_date: birthDate ? toDateOnlyString(birthDate) : null,
      weight_kg: weightValue,
      photo_url: photoUri,
      allergens: allergens.length > 0 ? allergens : null,
    };

    const { error } = dog
      ? await updateDog(dog.id, payload)
      : await addDog({ ...payload, sex: null, notes: null });

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
        <Text style={styles.title}>{dog ? 'Edit pet' : 'Add pet'}</Text>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <TouchableOpacity onPress={pickPhoto} style={styles.photoPicker}>
          {photoUri ? (
            <Image source={{ uri: photoUri }} style={styles.photoPreview} />
          ) : (
            <Text style={styles.photoPickerText}>Add photo</Text>
          )}
        </TouchableOpacity>

        <TextInput
          style={styles.input}
          placeholder="Name"
          placeholderTextColor={colors.textMuted}
          value={name}
          onChangeText={setName}
        />
        <TextInput
          style={styles.input}
          placeholder="Breed (optional)"
          placeholderTextColor={colors.textMuted}
          value={breed}
          onChangeText={setBreed}
        />
        <TextInput
          style={styles.input}
          placeholder="Weight in kg (optional)"
          placeholderTextColor={colors.textMuted}
          value={weightText}
          onChangeText={setWeightText}
          keyboardType="decimal-pad"
        />

        <TouchableOpacity style={styles.input} onPress={openDatePicker}>
          <Text style={birthDate ? styles.inputText : styles.placeholderText}>
            {birthDate ? toDateOnlyString(birthDate) : 'Date of birth (optional)'}
          </Text>
        </TouchableOpacity>

        {Platform.OS === 'ios' && showIosPicker && (
          <View>
            <DateTimePicker
              value={birthDate ?? new Date()}
              mode="date"
              display="spinner"
              maximumDate={new Date()}
              onChange={(_e: DateTimePickerEvent, selected?: Date) => {
                if (selected) setBirthDate(selected);
              }}
            />
            <TouchableOpacity onPress={() => setShowIosPicker(false)}>
              <Text style={styles.switchLink}>Done</Text>
            </TouchableOpacity>
          </View>
        )}

        <Text style={styles.sectionLabel}>Food sensitivities (optional)</Text>
        <View style={styles.allergenInputRow}>
          <TextInput
            style={styles.allergenInput}
            placeholder="e.g. Chicken"
            placeholderTextColor="#A8C89A"
            value={allergenInput}
            onChangeText={setAllergenInput}
            onSubmitEditing={addAllergen}
            returnKeyType="done"
          />
          <TouchableOpacity style={styles.allergenAddButton} onPress={addAllergen}>
            <Text style={styles.allergenAddButtonText}>Add</Text>
          </TouchableOpacity>
        </View>
        {allergens.length > 0 ? (
          <View style={styles.allergenChipRow}>
            {allergens.map(a => (
              <TouchableOpacity key={a} style={styles.allergenChip} onPress={() => removeAllergen(a)}>
                <Text style={styles.allergenChipText}>🚫 {a} ×</Text>
              </TouchableOpacity>
            ))}
          </View>
        ) : null}

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
    color: '#1A3A10',
    marginBottom: 20,
  },
  error: {
    color: colors.allergenText,
    fontSize: 13,
    marginBottom: 12,
    textAlign: 'center',
  },
  photoPicker: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: colors.card,
    borderWidth: 0.5,
    borderColor: colors.cardBorder,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    overflow: 'hidden',
  },
  photoPreview: {
    width: 96,
    height: 96,
  },
  photoPickerText: {
    color: colors.textMuted,
    fontSize: 13,
    textAlign: 'center',
  },
  input: {
    width: '100%',
    backgroundColor: colors.card,
    borderRadius: radii.card,
    padding: 16,
    fontSize: 15,
    color: '#1A3A10',
    marginBottom: 12,
    borderWidth: 0.5,
    borderColor: colors.cardBorder,
  },
  inputText: {
    fontSize: 15,
    color: '#1A3A10',
  },
  placeholderText: {
    fontSize: 15,
    color: colors.textMuted,
  },
  sectionLabel: {
    width: '100%',
    fontSize: 9,
    fontWeight: '600',
    color: colors.textMuted,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  allergenInputRow: {
    width: '100%',
    flexDirection: 'row',
    gap: 8,
    marginBottom: 10,
  },
  allergenInput: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: radii.card,
    paddingVertical: 12,
    paddingHorizontal: 14,
    fontSize: 14,
    color: '#1A3A10',
    borderWidth: 0.5,
    borderColor: colors.cardBorder,
  },
  allergenAddButton: {
    backgroundColor: colors.moodSelectedBg,
    borderRadius: radii.card,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  allergenAddButtonText: {
    color: colors.primaryGreen,
    fontSize: 13,
    fontWeight: '600',
  },
  allergenChipRow: {
    width: '100%',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 12,
  },
  allergenChip: {
    backgroundColor: colors.allergenBg,
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  allergenChipText: {
    fontSize: 11,
    fontWeight: '500',
    color: colors.allergenText,
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
});
