import { useMemo } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { HabitType } from '../types';
import { useTheme } from '../lib/ThemeContext';
import { useT } from '../lib/LanguageContext';
import { ThemeTokens } from '../lib/themes';
import SwipeBackWrapper from '../components/SwipeBackWrapper';

type Props = {
  onSelect: (habitType: HabitType) => void;
  onCancel: () => void;
  existingTypes?: HabitType[];
};

const PRESETS: { type: HabitType; labelKey: string; icon: string; descKey: string }[] = [
  { type: 'feeding', labelKey: 'habits.preset.feeding', icon: '🍖', descKey: 'habits.preset.feedingDesc' },
  { type: 'water', labelKey: 'habits.preset.water', icon: '💧', descKey: 'habits.preset.waterDesc' },
  { type: 'walking', labelKey: 'habits.preset.walking', icon: '🐾', descKey: 'habits.preset.walkingDesc' },
  { type: 'medication', labelKey: 'habits.preset.medication', icon: '💊', descKey: 'habits.preset.medicationDesc' },
  { type: 'vitamin', labelKey: 'habits.preset.vitamin', icon: '💊', descKey: 'habits.preset.vitaminDesc' },
  { type: 'dental', labelKey: 'habits.preset.dental', icon: '🦷', descKey: 'habits.preset.dentalDesc' },
  { type: 'custom', labelKey: 'habits.preset.custom', icon: '📝', descKey: 'habits.preset.customDesc' },
];

export default function HabitQuickAddScreen({ onSelect, onCancel, existingTypes = [] }: Props) {
  const { theme } = useTheme();
  const { t } = useT();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  return (
    <SwipeBackWrapper onBack={onCancel}>
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>{t('habits.addTitle')}</Text>
      <Text style={styles.subtitle}>{t('habits.addSubtitle')}</Text>

      {PRESETS.map((preset) => {
        const taken = preset.type !== 'custom' && existingTypes.includes(preset.type);
        return (
          <TouchableOpacity
            key={preset.type}
            style={[styles.card, taken && styles.cardDisabled]}
            onPress={() => onSelect(preset.type)}
            disabled={taken}
          >
            <Text style={styles.icon}>{preset.icon}</Text>
            <View style={styles.info}>
              <Text style={styles.label}>{t(preset.labelKey)}</Text>
              <Text style={styles.description}>
                {taken ? t('habits.alreadyAdded') : t(preset.descKey)}
              </Text>
            </View>
          </TouchableOpacity>
        );
      })}

      <TouchableOpacity onPress={onCancel} style={styles.cancelRow}>
        <Text style={styles.cancelLink}>{t('common.cancel')}</Text>
      </TouchableOpacity>
    </ScrollView>
    </SwipeBackWrapper>
  );
}

function makeStyles(theme: ThemeTokens) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.background,
    },
    content: {
      padding: 24,
      paddingTop: 60,
    },
    title: {
      fontSize: 26,
      fontWeight: '700',
      color: theme.textDark,
      marginBottom: 4,
    },
    subtitle: {
      fontSize: 14,
      color: theme.textMuted,
      marginBottom: 20,
    },
    card: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.surface,
      borderRadius: theme.radiiCard,
      padding: 14,
      marginBottom: 12,
      borderWidth: 1,
      borderColor: theme.border,
    },
    cardDisabled: {
      opacity: 0.4,
    },
    icon: {
      fontSize: 24,
      marginRight: 14,
    },
    info: {
      flex: 1,
    },
    label: {
      fontSize: 16,
      fontWeight: '600',
      color: theme.textDark,
    },
    description: {
      fontSize: 12,
      color: theme.textMuted,
      marginTop: 2,
    },
    cancelRow: {
      marginTop: 12,
      alignItems: 'center',
    },
    cancelLink: {
      color: theme.primary,
      fontSize: 14,
      fontWeight: '600',
    },
  });
}
