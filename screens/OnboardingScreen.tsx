import { useEffect, useState } from 'react';
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
import { Session, PostgrestError } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { useProfile } from '../lib/hooks/useProfile';
import { useDogs } from '../lib/hooks/useDogs';
import { useDebounce } from '../lib/hooks/useDebounce';
import { USERNAME_REQUIREMENTS, isUsernameFormatValid, suggestUsernames } from '../lib/usernamePolicy';
import PetFormScreen from './PetFormScreen';
import { colors, radii } from '../lib/theme';

type Props = {
  session: Session;
  onComplete: () => void;
};

type Step = 'identity' | 'pet' | 'addAnother';
type UsernameStatus = 'idle' | 'checking' | 'available' | 'taken' | 'invalid';

export default function OnboardingScreen({ onComplete }: Props) {
  const { profile, completeOnboarding, checkUsernameAvailable } = useProfile();
  const { dogs, addDog, updateDog } = useDogs();
  const [step, setStep] = useState<Step>('identity');
  const [fullName, setFullName] = useState(profile?.full_name ?? '');
  const [username, setUsername] = useState('');
  const [usernameStatus, setUsernameStatus] = useState<UsernameStatus>('idle');
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const debouncedUsername = useDebounce(username, 400);

  useEffect(() => {
    const trimmed = debouncedUsername.trim();
    if (!trimmed) {
      setUsernameStatus('idle');
      setSuggestions([]);
      return;
    }
    if (!isUsernameFormatValid(trimmed)) {
      setUsernameStatus('invalid');
      setSuggestions([]);
      return;
    }

    let cancelled = false;
    setUsernameStatus('checking');
    checkUsernameAvailable(trimmed).then(({ available, error }) => {
      if (cancelled) return;
      if (error) {
        // Fail open: a network blip shouldn't strand the user with no way
        // to proceed — the final save is the authoritative check anyway.
        setUsernameStatus('idle');
        return;
      }
      if (available) {
        setUsernameStatus('available');
        setSuggestions([]);
      } else {
        setUsernameStatus('taken');
        generateVerifiedSuggestions(trimmed);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [debouncedUsername]);

  async function generateVerifiedSuggestions(base: string) {
    let verified: string[] = [];
    let attempt = 0;
    while (verified.length < 3 && attempt < 4) {
      const candidates = suggestUsernames(base, 3);
      const results = await Promise.all(
        candidates.map(async (c) => ({ c, ok: (await checkUsernameAvailable(c)).available }))
      );
      verified = Array.from(
        new Set([...verified, ...results.filter((r) => r.ok).map((r) => r.c)])
      ).slice(0, 3);
      attempt++;
    }
    setSuggestions(verified);
  }

  async function handleContinue() {
    const trimmedName = fullName.trim();
    const trimmedUsername = username.trim();
    if (!trimmedName) {
      setError('Please enter your name.');
      return;
    }
    if (!isUsernameFormatValid(trimmedUsername)) {
      setError('Please choose a valid username.');
      return;
    }
    if (usernameStatus === 'taken') {
      setError('That username is taken — pick a suggestion below.');
      return;
    }
    setLoading(true);
    setError('');
    const { error } = await completeOnboarding(trimmedName, trimmedUsername);
    if (error) {
      if ((error as PostgrestError).code === '23505') {
        setError('That username was just taken — try another.');
        setUsernameStatus('taken');
        generateVerifiedSuggestions(trimmedUsername);
      } else {
        setError(error.message);
      }
    } else {
      // Existing users who already added a dog before username existed
      // shouldn't be asked to add another one just to get through this
      // screen again.
      setStep(dogs.length > 0 ? 'addAnother' : 'pet');
    }
    setLoading(false);
  }

  if (step === 'pet') {
    return (
      <PetFormScreen
        dog={null}
        addDog={addDog}
        updateDog={updateDog}
        onDone={() => setStep('addAnother')}
        onCancel={onComplete}
      />
    );
  }

  if (step === 'addAnother') {
    return (
      <View style={styles.container}>
        <Text style={styles.paw}>🐾</Text>
        <Text style={styles.title}>Add another pet?</Text>
        <Text style={styles.subtitle}>You can always add more later too.</Text>

        <TouchableOpacity style={styles.button} onPress={() => setStep('pet')}>
          <Text style={styles.buttonText}>Yes, add another</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.secondaryButton} onPress={onComplete}>
          <Text style={styles.secondaryButtonText}>No, continue to app</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const continueDisabled =
    loading ||
    usernameStatus === 'checking' ||
    usernameStatus === 'taken' ||
    usernameStatus === 'invalid' ||
    !fullName.trim() ||
    !username.trim();

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <Text style={styles.paw}>🐾</Text>
      <Text style={styles.title}>Tell us about you</Text>
      <Text style={styles.subtitle}>We'll use these to set up your account</Text>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <TouchableOpacity onPress={() => supabase.auth.signOut()} style={styles.signOutRow}>
        <Text style={styles.signOutText}>Not you? Sign out</Text>
      </TouchableOpacity>

      <TextInput
        style={styles.input}
        placeholder="Your name"
        placeholderTextColor={colors.textMuted}
        value={fullName}
        onChangeText={setFullName}
        autoCapitalize="words"
      />

      <TextInput
        style={styles.input}
        placeholder="Username"
        placeholderTextColor={colors.textMuted}
        value={username}
        onChangeText={setUsername}
        autoCapitalize="none"
        autoCorrect={false}
      />

      {usernameStatus === 'invalid' && username.length > 0 && (
        <View style={styles.checklist}>
          {USERNAME_REQUIREMENTS.map((req) => {
            const met = req.test(username.trim());
            return (
              <Text key={req.label} style={[styles.checklistItem, met && styles.checklistItemMet]}>
                {met ? '✓' : '○'} {req.label}
              </Text>
            );
          })}
        </View>
      )}

      {usernameStatus === 'checking' && (
        <Text style={styles.statusChecking}>Checking availability…</Text>
      )}

      {usernameStatus === 'available' && (
        <Text style={styles.statusAvailable}>✓ Available</Text>
      )}

      {usernameStatus === 'taken' && (
        <View>
          <Text style={styles.statusTaken}>✗ Not available</Text>
          {suggestions.length > 0 && (
            <View style={styles.suggestionsRow}>
              {suggestions.map((s) => (
                <TouchableOpacity key={s} style={styles.chip} onPress={() => setUsername(s)}>
                  <Text style={styles.chipText}>{s}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>
      )}

      <TouchableOpacity
        style={styles.button}
        onPress={handleContinue}
        disabled={continueDisabled}
      >
        {loading ? (
          <ActivityIndicator color="white" />
        ) : (
          <Text style={styles.buttonText}>Continue</Text>
        )}
      </TouchableOpacity>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
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
    color: colors.textDark,
    marginBottom: 6,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: colors.textMuted,
    marginBottom: 32,
    textAlign: 'center',
  },
  error: {
    color: colors.allergenText,
    fontSize: 13,
    marginBottom: 12,
    textAlign: 'center',
  },
  input: {
    width: '100%',
    backgroundColor: colors.card,
    borderRadius: radii.card,
    padding: 16,
    fontSize: 15,
    color: colors.textDark,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  checklist: {
    width: '100%',
    marginBottom: 4,
  },
  checklistItem: {
    fontSize: 12,
    color: colors.textMuted,
    marginBottom: 2,
  },
  checklistItemMet: {
    color: colors.doneGreen,
  },
  statusChecking: {
    width: '100%',
    fontSize: 12,
    color: colors.textMuted,
    marginBottom: 8,
  },
  statusAvailable: {
    width: '100%',
    fontSize: 12,
    color: colors.doneGreen,
    marginBottom: 8,
  },
  statusTaken: {
    width: '100%',
    fontSize: 12,
    color: colors.allergenText,
    marginBottom: 8,
  },
  suggestionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 8,
  },
  chip: {
    backgroundColor: colors.card,
    borderRadius: 999,
    paddingVertical: 6,
    paddingHorizontal: 14,
    marginRight: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  chipText: {
    color: colors.textDark,
    fontSize: 13,
    fontWeight: '600',
  },
  button: {
    width: '100%',
    backgroundColor: colors.primaryGreen,
    borderRadius: radii.card,
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButton: {
    width: '100%',
    alignItems: 'center',
    padding: 16,
    marginTop: 8,
  },
  secondaryButtonText: {
    color: colors.textMuted,
    fontSize: 14,
    fontWeight: '600',
  },
  signOutRow: {
    marginBottom: 16,
  },
  signOutText: {
    color: colors.textMuted,
    fontSize: 13,
  },
});
