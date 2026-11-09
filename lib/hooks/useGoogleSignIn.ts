import { NativeModules, Platform } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import { makeRedirectUri } from 'expo-auth-session';
import { supabase } from '../supabase';
import { AUTH_BRIDGE_URL } from '../authBridge';

let configuredNativeGoogle = false;

function tryConfigureNativeGoogle() {
  if (configuredNativeGoogle) return true;
  if (Platform.OS === 'web' || !NativeModules?.RNGoogleSignin) {
    return false;
  }
  try {
    // Dynamic require so OTA updates on existing APK binaries without
    // RNGoogleSignin compiled in do not crash at module load time.
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { GoogleSignin } = require('@react-native-google-signin/google-signin');
    const webClientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;
    const iosClientId = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID;
    GoogleSignin.configure({
      ...(webClientId ? { webClientId } : {}),
      ...(iosClientId ? { iosClientId } : {}),
      offlineAccess: false,
    });
    configuredNativeGoogle = true;
    return true;
  } catch (err) {
    console.warn('[google-signin] Native module not available, using OAuth fallback:', err);
    return false;
  }
}

export function useGoogleSignIn() {
  async function signInWithGoogle() {
    // 1. Prefer Native Android / iOS Google Sign-In (signInWithIdToken) when available
    if (tryConfigureNativeGoogle()) {
      try {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const { GoogleSignin, statusCodes } = require('@react-native-google-signin/google-signin');
        if (Platform.OS === 'android') {
          await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
        }
        const response = await GoogleSignin.signIn();
        // Support both v11/v12 (response.idToken) and v13+ (response.data?.idToken)
        if (response?.type === 'cancelled') {
          return { error: null };
        }
        const idToken: string | undefined = response?.data?.idToken ?? response?.idToken;
        if (idToken) {
          const { error: idTokenError } = await supabase.auth.signInWithIdToken({
            provider: 'google',
            token: idToken,
          });
          return { error: idTokenError };
        }
      } catch (nativeErr: any) {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const { statusCodes } = require('@react-native-google-signin/google-signin');
        if (
          nativeErr?.code === statusCodes?.SIGN_IN_CANCELLED ||
          nativeErr?.code === statusCodes?.IN_PROGRESS
        ) {
          return { error: null };
        }
        console.warn('[google-signin] Native sign-in error, falling back to browser OAuth:', nativeErr);
      }
    }

    // 2. Fallback: Browser OAuth flow via AUTH_BRIDGE_URL
    const redirectUri = makeRedirectUri();
    console.log('[google-signin] redirectUri:', redirectUri);
    const bridgeUrl = `${AUTH_BRIDGE_URL}?target=${encodeURIComponent(redirectUri)}`;
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: bridgeUrl, skipBrowserRedirect: true },
    });
    if (error || !data.url) {
      return { error: error ?? new Error('Could not start Google sign-in') };
    }

    const result = await WebBrowser.openAuthSessionAsync(data.url, redirectUri);
    if (result.type !== 'success') {
      if (result.type === 'cancel' || result.type === 'dismiss') {
        return { error: null };
      }
      return {
        error: new Error('google_signin_failed'),
      };
    }

    const hash = result.url.split('#')[1];
    if (!hash) {
      return { error: new Error('google_signin_failed') };
    }
    const params = new URLSearchParams(hash);
    const access_token = params.get('access_token');
    const refresh_token = params.get('refresh_token');
    if (!access_token || !refresh_token) {
      return { error: new Error('google_signin_failed') };
    }

    const { error: sessionError } = await supabase.auth.setSession({ access_token, refresh_token });
    return { error: sessionError };
  }

  return { signInWithGoogle };
}
