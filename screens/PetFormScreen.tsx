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
  Switch,
  TouchableWithoutFeedback,
  Keyboard,
} from 'react-native';
import DateTimePicker, {
  DateTimePickerAndroid,
  DateTimePickerEvent,
} from '@react-native-community/datetimepicker';
import * as ImagePicker from 'expo-image-picker';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { Dog } from '../types';
import { useDogs } from '../lib/hooks/useDogs';
import { useTheme } from '../lib/ThemeContext';
import { useT } from '../lib/LanguageContext';
import { THEMES, THEME_LABELS, ThemeFamily, ThemeTokens } from '../lib/themes';
import { uploadImage, AVATAR_PICKER_OPTIONS } from '../lib/storage';
import { suggestThemeFamily } from '../lib/themeSuggestion';
import { PET_SPECIES } from '../lib/petSpecies';
import { PET_SEX } from '../lib/petSex';
import SwipeBackWrapper from '../components/SwipeBackWrapper';
import { sanitizeWeightInput, validateWeight } from '../lib/weightValidation';

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

function calculateApproximateDob(years: number, months: number): string {
  const now = new Date();
  const estDate = new Date(now.getFullYear() - years, now.getMonth() - months, 1);
  return toDateOnlyString(estDate);
}

function formatEstimatedDobPreview(years: number, months: number): string {
  const now = new Date();
  const estDate = new Date(now.getFullYear() - years, now.getMonth() - months, 1);
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  const monthName = monthNames[estDate.getMonth()];
  const yr = estDate.getFullYear();
  const ageStr = years > 0 ? (months > 0 ? `${years}y ${months}m` : `${years}y`) : `${months}m`;
  return `~${monthName} ${yr} (~${ageStr} old)`;
}

function parseDateOnly(s: string): Date {
  const [y, m, day] = s.split('-').map(Number);
  return new Date(y, m - 1, day);
}

