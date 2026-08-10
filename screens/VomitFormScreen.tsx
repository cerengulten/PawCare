import { useState } from 'react';
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
import { HealthLog, VomitSeverity, VomitCause } from '../types';
import { useVomitLogs } from '../lib/hooks/useVomitLogs';
import { colors, radii } from '../lib/theme';

type UseVomitLogsReturn = ReturnType<typeof useVomitLogs>;

type Props = {
  log: HealthLog | null;
  addLog: UseVomitLogsReturn['addLog'];
  updateLog: UseVomitLogsReturn['updateLog'];
  deleteLog: UseVomitLogsReturn['deleteLog'];
  onDone: () => void;
  onCancel: () => void;
};

const SEVERITY_OPTIONS: { value: VomitSeverity; label: string }[] = [
  { value: 'mild', label: 'Mild' },
  { value: 'moderate', label: 'Moderate' },
  { value: 'severe', label: 'Severe' },
];

const CAUSE_OPTIONS: { value: VomitCause; label: string }[] = [
  { value: 'food', label: 'Food' },
  { value: 'motion', label: 'Motion' },
  { value: 'ate_too_fast', label: 'Ate too fast' },
  { value: 'hairball', label: 'Hairball' },
  { value: 'foreign_object', label: 'Foreign object' },
  { value: 'unknown', label: 'Unknown' },
];

export default function VomitFormScreen({
  log,
  addLog,
  updateLog,
  deleteLog,
  onDone,
  onCancel,
}: Props) {
  const details = log?.details as { severity: VomitSeverity; possibleCause: VomitCause; frequency: number } | undefined;
  const [severity, setSeverity] = useState<VomitSeverity>(details?.severity ?? 'mild');
  const [possibleCause, setPossibleCause] = useState<VomitCause>(details?.possibleCause ?? 'unknown');
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
      details: { severity, possibleCause, frequency },
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
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.title}>{log ? 'Edit Vomit' : 'Add Vomit'}</Text>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <Text style={styles.fieldLabel}>Severity</Text>
        <View style={styles.chipGrid}>
          {SEVERITY_OPTIONS.map(opt => {
            const selected = severity === opt.value;
            return (
              <TouchableOpacity
                key={opt.value}
                style={[styles.chipBtn, selected && styles.chipBtnSelected]}
                onPress={() => setSeverity(opt.value)}
              >
                <Text style={styles.chipBtnLabel}>{opt.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <Text style={styles.fieldLabel}>Possible cause</Text>
        <View style={styles.chipGrid}>
          {CAUSE_OPTIONS.map(opt => {
            const selected = possibleCause === opt.value;
            return (
              <TouchableOpacity
                key={opt.value}
                style={[styles.chipBtn, selected && styles.chipBtnSelected]}
                onPress={() => setPossibleCause(opt.value)}
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
          placeholderTextColor={colors.textMuted}
          value={frequencyText}
          onChangeText={setFrequencyText}
          keyboardType="number-pad"
        />

        <TextInput
          style={[styles.input, styles.notesInput]}
          placeholder="Notes (optional)"
          placeholderTextColor={colors.textMuted}
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
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    padding: 24,
    alignItems: 'center',
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: colors.textDark,
    marginBottom: 20,
  },
  error: {
    color: colors.allergenText,
    fontSize: 13,
    marginBottom: 12,
    textAlign: 'center',
  },
  fieldLabel: {
    width: '100%',
    fontSize: 12,
    fontWeight: '600',
    color: colors.textMuted,
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
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    marginRight: 8,
    marginBottom: 8,
  },
  chipBtnSelected: {
    backgroundColor: colors.moodSelectedBg,
    borderColor: colors.moodSelectedBorder,
  },
  chipBtnLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textDark,
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
  notesInput: {
    minHeight: 80,
    textAlignVertical: 'top',
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
    marginTop: 20,
  },
  switchLink: {
    color: colors.primaryGreen,
    fontSize: 14,
    fontWeight: '600',
  },
  deleteLink: {
    color: colors.allergenText,
    fontSize: 14,
    fontWeight: '600',
  },
});
