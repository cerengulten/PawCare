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
import * as ImagePicker from 'expo-image-picker';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../lib/supabase';
import { Profile } from '../types';
import { useProfile } from '../lib/hooks/useProfile';
import { useDebounce } from '../lib/hooks/useDebounce';
import { USERNAME_REQUIREMENTS, isUsernameFormatValid, usernameCooldown } from '../lib/usernamePolicy';
import { useTheme } from '../lib/ThemeContext';
import { useT } from '../lib/LanguageContext';
import { ThemeTokens } from '../lib/themes';
import SwipeBackWrapper from '../components/SwipeBackWrapper';
import ChangePasswordScreen from './ChangePasswordScreen';
import ChangeEmailScreen from './ChangeEmailScreen';
import DeleteAccountScreen from './DeleteAccountScreen';

type UseProfileReturn = ReturnType<typeof useProfile>;

type Props = {
  profile: Profile | null;
  updateProfile: UseProfileReturn['updateProfile'];
  checkUsernameAvailable: UseProfileReturn['checkUsernameAvailable'];
  onDone: () => void;
  onCancel: () => void;
};

type UsernameStatus = 'idle' | 'checking' | 'available' | 'taken' | 'invalid';
type SubScreen = 'password' | 'email' | 'delete' | null;

export default function ProfileScreen({ profile, updateProfile, checkUsernameAvailable, onDone, onCancel }: Props) {
  const { theme } = useTheme();
  const { t } = useT();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const [fullName, setFullName] = useState(profile?.full_name ?? '');
  const [username, setUsername] = useState(profile?.username ?? '');
  const [photoUri, setPhotoUri] = useState<string | null>(profile?.avatar_url ?? null);
  const [usernameStatus, setUsernameStatus] = useState<UsernameStatus>('idle');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [subScreen, setSubScreen] = useState<SubScreen>(null);

  const { active: cooldownActive, unlockDate } = usernameCooldown(profile?.username_changed_at ?? null);

  const debouncedUsername = useDebounce(username, 400);

  useEffect(() => {
    const trimmed = debouncedUsername.trim();
    if (!trimmed || trimmed === (profile?.username ?? '')) {
      // Own current username never needs re-checking — is_username_available
      // doesn't exclude the caller's own row, so it would otherwise report
      // "taken" for a value that's already this user's.
      setUsernameStatus('idle');
      return;
    }
    if (cooldownActive) {
      setUsernameStatus('idle');
      return;
    }
    if (!isUsernameFormatValid(trimmed)) {
      setUsernameStatus('invalid');
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
      setUsernameStatus(available ? 'available' : 'taken');
    });
    return () => {
      cancelled = true;
    };
  }, [debouncedUsername, cooldownActive]);

  async function pickPhoto() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setError(t('profile.photoPermission'));
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
    const trimmedName = fullName.trim();
    const trimmedUsername = username.trim();
    if (!trimmedName) {
      setError(t('profile.nameRequired'));
      return;
    }
    if (!trimmedUsername) {
      setError(t('profile.usernameRequired'));
      return;
    }
    const usernameChanged = trimmedUsername !== (profile?.username ?? '');
    if (usernameChanged && cooldownActive) {
      setError(t('profile.cooldownNotice', { date: unlockDate?.toLocaleDateString() ?? '' }));
      return;
    }
    if (usernameChanged && !isUsernameFormatValid(trimmedUsername)) {
      setError(t('profile.usernameFailsRequirements'));
      return;
    }
    if (usernameChanged && usernameStatus === 'taken') {
      setError(t('profile.usernameAlreadyTaken'));
      return;
    }

    setLoading(true);
    setError('');
    const { error } = await updateProfile({
      full_name: trimmedName,
      username: trimmedUsername,
      avatar_url: photoUri,
    });
    setLoading(false);
    if (error) {
      // Defense in depth: the DB trigger (profiles_username_cooldown) rejects
      // a change the client-side cooldownActive check somehow missed (e.g.
      // stale profile prop) with this error code.
      setError(
        error.message.includes('username_cooldown_active')
          ? t('profile.changedTooRecently')
          : error.message
      );
      return;
    }
    onDone();
  }

  function handleSignOut() {
    supabase.auth.signOut();
  }

  if (subScreen === 'password') {
    return <ChangePasswordScreen onDone={() => setSubScreen(null)} onCancel={() => setSubScreen(null)} />;
  }
  if (subScreen === 'email') {
    return <ChangeEmailScreen onDone={() => setSubScreen(null)} onCancel={() => setSubScreen(null)} />;
  }
  if (subScreen === 'delete') {
    return <DeleteAccountScreen onCancel={() => setSubScreen(null)} />;
  }

  return (
    <SwipeBackWrapper onBack={onCancel}>
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.title}>{t('profile.title')}</Text>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <TouchableOpacity onPress={pickPhoto} style={styles.photoPicker}>
          {photoUri ? (
            <Image source={{ uri: photoUri }} style={styles.photoPreview} />
          ) : (
            <Text style={styles.photoPickerText}>{t('profile.addPhoto')}</Text>
          )}
        </TouchableOpacity>

        <Text style={styles.sectionLabel}>{t('profile.fullName')}</Text>
        <TextInput
          style={styles.input}
          placeholder={t('profile.fullName')}
          placeholderTextColor={theme.textMuted}
          value={fullName}
          onChangeText={setFullName}
        />

        <Text style={styles.sectionLabel}>{t('profile.username')}</Text>
        <TextInput
          style={[styles.input, cooldownActive && styles.inputDisabled]}
          placeholder={t('profile.username')}
          placeholderTextColor={theme.textMuted}
          value={username}
          onChangeText={(v) => setUsername(v.replace(/\s/g, ''))}
          autoCapitalize="none"
          editable={!cooldownActive}
        />
        {cooldownActive ? (
          <Text style={styles.usernameTaken}>
            {t('profile.cooldownNotice', { date: unlockDate?.toLocaleDateString() ?? '' })}
          </Text>
        ) : username.trim() && username.trim() !== (profile?.username ?? '') ? (
          <View style={styles.requirements}>
            {USERNAME_REQUIREMENTS.map((req) => (
              <Text
                key={req.labelKey}
                style={[styles.requirement, req.test(username.trim()) && styles.requirementMet]}
              >
                {req.test(username.trim()) ? '✓' : '·'} {t(req.labelKey, req.labelParams)}
              </Text>
            ))}
            {usernameStatus === 'checking' ? (
              <Text style={styles.requirement}>{t('profile.checkingAvailability')}</Text>
            ) : usernameStatus === 'taken' ? (
              <Text style={styles.usernameTaken}>{t('profile.usernameTaken')}</Text>
            ) : usernameStatus === 'available' ? (
              <Text style={styles.usernameAvailable}>{t('profile.usernameAvailable')}</Text>
            ) : null}
          </View>
        ) : null}

        <TouchableOpacity style={styles.button} onPress={handleSave} disabled={loading}>
          {loading ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text style={styles.buttonText}>{t('common.save')}</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity onPress={onCancel} style={styles.switchRow}>
          <Text style={styles.switchLink}>{t('common.cancel')}</Text>
        </TouchableOpacity>

        <Text style={styles.accountSectionLabel}>{t('profile.account')}</Text>
        <View style={styles.card}>
          <TouchableOpacity style={styles.row} onPress={() => setSubScreen('password')}>
            <Text style={styles.rowTitle}>{t('settings.changePassword')}</Text>
            <Text style={styles.chevron}>›</Text>
          </TouchableOpacity>
          <View style={styles.divider} />
          <TouchableOpacity style={styles.row} onPress={() => setSubScreen('email')}>
            <Text style={styles.rowTitle}>{t('settings.changeEmail')}</Text>
            <Text style={styles.chevron}>›</Text>
          </TouchableOpacity>
          <View style={styles.divider} />
          <TouchableOpacity style={styles.row} onPress={() => setSubScreen('delete')}>
            <Text style={styles.rowTitleDanger}>{t('settings.deleteAccount')}</Text>
            <Text style={styles.chevron}>›</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.signOutRow} onPress={handleSignOut}>
          <Text style={styles.signOutText}>{t('profile.signOut')}</Text>
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
    inputDisabled: {
      backgroundColor: theme.surfaceAlt,
      color: theme.textMuted,
    },
    requirements: {
      width: '100%',
      marginBottom: 12,
    },
    requirement: {
      fontSize: 12,
      color: theme.textMuted,
      marginBottom: 2,
    },
    requirementMet: {
      color: theme.primary,
    },
    usernameTaken: {
      fontSize: 12,
      color: theme.allergenText,
      marginTop: 2,
    },
    usernameAvailable: {
      fontSize: 12,
      color: theme.primary,
      marginTop: 2,
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
    accountSectionLabel: {
      width: '100%',
      fontSize: 12,
      fontWeight: '600',
      color: theme.textMuted,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
      marginTop: 28,
      marginBottom: 8,
    },
    card: {
      width: '100%',
      backgroundColor: theme.surface,
      borderRadius: theme.radiiCard,
      borderWidth: 0.5,
      borderColor: theme.border,
      overflow: 'hidden',
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: 16,
    },
    rowTitle: {
      fontSize: 15,
      color: theme.textDark,
      fontWeight: '500',
    },
    rowTitleDanger: {
      fontSize: 15,
      color: theme.allergenText,
      fontWeight: '500',
    },
    chevron: {
      fontSize: 18,
      color: theme.textMuted,
    },
    divider: {
      height: 0.5,
      backgroundColor: theme.border,
      marginLeft: 16,
    },
    signOutRow: {
      marginTop: 32,
      paddingTop: 20,
      borderTopWidth: 0.5,
      borderTopColor: theme.border,
      width: '100%',
      alignItems: 'center',
    },
    signOutText: {
      color: theme.pendingAmberText,
      fontSize: 15,
      fontWeight: '600',
    },
  });
}