export default function PetFormScreen({ dog, addDog, updateDog, onDone, onCancel }: Props) {
  const { theme } = useTheme();
  const { t } = useT();
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
  const [sex, setSex] = useState<'male' | 'female' | 'unknown'>(dog?.sex ?? 'unknown');
  const [isSterilized, setIsSterilized] = useState(dog?.is_sterilized ?? false);
  const [weightText, setWeightText] = useState(dog?.weight_kg?.toString() ?? '');
  const [dobMode, setDobMode] = useState<'exact' | 'approximate' | 'unknown'>(
    dog?.birth_date ? 'exact' : 'exact'
  );
  const [approxYears, setApproxYears] = useState<number>(1);
  const [approxMonths, setApproxMonths] = useState<number>(0);
  const [birthDate, setBirthDate] = useState<Date | null>(
    dog?.birth_date ? parseDateOnly(dog.birth_date) : null
  );
  const [photoUri, setPhotoUri] = useState<string | null>(dog?.photo_url ?? null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedTheme, setSelectedTheme] = useState<ThemeFamily>(dog?.theme_family ?? 'nordic_slate');
  const [themeManuallyPicked, setThemeManuallyPicked] = useState(false);
  const [breedTouched, setBreedTouched] = useState(false);

  const suggested = breedTouched ? suggestThemeFamily(breed) : null;

  useEffect(() => {
    if (!dog) {
      const match = suggestThemeFamily(breed);
      setSelectedTheme(match ?? 'nordic_slate');
    } else if (!themeManuallyPicked && suggested) {
      setSelectedTheme(suggested);
    }
  }, [breed, suggested, dog, themeManuallyPicked]);

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
      setError(t('petForm.photoPermission'));
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync(AVATAR_PICKER_OPTIONS);
    if (!result.canceled && result.assets.length > 0) {
      setPhotoUri(result.assets[0].uri);
    }
  }

  async function handleSave() {
    const trimmedName = name.trim();
    if (!trimmedName) {
      setError(t('petForm.nameRequired'));
      return;
    }

    let weightValue: number | null = null;
    if (weightText.trim()) {
      const weightCheck = validateWeight(weightText);
      if (!weightCheck.isValid) {
        const errorKey = weightCheck.errorMessageKey ?? 'weightInvalid';
        setError(t(`petForm.${errorKey}`));
        return;
      }
      weightValue = weightCheck.value;
    }

    setLoading(true);
    setError('');

    try {
      const species =
        selectedSpecies === 'Other' ? customSpeciesText.trim() || null : selectedSpecies;

      let finalPhotoUrl = photoUri;
      if (photoUri && !photoUri.startsWith('http://') && !photoUri.startsWith('https://')) {
        const fileId = dog ? `pet_${dog.id}_${Date.now()}` : `pet_${Date.now()}`;
        finalPhotoUrl = await uploadImage(photoUri, 'pet-photos', fileId, dog?.photo_url);
      }

      let calculatedBirthDateString: string | null = null;
      if (dobMode === 'exact') {
        calculatedBirthDateString = birthDate ? toDateOnlyString(birthDate) : null;
      } else if (dobMode === 'approximate') {
        calculatedBirthDateString = calculateApproximateDob(approxYears, approxMonths);
      } else {
        calculatedBirthDateString = null;
      }

      const payload = {
        name: trimmedName,
        species,
        breed: breed.trim() || null,
        birth_date: calculatedBirthDateString,
        weight_kg: weightValue,
        photo_url: finalPhotoUrl,
        theme_family: selectedTheme,
        sex,
        is_sterilized: isSterilized,
      };

      const { error } = dog
        ? await updateDog(dog.id, payload)
        : await addDog({ ...payload, notes: null });

      if (error) {
        setError(error.message);
        return;
      }
      onDone();
    } catch (err: any) {
      setError(err?.message || 'Could not save pet');
    } finally {
      setLoading(false);
    }
  }

  return (
    <SwipeBackWrapper onBack={onCancel}>
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={{ width: '100%' }}>
          <Text style={styles.title}>{dog ? t('petForm.editTitle') : t('petForm.addTitle')}</Text>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <TouchableOpacity onPress={pickPhoto} style={styles.photoPicker}>
          {photoUri ? (
            <Image source={{ uri: photoUri }} style={styles.photoPreview} />
          ) : (
            <Text style={styles.photoPickerText}>{t('petForm.addPhoto')}</Text>
          )}
        </TouchableOpacity>

        <TextInput
          style={styles.input}
          placeholder={t('petForm.name')}
          placeholderTextColor={theme.textMuted}
          value={name}
          onChangeText={setName}
        />
        <Text style={styles.sectionLabel}>{t('petForm.species')}</Text>
        <View style={styles.chipGrid}>
          {PET_SPECIES.map(({ value, emoji, labelKey }) => {
            const selected = value === selectedSpecies;
            return (
              <TouchableOpacity
                key={value}
                style={[styles.chipBtn, selected && styles.chipBtnSelected]}
                onPress={() => setSelectedSpecies(value)}
              >
                <View style={styles.chipRow}>
                  <Text>{emoji}</Text>
                  <Text style={styles.chipBtnLabel}>{t(labelKey)}</Text>
                </View>
              </TouchableOpacity>
            );
          })}
          <TouchableOpacity
            style={[styles.chipBtn, selectedSpecies === 'Other' && styles.chipBtnSelected]}
            onPress={() => setSelectedSpecies('Other')}
          >
            <Text style={styles.chipBtnLabel}>{t('petForm.other')}</Text>
          </TouchableOpacity>
        </View>

        {selectedSpecies === 'Other' && (
          <TextInput
            style={styles.input}
            placeholder={t('petForm.enterSpecies')}
            placeholderTextColor={theme.textMuted}
            value={customSpeciesText}
            onChangeText={setCustomSpeciesText}
          />
        )}

        <TextInput
          style={styles.input}
          placeholder={t('petForm.breedOptional')}
          placeholderTextColor={theme.textMuted}
          value={breed}
          onChangeText={(text) => { setBreed(text); setBreedTouched(true); }}
        />

        <Text style={styles.sectionLabel}>{t('petForm.sex')}</Text>
        <View style={styles.chipGrid}>
          {PET_SEX.map(({ value, emoji, labelKey }) => {
            const selected = value === sex;
            return (
              <TouchableOpacity
                key={value}
                style={[styles.chipBtn, selected && styles.chipBtnSelected]}
                onPress={() => setSex(value)}
              >
                <View style={styles.chipRow}>
                  <Text>{emoji}</Text>
                  <Text style={styles.chipBtnLabel}>{t(labelKey)}</Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={styles.reminderRow}>
          <Text style={styles.reminderLabel}>{sex === 'male' ? t('petForm.neuteredQuestion') : t('petForm.sterilizedQuestion')}</Text>
          <Switch
            value={isSterilized}
            onValueChange={setIsSterilized}
            trackColor={{ false: theme.border, true: theme.primary }}
            thumbColor="white"
          />
        </View>

        <Text style={styles.sectionLabel}>{t('petForm.theme')}</Text>
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
                {isSuggested ? <Text style={styles.suggestedLabel}>{t('petForm.suggested')}</Text> : null}
              </TouchableOpacity>
            );
          })}
        </View>

        <TextInput
          style={styles.input}
          placeholder={t('petForm.weightOptional')}
          placeholderTextColor={theme.textMuted}
          value={weightText}
          onChangeText={(val) => {
            const sanitized = sanitizeWeightInput(val);
            setWeightText(sanitized);
            if (error) setError('');
          }}
          keyboardType="decimal-pad"
        />

        {/* AGE & BIRTHDAY SECTION */}
        <Text style={styles.sectionLabel}>{t('petForm.dobSectionTitle') || 'Age & Birthday'}</Text>
        <View style={styles.dobSegmentContainer}>
          <TouchableOpacity
            style={[styles.dobSegmentBtn, dobMode === 'exact' && styles.dobSegmentBtnActive]}
            onPress={() => setDobMode('exact')}
            activeOpacity={0.8}
          >
            <Text style={[styles.dobSegmentText, dobMode === 'exact' && styles.dobSegmentTextActive]}>
              {t('petForm.dobModeExact')}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.dobSegmentBtn, dobMode === 'approximate' && styles.dobSegmentBtnActive]}
            onPress={() => setDobMode('approximate')}
            activeOpacity={0.8}
          >
            <Text style={[styles.dobSegmentText, dobMode === 'approximate' && styles.dobSegmentTextActive]}>
              {t('petForm.dobModeApprox')}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.dobSegmentBtn, dobMode === 'unknown' && styles.dobSegmentBtnActive]}
            onPress={() => setDobMode('unknown')}
            activeOpacity={0.8}
          >
            <Text style={[styles.dobSegmentText, dobMode === 'unknown' && styles.dobSegmentTextActive]}>
              {t('petForm.dobModeUnknown')}
            </Text>
          </TouchableOpacity>
        </View>

        {dobMode === 'exact' && (
          Platform.OS === 'ios' ? (
            <View style={styles.dateFieldRow}>
              <Text style={birthDate ? styles.inputText : styles.placeholderText}>
                {birthDate ? toDateOnlyString(birthDate) : t('petForm.selectBirthDate')}
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
                {birthDate ? toDateOnlyString(birthDate) : t('petForm.selectBirthDate')}
              </Text>
            </TouchableOpacity>
          )
        )}

        {dobMode === 'approximate' && (
          <View style={styles.approxCard}>
            <View style={styles.approxSteppersRow}>
              {/* Years Stepper */}
              <View style={styles.stepperBox}>
                <Text style={styles.stepperLabel}>{t('petForm.approxYears')}</Text>
                <View style={styles.stepperControls}>
                  <TouchableOpacity
                    style={styles.stepperBtn}
                    onPress={() => setApproxYears(y => Math.max(0, y - 1))}
                    disabled={approxYears <= 0}
                  >
                    <Text style={styles.stepperBtnText}>−</Text>
                  </TouchableOpacity>
                  <Text style={styles.stepperValText}>{approxYears} yrs</Text>
                  <TouchableOpacity
                    style={styles.stepperBtn}
                    onPress={() => setApproxYears(y => Math.min(25, y + 1))}
                    disabled={approxYears >= 25}
                  >
                    <Text style={styles.stepperBtnText}>+</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Months Stepper */}
              <View style={styles.stepperBox}>
                <Text style={styles.stepperLabel}>{t('petForm.approxMonths')}</Text>
                <View style={styles.stepperControls}>
                  <TouchableOpacity
                    style={styles.stepperBtn}
                    onPress={() => setApproxMonths(m => Math.max(0, m - 1))}
                    disabled={approxMonths <= 0}
                  >
                    <Text style={styles.stepperBtnText}>−</Text>
                  </TouchableOpacity>
                  <Text style={styles.stepperValText}>{approxMonths} mos</Text>
                  <TouchableOpacity
                    style={styles.stepperBtn}
                    onPress={() => setApproxMonths(m => Math.min(11, m + 1))}
                    disabled={approxMonths >= 11}
                  >
                    <Text style={styles.stepperBtnText}>+</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>

            {/* Live estimated birthday preview */}
            <View style={styles.approxPreviewBox}>
              <Feather name="calendar" size={13} color={theme.primary} />
              <Text style={styles.approxPreviewText}>
                {t('petForm.approxCalculatedNote', {
                  date: formatEstimatedDobPreview(approxYears, approxMonths),
                })}
              </Text>
            </View>
          </View>
        )}

        {dobMode === 'unknown' && (
          <View style={styles.unknownAgeCard}>
            <Feather name="info" size={16} color={theme.primary} />
            <Text style={styles.unknownAgeCardText}>
              {t('petForm.unknownAgeHelper')}
            </Text>
          </View>
        )}

        <TouchableOpacity style={styles.button} onPress={handleSave} disabled={loading}>
          {loading ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text style={styles.buttonText}>{t('common.save')}</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity onPress={onCancel} style={styles.secondaryButton} activeOpacity={0.8}>
          <Text style={styles.secondaryButtonText}>{t('common.cancel')}</Text>
        </TouchableOpacity>
        </View>
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
      textAlignVertical: 'center',
      includeFontPadding: false,
    },
    reminderRow: {
      width: '100%',
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: theme.surface,
      borderRadius: theme.radiiCard,
      padding: 16,
      marginBottom: 12,
      borderWidth: 1,
      borderColor: theme.border,
    },
    reminderLabel: {
      fontSize: 15,
      color: theme.textDark,
      flexShrink: 1,
      marginRight: 12,
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
    dobSegmentContainer: {
      width: '100%',
      flexDirection: 'row',
      backgroundColor: theme.surfaceAlt,
      borderRadius: 14,
      padding: 4,
      marginBottom: 12,
      borderWidth: 1,
      borderColor: theme.border,
    },
    dobSegmentBtn: {
      flex: 1,
      paddingVertical: 9,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 10,
    },
    dobSegmentBtnActive: {
      backgroundColor: theme.surface,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.12,
      shadowRadius: 3,
      elevation: 2,
    },
    dobSegmentText: {
      fontSize: 12.5,
      fontWeight: '600',
      color: theme.textMuted,
    },
    dobSegmentTextActive: {
      color: theme.textDark,
      fontWeight: '700',
    },
    approxCard: {
      width: '100%',
      backgroundColor: theme.surface,
      borderRadius: theme.radiiCard,
      padding: 14,
      marginBottom: 12,
      borderWidth: 1,
      borderColor: theme.border,
    },
    approxSteppersRow: {
      flexDirection: 'row',
      gap: 12,
      marginBottom: 10,
    },
    stepperBox: {
      flex: 1,
      backgroundColor: theme.surfaceAlt,
      borderRadius: 12,
      padding: 10,
      alignItems: 'center',
      borderWidth: 0.5,
      borderColor: theme.border,
    },
    stepperLabel: {
      fontSize: 11,
      fontWeight: '700',
      color: theme.textMuted,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
      marginBottom: 6,
    },
    stepperControls: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      width: '100%',
      paddingHorizontal: 4,
    },
    stepperBtn: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: theme.surface,
      borderWidth: 1,
      borderColor: theme.border,
      alignItems: 'center',
      justifyContent: 'center',
    },
    stepperBtnText: {
      fontSize: 18,
      fontWeight: '700',
      color: theme.textDark,
      lineHeight: 20,
    },
    stepperValText: {
      fontSize: 14,
      fontWeight: '700',
      color: theme.textDark,
    },
    approxPreviewBox: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      backgroundColor: theme.surfaceAlt,
      paddingVertical: 8,
      paddingHorizontal: 10,
      borderRadius: 10,
    },
    approxPreviewText: {
      fontSize: 12,
      fontWeight: '600',
      color: theme.primary,
      flex: 1,
    },
    unknownAgeCard: {
      width: '100%',
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      backgroundColor: theme.surfaceAlt,
      borderRadius: theme.radiiCard,
      padding: 14,
      marginBottom: 12,
      borderWidth: 1,
      borderColor: theme.border,
    },
    unknownAgeCardText: {
      fontSize: 13,
      color: theme.textDark,
      flex: 1,
      lineHeight: 18,
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
    secondaryButton: {
      width: '100%',
      backgroundColor: theme.surfaceAlt,
      borderRadius: theme.radiiCard,
      paddingVertical: 16,
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: 10,
      borderWidth: 1,
      borderColor: theme.border,
    },
    secondaryButtonText: {
      color: theme.textDark,
      fontSize: 16,
      fontWeight: '600',
    },
  });
}
