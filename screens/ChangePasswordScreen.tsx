import { useEffect, useMemo, useState } from 'react';
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
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../lib/supabase';
import { PASSWORD_REQUIREMENTS, isPasswordValid } from '../lib/passwordPolicy';
import { useTheme } from '../lib/ThemeContext';
import { useT } from '../lib/LanguageContext';
import { ThemeTokens } from '../lib/themes';
import SwipeBackWrapper from '../components/SwipeBackWrapper';

type Props = {
  onDone: () => void;
  onCancel: () => void;
};

export default function ChangePasswordScreen({ onDone, onCancel }: Props) {
  const { theme } = useTheme();
  const { t } = useT();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const [email, setEmail] = useState<string | null>(null);
  const [hasPassword, setHasPassword] = useState<boolean | null>(null);
  const [currentPassword, setCurrentPassword] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      const user = session?.user;
      setEmail(user?.email ?? null);
      // Google-only accounts have no password to verify — skip the
      // current-password gate for them rather than show a field that can
      // never be filled correctly.
      setHasPassword(
        user?.app_metadata?.provider === 'email' ||
          (user?.identities ?? []).some((i) => i.provider === 'email')
      );
    });
  }, []);

  async function handleSave() {
    if (!isPasswordValid(password)) {
      setError(t('changePassword.passwordFailsRequirements'));
      return;
    }
    if (password !== confirmPassword) {
      setError(t('changePassword.passwordsDoNotMatch'));
      return;
    }

    setLoading(true);
    setError('');

    if (hasPassword) {
      if (!currentPassword) {
        setLoading(false);
        setError(t('changePassword.enterCurrentPassword'));
        return;
      }
      if (!email) {
        setLoading(false);
        setError(t('changePassword.couldNotVerify'));
        return;
      }
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password: currentPassword,
      });
      if (signInError) {
        setLoading(false);
        setError(t('changePassword.currentPasswordIncorrect'));
        return;
      }
    }

    const { error } = await supabase.auth.updateUser({ password });
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
        <Text style={styles.title}>{t('changePassword.title')}</Text>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        {hasPassword === false ? (
          <Text style={styles.googleNote}>
            {t('changePassword.googleNote')}
          </Text>
        ) : (
          <>
            <TextInput
              style={styles.input}
              placeholder={t('changePassword.currentPassword')}
              placeholderTextColor={theme.textMuted}
              value={currentPassword}
              onChangeText={setCurrentPassword}
              secureTextEntry
            />

            <TextInput
              style={styles.input}
              placeholder={t('changePassword.newPassword')}
              placeholderTextColor={theme.textMuted}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />
            <TextInput
              style={styles.input}
              placeholder={t('changePassword.confirmNewPassword')}
              placeholderTextColor={theme.textMuted}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry
            />

            <View style={styles.checklist}>
              {PASSWORD_REQUIREMENTS.map((req) => {
                const met = req.test(password);
                return (
                  <Text key={req.labelKey} style={[styles.checklistItem, met && styles.checklistItemMet]}>
                    {met ? '✓' : '○'} {t(req.labelKey)}
                  </Text>
                );
              })}
            </View>

            <TouchableOpacity style={styles.button} onPress={handleSave} disabled={loading || hasPassword === null}>
              {loading ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text style={styles.buttonText}>{t('common.save')}</Text>
              )}
            </TouchableOpacity>
          </>
        )}

        <TouchableOpacity onPress={onCancel} style={styles.switchRow}>
          <Text style={styles.switchLink}>{t('common.cancel')}</Text>
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
    googleNote: {
      fontSize: 14,
      color: theme.textMuted,
      textAlign: 'center',
      marginTop: 8,
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
    checklist: {
      width: '100%',
      marginBottom: 4,
    },
    checklistItem: {
      fontSize: 12,
      color: theme.textMuted,
      marginBottom: 2,
    },
    checklistItemMet: {
      color: theme.done,
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
