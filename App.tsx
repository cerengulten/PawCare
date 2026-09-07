import { useEffect, useState } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { supabase } from './lib/supabase';
import { Session } from '@supabase/supabase-js';
import LoginScreen from './screens/LoginScreen';
import RegisterScreen from './screens/RegisterScreen';
import AppTabs from './screens/AppTabs';
import OnboardingScreen from './screens/OnboardingScreen';
import { useProfile } from './lib/hooks/useProfile';
import { useDogs } from './lib/hooks/useDogs';
import { useSelectedPet } from './lib/hooks/useSelectedPet';
import { ThemeProvider, useTheme } from './lib/ThemeContext';

function AuthedApp({ session }: { session: Session }) {
  const { theme, setTheme } = useTheme();
  const { profile, loading: profileLoading } = useProfile();
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

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });
  }, []);

  if (loading) {
    return (
      <View style={[styles.loading, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color={theme.primary} />
      </View>
    );
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