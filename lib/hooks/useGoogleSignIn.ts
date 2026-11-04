import * as WebBrowser from 'expo-web-browser';
import { makeRedirectUri } from 'expo-auth-session';
import { supabase } from '../supabase';
import { AUTH_BRIDGE_URL } from '../authBridge';

export function useGoogleSignIn() {
  async function signInWithGoogle() {
    const redirectUri = makeRedirectUri();
    console.log('[google-signin] redirectUri:', redirectUri);
    // Route through the GitHub Pages auth-bridge page instead of passing
    // redirectUri straight to Supabase: confirmed via a real sign-in attempt
    // that GoTrue accepts a custom-scheme redirect_to (exp://<lan-ip>:<port>)
    // at the start of the flow, but its final redirect silently falls back to
    // the default Site URL for non-http(s) schemes — even when allowlisted.
    // (A first attempt hosted this bridge as a Supabase Edge Function, but
    // Supabase forces text/plain + a script-blocking CSP on Edge Function/
    // Storage HTML responses on this plan tier, so it's on GitHub Pages
    // instead — see docs/auth-bridge/index.html.) The bridge is a plain https
    // page GoTrue redirects to correctly, which then JS-redirects into
    // redirectUri itself.
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
        // User voluntarily dismissed or cancelled the modal; do not show error
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
