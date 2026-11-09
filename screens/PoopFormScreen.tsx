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
import { useT } from '../lib/LanguageContext';
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

const CONSISTENCY_META: {
  key: PoopConsistency;
  code: string;
  badgeColor: (theme: ThemeTokens) => string;
}[] = [
  { key: 'solid', code: 'T3–4', badgeColor: (th) => th.done },
  { key: 'soft', code: 'T5–6', badgeColor: (th) => th.pending },
  { key: 'liquid', code: 'T7', badgeColor: (th) => th.allergenText },
  { key: 'mucus', code: 'M', badgeColor: (th) => th.pending },
];

const COLOR_SWATCHES: {
  key: PoopColor;
  hex: string;
  isAlert?: boolean;
}[] = [
  { key: 'brown', hex: '#6D4C41' },
  { key: 'yellow', hex: '#D4A037' },
  { key: 'green', hex: '#558B2F' },
  { key: 'black', hex: '#262626', isAlert: true },
  { key: 'red', hex: '#C62828', isAlert: true },
];

export default function PoopFormScreen({
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
  const details = log?.details as { consistency: PoopConsistency; color: PoopColor; frequency: number } | undefined;
  const [consistency, setConsistency] = useState<PoopConsistency>(details?.consistency ?? 'solid');
  const [color, setColor] = useState<PoopColor>(details?.color ?? 'brown');
  const [frequencyText, setFrequencyText] = useState(String(details?.frequency ?? 1));
  const [notes, setNotes] = useState(log?.notes ?? '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const showBloodAlert = color === 'black' || color === 'red';

  async function handleSave() {
    const frequency = parseInt(frequencyText, 10);
    if (!frequencyText.trim() || Number.isNaN(frequency) || frequency < 1) {
      setError(t('tracker.frequencyError'));
      return;
    }

    setLoading(true);
    setError('');

    const payload = {
      details: { consistency, color, frequency },
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

          <Text style={styles.title}>{log ? t('poop.editTitle') : t('poop.addTitle')}</Text>
          <Text style={styles.subtitle}>{t('poop.subtitle')}</Text>

          {error ? <Text style={styles.error}>{error}</Text> : null}

          {/* 1. Bristol Scale Visual Consistency Cards */}
          <Text style={styles.fieldLabel}>{t('poop.consistency')}</Text>
          <View style={styles.bristolStack}>
            {CONSISTENCY_META.map((item) => {
              const selected = consistency === item.key;
              const statusDotColor = item.badgeColor(theme);
              return (
                <TouchableOpacity
                  key={item.key}
                  style={[styles.bristolCard, selected && styles.bristolCardSelected]}
                  onPress={() => setConsistency(item.key)}
                  activeOpacity={0.8}
                >
                  <View style={[styles.bristolIconWrap, { borderColor: statusDotColor }]}>
                    <Text style={[styles.bristolCodeText, { color: statusDotColor }]}>{item.code}</Text>
                    {item.key === 'solid' ? (
                      <View style={[styles.shapeBar, { backgroundColor: statusDotColor }]} />
                    ) : item.key === 'soft' ? (
                      <View style={styles.shapeDotsRow}>
                        <View style={[styles.shapeSoftDot, { backgroundColor: statusDotColor }]} />
                        <View style={[styles.shapeSoftDot, { backgroundColor: statusDotColor }]} />
                        <View style={[styles.shapeSoftDot, { backgroundColor: statusDotColor }]} />
                      </View>
                    ) : item.key === 'liquid' ? (
                      <View style={styles.shapeWavesCol}>
                        <View style={[styles.shapeWaveLine, { backgroundColor: statusDotColor }]} />
                        <View style={[styles.shapeWaveLineShort, { backgroundColor: statusDotColor }]} />
                      </View>
                    ) : (
                      <View style={[styles.shapeMucusRing, { borderColor: statusDotColor }]} />
                    )}
                  </View>
                  <View style={styles.bristolTextCol}>
                    <View style={styles.bristolTitleRow}>
                      <Text style={[styles.bristolTitle, selected && styles.bristolTitleSelected]}>
                        {t('poop.bristolTitle.' + item.key)}
                      </Text>
                      <View style={[styles.bristolDot, { backgroundColor: statusDotColor }]} />
                    </View>
                    <Text style={styles.bristolSub}>{t('poop.bristolSub.' + item.key)}</Text>
                  </View>
                  <View style={[styles.radioOuter, selected && styles.radioOuterSelected]}>
                    {selected ? <View style={styles.radioInner} /> : null}
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* 2. Real Color Swatches */}
          <Text style={styles.fieldLabel}>{t('poop.color')}</Text>
          <View style={styles.swatchRow}>
            {COLOR_SWATCHES.map((sw) => {
              const selected = color === sw.key;
              return (
                <TouchableOpacity
                  key={sw.key}
                  style={[
                    styles.swatchCard,
                    selected && styles.swatchCardSelected,
                    sw.isAlert && selected && styles.swatchCardAlertSelected,
                  ]}
                  onPress={() => setColor(sw.key)}
                  activeOpacity={0.8}
                >
                  <View style={[styles.swatchCircle, { backgroundColor: sw.hex }]}>
                    {selected ? <Text style={styles.swatchCheck}>✓</Text> : null}
                  </View>
                  <Text style={[styles.swatchLabel, selected && styles.swatchLabelSelected]} numberOfLines={1}>
                    {t('poop.colorOpt.' + sw.key)}
                  </Text>
                  <Text
                    style={[
                      styles.swatchSub,
                      sw.isAlert && { color: theme.allergenText, fontWeight: '700' },
                    ]}
                    numberOfLines={1}
                  >
                    {sw.isAlert ? '⚠️ ' : ''}{t('poop.colorSub.' + sw.key)}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {showBloodAlert ? (
            <View style={styles.alertBanner}>
              <Text style={styles.alertBannerTitle}>🚨 {t('poop.bloodWarningTitle')}</Text>
              <Text style={styles.alertBannerBody}>{t('poop.bloodWarningBody')}</Text>
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
              <Text style={styles.buttonText}>{t('poop.saveCta')}</Text>
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
    bristolStack: {
      gap: 10,
      marginBottom: 16,
    },
    bristolCard: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.surface,
      borderRadius: 18,
      borderWidth: 1.5,
      borderColor: theme.border,
      padding: 13,
      gap: 12,
    },
    bristolCardSelected: {
      backgroundColor: isDarkMode ? '#2E1E19' : '#FFF7F4',
      borderColor: theme.primary,
    },
    bristolIconWrap: {
      width: 46,
      height: 46,
      borderRadius: 14,
      backgroundColor: theme.surfaceAlt,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1.5,
      borderColor: theme.border,
      gap: 4,
    },
    bristolCodeText: {
      fontSize: 10,
      fontWeight: '800',
      letterSpacing: 0.3,
    },
    shapeBar: {
      width: 22,
      height: 6,
      borderRadius: 3,
    },
    shapeDotsRow: {
      flexDirection: 'row',
      gap: 3,
      alignItems: 'center',
    },
    shapeSoftDot: {
      width: 6,
      height: 6,
      borderRadius: 3,
    },
    shapeWavesCol: {
      gap: 2,
      alignItems: 'center',
    },
    shapeWaveLine: {
      width: 22,
      height: 2.5,
      borderRadius: 2,
    },
    shapeWaveLineShort: {
      width: 14,
      height: 2.5,
      borderRadius: 2,
    },
    shapeMucusRing: {
      width: 14,
      height: 8,
      borderRadius: 4,
      borderWidth: 2,
    },
    bristolTextCol: {
      flex: 1,
    },
    bristolTitleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      marginBottom: 2,
    },
    bristolTitle: {
      fontSize: 14,
      fontWeight: '700',
      color: theme.textDark,
    },
    bristolTitleSelected: {
      color: theme.primary,
    },
    bristolDot: {
      width: 7,
      height: 7,
      borderRadius: 4,
    },
    bristolSub: {
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
    swatchRow: {
      flexDirection: 'row',
      gap: 8,
      marginBottom: 16,
    },
    swatchCard: {
      flex: 1,
      backgroundColor: theme.surface,
      borderRadius: 16,
      borderWidth: 1.5,
      borderColor: theme.border,
      paddingVertical: 10,
      paddingHorizontal: 4,
      alignItems: 'center',
    },
    swatchCardSelected: {
      backgroundColor: isDarkMode ? '#2E1E19' : '#FFF7F4',
      borderColor: theme.primary,
    },
    swatchCardAlertSelected: {
      borderColor: theme.allergenText,
      backgroundColor: theme.allergenBg,
    },
    swatchCircle: {
      width: 28,
      height: 28,
      borderRadius: 14,
      marginBottom: 6,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1.5,
      borderColor: 'rgba(255,255,255,0.35)',
    },
    swatchCheck: {
      color: '#FFFFFF',
      fontSize: 13,
      fontWeight: '800',
    },
    swatchLabel: {
      fontSize: 11,
      fontWeight: '700',
      color: theme.textDark,
    },
    swatchLabelSelected: {
      color: theme.primary,
    },
    swatchSub: {
      fontSize: 9,
      color: theme.textMuted,
      marginTop: 2,
      textAlign: 'center',
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
