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
import SocialSignInButtons from '../components/SocialSignInButtons';
import ForgotPasswordScreen from './ForgotPasswordScreen';
import { useTheme } from '../lib/ThemeContext';
import { useT } from '../lib/LanguageContext';
import { ThemeTokens } from '../lib/themes';

type Props = {
  onSwitch: () => void;
};

export default function LoginScreen({ onSwitch }: Props) {
  const { theme } = useTheme();
  const { t } = useT();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showForgotPassword, setShowForgotPassword] = useState(false);

  async function handleLogin() {
    if (!email || !password) {
      setError(t('common.fillAllFields'));
      return;
    }
    setLoading(true);
    setError('');
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) setError(error.message);
    setLoading(false);
  }

  if (showForgotPassword) {
    return <ForgotPasswordScreen onBack={() => setShowForgotPassword(false)} />;
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <Text style={styles.paw}>🐾</Text>
      <Text style={styles.title}>{t('auth.welcomeBack')}</Text>
      <Text style={styles.subtitle}>{t('auth.signInSubtitle')}</Text>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <TextInput
        style={styles.input}
        placeholder={t('auth.email')}
        placeholderTextColor={theme.textMuted}
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
      />
      <TextInput
        style={styles.input}
        placeholder={t('auth.password')}
        placeholderTextColor={theme.textMuted}
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />

      <TouchableOpacity onPress={() => setShowForgotPassword(true)} style={styles.forgotRow}>
        <Text style={styles.switchLink}>{t('auth.forgotPassword')}</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.button} onPress={handleLogin} disabled={loading}>
        {loading ? (
          <ActivityIndicator color="white" />
        ) : (
          <Text style={styles.buttonText}>{t('auth.signIn')}</Text>
        )}
      </TouchableOpacity>

      <SocialSignInButtons />

      <TouchableOpacity onPress={onSwitch} style={styles.switchRow}>
        <Text style={styles.switchText}>{t('auth.noAccount')}</Text>
        <Text style={styles.switchLink}>{t('auth.signUp')}</Text>
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
      marginBottom: 6,
    },
    subtitle: {
      fontSize: 14,
      color: theme.textMuted,
      marginBottom: 32,
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
    forgotRow: {
      width: '100%',
      alignItems: 'flex-end',
      marginBottom: 4,
    },
    switchRow: {
      flexDirection: 'row',
      marginTop: 24,
    },
    switchText: {
      color: theme.textMuted,
      fontSize: 14,
    },
    switchLink: {
      color: theme.primary,
      fontSize: 14,
      fontWeight: '600',
    },
  });
}