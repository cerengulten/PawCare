import { useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Alert, StyleSheet, ActivityIndicator } from 'react-native';
import { Dog } from '../types';
import { useMoodHistory } from '../lib/hooks/useMoodHistory';
import { useMealDetails } from '../lib/hooks/useMealDetails';
import { useHealthLogs } from '../lib/hooks/useHealthLogs';
import { useVomitLogs } from '../lib/hooks/useVomitLogs';
import { useVaccines } from '../lib/hooks/useVaccines';
import { useProfile } from '../lib/hooks/useProfile';
import { useTheme } from '../lib/ThemeContext';
import { useT } from '../lib/LanguageContext';
import { ThemeTokens } from '../lib/themes';
import SwipeBackWrapper from '../components/SwipeBackWrapper';
import { shareHtmlAsPdf } from '../lib/pdfExport';
import { buildReportHtml, buildMultiSectionReportHtml } from '../lib/pdfReport';
import {
  buildDogInfoRows,
  buildMoodReport,
  buildMealReport,
  buildSymptomReport,
  buildVaccineReport,
  ReportBuild,
} from '../lib/reportBuilders';

type Props = {
  dog: Dog;
  onBack: () => void;
};

type ReportKey = 'mood' | 'meal' | 'symptom' | 'vaccine' | 'all';

export default function ReportPickerScreen({ dog, onBack }: Props) {
  const { theme } = useTheme();
  const { t } = useT();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const { profile } = useProfile(dog.owner_id);
  const { historyByDate: moodHistoryByDate } = useMoodHistory(dog.id, 90);
  const { mealDetails } = useMealDetails(dog.id);
  const { logs } = useHealthLogs(dog.id);
  const { logs: vomitLogs } = useVomitLogs(dog.id);
  const { upcoming, overdue } = useVaccines(dog.id);
  const [exportingReport, setExportingReport] = useState<ReportKey | null>(null);

  const exportSingle = async (key: ReportKey, report: ReportBuild | null, noDataMessage: string) => {
    if (!report) {
      Alert.alert(t('reportPicker.noData'), noDataMessage);
      return;
    }
    setExportingReport(key);
    try {
      const html = buildReportHtml({
        title: report.title,
        infoRows: buildDogInfoRows(dog, profile),
        tableHeaders: report.tableHeaders,
        tableRowsHtml: report.tableRowsHtml,
        summaryRows: report.summaryRows,
      });
      await shareHtmlAsPdf(report.filename, html);
    } catch {
      Alert.alert(t('reportPicker.exportFailed'), t('reportPicker.exportFailedMsg'));
    } finally {
      setExportingReport(null);
    }
  };

  const exportAll = async () => {
    const reports = [
      buildMoodReport(dog, moodHistoryByDate),
      buildMealReport(dog, mealDetails),
      buildSymptomReport(dog, logs, vomitLogs),
      buildVaccineReport(dog, overdue, upcoming),
    ].filter((r): r is ReportBuild => r !== null);

    if (reports.length === 0) {
      Alert.alert(t('reportPicker.noData'), t('reportPicker.nothingToExport'));
      return;
    }
    setExportingReport('all');
    try {
      const today = new Date();
      const monthAbbrev = today.toLocaleDateString('en-US', { month: 'short' });
      const filename = `${dog.name.replace(/\s+/g, '_')}_full_report_${monthAbbrev}${today.getFullYear()}.pdf`;
      const html = buildMultiSectionReportHtml({
        title: t('reportPicker.fullReportTitle'),
        infoRows: buildDogInfoRows(dog, profile),
        sections: reports,
      });
      await shareHtmlAsPdf(filename, html);
    } catch {
      Alert.alert(t('reportPicker.exportFailed'), t('reportPicker.exportFailedMsg'));
    } finally {
      setExportingReport(null);
    }
  };

  const reportRows: { key: ReportKey; label: string; onPress: () => void }[] = [
    { key: 'mood', label: t('reportPicker.rowMood'), onPress: () => exportSingle('mood', buildMoodReport(dog, moodHistoryByDate), t('reportPicker.noMood')) },
    { key: 'meal', label: t('reportPicker.rowMeal'), onPress: () => exportSingle('meal', buildMealReport(dog, mealDetails), t('reportPicker.noMeal')) },
    { key: 'symptom', label: t('reportPicker.rowSymptom'), onPress: () => exportSingle('symptom', buildSymptomReport(dog, logs, vomitLogs), t('reportPicker.noSymptom')) },
    { key: 'vaccine', label: t('reportPicker.rowVaccine'), onPress: () => exportSingle('vaccine', buildVaccineReport(dog, overdue, upcoming), t('reportPicker.noVaccine')) },
    { key: 'all', label: t('reportPicker.rowAll'), onPress: exportAll },
  ];

  return (
    <SwipeBackWrapper onBack={onBack}>
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <TouchableOpacity onPress={onBack} style={styles.backRow}>
        <Text style={styles.backText}>‹ {t('common.back')}</Text>
      </TouchableOpacity>

      <View style={styles.listHeader}>
        <View style={styles.listHeaderLeft}>
          <Text style={styles.listHeaderDogName}>{dog.name}</Text>
          <Text style={styles.title}>{t('reportPicker.title')}</Text>
        </View>
      </View>

      <View style={styles.card}>
        {reportRows.map((row, i) => (
          <TouchableOpacity
            key={row.key}
            style={[styles.reportRow, i > 0 ? styles.reportRowBorder : null]}
            onPress={row.onPress}
            disabled={exportingReport !== null}
          >
            <Text style={styles.reportRowLabel}>{row.label}</Text>
            {exportingReport === row.key ? (
              <ActivityIndicator size="small" color={theme.primary} />
            ) : (
              <Text style={styles.downloadIcon}>⬇</Text>
            )}
          </TouchableOpacity>
        ))}
      </View>
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
    },
    backRow: {
      marginBottom: 8,
    },
    backText: {
      color: theme.primary,
      fontSize: 16,
      fontWeight: '600',
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
    title: {
      fontSize: 22,
      fontWeight: '700',
      color: theme.textDark,
    },
    card: {
      backgroundColor: theme.surface,
      borderRadius: theme.radiiCard,
      borderWidth: 0.5,
      borderColor: theme.border,
      padding: 14,
    },
    reportRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: 14,
    },
    reportRowBorder: {
      borderTopWidth: 0.5,
      borderTopColor: theme.border,
    },
    reportRowLabel: {
      fontSize: 15,
      fontWeight: '500',
      color: theme.textDark,
    },
    downloadIcon: {
      fontSize: 18,
      color: theme.primary,
    },
  });
}
