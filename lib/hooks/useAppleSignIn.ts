import * as AppleAuthentication from 'expo-apple-authentication';
import * as Crypto from 'expo-crypto';
import { supabase } from '../supabase';

export function useAppleSignIn() {
  async function signInWithApple() {
    const rawNonce = Crypto.randomUUID();
    const hashedNonce = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, rawNonce);

    let credential: AppleAuthentication.AppleAuthenticationCredential;
    try {
      credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
        nonce: hashedNonce,
      });
    } catch (err) {
      const code = (err as { code?: string }).code;
      if (code === 'ERR_REQUEST_CANCELED') {
        return { error: null };
      }
      return { error: err instanceof Error ? err : new Error('Apple sign-in failed') };
    }

    if (!credential.identityToken) {
      return { error: new Error('No identity token returned from Apple sign-in') };
    }

    const { error } = await supabase.auth.signInWithIdToken({
      provider: 'apple',
      token: credential.identityToken,
      nonce: rawNonce,
    });

    return { error };
  }

  return { signInWithApple };
}
