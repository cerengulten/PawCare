import { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  Image,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Switch,
} from 'react-native';
import { Session, PostgrestError } from '@supabase/supabase-js';
import * as ImagePicker from 'expo-image-picker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import DateTimePicker, { DateTimePickerAndroid, DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { Feather, Ionicons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';
import { useProfile } from '../lib/hooks/useProfile';
import { useDogs } from '../lib/hooks/useDogs';
import { useDebounce } from '../lib/hooks/useDebounce';
import { USERNAME_REQUIREMENTS, isUsernameFormatValid, suggestUsernames } from '../lib/usernamePolicy';
import PetFormScreen from './PetFormScreen';
import { useTheme } from '../lib/ThemeContext';
import { useT } from '../lib/LanguageContext';
import { ThemeTokens, ThemeFamily } from '../lib/themes';
import { uploadImage } from '../lib/storage';
import { suggestThemeFamily } from '../lib/themeSuggestion';
import { requestNotificationPermissions } from '../lib/notifications';
import { useSubscription } from '../lib/SubscriptionContext';
import { Dog } from '../types';

type DogsState = ReturnType<typeof useDogs>;
type ProfileState = ReturnType<typeof useProfile>;

type Props = {
  session: Session;
  profile: ProfileState['profile'];
  completeOnboarding: ProfileState['completeOnboarding'];
  checkUsernameAvailable: ProfileState['checkUsernameAvailable'];
  dogs: Dog[];
  addDog: DogsState['addDog'];
  updateDog: DogsState['updateDog'];
  onComplete: () => void;
};

type OnboardingStep =
  | 'welcome'
  | 'identity'
  | 'pet_basics'
  | 'pet_health'
  | 'kickstart_habits'
  | 'priming'
  | 'addAnother';

type UsernameStatus = 'idle' | 'checking' | 'available' | 'taken' | 'invalid';

const PET_SPECIES = [
  { label: 'Dog', value: 'Dog', emoji: '🐶' },
  { label: 'Cat', value: 'Cat', emoji: '🐱' },
  { label: 'Rabbit', value: 'Rabbit', emoji: '🐰' },
  { label: 'Bird', value: 'Bird', emoji: '🦜' },
  { label: 'Other', value: 'Other', emoji: '🐾' },
];

