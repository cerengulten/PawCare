import { useMemo, useState } from 'react';
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
  onCancel: () => void;
};

const CONFIRM_WORD = 'DELETE';

export default function DeleteAccountScreen({ onCancel }: Props) {
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const [confirmText, setConfirmText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleDelete() {
    if (confirmText.trim().toUpperCase() !== CONFIRM_WORD) {
      setError(`Type ${CONFIRM_WORD} to confirm.`);
      return;
    }

    setLoading(true);
    setError('');
    const { error } = await supabase.rpc('delete_own_account');
    if (error) {
      setLoading(false);
      setError(error.message);
      return;
    }
    await supabase.auth.signOut();
    // No onDone/navigation call needed past this point — App.tsx's
    // onAuthStateChange listener sees the cleared session and routes back
    // to Login on its own, same as a normal sign-out.
  }

  return (
    <SwipeBackWrapper onBack={onCancel}>
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.title}>Delete account</Text>

        <View style={styles.warningCard}>
          <Text style={styles.warningText}>
            This permanently deletes your account, all of your pets, and every habit, mood,
            symptom, vaccine, and meal log attached to them. This cannot be undone.
          </Text>
        </View>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <Text style={styles.sectionLabel}>Type {CONFIRM_WORD} to confirm</Text>
        <TextInput
          style={styles.input}
          placeholder={CONFIRM_WORD}
          placeholderTextColor={theme.textMuted}
          value={confirmText}
          onChangeText={setConfirmText}
          autoCapitalize="characters"
        />

        <TouchableOpacity style={styles.deleteButton} onPress={handleDelete} disabled={loading}>
          {loading ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text style={styles.deleteButtonText}>Permanently delete my account</Text>
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
    scrollContent: {
      padding: 24,
      alignItems: 'center',
    },
    title: {
      fontSize: 26,
      fontWeight: '700',
      color: theme.textDark,
      marginBottom: 20,
    },
    warningCard: {
      width: '100%',
      backgroundColor: theme.allergenBg,
      borderRadius: theme.radiiCard,
      padding: 16,
      marginBottom: 16,
    },
    warningText: {
      fontSize: 14,
      color: theme.allergenText,
      lineHeight: 20,
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
    deleteButton: {
      width: '100%',
      backgroundColor: theme.allergenText,
      borderRadius: theme.radiiCard,
      padding: 16,
      alignItems: 'center',
      marginTop: 8,
    },
    deleteButtonText: {
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
