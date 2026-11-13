import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather, Ionicons } from '@expo/vector-icons';
import { Dog, HealthLog } from '../../types';
import PoopLogCard from '../PoopLogCard';
import VomitLogCard from '../VomitLogCard';
import SwipeBackWrapper from '../SwipeBackWrapper';
import { useTheme } from '../../lib/ThemeContext';
import { useT } from '../../lib/LanguageContext';
import { ThemeTokens } from '../../lib/themes';

export type JournalFilter = 'all' | 'stool' | 'vomit';

export type DigestiveMetrics = {
  windowDays: number;
  hasAnyEntries: boolean;
  avgDailyStool: string;
  idealPct: number;
  calmDays: number;
  vomits7dCount: number;
  latestPoop: HealthLog | null;
  latestPoopConsistency: string;
  needsAttention: boolean;
};

export type GroupedDigestiveGroup = {
  dateKey: string;
  label: string;
  entries: { kind: 'stool' | 'vomit'; log: HealthLog; ts: number; dateStr: string }[];
};

type Props = {
  dog: Dog;
  logs: HealthLog[];
  vomitLogs: HealthLog[];
  digestiveMetrics: DigestiveMetrics;
  groupedDigestiveLogs: GroupedDigestiveGroup[];
  journalFilter: JournalFilter;
  onChangeFilter: (filter: JournalFilter) => void;
  onBack: () => void;
  onEditStool: (log: HealthLog) => void;
  onEditVomit: (log: HealthLog) => void;
  onAddStool: () => void;
  onAddVomit: () => void;
};

