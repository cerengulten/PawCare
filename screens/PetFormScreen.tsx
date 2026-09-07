import { useEffect, useMemo, useState } from 'react';
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
import { SafeAreaView } from 'react-native-safe-area-context';
import { Dog } from '../types';
import { useDogs } from '../lib/hooks/useDogs';
import { useTheme } from '../lib/ThemeContext';
import { THEMES, THEME_LABELS, ThemeFamily, ThemeTokens } from '../lib/themes';
import { suggestThemeFamily } from '../lib/themeSuggestion';
import { PET_SPECIES } from '../lib/petSpecies';
import SwipeBackWrapper from '../components/SwipeBackWrapper';

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
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const [name, setName] = useState(dog?.name ?? '');
  const matchedSpecies = dog?.species && PET_SPECIES.some(s => s.value === dog.species) ? dog.species : null;
  const [selectedSpecies, setSelectedSpecies] = useState<string | null>(
    dog?.species ? matchedSpecies ?? 'Other' : null
  );
  const [customSpeciesText, setCustomSpeciesText] = useState(
    dog?.species && !matchedSpecies ? dog.species : ''
  );
  const [breed, setBreed] = useState(dog?.breed ?? '');
  const [weightText, setWeightText] = useState(dog?.weight_kg?.toString() ?? '');
  const [birthDate, setBirthDate] = useState<Date | null>(
    dog?.birth_date ? parseDateOnly(dog.birth_date) : null
  );
  const [photoUri, setPhotoUri] = useState<string | null>(dog?.photo_url ?? null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedTheme, setSelectedTheme] = useState<ThemeFamily>(dog?.theme_family ?? 'sage_clay');
  const [themeManuallyPicked, setThemeManuallyPicked] = useState(false);
  const [breedTouched, setBreedTouched] = useState(false);

  const suggested = breedTouched ? suggestThemeFamily(breed) : null;

  useEffect(() => {
    if (!themeManuallyPicked && suggested) setSelectedTheme(suggested);
  }, [suggested]);

  function openAndroidDatePicker() {
    DateTimePickerAndroid.open({
      value: birthDate ?? new Date(),
      mode: 'date',
      maximumDate: new Date(),
      onChange: (_event: DateTimePickerEvent, selected?: Date) => {
        if (selected) setBirthDate(selected);
      },
    });
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

    const species =
      selectedSpecies === 'Other' ? customSpeciesText.trim() || null : selectedSpecies;

    const payload = {
      name: trimmedName,
      species,
      breed: breed.trim() || null,
      birth_date: birthDate ? toDateOnlyString(birthDate) : null,
      weight_kg: weightValue,
      photo_url: photoUri,
      theme_family: selectedTheme,
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
    <SwipeBackWrapper onBack={onCancel}>
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
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
          placeholderTextColor={theme.textMuted}
          value={name}
          onChangeText={setName}
        />
        <Text style={styles.sectionLabel}>Species</Text>
        <View style={styles.chipGrid}>
          {PET_SPECIES.map(({ value, emoji }) => {
            const selected = value === selectedSpecies;
            return (
              <TouchableOpacity
                key={value}
                style={[styles.chipBtn, selected && styles.chipBtnSelected]}
                onPress={() => setSelectedSpecies(value)}
              >
                <View style={styles.chipRow}>
                  <Text>{emoji}</Text>
                  <Text style={styles.chipBtnLabel}>{value}</Text>
                </View>
              </TouchableOpacity>
            );
          })}
          <TouchableOpacity
            style={[styles.chipBtn, selectedSpecies === 'Other' && styles.chipBtnSelected]}
            onPress={() => setSelectedSpecies('Other')}
          >
            <Text style={styles.chipBtnLabel}>Other</Text>
          </TouchableOpacity>
        </View>

        {selectedSpecies === 'Other' && (
          <TextInput
            style={styles.input}
            placeholder="Enter species"
            placeholderTextColor={theme.textMuted}
            value={customSpeciesText}
            onChangeText={setCustomSpeciesText}
          />
        )}

        <TextInput
          style={styles.input}
          placeholder="Breed (optional)"
          placeholderTextColor={theme.textMuted}
          value={breed}
          onChangeText={(text) => { setBreed(text); setBreedTouched(true); }}
        />
        <Text style={styles.sectionLabel}>Theme</Text>
        <View style={styles.chipGrid}>
          {(Object.keys(THEMES) as ThemeFamily[]).map(family => {
            const selected = family === selectedTheme;
            const isSuggested = family === suggested && !themeManuallyPicked;
            return (
              <TouchableOpacity
                key={family}
                style={[styles.chipBtn, selected && styles.chipBtnSelected]}
                onPress={() => { setSelectedTheme(family); setThemeManuallyPicked(true); }}
              >
                <View style={styles.chipRow}>
                  <View style={[styles.swatchDot, { backgroundColor: THEMES[family].primary }]} />
                  <Text style={styles.chipBtnLabel}>{THEME_LABELS[family]}</Text>
                </View>
                {isSuggested ? <Text style={styles.suggestedLabel}>✨ Suggested</Text> : null}
              </TouchableOpacity>
            );
          })}
        </View>

        <TextInput
          style={styles.input}
          placeholder="Weight in kg (optional)"
          placeholderTextColor={theme.textMuted}
          value={weightText}
          onChangeText={setWeightText}
          keyboardType="decimal-pad"
        />

        {Platform.OS === 'ios' ? (
          <View style={styles.dateFieldRow}>
            <Text style={birthDate ? styles.inputText : styles.placeholderText}>
              {birthDate ? toDateOnlyString(birthDate) : 'Date of birth (optional)'}
            </Text>
            <DateTimePicker
              value={birthDate ?? new Date()}
              mode="date"
              display="compact"
              accentColor={theme.primary}
              maximumDate={new Date()}
              onChange={(_e: DateTimePickerEvent, selected?: Date) => {
                if (selected) setBirthDate(selected);
              }}
            />
          </View>
        ) : (
          <TouchableOpacity style={styles.input} onPress={openAndroidDatePicker}>
            <Text style={birthDate ? styles.inputText : styles.placeholderText}>
              {birthDate ? toDateOnlyString(birthDate) : 'Date of birth (optional)'}
            </Text>
          </TouchableOpacity>
        )}

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
    </SafeAreaView>
    </SwipeBackWrapper>
  );
}

