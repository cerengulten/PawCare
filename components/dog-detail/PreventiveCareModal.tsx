import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Alert, StyleSheet } from 'react-native';
import { Feather, Ionicons } from '@expo/vector-icons';
import { Dog, VaccineRecord } from '../../types';
import VaccineCard from '../VaccineCard';
import SwipeBackWrapper from '../SwipeBackWrapper';
import { useTheme } from '../../lib/ThemeContext';
import { useT } from '../../lib/LanguageContext';
import { ThemeTokens } from '../../lib/themes';
import { detectTreatmentType } from '../../lib/treatmentLogic';
import { formatDate } from '../../lib/vaccineDisplay';
import { toLocalDateString } from '../../lib/dateUtils';
import { triggerSuccessHaptic } from '../../lib/haptics';

type Props = {
  dog: Dog;
  upcoming: VaccineRecord[];
  overdue: VaccineRecord[];
  treatmentSegment: 'parasites' | 'vaccines';
  onChangeSegment: (seg: 'parasites' | 'vaccines') => void;
  onBack: () => void;
  onSelectVaccine: (v: VaccineRecord) => void;
  onAddNew: () => void;
  updateVaccine: (id: string, updates: Partial<VaccineRecord>) => Promise<{ error: any }>;
};

export default function PreventiveCareModal({
  dog,
  upcoming,
  overdue,
  treatmentSegment,
  onChangeSegment,
  onBack,
  onSelectVaccine,
  onAddNew,
  updateVaccine,
}: Props) {
  const { theme } = useTheme();
  const { t } = useT();
  const styles = useMemo(() => makeStyles(theme), [theme]);

  const allVaccines = [...overdue, ...upcoming];
  const vaccineList = allVaccines.filter((v) => detectTreatmentType(v.vaccine_name, v.notes) === 'vaccine');
  const parasiteList = allVaccines.filter((v) => detectTreatmentType(v.vaccine_name, v.notes) !== 'vaccine');
  const shownList = treatmentSegment === 'vaccines' ? vaccineList : parasiteList;

  async function handleAdministerToday(v: VaccineRecord, nextDueDate: string) {
    const today = toLocalDateString();
    const { error: adminErr } = await updateVaccine(v.id, {
      date_given: today,
      next_due_date: nextDueDate,
    });
    if (!adminErr) {
      triggerSuccessHaptic();
      Alert.alert(
        t('treatments.administeredTitle') || 'Dose Logged! 🎉',
        t('treatments.administeredBody', { name: v.vaccine_name, date: formatDate(nextDueDate) }) ||
          `${v.vaccine_name} recorded! Next dose set for ${formatDate(nextDueDate)}. 🐾`
      );
    }
  }

  return (
    <SwipeBackWrapper onBack={onBack}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <TouchableOpacity onPress={onBack} style={styles.backRow} activeOpacity={0.7}>
          <Feather name="chevron-left" size={20} color={theme.primary} />
          <Text style={styles.backText}>{t('common.back')}</Text>
        </TouchableOpacity>

        <View style={styles.listHeader}>
          <View style={styles.listHeaderLeft}>
            <Text style={styles.listHeaderDogName}>{dog.name}</Text>
            <Text style={styles.title}>{t('treatments.immunityTitle') || 'Preventive Care & Immunity'}</Text>
          </View>
        </View>

        <View style={styles.segmentSwitcher}>
          <TouchableOpacity
            style={[styles.segmentTab, treatmentSegment === 'parasites' && styles.segmentTabActive]}
            onPress={() => onChangeSegment('parasites')}
            activeOpacity={0.8}
          >
            <View style={styles.segmentTabInner}>
              <Feather
                name="shield"
                size={14}
                color={treatmentSegment === 'parasites' ? theme.primary : theme.textMuted}
              />
              <Text style={[styles.segmentTabText, treatmentSegment === 'parasites' && styles.segmentTabTextActive]}>
                {t('treatments.tabs.parasiteShield') || 'Parasite Shield'} ({parasiteList.length})
              </Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.segmentTab, treatmentSegment === 'vaccines' && styles.segmentTabActive]}
            onPress={() => onChangeSegment('vaccines')}
            activeOpacity={0.8}
          >
            <View style={styles.segmentTabInner}>
              <Ionicons
                name="shield-checkmark-outline"
                size={15}
                color={treatmentSegment === 'vaccines' ? theme.primary : theme.textMuted}
              />
              <Text style={[styles.segmentTabText, treatmentSegment === 'vaccines' && styles.segmentTabTextActive]}>
                {t('treatments.tabs.vaccines') || 'Vaccines'} ({vaccineList.length})
              </Text>
            </View>
          </TouchableOpacity>
        </View>

        {shownList.length === 0 ? (
          <View style={styles.emptyTreatmentCard}>
            <View style={styles.emptyIconCircle}>
              {treatmentSegment === 'parasites' ? (
                <Feather name="shield" size={26} color={theme.primary} />
              ) : (
                <Ionicons name="shield-checkmark-outline" size={28} color={theme.primary} />
              )}
            </View>
            <Text style={styles.emptyTreatmentTitle}>
              {treatmentSegment === 'parasites'
                ? t('treatments.noParasiteTracked') || 'No parasite shield active'
                : t('dogDetail.noVaccinesTracked') || 'No clinical vaccines tracked'}
            </Text>
            <Text style={styles.emptyTreatmentSubtitle}>
              {treatmentSegment === 'parasites'
                ? t('treatments.parasiteEmptyHint')
                : t('treatments.vaccineEmptyHint')}
            </Text>
          </View>
        ) : (
          <View style={styles.treatmentList}>
            {shownList.map((v) => (
              <VaccineCard
                key={v.id}
                vaccine={v}
                isOverdue={overdue.includes(v)}
                onPress={() => onSelectVaccine(v)}
                onAdministerToday={(item, nextDate) => handleAdministerToday(item, nextDate)}
              />
            ))}
          </View>
        )}

        <TouchableOpacity style={styles.addTreatmentBtn} onPress={onAddNew} activeOpacity={0.85}>
          <Feather name="plus" size={16} color="#FFFFFF" />
          <Text style={styles.addTreatmentBtnText}>
            {treatmentSegment === 'parasites' ? t('treatments.addParasite') : t('treatments.addVaccine')}
          </Text>
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
      padding: 16,
      paddingTop: 56,
      paddingBottom: 36,
    },
    backRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      marginBottom: 16,
    },
    backText: {
      color: theme.primary,
      fontSize: 16,
      fontWeight: '600',
    },
    title: {
      fontSize: 22,
      fontWeight: '800',
      color: theme.textDark,
    },
    listHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 16,
    },
    listHeaderLeft: {
      flex: 1,
      minWidth: 0,
    },
    listHeaderDogName: {
      fontSize: 12,
      color: theme.textMuted,
      marginBottom: 1,
    },
    segmentSwitcher: {
      flexDirection: 'row',
      backgroundColor: theme.surfaceAlt,
      borderRadius: 16,
      padding: 4,
      marginBottom: 16,
      borderWidth: 1,
      borderColor: theme.border,
    },
    segmentTab: {
      flex: 1,
      paddingVertical: 10,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 12,
    },
    segmentTabInner: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    segmentTabActive: {
      backgroundColor: theme.surface,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.08,
      shadowRadius: 4,
      elevation: 2,
    },
    segmentTabText: {
      fontSize: 13,
      fontWeight: '600',
      color: theme.textMuted,
    },
    segmentTabTextActive: {
      color: theme.primary,
      fontWeight: '700',
    },
    emptyTreatmentCard: {
      backgroundColor: theme.surface,
      borderRadius: 20,
      padding: 24,
      alignItems: 'center',
      borderWidth: 1.5,
      borderColor: theme.border,
      marginBottom: 16,
    },
    emptyIconCircle: {
      width: 56,
      height: 56,
      borderRadius: 28,
      backgroundColor: theme.primaryLight,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 12,
    },
    emptyTreatmentTitle: {
      fontSize: 16,
      fontWeight: '700',
      color: theme.textDark,
      marginBottom: 6,
    },
    emptyTreatmentSubtitle: {
      fontSize: 13,
      color: theme.textMuted,
      textAlign: 'center',
      lineHeight: 18,
    },
    treatmentList: {
      marginBottom: 12,
    },
    addTreatmentBtn: {
      flexDirection: 'row',
      gap: 8,
      backgroundColor: theme.primary,
      borderRadius: 16,
      paddingVertical: 15,
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: theme.primary,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.25,
      shadowRadius: 8,
      elevation: 3,
      marginBottom: 20,
    },
    addTreatmentBtnText: {
      color: '#FFFFFF',
      fontSize: 15,
      fontWeight: '700',
    },
  });
}