export default function DigestiveJournalModal({
  dog,
  logs,
  vomitLogs,
  digestiveMetrics,
  groupedDigestiveLogs,
  journalFilter,
  onChangeFilter,
  onBack,
  onEditStool,
  onEditVomit,
  onAddStool,
  onAddVomit,
}: Props) {
  const { theme, isDarkMode } = useTheme();
  const { t } = useT();
  const styles = useMemo(() => makeStyles(theme, isDarkMode), [theme, isDarkMode]);

  return (
    <SwipeBackWrapper onBack={onBack}>
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <ScrollView style={styles.container} contentContainerStyle={styles.content}>
          <TouchableOpacity onPress={onBack} style={styles.backRow} activeOpacity={0.7} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Feather name="chevron-left" size={20} color={theme.primary} />
            <Text style={styles.backText}>{t('common.back')}</Text>
          </TouchableOpacity>

          <Text style={styles.title}>{t('dogDetail.digestiveJournal.title')}</Text>
          <Text style={styles.subtitle}>
            {digestiveMetrics.windowDays <= 1
              ? t('dogDetail.digestiveJournal.subtitleToday', { name: dog.name })
              : t('dogDetail.digestiveJournal.subtitle', {
                  days: digestiveMetrics.windowDays,
                  name: dog.name,
                })}
          </Text>

          {/* Adaptive Gut Health KPI Ribbon */}
          <View style={styles.journalKpiRibbon}>
            <View style={styles.journalKpiCard}>
              <Text style={styles.journalKpiVal}>{digestiveMetrics.avgDailyStool}x</Text>
              <Text style={styles.journalKpiLabel}>{t('dogDetail.digestiveJournal.kpiAvgDaily')}</Text>
            </View>
            <View style={[styles.journalKpiCard, styles.journalKpiCardCenter]}>
              <Text style={[styles.journalKpiVal, { color: theme.done }]}>
                {logs.length > 0 ? `${digestiveMetrics.idealPct}%` : '—'}
              </Text>
              <Text style={styles.journalKpiLabel}>{t('dogDetail.digestiveJournal.kpiIdealPct')}</Text>
            </View>
            <View style={styles.journalKpiCard}>
              <Text style={styles.journalKpiVal}>
                {t('dogDetail.digestiveJournal.kpiDaysUnit', { count: digestiveMetrics.calmDays })}
              </Text>
              <Text style={styles.journalKpiLabel}>{t('dogDetail.digestiveJournal.kpiCalmDays')}</Text>
            </View>
          </View>

          {/* Bisco AI Care Insight Card */}
          <View style={styles.journalInsightCard}>
            <View style={styles.journalInsightHeaderRow}>
              <Ionicons name="sparkles-outline" size={15} color={theme.primary} />
              <Text style={styles.journalInsightTitle}>
                {!digestiveMetrics.hasAnyEntries
                  ? t('dogDetail.digestiveJournal.insightNewTitle')
                  : digestiveMetrics.needsAttention
                    ? t('dogDetail.digestiveJournal.insightWatchTitle')
                    : t('dogDetail.digestiveJournal.insightStableTitle')}
              </Text>
            </View>
            <Text style={styles.journalInsightBody}>
              {!digestiveMetrics.hasAnyEntries
                ? t('dogDetail.digestiveJournal.insightNewBody', { name: dog.name })
                : digestiveMetrics.needsAttention
                  ? t('dogDetail.digestiveJournal.insightWatchBody')
                  : t('dogDetail.digestiveJournal.insightStableBody', {
                      name: dog.name,
                      pct: digestiveMetrics.idealPct,
                      windowDays: digestiveMetrics.windowDays,
                      days: digestiveMetrics.calmDays,
                    })}
            </Text>
          </View>

          {/* Filter Pills */}
          <View style={styles.journalFilterRow}>
            {(
              [
                {
                  key: 'all',
                  label: `${t('dogDetail.digestiveJournal.filterAll')} (${logs.length + vomitLogs.length})`,
                },
                {
                  key: 'stool',
                  label: `${t('dogDetail.digestiveJournal.filterStool')} (${logs.length})`,
                },
                {
                  key: 'vomit',
                  label: `${t('dogDetail.digestiveJournal.filterVomit')} (${vomitLogs.length})`,
                },
              ] as { key: JournalFilter; label: string }[]
            ).map((f) => {
              const active = journalFilter === f.key;
              return (
                <TouchableOpacity
                  key={f.key}
                  style={[styles.journalFilterPill, active && styles.journalFilterPillActive]}
                  onPress={() => onChangeFilter(f.key)}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.journalFilterPillText, active && styles.journalFilterPillTextActive]}>
                    {f.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Date-Grouped Chronological Stream */}
          {groupedDigestiveLogs.length === 0 ? (
            <View style={styles.emptyTreatmentCard}>
              <View style={styles.emptyIconCircle}>
                <Ionicons name="pulse-outline" size={26} color={theme.primary} />
              </View>
              <Text style={styles.emptyTreatmentSubtitle}>
                {t('dogDetail.digestiveJournal.emptyFilter')}
              </Text>
            </View>
          ) : (
            groupedDigestiveLogs.map((group) => (
              <View key={group.dateKey} style={styles.journalDateSection}>
                <Text style={styles.journalDateHeader}>{group.label}</Text>
                <View style={styles.card}>
                  {group.entries.map((entry, idx) => (
                    <View key={entry.log.id}>
                      {entry.kind === 'stool' ? (
                        <PoopLogCard log={entry.log} onPress={() => onEditStool(entry.log)} />
                      ) : (
                        <VomitLogCard log={entry.log} onPress={() => onEditVomit(entry.log)} />
                      )}
                      {idx < group.entries.length - 1 ? <View style={styles.divider} /> : null}
                    </View>
                  ))}
                </View>
              </View>
            ))
          )}
        </ScrollView>

        {/* Bottom Dual Quick-Add Bar */}
        <View style={styles.journalBottomBar}>
          <TouchableOpacity style={styles.journalPrimaryBtn} onPress={onAddStool} activeOpacity={0.85}>
            <Feather name="check-circle" size={15} color="#FFFFFF" />
            <Text style={styles.journalPrimaryBtnText}>{t('dogDetail.digestiveHub.logStoolBtn')}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.journalSecondaryBtn} onPress={onAddVomit} activeOpacity={0.85}>
            <Feather name="activity" size={15} color={theme.primary} />
            <Text style={styles.journalSecondaryBtnText}>{t('dogDetail.digestiveHub.logIncidentBtn')}</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </SwipeBackWrapper>
  );
}

function makeStyles(theme: ThemeTokens, isDarkMode = false) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.background,
    },
    content: {
      padding: 16,
      paddingTop: 8,
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
    subtitle: {
      fontSize: 13,
      color: theme.textMuted,
      marginTop: 2,
      marginBottom: 16,
    },
    journalKpiRibbon: {
      flexDirection: 'row',
      backgroundColor: theme.surface,
      borderRadius: 20,
      borderWidth: 1.5,
      borderColor: theme.border,
      paddingVertical: 14,
      marginBottom: 14,
    },
    journalKpiCard: {
      flex: 1,
      alignItems: 'center',
      paddingHorizontal: 6,
    },
    journalKpiCardCenter: {
      borderLeftWidth: 1,
      borderRightWidth: 1,
      borderColor: theme.border,
    },
    journalKpiVal: {
      fontSize: 17,
      fontWeight: '800',
      color: theme.textDark,
    },
    journalKpiLabel: {
      fontSize: 11,
      fontWeight: '600',
      color: theme.textMuted,
      marginTop: 3,
      textAlign: 'center',
    },
    journalInsightCard: {
      backgroundColor: isDarkMode ? '#1E2D24' : theme.primaryLight,
      borderRadius: 18,
      borderWidth: 1,
      borderColor: theme.primary,
      padding: 14,
      marginBottom: 16,
    },
    journalInsightHeaderRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      marginBottom: 4,
    },
    journalInsightTitle: {
      fontSize: 13,
      fontWeight: '800',
      color: theme.primary,
    },
    journalInsightBody: {
      fontSize: 12.5,
      color: theme.textDark,
      lineHeight: 18,
    },
    journalFilterRow: {
      flexDirection: 'row',
      gap: 8,
      marginBottom: 16,
    },
    journalFilterPill: {
      flex: 1,
      paddingVertical: 9,
      paddingHorizontal: 8,
      borderRadius: 14,
      backgroundColor: theme.surface,
      borderWidth: 1,
      borderColor: theme.border,
      alignItems: 'center',
    },
    journalFilterPillActive: {
      backgroundColor: theme.primary,
      borderColor: theme.primary,
    },
    journalFilterPillText: {
      fontSize: 11.5,
      fontWeight: '700',
      color: theme.textMuted,
    },
    journalFilterPillTextActive: {
      color: '#FFFFFF',
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
      width: 52,
      height: 52,
      borderRadius: 26,
      backgroundColor: theme.primaryLight,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 10,
    },
    emptyTreatmentSubtitle: {
      fontSize: 13,
      color: theme.textMuted,
      textAlign: 'center',
      lineHeight: 18,
    },
    journalDateSection: {
      marginBottom: 16,
    },
    journalDateHeader: {
      fontSize: 12,
      fontWeight: '800',
      color: theme.textMuted,
      textTransform: 'uppercase',
      letterSpacing: 0.6,
      marginBottom: 8,
    },
    card: {
      backgroundColor: theme.surface,
      borderRadius: 22,
      borderWidth: 1.5,
      borderColor: theme.border,
      padding: 16,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.04,
      shadowRadius: 6,
      elevation: 2,
    },
    divider: {
      height: 0.5,
      backgroundColor: theme.divider,
      marginVertical: 4,
    },
    journalBottomBar: {
      flexDirection: 'row',
      gap: 10,
      paddingHorizontal: 16,
      paddingVertical: 12,
      backgroundColor: theme.surface,
      borderTopWidth: 1,
      borderTopColor: theme.border,
    },
    journalPrimaryBtn: {
      flex: 1,
      flexDirection: 'row',
      gap: 6,
      backgroundColor: theme.primary,
      borderRadius: 14,
      paddingVertical: 13,
      alignItems: 'center',
      justifyContent: 'center',
    },
    journalPrimaryBtnText: {
      color: '#FFFFFF',
      fontSize: 13,
      fontWeight: '700',
    },
    journalSecondaryBtn: {
      flex: 1,
      flexDirection: 'row',
      gap: 6,
      backgroundColor: theme.surfaceAlt,
      borderRadius: 14,
      paddingVertical: 13,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1.5,
      borderColor: theme.primary,
    },
    journalSecondaryBtnText: {
      color: theme.primary,
      fontSize: 13,
      fontWeight: '700',
    },
  });
}
