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
import { HealthLog, VomitSeverity, VomitCause } from '../types';
import { useVomitLogs } from '../lib/hooks/useVomitLogs';
import { useTheme } from '../lib/ThemeContext';
import { useT } from '../lib/LanguageContext';
import { ThemeTokens } from '../lib/themes';
import SwipeBackWrapper from '../components/SwipeBackWrapper';

type UseVomitLogsReturn = ReturnType<typeof useVomitLogs>;

type Props = {
  log: HealthLog | null;
  addLog: UseVomitLogsReturn['addLog'];
  updateLog: UseVomitLogsReturn['updateLog'];
  deleteLog: UseVomitLogsReturn['deleteLog'];
  onDone: () => void;
  onCancel: () => void;
};

const SEVERITY_META: {
  key: VomitSeverity;
  icon: string;
  dotColor: (th: ThemeTokens) => string;
}[] = [
  { key: 'mild', icon: '🟢', dotColor: (th) => th.done },
  { key: 'moderate', icon: '🟡', dotColor: (th) => th.pending },
  { key: 'severe', icon: '🔴', dotColor: (th) => th.allergenText },
];

const CAUSE_META: { key: VomitCause; icon: string }[] = [
  { key: 'food', icon: '🍽️' },
  { key: 'ate_too_fast', icon: '⚡' },
  { key: 'hairball', icon: '🧶' },
  { key: 'motion', icon: '🚗' },
  { key: 'foreign_object', icon: '⚠️' },
  { key: 'unknown', icon: '❓' },
];

