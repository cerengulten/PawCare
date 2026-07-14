import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

type Props = {
  session: Session;
};

export default function HomeScreen({ session }: Props) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>🐾 PawCare</Text>
      <Text style={styles.subtitle}>Logged in as {session.user.email}</Text>
      <TouchableOpacity style={styles.button} onPress={() => supabase.auth.signOut()}>
        <Text style={styles.buttonText}>Sign out</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF8F0',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: '#5C3D22',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#8B6343',
    marginBottom: 32,
  },
  button: {
    backgroundColor: '#5C3D22',
    borderRadius: 14,
    padding: 16,
    paddingHorizontal: 32,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});