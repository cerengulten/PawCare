import { useEffect, useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Platform } from 'react-native';
import * as AppleAuthentication from 'expo-apple-authentication';
import { useGoogleSignIn } from '../lib/hooks/useGoogleSignIn';
import { useAppleSignIn } from '../lib/hooks/useAppleSignIn';
import { useTheme } from '../lib/ThemeContext';
import { useT } from '../lib/LanguageContext';
import { ThemeTokens } from '../lib/themes';

// Apple sign-in is required on iOS alongside Google Sign-In per App Store Guideline 4.8.
// When running on iOS, AppleAuthentication.isAvailableAsync() determines availability.
const APPLE_SIGN_IN_ENABLED = true;

export default function SocialSignInButtons() {
  const { theme } = useTheme();
  const { t } = useT();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const { signInWithGoogle } = useGoogleSignIn();
  const { signInWithApple } = useAppleSignIn();
  const [appleAvailable, setAppleAvailable] = useState(false);
  const [loadingProvider, setLoadingProvider] = useState<'google' | 'apple' | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (APPLE_SIGN_IN_ENABLED && Platform.OS === 'ios') {
      AppleAuthentication.isAvailableAsync().then(setAppleAvailable);
    }
  }, []);

  async function handleGoogle() {
    setError('');
    setLoadingProvider('google');
    const { error } = await signInWithGoogle();
    if (error) setError(error.message);
    setLoadingProvider(null);
  }

  async function handleApple() {
    setError('');
    setLoadingProvider('apple');
    const { error } = await signInWithApple();
    if (error) setError(error.message);
    setLoadingProvider(null);
  }

  return (
    <View style={styles.container}>
      <View style={styles.divider}>
        <View style={styles.dividerLine} />
        <Text style={styles.dividerText}>{t('auth.orDivider')}</Text>
        <View style={styles.dividerLine} />
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      {APPLE_SIGN_IN_ENABLED && Platform.OS === 'ios' && appleAvailable ? (
        <TouchableOpacity style={styles.button} onPress={handleApple} disabled={loadingProvider !== null}>
          {loadingProvider === 'apple' ? (
            <ActivityIndicator color={theme.primary} />
          ) : (
            <Text style={styles.buttonText}>{t('auth.continueWithApple')}</Text>
          )}
        </TouchableOpacity>
      ) : null}

      <TouchableOpacity style={styles.button} onPress={handleGoogle} disabled={loadingProvider !== null}>
        {loadingProvider === 'google' ? (
          <ActivityIndicator color={theme.primary} />
        ) : (
          <Text style={styles.buttonText}>{t('auth.continueWithGoogle')}</Text>
        )}
      </TouchableOpacity>
    </View>
  );
}

function makeStyles(theme: ThemeTokens) {
  return StyleSheet.create({
    container: {
      width: '100%',
      marginTop: 16,
    },
    divider: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 16,
    },
    dividerLine: {
      flex: 1,
      height: 1,
      backgroundColor: theme.border,
    },
    dividerText: {
      color: theme.textMuted,
      fontSize: 13,
      marginHorizontal: 8,
    },
    error: {
      color: theme.allergenText,
      fontSize: 13,
      marginBottom: 12,
      textAlign: 'center',
    },
    button: {
      width: '100%',
      backgroundColor: theme.surface,
      borderRadius: theme.radiiCard,
      padding: 16,
      alignItems: 'center',
      marginBottom: 12,
      borderWidth: 1,
      borderColor: theme.border,
    },
    buttonText: {
      color: theme.textDark,
      fontSize: 16,
      fontWeight: '600',
    },
  });
}
