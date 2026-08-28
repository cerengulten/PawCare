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
import { HealthLog, PoopConsistency, PoopColor } from '../types';
import { useHealthLogs } from '../lib/hooks/useHealthLogs';
import { useTheme } from '../lib/ThemeContext';
import { ThemeTokens } from '../lib/themes';
import SwipeBackWrapper from '../components/SwipeBackWrapper';

type UseHealthLogsReturn = ReturnType<typeof useHealthLogs>;

type Props = {
  log: HealthLog | null;
  addLog: UseHealthLogsReturn['addLog'];
  updateLog: UseHealthLogsReturn['updateLog'];
  deleteLog: UseHealthLogsReturn['deleteLog'];
  onDone: () => void;
  onCancel: () => void;
};

const CONSISTENCY_OPTIONS: { value: PoopConsistency; label: string }[] = [
  { value: 'solid', label: 'Solid' },
  { value: 'soft', label: 'Soft' },
  { value: 'liquid', label: 'Liquid' },
  { value: 'mucus', label: 'Mucus' },
];

const COLOR_OPTIONS: { value: PoopColor; label: string }[] = [
  { value: 'brown', label: 'Brown' },
  { value: 'yellow', label: 'Yellow' },
  { value: 'green', label: 'Green' },
  { value: 'black', label: 'Black' },
  { value: 'red', label: 'Red' },
];

export default function PoopFormScreen({
  log,
  addLog,
  updateLog,
  deleteLog,
  onDone,
  onCancel,
}: Props) {
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const details = log?.details as { consistency: PoopConsistency; color: PoopColor; frequency: number } | undefined;
  const [consistency, setConsistency] = useState<PoopConsistency>(details?.consistency ?? 'solid');
  const [color, setColor] = useState<PoopColor>(details?.color ?? 'brown');
  const [frequencyText, setFrequencyText] = useState(String(details?.frequency ?? 1));
  const [notes, setNotes] = useState(log?.notes ?? '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSave() {
    const frequency = parseInt(frequencyText, 10);
    if (!frequencyText.trim() || Number.isNaN(frequency) || frequency < 1) {
      setError('Frequency must be a number of 1 or more.');
      return;
    }

    setLoading(true);
    setError('');

    const payload = {
      details: { consistency, color, frequency },
      notes: notes.trim() || null,
    };

    const { error } = log
      ? await updateLog(log.id, payload)
      : await addLog(payload);

    setLoading(false);
    if (error) {
      setError(error.message);
      return;
    }
    onDone();
  }

  async function handleDelete() {
    if (!log) return;
    setLoading(true);
    const { error } = await deleteLog(log.id);
    setLoading(false);
    if (error) {
      setError(error.message);
      return;
    }
    onDone();
  }

  return (
    <SwipeBackWrapper onBack={onCancel}>
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.title}>{log ? 'Edit Poop' : 'Add Poop'}</Text>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <Text style={styles.fieldLabel}>Consistency</Text>
        <View style={styles.chipGrid}>
          {CONSISTENCY_OPTIONS.map(opt => {
            const selected = consistency === opt.value;
            return (
              <TouchableOpacity
                key={opt.value}
                style={[styles.chipBtn, selected && styles.chipBtnSelected]}
                onPress={() => setConsistency(opt.value)}
              >
                <Text style={styles.chipBtnLabel}>{opt.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <Text style={styles.fieldLabel}>Color</Text>
        <View style={styles.chipGrid}>
          {COLOR_OPTIONS.map(opt => {
            const selected = color === opt.value;
            return (
              <TouchableOpacity
                key={opt.value}
                style={[styles.chipBtn, selected && styles.chipBtnSelected]}
                onPress={() => setColor(opt.value)}
              >
                <Text style={styles.chipBtnLabel}>{opt.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <Text style={styles.fieldLabel}>Frequency</Text>
        <TextInput
          style={styles.input}
          placeholder="1"
          placeholderTextColor={theme.textMuted}
          value={frequencyText}
          onChangeText={setFrequencyText}
          keyboardType="number-pad"
        />

        <TextInput
          style={[styles.input, styles.notesInput]}
          placeholder="Notes (optional)"
          placeholderTextColor={theme.textMuted}
          value={notes}
          onChangeText={setNotes}
          multiline
        />

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

        {log ? (
          <TouchableOpacity onPress={handleDelete} style={styles.switchRow} disabled={loading}>
            <Text style={styles.deleteLink}>Delete</Text>
          </TouchableOpacity>
        ) : null}
      </ScrollView>
    </KeyboardAvoidingView>
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
    error: {
      color: theme.allergenText,
      fontSize: 13,
      marginBottom: 12,
      textAlign: 'center',
    },
    fieldLabel: {
      width: '100%',
      fontSize: 12,
      fontWeight: '600',
      color: theme.textMuted,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
      marginBottom: 8,
    },
    chipGrid: {
      width: '100%',
      flexDirection: 'row',
      flexWrap: 'wrap',
      marginBottom: 12,
    },
    chipBtn: {
      paddingVertical: 10,
      paddingHorizontal: 14,
      borderRadius: 12,
      backgroundColor: theme.surface,
      borderWidth: 1,
      borderColor: theme.border,
      marginRight: 8,
      marginBottom: 8,
    },
    chipBtnSelected: {
      backgroundColor: theme.moodSelBg,
      borderColor: theme.moodSelBorder,
    },
    chipBtnLabel: {
      fontSize: 13,
      fontWeight: '600',
      color: theme.textDark,
    },
    input: {
      width: '100%',
      backgroundColor: theme.surface,
      borderRadius: theme.radiiCard,
      padding: 16,
      fontSize: 15,
      color: theme.textDark,
      marginBottom: 12,
      borderWidth: 1,
      borderColor: theme.border,
    },
    notesInput: {
      minHeight: 80,
      textAlignVertical: 'top',
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
    deleteLink: {
      color: theme.allergenText,
      fontSize: 14,
      fontWeight: '600',
    },
  });
}
