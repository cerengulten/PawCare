import { useEffect, useState } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { supabase } from './lib/supabase';
import { Session } from '@supabase/supabase-js';
import LoginScreen from './screens/LoginScreen';
import RegisterScreen from './screens/RegisterScreen';
import AppTabs from './screens/AppTabs';
import OnboardingScreen from './screens/OnboardingScreen';
import { useProfile } from './lib/hooks/useProfile';

function AuthedApp({ session }: { session: Session }) {
  const { profile, loading: profileLoading } = useProfile();
  const [onboardingActive, setOnboardingActive] = useState(false);

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
      <View style={styles.loading}>
        <ActivityIndicator size="large" color="#5C3D22" />
      </View>
    );
  }

  if (onboardingActive) {
    return (
      <OnboardingScreen
        session={session}
        onComplete={() => setOnboardingActive(false)}
      />
    );
  }

  return <AppTabs session={session} />;
}

export default function App() {
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
      <View style={styles.loading}>
        <ActivityIndicator size="large" color="#5C3D22" />
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

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    backgroundColor: '#FFF8F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
});