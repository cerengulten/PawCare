import { useEffect, useState } from 'react';
import { View, ActivityIndicator, StyleSheet, Linking } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { supabase } from './lib/supabase';
import { Session } from '@supabase/supabase-js';
import LoginScreen from './screens/LoginScreen';
import RegisterScreen from './screens/RegisterScreen';
import AppTabs from './screens/AppTabs';
import OnboardingScreen from './screens/OnboardingScreen';
import SetNewPasswordScreen from './screens/SetNewPasswordScreen';
import { useProfile } from './lib/hooks/useProfile';
import { useDogs } from './lib/hooks/useDogs';
import { useSelectedPet } from './lib/hooks/useSelectedPet';
import { ThemeProvider, useTheme } from './lib/ThemeContext';

// Parses the `bisco://reset-password#access_token=...&refresh_token=...&type=recovery`
// deep link Supabase's password-reset email sends the user to (see
// ForgotPasswordScreen.tsx's resetPasswordForEmail redirectTo). Manual parsing
// mirrors useGoogleSignIn.ts's OAuth callback handling — detectSessionInUrl is
// false in lib/supabase.ts (correct for RN, no window.location to auto-parse),
// so nothing else in the app will pick this up on its own.
function parseRecoveryUrl(url: string): { access_token: string; refresh_token: string } | null {
  const hash = url.split('#')[1];
  if (!hash) return null;
  const params = new URLSearchParams(hash);
  if (params.get('type') !== 'recovery') return null;
  const access_token = params.get('access_token');
  const refresh_token = params.get('refresh_token');
  if (!access_token || !refresh_token) return null;
  return { access_token, refresh_token };
}

function AuthedApp({ session }: { session: Session }) {
  const { theme, setTheme } = useTheme();
  // Lifted here (rather than let each screen own its own useProfile()
  // instance) for the same reason as dogsState below — HomeScreen and
  // MoreScreen each used to fetch their own copy, so editing the profile
  // photo/name/username in one place (ProfileScreen, opened from Home)
  // never showed up on More until the app restarted. See the "onboarding's
  // first pet missing from Pets tab" bugfix note in CLAUDE.md for the same
  // pattern already applied to dogs.
  const profileState = useProfile();
  const { profile, loading: profileLoading } = profileState;
  const [onboardingActive, setOnboardingActive] = useState(false);

  // Lifted here (rather than owned solely by PetsScreen) so the active theme reflects
  // the selected dog app-wide — including Home, before the Pets tab has ever been
  // opened — not just while the Pets tab itself is mounted/focused. See
  // lib/ThemeContext.tsx / lib/themes.ts. PetsScreen consumes this same state via
  // props passed down through AppTabs instead of owning its own useDogs()/
  // useSelectedPet() instances.
  const dogsState = useDogs();
  const selectedPetState = useSelectedPet(dogsState.dogs);
  const selectedDog = selectedPetState.selectedDogId
    ? dogsState.dogs.find(d => d.id === selectedPetState.selectedDogId) ?? null
    : null;

  useEffect(() => {
    setTheme(selectedDog?.theme_family ?? 'sage_clay');
  }, [selectedDog?.id, selectedDog?.theme_family]);

  useEffect(() => {
    // A `profiles` row is auto-created at signup by a DB trigger (with
    // full_name/username null), so most new users will already have a row
    // here — gate on those fields being unset, not on the row being
    // missing. The `profile === null` check still covers legacy users who
    // signed up before that trigger existed. Users who onboarded before
    // `username` was introduced will have full_name set but username null,
    // so they get routed back through OnboardingScreen once more (it
    // prefills their name and skips straight past the pet step for them).
    if (!profileLoading && (profile === null || !profile.full_name || !profile.username)) {
      setOnboardingActive(true);
    }
  }, [profileLoading, profile]);

  if (profileLoading) {
    return (
      <View style={[styles.loading, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color={theme.primary} />
      </View>
    );
  }

  if (onboardingActive) {
    return (
      <OnboardingScreen
        session={session}
        profile={profile}
        completeOnboarding={profileState.completeOnboarding}
        checkUsernameAvailable={profileState.checkUsernameAvailable}
        dogs={dogsState.dogs}
        addDog={dogsState.addDog}
        updateDog={dogsState.updateDog}
        onComplete={() => setOnboardingActive(false)}
      />
    );
  }

  return (
    <AppTabs
      session={session}
      profile={profile}
      updateProfile={profileState.updateProfile}
      checkUsernameAvailable={profileState.checkUsernameAvailable}
      dogs={dogsState.dogs}
      dogsLoading={dogsState.loading}
      addDog={dogsState.addDog}
      updateDog={dogsState.updateDog}
      deleteDog={dogsState.deleteDog}
      selectedDogId={selectedPetState.selectedDogId}
      selectDog={selectedPetState.selectDog}
    />
  );
}

function AppInner() {
  const { theme } = useTheme();
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [showRegister, setShowRegister] = useState(false);
  const [recoveryActive, setRecoveryActive] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });
  }, []);

  useEffect(() => {
    async function handleUrl(url: string) {
      const tokens = parseRecoveryUrl(url);
      if (!tokens) return;
      const { error } = await supabase.auth.setSession(tokens);
      if (!error) setRecoveryActive(true);
    }

    Linking.getInitialURL().then((url) => {
      if (url) handleUrl(url);
    });
    const subscription = Linking.addEventListener('url', ({ url }) => handleUrl(url));
    return () => subscription.remove();
  }, []);

  if (loading) {
    return (
      <View style={[styles.loading, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color={theme.primary} />
      </View>
    );
  }

  if (recoveryActive) {
    return <SetNewPasswordScreen onDone={() => setRecoveryActive(false)} />;
  }

  if (!session) {
    return showRegister ? (
      <RegisterScreen onSwitch={() => setShowRegister(false)} />
    ) : (
      <LoginScreen onSwitch={() => setShowRegister(true)} />
    );
  }

  return <AuthedApp session={session} />;
}

export default function App() {
  return (
    <GestureHandlerRootView style={styles.flex}>
      <SafeAreaProvider>
        <ThemeProvider>
          <AppInner />
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});