import { useMemo, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { supabase } from '../lib/supabase';
import { PASSWORD_REQUIREMENTS, isPasswordValid } from '../lib/passwordPolicy';
import { useTheme } from '../lib/ThemeContext';
import { useT } from '../lib/LanguageContext';
import { ThemeTokens } from '../lib/themes';

type Props = {
  onDone: () => void;
};

// Reached only via a password-recovery deep link (see App.tsx's Linking
// handler) — arriving here at all already proves control of the email
// account, so unlike ChangePasswordScreen.tsx this doesn't re-verify a
// current password.
export default function SetNewPasswordScreen({ onDone }: Props) {
  const { theme } = useTheme();
  const { t } = useT();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSave() {
    if (!isPasswordValid(password)) {
      setError(t('auth.passwordFailsRequirements'));
      return;
    }
    if (password !== confirmPassword) {
      setError(t('auth.passwordsDoNotMatch'));
      return;
    }

    setLoading(true);
    setError('');
    const { error } = await supabase.auth.updateUser({ password });
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
      <Text style={styles.paw}>🔑</Text>
      <Text style={styles.title}>{t('auth.setNewPasswordTitle')}</Text>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <TextInput
        style={styles.input}
        placeholder={t('auth.newPassword')}
        placeholderTextColor={theme.textMuted}
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />
      <TextInput
        style={styles.input}
        placeholder={t('auth.confirmNewPassword')}
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

      <TouchableOpacity style={styles.button} onPress={handleSave} disabled={loading}>
        {loading ? (
          <ActivityIndicator color="white" />
        ) : (
          <Text style={styles.buttonText}>{t('common.save')}</Text>
        )}
      </TouchableOpacity>
    </KeyboardAvoidingView>
  );
}

function makeStyles(theme: ThemeTokens) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.background,
      alignItems: 'center',
      justifyContent: 'center',
      padding: 24,
    },
    paw: {
      fontSize: 48,
      marginBottom: 12,
    },
    title: {
      fontSize: 26,
      fontWeight: '700',
      color: theme.textDark,
      marginBottom: 20,
      textAlign: 'center',
    },
    error: {
      color: theme.allergenText,
      fontSize: 13,
      marginBottom: 12,
      textAlign: 'center',
    },
    input: {
      width: '100%',
      backgroundColor: theme.surface,
      borderRadius: theme.radiiCard,
      padding: 16,
      fontSize: 15,
      color: theme.textDark,
      marginBottom: 12,
      borderWidth: 1,
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
  });
}
