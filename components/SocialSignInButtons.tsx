import { useEffect, useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Platform } from 'react-native';
import * as AppleAuthentication from 'expo-apple-authentication';
import { FontAwesome5 } from '@expo/vector-icons';
import { useGoogleSignIn } from '../lib/hooks/useGoogleSignIn';
import { useAppleSignIn } from '../lib/hooks/useAppleSignIn';
import { useTheme } from '../lib/ThemeContext';
import { useT } from '../lib/LanguageContext';
import { ThemeTokens } from '../lib/themes';
import { formatAuthError } from '../lib/authErrors';

const APPLE_SIGN_IN_ENABLED = true;

type Props = {
  hideDivider?: boolean;
  dividerPosition?: 'top' | 'bottom';
  dividerText?: string;
};

export default function SocialSignInButtons({
  hideDivider = false,
  dividerPosition = 'top',
  dividerText,
}: Props) {
  const { theme, isDarkMode } = useTheme();
  const { t } = useT();
  const styles = useMemo(() => makeStyles(theme, isDarkMode), [theme, isDarkMode]);
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
    if (error) setError(formatAuthError(error, t));
    setLoadingProvider(null);
  }

  async function handleApple() {
    setError('');
    setLoadingProvider('apple');
    const { error } = await signInWithApple();
    if (error) setError(formatAuthError(error, t));
    setLoadingProvider(null);
  }

  const divider = !hideDivider ? (
    <View style={styles.divider}>
      <View style={styles.dividerLine} />
      <Text style={styles.dividerText}>{dividerText || t('auth.orEmail') || '— or continue with email —'}</Text>
      <View style={styles.dividerLine} />
    </View>
  ) : null;

  return (
    <View style={styles.container}>
      {dividerPosition === 'top' ? divider : null}

      {error ? <Text style={styles.error}>{error}</Text> : null}

      {APPLE_SIGN_IN_ENABLED && Platform.OS === 'ios' && appleAvailable ? (
        <TouchableOpacity
          style={styles.appleButton}
          onPress={handleApple}
          disabled={loadingProvider !== null}
          activeOpacity={0.85}
        >
          {loadingProvider === 'apple' ? (
            <ActivityIndicator color={isDarkMode ? '#000000' : '#FFFFFF'} />
          ) : (
            <View style={styles.buttonInner}>
              <FontAwesome5 name="apple" size={18} color={isDarkMode ? '#000000' : '#FFFFFF'} style={styles.buttonIcon} />
              <Text style={styles.appleButtonText}>{t('auth.continueWithApple')}</Text>
            </View>
          )}
        </TouchableOpacity>
      ) : null}

      <TouchableOpacity
        style={styles.googleButton}
        onPress={handleGoogle}
        disabled={loadingProvider !== null}
        activeOpacity={0.85}
      >
        {loadingProvider === 'google' ? (
          <ActivityIndicator color={theme.primary} />
        ) : (
          <View style={styles.buttonInner}>
            <FontAwesome5 name="google" size={16} color="#EA4335" style={styles.buttonIcon} />
            <Text style={styles.googleButtonText}>{t('auth.continueWithGoogle')}</Text>
          </View>
        )}
      </TouchableOpacity>

      {dividerPosition === 'bottom' ? divider : null}
    </View>
  );
}

function makeStyles(theme: ThemeTokens, isDarkMode = false) {
  return StyleSheet.create({
    container: {
      width: '100%',
    },
    divider: {
      flexDirection: 'row',
      alignItems: 'center',
      marginVertical: 18,
    },
    dividerLine: {
      flex: 1,
      height: 1,
      backgroundColor: theme.border,
    },
    dividerText: {
      color: theme.textMuted,
      fontSize: 12,
      fontWeight: '600',
      marginHorizontal: 10,
    },
    error: {
      color: theme.allergenText,
      fontSize: 13,
      marginBottom: 12,
      textAlign: 'center',
    },
    buttonInner: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
    },
    buttonIcon: {
      marginRight: 10,
    },
    appleButton: {
      width: '100%',
      backgroundColor: isDarkMode ? '#FFFFFF' : '#000000',
      borderRadius: 16,
      paddingVertical: 14,
      paddingHorizontal: 16,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 10,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.08,
      shadowRadius: 4,
      elevation: 2,
    },
    appleButtonText: {
      color: isDarkMode ? '#000000' : '#FFFFFF',
      fontSize: 15,
      fontWeight: '700',
    },
    googleButton: {
      width: '100%',
      backgroundColor: isDarkMode ? '#24221E' : '#FFFFFF',
      borderRadius: 16,
      paddingVertical: 14,
      paddingHorizontal: 16,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 6,
      borderWidth: 1,
      borderColor: isDarkMode ? '#3D3830' : '#E8E2D5',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.04,
      shadowRadius: 4,
      elevation: 1,
    },
    googleButtonText: {
      color: theme.textDark,
      fontSize: 15,
      fontWeight: '700',
    },
  });
}
