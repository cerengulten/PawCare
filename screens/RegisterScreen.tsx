import { useState } from 'react';
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
import { supabase } from '../lib/supabase';
import { PASSWORD_REQUIREMENTS, isPasswordValid } from '../lib/passwordPolicy';
import SocialSignInButtons from '../components/SocialSignInButtons';
import { colors, radii } from '../lib/theme';

type Props = {
  onSwitch: () => void;
};

export default function RegisterScreen({ onSwitch }: Props) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  async function handleRegister() {
    if (!email || !password) {
      setError('Please fill in all fields.');
      return;
    }
    if (!isPasswordValid(password)) {
      setError('Password does not meet the requirements below.');
      return;
    }
    setLoading(true);
    setError('');
    const { error } = await supabase.auth.signUp({ email, password });
    if (error) {
      setError(error.message);
    } else {
      setSuccess(true);
    }
    setLoading(false);
  }

  if (success) {
    return (
      <View style={styles.container}>
        <Text style={styles.paw}>📬</Text>
        <Text style={styles.title}>Check your email</Text>
        <Text style={styles.subtitle}>
          We sent a confirmation link to {email}. Click it then come back to sign in.
        </Text>
        <TouchableOpacity style={styles.button} onPress={onSwitch}>
          <Text style={styles.buttonText}>Go to sign in</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <Text style={styles.paw}>🐾</Text>
      <Text style={styles.title}>Create account</Text>
      <Text style={styles.subtitle}>Start caring for your dog today</Text>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <TextInput
        style={styles.input}
        placeholder="Email"
        placeholderTextColor={colors.textMuted}
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
      />
      <TextInput
        style={styles.input}
        placeholder="Password"
        placeholderTextColor={colors.textMuted}
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />

      <View style={styles.checklist}>
        {PASSWORD_REQUIREMENTS.map((req) => {
          const met = req.test(password);
          return (
            <Text key={req.label} style={[styles.checklistItem, met && styles.checklistItemMet]}>
              {met ? '✓' : '○'} {req.label}
            </Text>
          );
        })}
      </View>

      <TouchableOpacity style={styles.button} onPress={handleRegister} disabled={loading}>
        {loading ? (
          <ActivityIndicator color="white" />
        ) : (
          <Text style={styles.buttonText}>Create account</Text>
        )}
      </TouchableOpacity>

      <SocialSignInButtons />

      <TouchableOpacity onPress={onSwitch} style={styles.switchRow}>
        <Text style={styles.switchText}>Already have an account? </Text>
        <Text style={styles.switchLink}>Sign in</Text>
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
  switchRow: {
    flexDirection: 'row',
    marginTop: 24,
  },
  switchText: {
    color: colors.textMuted,
    fontSize: 14,
  },
  switchLink: {
    color: colors.primaryGreen,
    fontSize: 14,
    fontWeight: '600',
  },
});