export default function VomitFormScreen({
  log,
  addLog,
  updateLog,
  deleteLog,
  onDone,
  onCancel,
}: Props) {
  const { theme, isDarkMode } = useTheme();
  const { t } = useT();
  const styles = useMemo(() => makeStyles(theme, isDarkMode), [theme, isDarkMode]);
  const details = log?.details as { severity: VomitSeverity; possibleCause: VomitCause; frequency: number } | undefined;
  const [severity, setSeverity] = useState<VomitSeverity>(details?.severity ?? 'mild');
  const [possibleCause, setPossibleCause] = useState<VomitCause>(details?.possibleCause ?? 'unknown');
  const [frequencyText, setFrequencyText] = useState(String(details?.frequency ?? 1));
  const [notes, setNotes] = useState(log?.notes ?? '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const showUrgentAlert = severity === 'severe' || possibleCause === 'foreign_object';

  async function handleSave() {
    const frequency = parseInt(frequencyText, 10);
    if (!frequencyText.trim() || Number.isNaN(frequency) || frequency < 1) {
      setError(t('tracker.frequencyError'));
      return;
    }

    setLoading(true);
    setError('');

    const payload = {
      details: { severity, possibleCause, frequency },
      notes: notes.trim() || null,
    };

    const { error: saveErr } = log
      ? await updateLog(log.id, payload)
      : await addLog(payload);

    setLoading(false);
    if (saveErr) {
      setError(saveErr.message);
      return;
    }
    onDone();
  }

  async function handleDelete() {
    if (!log) return;
    setLoading(true);
    const { error: delErr } = await deleteLog(log.id);
    setLoading(false);
    if (delErr) {
      setError(delErr.message);
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
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          <TouchableOpacity onPress={onCancel} style={styles.backRow} activeOpacity={0.7}>
            <Text style={styles.backText}>‹ {t('common.back')}</Text>
          </TouchableOpacity>

          <Text style={styles.title}>{log ? t('vomit.editTitle') : t('vomit.addTitle')}</Text>
          <Text style={styles.subtitle}>{t('vomit.subtitle')}</Text>

          {error ? <Text style={styles.error}>{error}</Text> : null}

          {/* 1. Severity Visual Cards */}
          <Text style={styles.fieldLabel}>{t('vomit.severity')}</Text>
          <View style={styles.severityStack}>
            {SEVERITY_META.map((item) => {
              const selected = severity === item.key;
              return (
                <TouchableOpacity
                  key={item.key}
                  style={[styles.severityCard, selected && styles.severityCardSelected]}
                  onPress={() => setSeverity(item.key)}
                  activeOpacity={0.8}
                >
                  <View style={styles.severityIconWrap}>
                    <Text style={styles.severityIcon}>{item.icon}</Text>
                  </View>
                  <View style={styles.severityTextCol}>
                    <Text style={[styles.severityTitle, selected && styles.severityTitleSelected]}>
                      {t('vomit.severityOpt.' + item.key)}
                    </Text>
                    <Text style={styles.severitySub}>{t('vomit.severitySub.' + item.key)}</Text>
                  </View>
                  <View style={[styles.radioOuter, selected && styles.radioOuterSelected]}>
                    {selected ? <View style={styles.radioInner} /> : null}
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* 2. Suspected Trigger / Cause Grid */}
          <Text style={styles.fieldLabel}>{t('vomit.possibleCause')}</Text>
          <View style={styles.causeGrid}>
            {CAUSE_META.map((item) => {
              const selected = possibleCause === item.key;
              return (
                <TouchableOpacity
                  key={item.key}
                  style={[styles.causeCard, selected && styles.causeCardSelected]}
                  onPress={() => setPossibleCause(item.key)}
                  activeOpacity={0.8}
                >
                  <Text style={styles.causeIcon}>{item.icon}</Text>
                  <Text style={[styles.causeLabel, selected && styles.causeLabelSelected]} numberOfLines={1}>
                    {t('vomit.causeOpt.' + item.key)}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {showUrgentAlert ? (
            <View style={styles.alertBanner}>
              <Text style={styles.alertBannerTitle}>🚨 {t('vomit.severeWarningTitle')}</Text>
              <Text style={styles.alertBannerBody}>{t('vomit.severeWarningBody')}</Text>
            </View>
          ) : null}

          {/* 3. Frequency & Notes */}
          <Text style={styles.fieldLabel}>{t('tracker.frequency')}</Text>
          <View style={styles.freqRow}>
            {['1', '2', '3', '4'].map((num) => {
              const active = frequencyText === num;
              return (
                <TouchableOpacity
                  key={num}
                  style={[styles.freqPill, active && styles.freqPillActive]}
                  onPress={() => setFrequencyText(num)}
                >
                  <Text style={[styles.freqPillText, active && styles.freqPillTextActive]}>{num}x</Text>
                </TouchableOpacity>
              );
            })}
            <TextInput
              style={styles.freqInput}
              placeholder="1"
              placeholderTextColor={theme.textMuted}
              value={frequencyText}
              onChangeText={setFrequencyText}
              keyboardType="number-pad"
            />
          </View>

          <Text style={styles.fieldLabel}>{t('tracker.notesOptional')}</Text>
          <TextInput
            style={[styles.input, styles.notesInput]}
            placeholder={t('tracker.notesOptional')}
            placeholderTextColor={theme.textMuted}
            value={notes}
            onChangeText={setNotes}
            multiline
          />

          {log ? (
            <TouchableOpacity onPress={handleDelete} style={styles.deleteBtn} disabled={loading}>
              <Text style={styles.deleteLink}>🗑️ {t('tracker.deleteEntry')}</Text>
            </TouchableOpacity>
          ) : null}
        </ScrollView>

        {/* Sticky Bottom CTA */}
        <View style={styles.stickyFooter}>
          <TouchableOpacity style={styles.button} onPress={handleSave} disabled={loading} activeOpacity={0.85}>
            {loading ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text style={styles.buttonText}>{t('vomit.saveCta')}</Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SwipeBackWrapper>
  );
}

function makeStyles(theme: ThemeTokens, isDarkMode = false) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.background,
    },
    scrollContent: {
      padding: 20,
      paddingBottom: 32,
    },
    backRow: {
      marginBottom: 10,
      alignSelf: 'flex-start',
    },
    backText: {
      color: theme.primary,
      fontSize: 16,
      fontWeight: '600',
    },
    title: {
      fontSize: 24,
      fontWeight: '800',
      color: theme.textDark,
      letterSpacing: -0.3,
    },
    subtitle: {
      fontSize: 13,
      color: theme.textMuted,
      marginTop: 4,
      marginBottom: 18,
    },
    error: {
      color: theme.allergenText,
      fontSize: 13,
      marginBottom: 12,
      fontWeight: '600',
    },
    fieldLabel: {
      fontSize: 11,
      fontWeight: '800',
      color: theme.textMuted,
      textTransform: 'uppercase',
      letterSpacing: 0.6,
      marginBottom: 10,
      marginTop: 6,
    },
    severityStack: {
      gap: 10,
      marginBottom: 16,
    },
    severityCard: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.surface,
      borderRadius: 18,
      borderWidth: 1.5,
      borderColor: theme.border,
      padding: 13,
      gap: 12,
    },
    severityCardSelected: {
      backgroundColor: isDarkMode ? '#2E1E19' : '#FFF7F4',
      borderColor: theme.primary,
    },
    severityIconWrap: {
      width: 40,
      height: 40,
      borderRadius: 14,
      backgroundColor: theme.surfaceAlt,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: theme.border,
    },
    severityIcon: {
      fontSize: 18,
    },
    severityTextCol: {
      flex: 1,
    },
    severityTitle: {
      fontSize: 14,
      fontWeight: '700',
      color: theme.textDark,
      marginBottom: 2,
    },
    severityTitleSelected: {
      color: theme.primary,
    },
    severitySub: {
      fontSize: 12,
      color: theme.textMuted,
      lineHeight: 16,
    },
    radioOuter: {
      width: 20,
      height: 20,
      borderRadius: 10,
      borderWidth: 2,
      borderColor: theme.border,
      alignItems: 'center',
      justifyContent: 'center',
    },
    radioOuterSelected: {
      borderColor: theme.primary,
    },
    radioInner: {
      width: 10,
      height: 10,
      borderRadius: 5,
      backgroundColor: theme.primary,
    },
    causeGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
      marginBottom: 16,
    },
    causeCard: {
      width: '31%',
      backgroundColor: theme.surface,
      borderRadius: 16,
      borderWidth: 1.5,
      borderColor: theme.border,
      paddingVertical: 12,
      paddingHorizontal: 8,
      alignItems: 'center',
      gap: 6,
    },
    causeCardSelected: {
      backgroundColor: isDarkMode ? '#2E1E19' : '#FFF7F4',
      borderColor: theme.primary,
    },
    causeIcon: {
      fontSize: 20,
    },
    causeLabel: {
      fontSize: 11,
      fontWeight: '700',
      color: theme.textDark,
      textAlign: 'center',
    },
    causeLabelSelected: {
      color: theme.primary,
    },
    alertBanner: {
      backgroundColor: theme.allergenBg,
      borderColor: theme.allergenText,
      borderWidth: 1,
      borderRadius: 16,
      padding: 12,
      marginBottom: 16,
    },
    alertBannerTitle: {
      fontSize: 13,
      fontWeight: '800',
      color: theme.allergenText,
      marginBottom: 4,
    },
    alertBannerBody: {
      fontSize: 12,
      color: theme.textDark,
      lineHeight: 17,
    },
    freqRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginBottom: 16,
    },
    freqPill: {
      paddingVertical: 10,
      paddingHorizontal: 15,
      borderRadius: 14,
      backgroundColor: theme.surface,
      borderWidth: 1.5,
      borderColor: theme.border,
    },
    freqPillActive: {
      backgroundColor: isDarkMode ? '#2E1E19' : '#FFF7F4',
      borderColor: theme.primary,
    },
    freqPillText: {
      fontSize: 14,
      fontWeight: '700',
      color: theme.textDark,
    },
    freqPillTextActive: {
      color: theme.primary,
    },
    freqInput: {
      flex: 1,
      backgroundColor: theme.surface,
      borderRadius: 14,
      paddingVertical: 10,
      paddingHorizontal: 14,
      fontSize: 14,
      fontWeight: '700',
      color: theme.textDark,
      borderWidth: 1.5,
      borderColor: theme.border,
      textAlign: 'center',
    },
    input: {
      width: '100%',
      backgroundColor: theme.surface,
      borderRadius: 16,
      padding: 14,
      fontSize: 14,
      color: theme.textDark,
      marginBottom: 12,
      borderWidth: 1.5,
      borderColor: theme.border,
    },
    notesInput: {
      minHeight: 76,
      textAlignVertical: 'top',
    },
    deleteBtn: {
      alignSelf: 'center',
      marginTop: 8,
      paddingVertical: 8,
    },
    deleteLink: {
      color: theme.allergenText,
      fontSize: 14,
      fontWeight: '700',
    },
    stickyFooter: {
      paddingHorizontal: 20,
      paddingVertical: 14,
      backgroundColor: theme.surface,
      borderTopWidth: 1,
      borderTopColor: theme.border,
    },
    button: {
      width: '100%',
      backgroundColor: theme.primary,
      borderRadius: 16,
      paddingVertical: 15,
      alignItems: 'center',
      shadowColor: theme.primary,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.25,
      shadowRadius: 8,
      elevation: 3,
    },
    buttonText: {
      color: 'white',
      fontSize: 16,
      fontWeight: '700',
    },
  });
}
