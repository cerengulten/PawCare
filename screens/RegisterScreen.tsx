import { useMemo, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  ScrollView,
  Linking,
  Platform,
} from 'react-native';
import { supabase } from '../lib/supabase';
import { PASSWORD_REQUIREMENTS, isPasswordValid } from '../lib/passwordPolicy';
import SocialSignInButtons from '../components/SocialSignInButtons';
import { useTheme } from '../lib/ThemeContext';
import { useT } from '../lib/LanguageContext';
import { ThemeTokens } from '../lib/themes';

type Props = {
  onSwitch: () => void;
};

export default function RegisterScreen({ onSwitch }: Props) {
  const { theme } = useTheme();
  const { t } = useT();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  async function handleRegister() {
    if (!email || !password) {
      setError(t('common.fillAllFields'));
      return;
    }
    if (!isPasswordValid(password)) {
      setError(t('auth.passwordFailsRequirements'));
      return;
    }
    setLoading(true);
    setError('');
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) {
      setError(error.message);
    } else if (data?.session) {
      // User automatically signed in when email confirmation is disabled in Supabase
    } else {
      setSuccess(true);
    }
    setLoading(false);
  }

  if (success) {
    return (
      <View style={styles.container}>
        <Text style={styles.paw}>📬</Text>
        <Text style={styles.title}>{t('auth.checkEmailTitle')}</Text>
        <Text style={styles.subtitle}>
          {t('auth.checkEmailConfirm', { email })}
        </Text>
        <TouchableOpacity style={styles.button} onPress={onSwitch}>
          <Text style={styles.buttonText}>{t('auth.goToSignIn')}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <Text style={styles.paw}>🐾</Text>
      <Text style={styles.title}>{t('auth.createAccount')}</Text>
      <Text style={styles.subtitle}>{t('auth.signUpSubtitle')}</Text>

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

      <TouchableOpacity style={styles.button} onPress={handleRegister} disabled={loading}>
        {loading ? (
          <ActivityIndicator color="white" />
        ) : (
          <Text style={styles.buttonText}>{t('auth.createAccount')}</Text>
        )}
      </TouchableOpacity>

      <SocialSignInButtons />

      <View style={styles.termsRow}>
        <Text style={styles.termsNotice}>{t('auth.termsNotice')}</Text>
        <View style={styles.termsLinks}>
          <TouchableOpacity onPress={() => Linking.openURL('https://bisco.app/terms')}>
            <Text style={styles.termsLink}>{t('settings.termsOfService')}</Text>
          </TouchableOpacity>
          <Text style={styles.termsDivider}> · </Text>
          <TouchableOpacity onPress={() => Linking.openURL('https://bisco.app/privacy')}>
            <Text style={styles.termsLink}>{t('settings.privacyPolicy')}</Text>
          </TouchableOpacity>
        </View>
      </View>

      <TouchableOpacity onPress={onSwitch} style={styles.switchRow}>
        <Text style={styles.switchText}>{t('auth.haveAccount')}</Text>
        <Text style={styles.switchLink}>{t('auth.signIn')}</Text>
      </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function makeStyles(theme: ThemeTokens) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.background,
    },
    scrollContent: {
      flexGrow: 1,
      alignItems: 'center',
      justifyContent: 'center',
      padding: 24,
      paddingTop: 60,
      paddingBottom: 40,
    },
    termsRow: {
      marginTop: 20,
      alignItems: 'center',
      paddingHorizontal: 16,
    },
    termsNotice: {
      fontSize: 12,
      color: theme.textMuted,
      textAlign: 'center',
      marginBottom: 6,
    },
    termsLinks: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    termsLink: {
      fontSize: 12,
      color: theme.primary,
      fontWeight: '600',
    },
    termsDivider: {
      fontSize: 12,
      color: theme.textMuted,
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