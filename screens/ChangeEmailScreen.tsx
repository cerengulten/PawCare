import { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../lib/supabase';
import { useTheme } from '../lib/ThemeContext';
import { ThemeTokens } from '../lib/themes';
import SwipeBackWrapper from '../components/SwipeBackWrapper';

type Props = {
  onDone: () => void;
  onCancel: () => void;
};

function isEmailFormatValid(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export default function ChangeEmailScreen({ onDone, onCancel }: Props) {
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const [currentEmail, setCurrentEmail] = useState<string | null>(null);
  const [newEmail, setNewEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setCurrentEmail(data.user?.email ?? null));
  }, []);

  async function handleSave() {
    const trimmed = newEmail.trim();
    if (!isEmailFormatValid(trimmed)) {
      setError('Enter a valid email address.');
      return;
    }
    if (currentEmail && trimmed.toLowerCase() === currentEmail.toLowerCase()) {
      setError('That is already your current email.');
      return;
    }

    setLoading(true);
    setError('');
    const { error } = await supabase.auth.updateUser({ email: trimmed });
    setLoading(false);
    if (error) {
      setError(error.message);
      return;
    }
    setSent(true);
  }

  if (sent) {
    return (
      <SwipeBackWrapper onBack={onDone}>
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <View style={styles.centerContent}>
          <Text style={styles.paw}>📬</Text>
          <Text style={styles.title}>Check your new inbox</Text>
          <Text style={styles.subtitle}>
            We sent a confirmation link to {newEmail.trim()}. Your email won't change until
            you click it.
          </Text>
          <TouchableOpacity style={styles.button} onPress={onDone}>
            <Text style={styles.buttonText}>Done</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
      </SwipeBackWrapper>
    );
  }

  return (
    <SwipeBackWrapper onBack={onCancel}>
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.title}>Change email</Text>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <Text style={styles.sectionLabel}>Current email</Text>
        <View style={styles.readOnlyInput}>
          <Text style={styles.readOnlyText}>{currentEmail ?? '…'}</Text>
        </View>

        <Text style={styles.sectionLabel}>New email</Text>
        <TextInput
          style={styles.input}
          placeholder="New email"
          placeholderTextColor={theme.textMuted}
          value={newEmail}
          onChangeText={setNewEmail}
          autoCapitalize="none"
          keyboardType="email-address"
        />
        <Text style={styles.helperText}>
          We'll send a confirmation link to the new address — the change only takes effect
          once you click it.
        </Text>

        <TouchableOpacity style={styles.button} onPress={handleSave} disabled={loading}>
          {loading ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text style={styles.buttonText}>Save</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity onPress={onCancel} style={styles.switchRow}>
          <Text style={styles.switchLink}>Cancel</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
    </SafeAreaView>
    </SwipeBackWrapper>
  );
}

function makeStyles(theme: ThemeTokens) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.background,
    },
    centerContent: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      padding: 24,
    },
    paw: {
      fontSize: 48,
      marginBottom: 12,
    },
    scrollContent: {
      padding: 24,
      alignItems: 'center',
    },
    title: {
      fontSize: 26,
      fontWeight: '700',
      color: theme.textDark,
      marginBottom: 20,
      textAlign: 'center',
    },
    subtitle: {
      fontSize: 14,
      color: theme.textMuted,
      marginBottom: 32,
      textAlign: 'center',
    },
    error: {
      color: theme.allergenText,
      fontSize: 13,
      marginBottom: 12,
      textAlign: 'center',
    },
    sectionLabel: {
      width: '100%',
      fontSize: 12,
      fontWeight: '600',
      color: theme.textMuted,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
      marginBottom: 8,
    },
    readOnlyInput: {
      width: '100%',
      backgroundColor: theme.surfaceAlt,
      borderRadius: theme.radiiCard,
      padding: 16,
      marginBottom: 12,
      borderWidth: 0.5,
      borderColor: theme.border,
    },
    readOnlyText: {
      fontSize: 15,
      color: theme.textMuted,
    },
    input: {
      width: '100%',
      backgroundColor: theme.surface,
      borderRadius: theme.radiiCard,
      padding: 16,
      fontSize: 15,
      color: theme.textDark,
      marginBottom: 12,
      borderWidth: 0.5,
      borderColor: theme.border,
    },
    helperText: {
      width: '100%',
      fontSize: 12,
      color: theme.textMuted,
      marginBottom: 12,
    },
    button: {
      width: '100%',
      backgroundColor: theme.primary,
      borderRadius: theme.radiiCard,
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
      marginTop: 20,
    },
    switchLink: {
      color: theme.primary,
      fontSize: 14,
      fontWeight: '600',
    },
  });
}
