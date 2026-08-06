import { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Platform } from 'react-native';
import * as AppleAuthentication from 'expo-apple-authentication';
import { useGoogleSignIn } from '../lib/hooks/useGoogleSignIn';
import { useAppleSignIn } from '../lib/hooks/useAppleSignIn';
import { colors, radii } from '../lib/theme';

// Apple sign-in isn't configured in Supabase yet (pending the Apple Developer
// Program membership decision). Flip this once that's done and the provider
// is set up — the button would otherwise render but fail on tap.
const APPLE_SIGN_IN_ENABLED = false;

export default function SocialSignInButtons() {
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
        <Text style={styles.dividerText}>or</Text>
        <View style={styles.dividerLine} />
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <TouchableOpacity style={styles.button} onPress={handleGoogle} disabled={loadingProvider !== null}>
        {loadingProvider === 'google' ? (
          <ActivityIndicator color={colors.primaryGreen} />
        ) : (
          <Text style={styles.buttonText}>Continue with Google</Text>
        )}
      </TouchableOpacity>

      {APPLE_SIGN_IN_ENABLED && Platform.OS === 'ios' && appleAvailable ? (
        <TouchableOpacity style={styles.button} onPress={handleApple} disabled={loadingProvider !== null}>
          {loadingProvider === 'apple' ? (
            <ActivityIndicator color={colors.primaryGreen} />
          ) : (
            <Text style={styles.buttonText}>Continue with Apple</Text>
          )}
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
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
    backgroundColor: colors.cardBorder,
  },
  dividerText: {
    color: colors.textMuted,
    fontSize: 13,
    marginHorizontal: 8,
  },
  error: {
    color: colors.allergenText,
    fontSize: 13,
    marginBottom: 12,
    textAlign: 'center',
  },
  button: {
    width: '100%',
    backgroundColor: colors.card,
    borderRadius: radii.card,
    padding: 16,
    alignItems: 'center',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  buttonText: {
    color: colors.textDark,
    fontSize: 16,
    fontWeight: '600',
  },
});
