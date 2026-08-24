import { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Alert, StyleSheet, ActivityIndicator } from 'react-native';
import { Dog } from '../types';
import { useMoodHistory } from '../lib/hooks/useMoodHistory';
import { useMealDetails } from '../lib/hooks/useMealDetails';
import { useHealthLogs } from '../lib/hooks/useHealthLogs';
import { useVomitLogs } from '../lib/hooks/useVomitLogs';
import { useVaccines } from '../lib/hooks/useVaccines';
import { useProfile } from '../lib/hooks/useProfile';
import { colors, radii } from '../lib/theme';
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
  const { profile } = useProfile();
  const { historyByDate: moodHistoryByDate } = useMoodHistory(dog.id, 90);
  const { mealDetails } = useMealDetails(dog.id);
  const { logs } = useHealthLogs(dog.id);
  const { logs: vomitLogs } = useVomitLogs(dog.id);
  const { upcoming, overdue } = useVaccines(dog.id);
  const [exportingReport, setExportingReport] = useState<ReportKey | null>(null);

  const exportSingle = async (key: ReportKey, report: ReportBuild | null, noDataMessage: string) => {
    if (!report) {
      Alert.alert('No Data', noDataMessage);
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
      Alert.alert('Export Failed', 'Could not export report. Please try again.');
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
      Alert.alert('No Data', 'Nothing to export yet.');
      return;
    }
    setExportingReport('all');
    try {
      const today = new Date();
      const monthAbbrev = today.toLocaleDateString('en-US', { month: 'short' });
      const filename = `${dog.name.replace(/\s+/g, '_')}_full_report_${monthAbbrev}${today.getFullYear()}.pdf`;
      const html = buildMultiSectionReportHtml({
        title: '🐾 PawCare — Full Report',
        infoRows: buildDogInfoRows(dog, profile),
        sections: reports,
      });
      await shareHtmlAsPdf(filename, html);
    } catch {
      Alert.alert('Export Failed', 'Could not export report. Please try again.');
    } finally {
      setExportingReport(null);
    }
  };

  const reportRows: { key: ReportKey; label: string; onPress: () => void }[] = [
    { key: 'mood', label: '😊 Mood History', onPress: () => exportSingle('mood', buildMoodReport(dog, moodHistoryByDate), 'No mood history to export yet.') },
    { key: 'meal', label: '🍽️ Meal History', onPress: () => exportSingle('meal', buildMealReport(dog, mealDetails), 'No meal history to export yet.') },
    { key: 'symptom', label: '🩺 Symptom History', onPress: () => exportSingle('symptom', buildSymptomReport(dog, logs, vomitLogs), 'No symptom history to export yet.') },
    { key: 'vaccine', label: '💉 Vaccine History', onPress: () => exportSingle('vaccine', buildVaccineReport(dog, overdue, upcoming), 'No vaccines to export yet.') },
    { key: 'all', label: '📄 All Reports', onPress: exportAll },
  ];

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <TouchableOpacity onPress={onBack} style={styles.backRow}>
        <Text style={styles.backText}>‹ Back</Text>
      </TouchableOpacity>

      <View style={styles.listHeader}>
        <View style={styles.listHeaderLeft}>
          <Text style={styles.listHeaderDogName}>{dog.name}</Text>
          <Text style={styles.title}>Download report</Text>
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
              <ActivityIndicator size="small" color={colors.primaryGreen} />
            ) : (
              <Text style={styles.downloadIcon}>⬇</Text>
            )}
          </TouchableOpacity>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: 16,
    paddingTop: 56,
  },
  backRow: {
    marginBottom: 8,
  },
  backText: {
    color: colors.primaryGreen,
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
    color: colors.textMuted,
    marginBottom: 1,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.textDark,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: radii.card,
    borderWidth: 0.5,
    borderColor: colors.cardBorder,
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
    borderTopColor: colors.cardBorder,
  },
  reportRowLabel: {
    fontSize: 15,
    fontWeight: '500',
    color: colors.textDark,
  },
  downloadIcon: {
    fontSize: 18,
    color: colors.primaryGreen,
  },
});
