import { useMemo } from 'react';
import { View, Text, TouchableOpacity, Alert, StyleSheet } from 'react-native';
import { Dog } from '../types';
import { useCycleTracking } from '../lib/hooks/useCycleTracking';
import { useTheme } from '../lib/ThemeContext';
import { ThemeTokens } from '../lib/themes';
import { phaseColorToken, CyclePhaseName } from '../lib/cycleLogic';

function toDateOnlyString(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function daysAway(target: Date): number {
  const now = new Date();
  const todayMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.round((target.getTime() - todayMidnight.getTime()) / (1000 * 60 * 60 * 24));
}

function phaseLabel(phase: CyclePhaseName): string {
  return phase.charAt(0).toUpperCase() + phase.slice(1);
}

type Props = {
  dog: Dog;
  tracking: ReturnType<typeof useCycleTracking>;
  onStartCycle: () => void;
  onLogSymptoms: () => void;
  onViewHistory: () => void;
};

export default function HeatCycleSection({ dog, tracking, onStartCycle, onLogSymptoms, onViewHistory }: Props) {
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const { mostRecentCycle, activeCycle, currentPhase, predictedPhases, nextCycleDate, loading, endCycle } = tracking;

  if (loading) return null;

  function handleEndCycle() {
    if (!activeCycle) return;
    Alert.alert('End cycle?', `This marks ${dog.name}'s current cycle as finished today.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'End cycle',
        style: 'destructive',
        onPress: () => endCycle(activeCycle.id, new Date()),
      },
    ]);
  }

  // 3a: no cycle recorded yet
  if (!mostRecentCycle) {
    return (
      <View style={styles.section}>
        <View style={styles.sectionTitleRow}>
          <Text style={styles.sectionTitle}>🌸 Heat Cycle</Text>
        </View>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Track {dog.name}'s heat cycle</Text>
          <Text style={styles.cardSubtext}>
            Log when her cycle starts to get phase predictions and reminders for future cycles
          </Text>
          <TouchableOpacity style={styles.primaryLink} onPress={onStartCycle}>
            <Text style={styles.primaryLinkText}>Start tracking →</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // 3b: active cycle
  if (activeCycle && currentPhase && predictedPhases) {
    const segments = predictedPhases.map(p => ({
      phase: p.phase,
      isFertileWindow: p.isFertileWindow,
      days: Math.max(1, Math.round((p.endDate.getTime() - p.startDate.getTime()) / (1000 * 60 * 60 * 24))),
    }));
    const totalDays = segments.reduce((sum, s) => sum + s.days, 0);
    const todayPct = Math.max(0, Math.min(100, (currentPhase.dayOfCycle / totalDays) * 100));
    const fertileSegment = segments.find(s => s.isFertileWindow);

    return (
      <View style={styles.section}>
        <View style={styles.sectionTitleRow}>
          <Text style={styles.sectionTitle}>🌸 Heat Cycle</Text>
        </View>
        <View style={styles.card}>
          <View style={styles.phaseHeaderRow}>
            <View style={[styles.phaseDot, { backgroundColor: theme[phaseColorToken(currentPhase.phaseName)] }]} />
            <Text style={styles.phaseHeaderText}>
              {phaseLabel(currentPhase.phaseName)} · Day {currentPhase.dayOfPhase}
            </Text>
          </View>

          <View style={styles.timelineWrapper}>
            <View style={styles.timelineBar}>
              {segments.map((seg, i) => (
                <View
                  key={`${seg.phase}-${i}`}
                  style={[
                    styles.timelineSegment,
                    { flex: seg.days, backgroundColor: theme[phaseColorToken(seg.phase)] },
                    seg.phase === currentPhase.phaseName && styles.timelineSegmentActive,
                  ]}
                />
              ))}
            </View>
            <View style={[styles.todayMarker, { left: `${todayPct}%` }]} />
          </View>
          {fertileSegment ? <Text style={styles.fertileLabel}>Fertile window during Estrus</Text> : null}

          <TouchableOpacity style={styles.primaryLink} onPress={onLogSymptoms}>
            <Text style={styles.primaryLinkText}>Log today's symptoms</Text>
          </TouchableOpacity>
        </View>
        <TouchableOpacity onPress={handleEndCycle} style={styles.endCycleRow}>
          <Text style={styles.endCycleText}>End cycle</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // 3c: between cycles
  if (nextCycleDate) {
    const away = daysAway(nextCycleDate.predictedDate);
    const awayLabel = away === 0 ? 'today' : away === 1 ? 'in 1 day' : away > 0 ? `in ${away} days` : `${Math.abs(away)} days ago`;
    const confidenceLabel = nextCycleDate.confidenceLevel === 'predicted' ? 'Predicted' : 'Estimated';

    return (
      <View style={styles.section}>
        <View style={styles.sectionTitleRow}>
          <Text style={styles.sectionTitle}>🌸 Heat Cycle</Text>
        </View>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Next cycle expected</Text>
          <Text style={styles.nextCycleDate}>
            {toDateOnlyString(nextCycleDate.predictedDate)} · {awayLabel}
          </Text>
          <Text style={styles.confidenceLabel}>{confidenceLabel}</Text>
          <TouchableOpacity style={styles.primaryLink} onPress={onViewHistory}>
            <Text style={styles.primaryLinkText}>View cycle history →</Text>
          </TouchableOpacity>
        </View>
        <TouchableOpacity onPress={onStartCycle} style={styles.endCycleRow}>
          <Text style={styles.endCycleText}>Cycle started early?</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return null;
}

function makeStyles(theme: ThemeTokens) {
  return StyleSheet.create({
    section: {
      width: '100%',
      marginBottom: 20,
    },
    sectionTitleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 10,
    },
    sectionTitle: {
      fontSize: 16,
      fontWeight: '700',
      color: theme.textDark,
    },
    card: {
      backgroundColor: theme.surface,
      borderRadius: theme.radiiCard,
      borderWidth: 0.5,
      borderColor: theme.border,
      padding: 16,
    },
    cardTitle: {
      fontSize: 15,
      fontWeight: '600',
      color: theme.textDark,
      marginBottom: 6,
    },
    cardSubtext: {
      fontSize: 13,
      color: theme.textMuted,
      marginBottom: 14,
      lineHeight: 18,
    },
    primaryLink: {
      backgroundColor: theme.primaryLight,
      borderRadius: theme.radiiCard,
      paddingVertical: 12,
      alignItems: 'center',
      marginTop: 4,
    },
    primaryLinkText: {
      fontSize: 14,
      fontWeight: '700',
      color: theme.primaryDark,
    },
    phaseHeaderRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginBottom: 12,
    },
    phaseDot: {
      width: 10,
      height: 10,
      borderRadius: 5,
    },
    phaseHeaderText: {
      fontSize: 15,
      fontWeight: '700',
      color: theme.textDark,
    },
    timelineWrapper: {
      marginBottom: 8,
    },
    timelineBar: {
      flexDirection: 'row',
      height: 10,
      borderRadius: 5,
      overflow: 'hidden',
    },
    timelineSegment: {
      height: 10,
    },
    timelineSegmentActive: {
      borderWidth: 1.5,
      borderColor: theme.textDark,
    },
    todayMarker: {
      position: 'absolute',
      top: -3,
      width: 2,
      height: 16,
      backgroundColor: theme.textDark,
    },
    fertileLabel: {
      fontSize: 11,
      color: theme.phaseEstrus,
      fontWeight: '600',
      marginBottom: 10,
    },
    nextCycleDate: {
      fontSize: 15,
      fontWeight: '600',
      color: theme.textDark,
      marginBottom: 4,
    },
    confidenceLabel: {
      fontSize: 12,
      color: theme.textMuted,
      marginBottom: 14,
    },
    endCycleRow: {
      alignItems: 'center',
      marginTop: 10,
    },
    endCycleText: {
      fontSize: 13,
      fontWeight: '600',
      color: theme.textMuted,
    },
  });
}
