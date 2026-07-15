import * as WebBrowser from 'expo-web-browser';
import { makeRedirectUri } from 'expo-auth-session';
import { supabase } from '../supabase';

export function useGoogleSignIn() {
  async function signInWithGoogle() {
    const redirectUri = makeRedirectUri();
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: redirectUri, skipBrowserRedirect: true },
    });
    if (error || !data.url) {
      return { error: error ?? new Error('Could not start Google sign-in') };
    }

    const result = await WebBrowser.openAuthSessionAsync(data.url, redirectUri);
    if (result.type !== 'success') {
      return { error: null };
    }

    const hash = result.url.split('#')[1];
    if (!hash) {
      return { error: new Error('No session returned from Google sign-in') };
    }
    const params = new URLSearchParams(hash);
    const access_token = params.get('access_token');
    const refresh_token = params.get('refresh_token');
    if (!access_token || !refresh_token) {
      return { error: new Error('No session returned from Google sign-in') };
    }

    const { error: sessionError } = await supabase.auth.setSession({ access_token, refresh_token });
    return { error: sessionError };
  }

  return { signInWithGoogle };
}
