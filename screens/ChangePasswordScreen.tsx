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
import { ThemeTokens } from '../lib/themes';
import SwipeBackWrapper from '../components/SwipeBackWrapper';

type Props = {
  onDone: () => void;
  onCancel: () => void;
};

export default function ChangePasswordScreen({ onDone, onCancel }: Props) {
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const [email, setEmail] = useState<string | null>(null);
  const [hasPassword, setHasPassword] = useState<boolean | null>(null);
  const [currentPassword, setCurrentPassword] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setEmail(data.user?.email ?? null);
      // Google-only accounts have no password to verify — skip the
      // current-password gate for them rather than show a field that can
      // never be filled correctly.
      setHasPassword(
        data.user?.app_metadata?.provider === 'email' ||
          (data.user?.identities ?? []).some((i) => i.provider === 'email')
      );
    });
  }, []);

  async function handleSave() {
    if (!isPasswordValid(password)) {
      setError('Password does not meet the requirements below.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    setError('');

    if (hasPassword) {
      if (!currentPassword) {
        setLoading(false);
        setError('Enter your current password.');
        return;
      }
      if (!email) {
        setLoading(false);
        setError('Could not verify your account. Try again.');
        return;
      }
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password: currentPassword,
      });
      if (signInError) {
        setLoading(false);
        setError('Current password is incorrect.');
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
        <Text style={styles.title}>Change password</Text>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        {hasPassword === false ? (
          <Text style={styles.googleNote}>
            Signed in with Google — no password to change here.
          </Text>
        ) : (
          <>
            <TextInput
              style={styles.input}
              placeholder="Current password"
              placeholderTextColor={theme.textMuted}
              value={currentPassword}
              onChangeText={setCurrentPassword}
              secureTextEntry
            />

            <TextInput
              style={styles.input}
              placeholder="New password"
              placeholderTextColor={theme.textMuted}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />
            <TextInput
              style={styles.input}
              placeholder="Confirm new password"
              placeholderTextColor={theme.textMuted}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry
            />

            <View style={styles.checklist}>
              {PASSWORD_REQUIREMENTS.map((req) => {
                const met = req.test(password);
                return (
                  <Text key={req.label} style={[styles.checklistItem, met && styles.checklistItemMet]}>
                    {met ? '✓' : '○'} {req.label}
                  </Text>
                );
              })}
            </View>

            <TouchableOpacity style={styles.button} onPress={handleSave} disabled={loading || hasPassword === null}>
              {loading ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text style={styles.buttonText}>Save</Text>
              )}
            </TouchableOpacity>
          </>
        )}

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