function toDateOnlyString(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export default function OnboardingScreen({
  session,
  profile,
  completeOnboarding,
  checkUsernameAvailable,
  dogs,
  addDog,
  updateDog,
  onComplete,
}: Props) {
  const { theme, isDarkMode } = useTheme();
  const { t } = useT();
  const insets = useSafeAreaInsets();
  const { upgradeToPro } = useSubscription();
  const styles = useMemo(() => makeStyles(theme, isDarkMode, insets), [theme, isDarkMode, insets]);

  const welcomeSlides = useMemo(() => [
    {
      icon: '🩺',
      badge: t('onboarding.welcomeBadge1'),
      title: t('onboarding.welcomeTitle1'),
      description: t('onboarding.welcomeDesc1'),
    },
    {
      icon: '💬',
      badge: t('onboarding.welcomeBadge2'),
      title: t('onboarding.welcomeTitle2'),
      description: t('onboarding.welcomeDesc2'),
    },
    {
      icon: '📄',
      badge: t('onboarding.welcomeBadge3'),
      title: t('onboarding.welcomeTitle3'),
      description: t('onboarding.welcomeDesc3'),
    },
  ], [t]);

  // Initial step determination
  const initialStep: OnboardingStep = useMemo(() => {
    if (profile?.full_name && profile?.username) {
      return dogs.length > 0 ? 'addAnother' : 'pet_basics';
    }
    return 'welcome';
  }, []);

  const [step, setStep] = useState<OnboardingStep>(initialStep);

  // Pass 1: Welcome slide index
  const [welcomeIndex, setWelcomeIndex] = useState(0);

  // Pass 2: User Identity State
  const [fullName, setFullName] = useState(profile?.full_name ?? '');
  const [username, setUsername] = useState('');
  const [userPhotoUri, setUserPhotoUri] = useState<string | null>(null);
  const [usernameStatus, setUsernameStatus] = useState<UsernameStatus>('idle');
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [identityLoading, setIdentityLoading] = useState(false);
  const [identityError, setIdentityError] = useState('');

  // Pass 3 & 4: Pet State
  const [petPhotoUri, setPetPhotoUri] = useState<string | null>(null);
  const [petName, setPetName] = useState('');
  const [petSpecies, setPetSpecies] = useState('Dog');
  const [petBreed, setPetBreed] = useState('');
  const [petTheme, setPetTheme] = useState<ThemeFamily>('sage_clay');
  const [petSex, setPetSex] = useState<'male' | 'female' | 'unknown'>('male');
  const [petSterilized, setPetSterilized] = useState(false);
  const [petWeightText, setPetWeightText] = useState('');
  const [petBirthDate, setPetBirthDate] = useState<Date | null>(null);
  const [petLoading, setPetLoading] = useState(false);
  const [petError, setPetError] = useState('');
  const [createdDog, setCreatedDog] = useState<Dog | null>(null);

  // Pass 5: Kickstart Habits State
  const [habitsSelected, setHabitsSelected] = useState({
    water: true,
    meals: true,
    walk: true,
  });
  const [habitsLoading, setHabitsLoading] = useState(false);

  // Pass 6: Priming State
  const [notificationsGranted, setNotificationsGranted] = useState(false);
  const [primingLoading, setPrimingLoading] = useState(false);

  // Debounced username checking
  const debouncedUsername = useDebounce(username, 400);

  useEffect(() => {
    const trimmed = debouncedUsername.trim();
    if (!trimmed) {
      setUsernameStatus('idle');
      setSuggestions([]);
      return;
    }
    if (!isUsernameFormatValid(trimmed)) {
      setUsernameStatus('invalid');
      setSuggestions([]);
      return;
    }

    let cancelled = false;
    setUsernameStatus('checking');
    checkUsernameAvailable(trimmed).then(({ available, error }) => {
      if (cancelled) return;
      if (error) {
        setUsernameStatus('idle');
        return;
      }
      if (available) {
        setUsernameStatus('available');
        setSuggestions([]);
      } else {
        setUsernameStatus('taken');
        generateVerifiedSuggestions(trimmed);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [debouncedUsername]);

  // Automatic coat theme matching when pet breed changes
  useEffect(() => {
    if (petBreed.trim()) {
      const match = suggestThemeFamily(petBreed);
      if (match) {
        setPetTheme(match);
      }
    }
  }, [petBreed]);

  async function pickUserPhoto() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setIdentityError(t('onboarding.photoPermission'));
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });
    if (!result.canceled && result.assets.length > 0) {
      setUserPhotoUri(result.assets[0].uri);
    }
  }

  async function pickPetPhoto() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setPetError(t('petForm.photoPermission'));
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });
    if (!result.canceled && result.assets.length > 0) {
      setPetPhotoUri(result.assets[0].uri);
    }
  }

  async function generateVerifiedSuggestions(base: string) {
    let verified: string[] = [];
    let attempt = 0;
    while (verified.length < 3 && attempt < 4) {
      const candidates = suggestUsernames(base, 3);
      const results = await Promise.all(
        candidates.map(async (c) => ({ c, ok: (await checkUsernameAvailable(c)).available }))
      );
      verified = Array.from(
        new Set([...verified, ...results.filter((r) => r.ok).map((r) => r.c)])
      ).slice(0, 3);
      attempt++;
    }
    setSuggestions(verified);
  }

  async function handleCompleteIdentity() {
    const trimmedName = fullName.trim();
    const trimmedUsername = username.trim();
    if (!trimmedName) {
      setIdentityError(t('onboarding.enterYourName'));
      return;
    }
    if (!isUsernameFormatValid(trimmedUsername)) {
      setIdentityError(t('onboarding.chooseValidUsername'));
      return;
    }
    if (usernameStatus === 'taken') {
      setIdentityError(t('onboarding.usernameTakenPickSuggestion'));
      return;
    }
    setIdentityLoading(true);
    setIdentityError('');

    let finalAvatarUrl = userPhotoUri;
    if (userPhotoUri && !userPhotoUri.startsWith('http://') && !userPhotoUri.startsWith('https://')) {
      const fileId = `avatar_${session?.user?.id ?? Date.now()}_${Date.now()}`;
      finalAvatarUrl = await uploadImage(userPhotoUri, 'avatars', fileId);
    }

    const { error } = await completeOnboarding(trimmedName, trimmedUsername, finalAvatarUrl);
    if (error) {
      if ((error as PostgrestError).code === '23505') {
        setIdentityError(t('onboarding.usernameJustTaken'));
        setUsernameStatus('taken');
        generateVerifiedSuggestions(trimmedUsername);
      } else {
        setIdentityError(error.message);
      }
    } else {
      if (dogs.length > 0) {
        setStep('addAnother');
      } else {
        setStep('pet_basics');
      }
    }
    setIdentityLoading(false);
  }

  function openAndroidPetDatePicker() {
    DateTimePickerAndroid.open({
      value: petBirthDate ?? new Date(),
      mode: 'date',
      maximumDate: new Date(),
      onChange: (_event: DateTimePickerEvent, selected?: Date) => {
        if (selected) setPetBirthDate(selected);
      },
    });
  }

  async function handleCreatePet() {
    if (!petName.trim()) {
      setPetError(t('petForm.nameRequired'));
      return;
    }
    setPetLoading(true);
    setPetError('');

    let finalPhotoUrl = petPhotoUri;
    if (petPhotoUri && !petPhotoUri.startsWith('http://') && !petPhotoUri.startsWith('https://')) {
      const fileId = `dog_${session.user.id}_${Date.now()}`;
      finalPhotoUrl = await uploadImage(petPhotoUri, 'pet-photos', fileId);
    }

    const weightNum = petWeightText.trim() ? parseFloat(petWeightText.replace(',', '.')) : null;
    const dobString = petBirthDate ? toDateOnlyString(petBirthDate) : null;

    const { data: newDog, error } = await addDog({
      name: petName.trim(),
      species: petSpecies,
      breed: petBreed.trim() || null,
      sex: petSex,
      is_sterilized: petSterilized,
      weight_kg: weightNum && !isNaN(weightNum) ? weightNum : null,
      birth_date: dobString,
      photo_url: finalPhotoUrl,
      theme_family: petTheme,
      notes: null,
    });

    if (error) {
      setPetError(error.message);
      setPetLoading(false);
      return;
    }

    if (newDog) {
      setCreatedDog(newDog);
    }
    setPetLoading(false);
    setStep('kickstart_habits');
  }

  async function handleActivateHabits() {
    if (!createdDog && dogs.length === 0) {
      setStep('priming');
      return;
    }
    const targetDogId = createdDog?.id ?? dogs[0]?.id;
    if (!targetDogId) {
      setStep('priming');
      return;
    }

    setHabitsLoading(true);
    try {
      const toInsert = [];
      if (habitsSelected.water) {
        toInsert.push({
          dog_id: targetDogId,
          owner_id: session.user.id,
          title: 'Fresh Water',
          category: 'other',
          habit_type: 'water',
          frequency: 'daily',
          water_goal_ml: 800,
          is_active: true,
        });
      }
      if (habitsSelected.meals) {
        toInsert.push({
          dog_id: targetDogId,
          owner_id: session.user.id,
          title: 'Daily Meals',
          category: 'feeding',
          habit_type: 'feeding',
          frequency: 'daily',
          times_per_day: 2,
          is_active: true,
        });
      }
      if (habitsSelected.walk) {
        toInsert.push({
          dog_id: targetDogId,
          owner_id: session.user.id,
          title: 'Daily Walk',
          category: 'walk',
          habit_type: 'walking',
          frequency: 'daily',
          times_per_day: 1,
          walk_duration_minutes: 30,
          is_active: true,
        });
      }
      if (toInsert.length > 0) {
        await supabase.from('habits').insert(toInsert);
      }
    } catch (err) {
      console.warn('Failed to insert default habits during onboarding:', err);
    } finally {
      setHabitsLoading(false);
      setStep('priming');
    }
  }

  async function handleEnableNotifications() {
    const granted = await requestNotificationPermissions();
    setNotificationsGranted(granted);
  }

  async function handleStartProTrial() {
    setPrimingLoading(true);
    try {
      await upgradeToPro('annual');
    } catch {}
    setPrimingLoading(false);
    onComplete();
  }

  // PASS 1: Welcome Value Slides
  if (step === 'welcome') {
    const curSlide = welcomeSlides[welcomeIndex];
    const isLastSlide = welcomeIndex === welcomeSlides.length - 1;

    return (
      <View style={styles.container}>
        <View style={styles.welcomeTopNav}>
          <View style={styles.welcomeBrandTag}>
            <Text style={styles.welcomeBrandTagText}>BISCO</Text>
          </View>
          <TouchableOpacity
            onPress={() => setStep('identity')}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <Text style={styles.skipBtnText}>{t('tour.skip')}</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.welcomeCardWrap}>
          <View style={styles.welcomeCard}>
            <View style={styles.welcomeIconBox}>
              <Text style={styles.welcomeIcon}>{curSlide.icon}</Text>
            </View>
            <View style={styles.welcomeBadge}>
              <Text style={styles.welcomeBadgeText}>{curSlide.badge}</Text>
            </View>
            <Text style={styles.welcomeTitle}>{curSlide.title}</Text>
            <Text style={styles.welcomeDescription}>{curSlide.description}</Text>
          </View>
        </View>

        {/* Pagination Dots */}
        <View style={styles.dotsRow}>
          {welcomeSlides.map((_, idx) => (
            <TouchableOpacity
              key={idx}
              onPress={() => setWelcomeIndex(idx)}
              style={[styles.dot, idx === welcomeIndex && styles.dotActive]}
            />
          ))}
        </View>

        <View style={styles.welcomeFooter}>
          <TouchableOpacity
            style={styles.primaryBtn}
            onPress={() => {
              if (isLastSlide) {
                setStep('identity');
              } else {
                setWelcomeIndex(i => i + 1);
              }
            }}
          >
            <Text style={styles.primaryBtnText}>
              {isLastSlide ? `${t('common.continue')} 🐾` : t('common.continue')}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // PASS 2: Account Identity
  if (step === 'identity') {
    const continueDisabled =
      identityLoading ||
      usernameStatus === 'checking' ||
      usernameStatus === 'taken' ||
      usernameStatus === 'invalid' ||
      !fullName.trim() ||
      !username.trim();

    return (
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          <TouchableOpacity onPress={pickUserPhoto} style={styles.photoPickerWrap}>
            <View style={styles.photoPicker}>
              {userPhotoUri ? (
                <Image source={{ uri: userPhotoUri }} style={styles.photoPreview} />
              ) : (
                <Text style={styles.photoPickerText}>🐾</Text>
              )}
            </View>
            <View style={styles.photoPickerBadge}>
              <Text style={styles.photoPickerBadgeText}>{userPhotoUri ? '✎' : '+'}</Text>
            </View>
          </TouchableOpacity>
          <Text style={styles.photoCaption}>
            {userPhotoUri ? t('onboarding.tapToChangePhoto') : t('onboarding.addPhotoOptional')}
          </Text>

          <Text style={styles.title}>{t('onboarding.tellUsAboutYou')}</Text>
          <Text style={styles.subtitle}>{t('onboarding.identitySubtitle')}</Text>

          {identityError ? <Text style={styles.errorText}>{identityError}</Text> : null}

          <TextInput
            style={styles.input}
            placeholder={t('onboarding.yourName')}
            placeholderTextColor={theme.textMuted}
            value={fullName}
            onChangeText={setFullName}
            autoCapitalize="words"
          />

          <TextInput
            style={styles.input}
            placeholder={t('onboarding.chooseUsername')}
            placeholderTextColor={theme.textMuted}
            value={username}
            onChangeText={setUsername}
            autoCapitalize="none"
            autoCorrect={false}
          />

          {usernameStatus === 'checking' ? (
            <Text style={styles.statusChecking}>{t('onboarding.checkingAvailability')}</Text>
          ) : null}
          {usernameStatus === 'available' ? (
            <Text style={styles.statusAvailable}>{t('onboarding.usernameAvailable')}</Text>
          ) : null}
          {usernameStatus === 'taken' ? (
            <Text style={styles.statusTaken}>{t('onboarding.usernameTaken')}</Text>
          ) : null}
          {usernameStatus === 'invalid' ? (
            <Text style={styles.statusTaken}>{t('onboarding.chooseValidUsername')}</Text>
          ) : null}

          {suggestions.length > 0 ? (
            <View style={styles.suggestionsRow}>
              {suggestions.map((s) => (
                <TouchableOpacity
                  key={s}
                  style={styles.chip}
                  onPress={() => setUsername(s)}
                >
                  <Text style={styles.chipText}>@{s}</Text>
                </TouchableOpacity>
              ))}
            </View>
          ) : null}

          <View style={styles.checklist}>
            {USERNAME_REQUIREMENTS.map((req) => {
              const met = req.test(username);
              return (
                <Text
                  key={req.labelKey}
                  style={[styles.checklistItem, met && styles.checklistItemMet]}
                >
                  {met ? '✓' : '○'} {t(req.labelKey)}
                </Text>
              );
            })}
          </View>

          <TouchableOpacity
            style={[styles.primaryBtn, continueDisabled && styles.btnDisabled]}
            onPress={handleCompleteIdentity}
            disabled={continueDisabled}
          >
            {identityLoading ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text style={styles.primaryBtnText}>{t('common.continue')}</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.signOutRow}
            onPress={() => supabase.auth.signOut()}
          >
            <Text style={styles.signOutText}>{t('onboarding.wrongAccountSignOut')}</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    );
  }

  // PASS 3: Pet Basics (Photo, Name, Species, Breed)
  if (step === 'pet_basics') {
    return (
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          <View style={styles.stepProgressRow}>
            <Text style={styles.stepProgressText}>{t('onboarding.step1Title')}</Text>
          </View>

          <TouchableOpacity onPress={pickPetPhoto} style={styles.photoPickerWrap}>
            <View style={styles.photoPicker}>
              {petPhotoUri ? (
                <Image source={{ uri: petPhotoUri }} style={styles.photoPreview} />
              ) : (
                <Text style={styles.photoPickerText}>🐶</Text>
              )}
            </View>
            <View style={styles.photoPickerBadge}>
              <Text style={styles.photoPickerBadgeText}>{petPhotoUri ? '✎' : '+'}</Text>
            </View>
          </TouchableOpacity>
          <Text style={styles.photoCaption}>
            {petPhotoUri ? t('onboarding.tapToChangePhoto') : t('onboarding.addPhotoOptional')}
          </Text>

          <Text style={styles.title}>{t('onboarding.meetCompanion')}</Text>
          <Text style={styles.subtitle}>{t('onboarding.whoCaringFor')}</Text>

          {petError ? <Text style={styles.errorText}>{petError}</Text> : null}

          <TextInput
            style={styles.input}
            placeholder={t('petForm.name')}
            placeholderTextColor={theme.textMuted}
            value={petName}
            onChangeText={setPetName}
            autoCapitalize="words"
          />

          <Text style={styles.sectionLabel}>{t('onboarding.species')}</Text>
          <View style={styles.speciesRow}>
            {PET_SPECIES.map((s) => {
              const selected = petSpecies === s.value;
              return (
                <TouchableOpacity
                  key={s.value}
                  style={[styles.speciesBtn, selected && styles.speciesBtnSelected]}
                  onPress={() => setPetSpecies(s.value)}
                >
                  <Text style={styles.speciesEmoji}>{s.emoji}</Text>
                  <Text
                    style={[
                      styles.speciesLabel,
                      selected && styles.speciesLabelSelected,
                    ]}
                  >
                    {s.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <Text style={styles.sectionLabel}>{t('onboarding.breedOptional')}</Text>
          <TextInput
            style={styles.input}
            placeholder={t('petForm.breed')}
            placeholderTextColor={theme.textMuted}
            value={petBreed}
            onChangeText={setPetBreed}
            autoCapitalize="words"
          />

          {petBreed.trim() && petTheme !== 'sage_clay' ? (
            <View style={styles.coatMatchCard}>
              <Text style={styles.coatMatchEmoji}>🎨</Text>
              <Text style={styles.coatMatchText}>
                {t('onboarding.coatMatchedNotice')}
              </Text>
            </View>
          ) : null}

          <TouchableOpacity
            style={[styles.primaryBtn, !petName.trim() && styles.btnDisabled]}
            disabled={!petName.trim()}
            onPress={() => setStep('pet_health')}
          >
            <Text style={styles.primaryBtnText}>{t('onboarding.nextHealthBaseline')}</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    );
  }

  // PASS 4: Pet Health Baseline (Sex, Sterilization, DOB, Weight)
  if (step === 'pet_health') {
    return (
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          <View style={styles.stepProgressRow}>
            <Text style={styles.stepProgressText}>{t('onboarding.step2Title')}</Text>
          </View>

          <Text style={styles.title}>{t('onboarding.baselineTitle', { name: petName })}</Text>
          <Text style={styles.subtitle}>
            {t('onboarding.baselineSubtitle')}
          </Text>

          {petError ? <Text style={styles.errorText}>{petError}</Text> : null}

          <Text style={styles.sectionLabel}>{t('onboarding.biologicalSex')}</Text>
          <View style={styles.speciesRow}>
            {[
              { label: t('dogDetail.male'), value: 'male', emoji: '♂' },
              { label: t('dogDetail.female'), value: 'female', emoji: '♀' },
              { label: t('dogDetail.unknown'), value: 'unknown', emoji: '?' },
            ].map((s) => {
              const selected = petSex === s.value;
              return (
                <TouchableOpacity
                  key={s.value}
                  style={[styles.speciesBtn, selected && styles.speciesBtnSelected]}
                  onPress={() => setPetSex(s.value as any)}
                >
                  <Text style={styles.speciesEmoji}>{s.emoji}</Text>
                  <Text
                    style={[
                      styles.speciesLabel,
                      selected && styles.speciesLabelSelected,
                    ]}
                  >
                    {s.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <View style={styles.switchRow}>
            <View style={styles.switchTextCol}>
              <Text style={styles.switchLabel}>
                {petSex === 'male' ? t('onboarding.neutered') : t('onboarding.spayed')}
              </Text>
              <Text style={styles.switchSublabel}>
                {t('onboarding.sterilizationNotice')}
              </Text>
            </View>
            <Switch
              value={petSterilized}
              onValueChange={setPetSterilized}
              trackColor={{ false: theme.border, true: theme.primary }}
              thumbColor="#FFFFFF"
            />
          </View>

          <Text style={styles.sectionLabel}>{t('onboarding.currentWeight')}</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. 14.5"
            placeholderTextColor={theme.textMuted}
            value={petWeightText}
            onChangeText={setPetWeightText}
            keyboardType="decimal-pad"
          />

          <Text style={styles.sectionLabel}>{t('onboarding.dobOptional')}</Text>
          {Platform.OS === 'ios' ? (
            <View style={styles.iosDateRow}>
              <Text style={styles.iosDateLabel}>
                {petBirthDate ? toDateOnlyString(petBirthDate) : t('petForm.dobOptional')}
              </Text>
              <DateTimePicker
                value={petBirthDate ?? new Date()}
                mode="date"
                themeVariant={isDarkMode ? 'dark' : 'light'}
                maximumDate={new Date()}
                display="compact"
                onChange={(_e, d) => {
                  if (d) setPetBirthDate(d);
                }}
              />
            </View>
          ) : (
            <TouchableOpacity
              style={styles.input}
              onPress={openAndroidPetDatePicker}
            >
              <Text style={petBirthDate ? styles.dateTextActive : styles.dateTextPlaceholder}>
                {petBirthDate ? toDateOnlyString(petBirthDate) : t('petForm.dobOptional')}
              </Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={[styles.primaryBtn, petLoading && styles.btnDisabled]}
            disabled={petLoading}
            onPress={handleCreatePet}
          >
            {petLoading ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text style={styles.primaryBtnText}>{t('onboarding.saveAndSetRhythm')}</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryBtn}
            onPress={() => setStep('pet_basics')}
          >
            <Text style={styles.secondaryBtnText}>{t('onboarding.backToBasics')}</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    );
  }

  // PASS 5: First-Day Care Plan Kickstart (Water, Meals, Walk)
  if (step === 'kickstart_habits') {
    return (
      <View style={styles.container}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.stepProgressRow}>
            <Text style={styles.stepProgressText}>{t('onboarding.step3Title')}</Text>
          </View>

          <Text style={styles.title}>{t('onboarding.carePlanTitle', { name: petName || t('home.yourPet') })}</Text>
          <Text style={styles.subtitle}>
            {t('onboarding.carePlanSubtitle')}
          </Text>

          <View style={styles.habitCardsStack}>
            {/* Water Habit */}
            <TouchableOpacity
              style={[
                styles.habitSelectCard,
                habitsSelected.water && styles.habitSelectCardActive,
              ]}
              onPress={() =>
                setHabitsSelected((s) => ({ ...s, water: !s.water }))
              }
              activeOpacity={0.8}
            >
              <View style={styles.habitSelectIconBox}>
                <Text style={styles.habitSelectIcon}>💧</Text>
              </View>
              <View style={styles.habitSelectTextCol}>
                <Text style={styles.habitSelectTitle}>{t('onboarding.freshHydration')}</Text>
                <Text style={styles.habitSelectSubtitle}>
                  {t('onboarding.freshHydrationSub')}
                </Text>
              </View>
              <View
                style={[
                  styles.checkboxCircle,
                  habitsSelected.water && styles.checkboxCircleActive,
                ]}
              >
                {habitsSelected.water && <Text style={styles.checkboxCheck}>✓</Text>}
              </View>
            </TouchableOpacity>

            {/* Meals Habit */}
            <TouchableOpacity
              style={[
                styles.habitSelectCard,
                habitsSelected.meals && styles.habitSelectCardActive,
              ]}
              onPress={() =>
                setHabitsSelected((s) => ({ ...s, meals: !s.meals }))
              }
              activeOpacity={0.8}
            >
              <View style={styles.habitSelectIconBox}>
                <Text style={styles.habitSelectIcon}>🥩</Text>
              </View>
              <View style={styles.habitSelectTextCol}>
                <Text style={styles.habitSelectTitle}>{t('onboarding.dailyMeals')}</Text>
                <Text style={styles.habitSelectSubtitle}>
                  {t('onboarding.dailyMealsSub')}
                </Text>
              </View>
              <View
                style={[
                  styles.checkboxCircle,
                  habitsSelected.meals && styles.checkboxCircleActive,
                ]}
              >
                {habitsSelected.meals && <Text style={styles.checkboxCheck}>✓</Text>}
              </View>
            </TouchableOpacity>

            {/* Daily Walk Habit */}
            <TouchableOpacity
              style={[
                styles.habitSelectCard,
                habitsSelected.walk && styles.habitSelectCardActive,
              ]}
              onPress={() =>
                setHabitsSelected((s) => ({ ...s, walk: !s.walk }))
              }
              activeOpacity={0.8}
            >
              <View style={styles.habitSelectIconBox}>
                <Text style={styles.habitSelectIcon}>🦮</Text>
              </View>
              <View style={styles.habitSelectTextCol}>
                <Text style={styles.habitSelectTitle}>{t('onboarding.dailyWalk')}</Text>
                <Text style={styles.habitSelectSubtitle}>
                  {t('onboarding.dailyWalkSub')}
                </Text>
              </View>
              <View
                style={[
                  styles.checkboxCircle,
                  habitsSelected.walk && styles.checkboxCircleActive,
                ]}
              >
                {habitsSelected.walk && <Text style={styles.checkboxCheck}>✓</Text>}
              </View>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={[styles.primaryBtn, habitsLoading && styles.btnDisabled]}
            disabled={habitsLoading}
            onPress={handleActivateHabits}
          >
            {habitsLoading ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text style={styles.primaryBtnText}>{t('onboarding.activateCarePlan')}</Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </View>
    );
  }

  // PASS 6: Notification Priming & Soft Bisco Pro Offer
  if (step === 'priming') {
    return (
      <View style={styles.container}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <Text style={styles.title}>{t('onboarding.allSetTitle')}</Text>
          <Text style={styles.subtitle}>
            {t('onboarding.allSetSubtitle')}
          </Text>

          {/* Card 1: Notifications Priming */}
          <View style={styles.primingCard}>
            <View style={styles.primingHeaderRow}>
              <View style={styles.primingIconBox}>
                <Text style={styles.primingIcon}>🔔</Text>
              </View>
              <View style={styles.primingHeaderCol}>
                <Text style={styles.primingTitle}>{t('onboarding.smartRemindersTitle')}</Text>
                <Text style={styles.primingSubtitle}>
                  {t('onboarding.smartRemindersSub')}
                </Text>
              </View>
            </View>

            <TouchableOpacity
              style={[
                styles.reminderBtn,
                notificationsGranted && styles.reminderBtnGranted,
              ]}
              onPress={handleEnableNotifications}
              disabled={notificationsGranted}
            >
              <Text
                style={[
                  styles.reminderBtnText,
                  notificationsGranted && styles.reminderBtnTextGranted,
                ]}
              >
                {notificationsGranted ? t('onboarding.remindersEnabled') : t('onboarding.enableReminders')}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Card 2: Bisco Pro Soft Trial Card */}
          <View style={styles.proTrialCard}>
            <View style={styles.proTrialBadge}>
              <Text style={styles.proTrialBadgeText}>{t('onboarding.proTrialBadge')}</Text>
            </View>

            <Text style={styles.proTrialTitle}>{t('onboarding.proTrialTitle', { name: petName || t('home.yourPet') })}</Text>
            <Text style={styles.proTrialSubtitle}>
              {t('onboarding.proTrialSubtitle')}
            </Text>

            <View style={styles.proBenefitsList}>
              <Text style={styles.proBenefitItem}>{t('onboarding.proBenefit1')}</Text>
              <Text style={styles.proBenefitItem}>{t('onboarding.proBenefit2')}</Text>
              <Text style={styles.proBenefitItem}>{t('onboarding.proBenefit3')}</Text>
            </View>

            <TouchableOpacity
              style={styles.proTrialBtn}
              onPress={handleStartProTrial}
              disabled={primingLoading}
            >
              {primingLoading ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text style={styles.proTrialBtnText}>{t('onboarding.startProTrialBtn')}</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.skipTrialBtn}
              onPress={onComplete}
            >
              <Text style={styles.skipTrialBtnText}>{t('onboarding.continueFreeBtn')}</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    );
  }

  // Legacy fallback: Add Another Pet
  return (
    <View style={styles.container}>
      <Text style={styles.paw}>🐾</Text>
      <Text style={styles.title}>{t('onboarding.addAnotherTitle')}</Text>
      <Text style={styles.subtitle}>{t('onboarding.addAnotherSubtitle')}</Text>

      <TouchableOpacity
        style={styles.primaryBtn}
        onPress={() => setStep('pet_basics')}
      >
        <Text style={styles.primaryBtnText}>{t('onboarding.yesAddAnother')}</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.secondaryBtn} onPress={onComplete}>
        <Text style={styles.secondaryBtnText}>{t('onboarding.noContinue')}</Text>
      </TouchableOpacity>
    </View>
  );
}

function makeStyles(theme: ThemeTokens, isDarkMode = false, insets = { top: 0, bottom: 0 }) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.background,
    },
    scrollContent: {
      flexGrow: 1,
      paddingHorizontal: 24,
      paddingTop: Math.max(insets.top + 16, 52),
      paddingBottom: Math.max(insets.bottom + 24, 40),
    },
    // Welcome Screen
    welcomeTopNav: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 24,
      paddingTop: Math.max(insets.top + 12, 48),
      marginBottom: 20,
    },
    welcomeBrandTag: {
      backgroundColor: theme.surfaceAlt,
      borderRadius: 12,
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderWidth: 1,
      borderColor: theme.border,
    },
    welcomeBrandTagText: {
      fontSize: 11,
      fontWeight: '800',
      color: theme.primary,
      letterSpacing: 1,
    },
    skipBtnText: {
      fontSize: 14,
      fontWeight: '600',
      color: theme.textMuted,
    },
    welcomeCardWrap: {
      flex: 1,
      justifyContent: 'center',
      paddingHorizontal: 24,
    },
    welcomeCard: {
      backgroundColor: theme.surface,
      borderRadius: 24,
      padding: 28,
      alignItems: 'center',
      borderWidth: 1.5,
      borderColor: theme.border,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.06,
      shadowRadius: 10,
      elevation: 3,
    },
    welcomeIconBox: {
      width: 76,
      height: 76,
      borderRadius: 38,
      backgroundColor: theme.surfaceAlt,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 18,
    },
    welcomeIcon: {
      fontSize: 38,
    },
    welcomeBadge: {
      backgroundColor: isDarkMode ? '#2B231D' : '#FFF3E8',
      paddingHorizontal: 12,
      paddingVertical: 5,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: isDarkMode ? '#4D3627' : '#F6D9BF',
      marginBottom: 12,
    },
    welcomeBadgeText: {
      fontSize: 11,
      fontWeight: '800',
      color: theme.primary,
      letterSpacing: 0.8,
    },
    welcomeTitle: {
      fontSize: 22,
      fontWeight: '800',
      color: theme.textDark,
      textAlign: 'center',
      marginBottom: 10,
      letterSpacing: -0.3,
    },
    welcomeDescription: {
      fontSize: 14,
      lineHeight: 22,
      color: theme.textMuted,
      textAlign: 'center',
    },
    dotsRow: {
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      gap: 8,
      marginVertical: 24,
    },
    dot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: theme.border,
    },
    dotActive: {
      width: 24,
      backgroundColor: theme.primary,
    },
    welcomeFooter: {
      paddingHorizontal: 24,
      paddingBottom: Math.max(insets.bottom + 20, 36),
    },
    // Step Progress Badge
    stepProgressRow: {
      alignSelf: 'flex-start',
      backgroundColor: theme.surfaceAlt,
      borderRadius: 12,
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderWidth: 1,
      borderColor: theme.border,
      marginBottom: 16,
    },
    stepProgressText: {
      fontSize: 10,
      fontWeight: '800',
      color: theme.primary,
      letterSpacing: 0.8,
    },
    // Photos
    photoPickerWrap: {
      alignSelf: 'center',
      marginBottom: 8,
    },
    photoPicker: {
      width: 92,
      height: 92,
      borderRadius: 46,
      backgroundColor: theme.surface,
      borderWidth: 1.5,
      borderColor: theme.border,
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden',
    },
    photoPreview: {
      width: 92,
      height: 92,
    },
    photoPickerBadge: {
      position: 'absolute',
      right: -2,
      bottom: -2,
      width: 28,
      height: 28,
      borderRadius: 14,
      backgroundColor: theme.primary,
      borderWidth: 2,
      borderColor: theme.background,
      alignItems: 'center',
      justifyContent: 'center',
    },
    photoPickerBadgeText: {
      color: 'white',
      fontSize: 14,
      fontWeight: '700',
    },
    photoCaption: {
      fontSize: 12,
      color: theme.textMuted,
      textAlign: 'center',
      marginBottom: 20,
    },
    photoPickerText: {
      fontSize: 36,
    },
    paw: {
      fontSize: 48,
      textAlign: 'center',
      marginBottom: 12,
    },
    title: {
      fontSize: 24,
      fontWeight: '800',
      color: theme.textDark,
      marginBottom: 6,
      letterSpacing: -0.3,
    },
    subtitle: {
      fontSize: 14,
      color: theme.textMuted,
      lineHeight: 20,
      marginBottom: 24,
    },
    errorText: {
      color: theme.allergenText,
      fontSize: 13,
      marginBottom: 12,
    },
    input: {
      width: '100%',
      backgroundColor: theme.surface,
      borderRadius: 16,
      padding: 16,
      fontSize: 15,
      color: theme.textDark,
      marginBottom: 14,
      borderWidth: 1,
      borderColor: theme.border,
    },
    sectionLabel: {
      fontSize: 13,
      fontWeight: '700',
      color: theme.textDark,
      marginBottom: 8,
      marginTop: 4,
    },
    // Species Grid / Row
    speciesRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
      marginBottom: 16,
    },
    speciesBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingVertical: 10,
      paddingHorizontal: 14,
      backgroundColor: theme.surface,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: theme.border,
    },
    speciesBtnSelected: {
      backgroundColor: isDarkMode ? '#2B231D' : '#FFF3E8',
      borderColor: theme.primary,
    },
    speciesEmoji: {
      fontSize: 16,
    },
    speciesLabel: {
      fontSize: 13,
      fontWeight: '600',
      color: theme.textDark,
    },
    speciesLabelSelected: {
      color: theme.primary,
      fontWeight: '800',
    },
    coatMatchCard: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      backgroundColor: isDarkMode ? '#2B231D' : '#FFF9EE',
      borderRadius: 14,
      padding: 12,
      borderWidth: 1,
      borderColor: isDarkMode ? '#4D3627' : '#F6E5CC',
      marginBottom: 16,
    },
    coatMatchEmoji: {
      fontSize: 16,
    },
    coatMatchText: {
      flex: 1,
      fontSize: 12,
      fontWeight: '600',
      color: theme.primary,
      lineHeight: 16,
    },
    // Switch row
    switchRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: theme.surface,
      borderRadius: 16,
      padding: 16,
      borderWidth: 1,
      borderColor: theme.border,
      marginBottom: 14,
    },
    switchTextCol: {
      flex: 1,
    },
    switchLabel: {
      fontSize: 14,
      fontWeight: '700',
      color: theme.textDark,
      marginBottom: 2,
    },
    switchSublabel: {
      fontSize: 12,
      color: theme.textMuted,
    },
    iosDateRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: theme.surface,
      borderRadius: 16,
      padding: 14,
      borderWidth: 1,
      borderColor: theme.border,
      marginBottom: 14,
    },
    iosDateLabel: {
      fontSize: 14,
      color: theme.textDark,
    },
    dateTextActive: {
      fontSize: 15,
      color: theme.textDark,
    },
    dateTextPlaceholder: {
      fontSize: 15,
      color: theme.textMuted,
    },
    // Habit Cards Selection Stack
    habitCardsStack: {
      gap: 12,
      marginBottom: 24,
    },
    habitSelectCard: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      backgroundColor: theme.surface,
      borderRadius: 18,
      padding: 16,
      borderWidth: 1.5,
      borderColor: theme.border,
    },
    habitSelectCardActive: {
      borderColor: theme.primary,
      backgroundColor: isDarkMode ? '#241D19' : '#FFF9F4',
    },
    habitSelectIconBox: {
      width: 44,
      height: 44,
      borderRadius: 14,
      backgroundColor: theme.surfaceAlt,
      alignItems: 'center',
      justifyContent: 'center',
    },
    habitSelectIcon: {
      fontSize: 22,
    },
    habitSelectTextCol: {
      flex: 1,
    },
    habitSelectTitle: {
      fontSize: 14,
      fontWeight: '800',
      color: theme.textDark,
      marginBottom: 2,
    },
    habitSelectSubtitle: {
      fontSize: 12,
      color: theme.textMuted,
      lineHeight: 16,
    },
    checkboxCircle: {
      width: 24,
      height: 24,
      borderRadius: 12,
      borderWidth: 2,
      borderColor: theme.border,
      alignItems: 'center',
      justifyContent: 'center',
    },
    checkboxCircleActive: {
      borderColor: theme.primary,
      backgroundColor: theme.primary,
    },
    checkboxCheck: {
      color: '#FFFFFF',
      fontSize: 13,
      fontWeight: '800',
    },
    // Priming Screen Cards
    primingCard: {
      backgroundColor: theme.surface,
      borderRadius: 20,
      padding: 18,
      borderWidth: 1.5,
      borderColor: theme.border,
      marginBottom: 16,
    },
    primingHeaderRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      marginBottom: 14,
    },
    primingIconBox: {
      width: 42,
      height: 42,
      borderRadius: 14,
      backgroundColor: isDarkMode ? '#243C2E' : '#EAF4EB',
      alignItems: 'center',
      justifyContent: 'center',
    },
    primingIcon: {
      fontSize: 20,
    },
    primingHeaderCol: {
      flex: 1,
    },
    primingTitle: {
      fontSize: 15,
      fontWeight: '800',
      color: theme.textDark,
      marginBottom: 2,
    },
    primingSubtitle: {
      fontSize: 12,
      color: theme.textMuted,
      lineHeight: 16,
    },
    reminderBtn: {
      backgroundColor: theme.surfaceAlt,
      borderRadius: 14,
      paddingVertical: 12,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: theme.border,
    },
    reminderBtnGranted: {
      backgroundColor: isDarkMode ? '#1B2721' : '#F0F7F1',
      borderColor: theme.done,
    },
    reminderBtnText: {
      fontSize: 13,
      fontWeight: '700',
      color: theme.textDark,
    },
    reminderBtnTextGranted: {
      color: theme.done,
    },
    // Pro Trial Card
    proTrialCard: {
      backgroundColor: isDarkMode ? '#281F1A' : '#FFF9EE',
      borderRadius: 22,
      padding: 20,
      borderWidth: 1.5,
      borderColor: isDarkMode ? '#4D3627' : '#F6E5CC',
      marginBottom: 20,
    },
    proTrialBadge: {
      alignSelf: 'flex-start',
      backgroundColor: theme.primary,
      borderRadius: 10,
      paddingHorizontal: 8,
      paddingVertical: 3,
      marginBottom: 12,
    },
    proTrialBadgeText: {
      fontSize: 10,
      fontWeight: '800',
      color: '#FFFFFF',
      letterSpacing: 0.5,
    },
    proTrialTitle: {
      fontSize: 18,
      fontWeight: '800',
      color: theme.textDark,
      marginBottom: 6,
    },
    proTrialSubtitle: {
      fontSize: 13,
      color: theme.textMuted,
      lineHeight: 18,
      marginBottom: 14,
    },
    proBenefitsList: {
      gap: 6,
      marginBottom: 18,
    },
    proBenefitItem: {
      fontSize: 13,
      fontWeight: '600',
      color: theme.textDark,
    },
    proTrialBtn: {
      backgroundColor: theme.primary,
      borderRadius: 16,
      paddingVertical: 14,
      alignItems: 'center',
      marginBottom: 10,
    },
    proTrialBtnText: {
      fontSize: 15,
      fontWeight: '800',
      color: '#FFFFFF',
    },
    skipTrialBtn: {
      alignItems: 'center',
      paddingVertical: 8,
    },
    skipTrialBtnText: {
      fontSize: 13,
      fontWeight: '600',
      color: theme.textMuted,
    },
    // Standard Buttons & Form Elements
    checklist: {
      width: '100%',
      marginBottom: 8,
    },
    checklistItem: {
      fontSize: 12,
      color: theme.textMuted,
      marginBottom: 2,
    },
    checklistItemMet: {
      color: theme.done,
    },
    statusChecking: {
      fontSize: 12,
      color: theme.textMuted,
      marginBottom: 8,
    },
    statusAvailable: {
      fontSize: 12,
      color: theme.done,
      marginBottom: 8,
    },
    statusTaken: {
      fontSize: 12,
      color: theme.allergenText,
      marginBottom: 8,
    },
    suggestionsRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      marginBottom: 8,
    },
    chip: {
      backgroundColor: theme.surface,
      borderRadius: 999,
      paddingVertical: 6,
      paddingHorizontal: 14,
      marginRight: 8,
      marginBottom: 8,
      borderWidth: 1,
      borderColor: theme.border,
    },
    chipText: {
      color: theme.textDark,
      fontSize: 13,
      fontWeight: '600',
    },
    primaryBtn: {
      width: '100%',
      backgroundColor: theme.primary,
      borderRadius: 16,
      padding: 16,
      alignItems: 'center',
      marginTop: 8,
    },
    primaryBtnText: {
      color: '#FFFFFF',
      fontSize: 16,
      fontWeight: '700',
    },
    btnDisabled: {
      opacity: 0.45,
    },
    secondaryBtn: {
      width: '100%',
      alignItems: 'center',
      padding: 14,
      marginTop: 8,
    },
    secondaryBtnText: {
      color: theme.textMuted,
      fontSize: 14,
      fontWeight: '600',
    },
    signOutRow: {
      marginTop: 20,
      alignItems: 'center',
    },
    signOutText: {
      color: theme.textMuted,
      fontSize: 13,
    },
  });
}