function makeStyles(theme: ThemeTokens) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.background,
    },
    scrollContent: {
      padding: 24,
      alignItems: 'center',
    },
    title: {
      fontSize: 26,
      fontWeight: '700',
      color: theme.textDark,
      marginBottom: 20,
    },
    error: {
      color: theme.allergenText,
      fontSize: 13,
      marginBottom: 12,
      textAlign: 'center',
    },
    photoPicker: {
      width: 96,
      height: 96,
      borderRadius: 48,
      backgroundColor: theme.surface,
      borderWidth: 0.5,
      borderColor: theme.border,
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
      color: theme.textMuted,
      fontSize: 13,
      textAlign: 'center',
    },
    sectionLabel: {
      width: '100%',
      fontSize: 12,
      fontWeight: '600',
      color: theme.textMuted,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
      marginBottom: 8,
    },
    chipGrid: {
      width: '100%',
      flexDirection: 'row',
      flexWrap: 'wrap',
      marginBottom: 12,
    },
    chipBtn: {
      paddingVertical: 10,
      paddingHorizontal: 14,
      borderRadius: 12,
      backgroundColor: theme.surface,
      borderWidth: 1,
      borderColor: theme.border,
      marginRight: 8,
      marginBottom: 8,
    },
    chipBtnSelected: {
      backgroundColor: theme.moodSelBg,
      borderColor: theme.moodSelBorder,
    },
    chipRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    swatchDot: {
      width: 14,
      height: 14,
      borderRadius: 7,
    },
    chipBtnLabel: {
      fontSize: 13,
      fontWeight: '600',
      color: theme.textDark,
    },
    suggestedLabel: {
      fontSize: 10,
      color: theme.textMuted,
      marginTop: 3,
    },
    input: {
      width: '100%',
      backgroundColor: theme.surface,
      borderRadius: theme.radiiCard,
      padding: 16,
      fontSize: 15,
      color: theme.textDark,
      marginBottom: 12,
      borderWidth: 0.5,
      borderColor: theme.border,
    },
    dateFieldRow: {
      width: '100%',
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: theme.surface,
      borderRadius: theme.radiiCard,
      padding: 12,
      marginBottom: 12,
      borderWidth: 0.5,
      borderColor: theme.border,
    },
    inputText: {
      fontSize: 15,
      color: theme.textDark,
    },
    placeholderText: {
      fontSize: 15,
      color: theme.textMuted,
    },
    button: {
      width: '100%',
      backgroundColor: theme.primary,
      borderRadius: theme.radiiCard,
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
      color: theme.primary,
      fontSize: 14,
      fontWeight: '600',
    },
  });
}
