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
import { LanguageProvider } from './lib/LanguageContext';
import { SubscriptionProvider } from './lib/SubscriptionContext';
import { cancelAllLocalNotifications } from './lib/notifications';
import { clearHomeVetCache } from './lib/hooks/useHomeVetPreview';

// Parses auth deep links (both password-reset `type=recovery` and email
// confirmation / signup `type=signup`) routed back to `bisco://` from the
// GitHub Pages auth bridge (or directly). DetectSessionInUrl is false in
// lib/supabase.ts (correct for React Native, no window.location to auto-parse),
// so this listener receives the link and manually calls setSession.
function parseAuthUrl(url: string): { access_token?: string; refresh_token?: string; code?: string; type: string } | null {
  const hash = url.split('#')[1];
  const query = url.split('?')[1]?.split('#')[0];
  const hashParams = hash ? new URLSearchParams(hash) : null;
  const queryParams = query ? new URLSearchParams(query) : null;

  const access_token = hashParams?.get('access_token') || queryParams?.get('access_token');
  const refresh_token = hashParams?.get('refresh_token') || queryParams?.get('refresh_token');
  const code = queryParams?.get('code') || hashParams?.get('code');
  const type = hashParams?.get('type') || queryParams?.get('type') || 'signup';

  if (access_token && refresh_token) {
    return { access_token, refresh_token, type };
  }
  if (code) {
    return { code, type };
  }
  return null;
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
  const profileState = useProfile(session.user.id);
  const { profile, loading: profileLoading } = profileState;
  const [onboardingActive, setOnboardingActive] = useState(false);

  // Lifted here (rather than owned solely by PetsScreen) so the active theme reflects
  // the selected dog app-wide — including Home, before the Pets tab has ever been
  // opened — not just while the Pets tab itself is mounted/focused. See
  // lib/ThemeContext.tsx / lib/themes.ts. PetsScreen consumes this same state via
  // props passed down through AppTabs instead of owning its own useDogs()/
  // useSelectedPet() instances.
  const dogsState = useDogs(session.user.id);
  const selectedPetState = useSelectedPet(dogsState.dogs, session.user.id);
  const selectedDog = selectedPetState.selectedDogId
    ? dogsState.dogs.find(d => d.id === selectedPetState.selectedDogId) ?? null
    : null;

  useEffect(() => {
    setTheme(selectedDog?.theme_family ?? 'sage_clay');
  }, [selectedDog?.id, selectedDog?.theme_family]);

  useEffect(() => {
    // A `profiles` row is auto-created at signup by a DB trigger (with
    // full_name/username null), so most new users will already have a row
    // here. Gate on those fields being unset, not on the row being
    // missing. If the user already has a valid profile or existing pets,
    // onboarding is explicitly dismissed.
    if (!profileLoading && !dogsState.loading) {
      if ((profile?.full_name && profile?.username) || dogsState.dogs.length > 0) {
        setOnboardingActive(false);
      } else if (profile === null || !profile.full_name || !profile.username) {
        setOnboardingActive(true);
      }
    }
  }, [profileLoading, dogsState.loading, profile, dogsState.dogs.length]);

  if (profileLoading || dogsState.loading) {
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

    supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') {
        cancelAllLocalNotifications();
        clearHomeVetCache();
      }
      setSession(session);
    });
  }, []);

  useEffect(() => {
    async function handleUrl(url: string) {
      const authData = parseAuthUrl(url);
      if (!authData) return;

      if (authData.access_token && authData.refresh_token) {
        const { error } = await supabase.auth.setSession({
          access_token: authData.access_token,
          refresh_token: authData.refresh_token,
        });
        if (!error && authData.type === 'recovery') {
          setRecoveryActive(true);
        }
      } else if (authData.code) {
        const { error } = await supabase.auth.exchangeCodeForSession(authData.code);
        if (!error && authData.type === 'recovery') {
          setRecoveryActive(true);
        }
      }
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
        <LanguageProvider>
          <ThemeProvider>
            <SubscriptionProvider>
              <AppInner />
            </SubscriptionProvider>
          </ThemeProvider>
        </LanguageProvider>
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