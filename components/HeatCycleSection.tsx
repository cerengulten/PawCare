import { useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Dog } from '../types';
import { useCycleTracking } from '../lib/hooks/useCycleTracking';
import { useTheme } from '../lib/ThemeContext';
import { useT } from '../lib/LanguageContext';
import { i18n } from '../lib/i18n';
import { shortDate as i18nShortDate } from '../lib/i18n/calendar';
import { ThemeTokens } from '../lib/themes';
import { phaseColorToken, phaseLabel, matchBreedSizeTier } from '../lib/cycleLogic';

function toDateOnlyString(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function shortDate(d: Date): string {
  return i18nShortDate(toDateOnlyString(d));
}

function daysAway(target: Date): number {
  const now = new Date();
  const todayMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.round((target.getTime() - todayMidnight.getTime()) / (1000 * 60 * 60 * 24));
}

type Props = {
  dog: Dog;
  tracking: ReturnType<typeof useCycleTracking>;
  onStartCycle: () => void;
  onViewHistory: () => void;
};

export default function HeatCycleSection({ dog, tracking, onStartCycle, onViewHistory }: Props) {
  const { theme } = useTheme();
  const { t } = useT();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const { mostRecentCycle, activeCycle, currentPhase, predictedPhases, nextCycleDate, cycles, loading } = tracking;

  if (loading) return null;

  // 3a: no cycle recorded yet
  if (!mostRecentCycle) {
    return (
      <View style={styles.section}>
        <View style={styles.sectionTitleRow}>
          <Text style={styles.sectionTitle}>{t('cycle.sectionTitle')}</Text>
        </View>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>{t('cycle.trackTitle', { name: dog.name })}</Text>
          <Text style={styles.cardSubtext}>
            {t('cycle.trackSubtext')}
          </Text>
          <TouchableOpacity style={styles.primaryLink} onPress={onStartCycle}>
            <Text style={styles.primaryLinkText}>{t('cycle.startTracking')}</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const away = nextCycleDate ? daysAway(nextCycleDate.predictedDate) : null;
  const awayLabel = away == null ? '—' : away <= 0 ? t('cycle.today') : `${away}d`;

  // 3b/3c: a tap-through summary tile — whole card opens Cycle History, no inline buttons.
  return (
    <View style={styles.section}>
      <View style={styles.sectionTitleRow}>
        <Text style={styles.sectionTitle}>{t('cycle.sectionTitle')}</Text>
      </View>
      <TouchableOpacity style={styles.card} onPress={onViewHistory} activeOpacity={0.85}>
        {activeCycle && currentPhase && predictedPhases ? (
          <ActiveHeader currentPhase={currentPhase} predictedPhases={predictedPhases} activeCycleStart={activeCycle.start_date} styles={styles} theme={theme} />
        ) : (
          <BetweenHeader dog={dog} nextCycleDate={nextCycleDate} styles={styles} theme={theme} />
        )}

        <View style={styles.statStrip}>
          <View style={styles.statBox}>
            <Text style={styles.statNum}>{nextCycleDate ? shortDate(nextCycleDate.predictedDate) : '—'}</Text>
            <Text style={styles.statLabel}>{t('cycle.nextCycle')}</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statNum}>{awayLabel}</Text>
            <Text style={styles.statLabel}>{t('cycle.untilNext')}</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statNum}>{cycles.length}</Text>
            <Text style={styles.statLabel}>{cycles.length === 1 ? t('cycle.cycleLogged') : t('cycle.cyclesLogged')}</Text>
          </View>
        </View>
      </TouchableOpacity>
    </View>
  );
}

function ActiveHeader({
  currentPhase,
  predictedPhases,
  activeCycleStart,
  styles,
  theme,
}: {
  currentPhase: NonNullable<ReturnType<typeof useCycleTracking>['currentPhase']>;
  predictedPhases: NonNullable<ReturnType<typeof useCycleTracking>['predictedPhases']>;
  activeCycleStart: string;
  styles: ReturnType<typeof makeStyles>;
  theme: ThemeTokens;
}) {
  const segments = predictedPhases.map(p => ({
    phase: p.phase,
    days: Math.max(1, Math.round((p.endDate.getTime() - p.startDate.getTime()) / (1000 * 60 * 60 * 24))),
  }));
  const totalDays = segments.reduce((sum, s) => sum + s.days, 0);

  return (
    <>
      <View style={styles.headerRow}>
        <View style={[styles.iconBadge, { backgroundColor: theme[phaseColorToken(currentPhase.phaseName)] + '33' }]}>
          <Text style={styles.iconBadgeEmoji}>🌸</Text>
        </View>
        <View style={styles.headerTextCol}>
          <Text style={[styles.headerTitle, { color: theme[phaseColorToken(currentPhase.phaseName)] }]}>
            {i18n.t('cycle.phaseDay', { phase: phaseLabel(currentPhase.phaseName), day: currentPhase.dayOfPhase })}
          </Text>
          <Text style={styles.headerSubtext}>
            {i18n.t('cycle.startedEnds', { start: shortDate(parseLocalDate(activeCycleStart)), end: shortDate(currentPhase.phaseEndDate) })}
          </Text>
        </View>
      </View>

      <View style={styles.timelineBar}>
        {segments.map((seg, i) => (
          <View key={`${seg.phase}-${i}`} style={[styles.timelineSegment, { flex: seg.days, backgroundColor: theme[phaseColorToken(seg.phase)] }]} />
        ))}
      </View>
      <Text style={styles.timelineCaption}>{i18n.t('cycle.todayCaption', { day: currentPhase.dayOfCycle, total: totalDays })}</Text>
    </>
  );
}

function BetweenHeader({
  dog,
  nextCycleDate,
  styles,
  theme,
}: {
  dog: Dog;
  nextCycleDate: ReturnType<typeof useCycleTracking>['nextCycleDate'];
  styles: ReturnType<typeof makeStyles>;
  theme: ThemeTokens;
}) {
  const confidenceLabel = !nextCycleDate
    ? ''
    : nextCycleDate.confidenceLevel === 'predicted'
    ? i18n.t('cycle.predictedFromHistory')
    : matchBreedSizeTier(dog.breed)
    ? i18n.t('cycle.estimatedFromBreed')
    : i18n.t('cycle.estimatedFromSpecies');

  return (
    <View style={styles.headerRow}>
      <View style={[styles.iconBadge, { backgroundColor: theme.phaseDiestrus + '33' }]}>
        <Text style={styles.iconBadgeEmoji}>🌸</Text>
      </View>
      <View style={styles.headerTextCol}>
        <Text style={styles.headerTitle}>{i18n.t('cycle.betweenCycles')}</Text>
        <Text style={styles.headerSubtext}>{confidenceLabel}</Text>
      </View>
    </View>
  );
}

function parseLocalDate(s: string): Date {
  const [y, m, day] = s.split('-').map(Number);
  return new Date(y, m - 1, day);
}

function makeStyles(theme: ThemeTokens) {
  return StyleSheet.create({
    section: {
      width: '100%',
      marginTop: 20,
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
    headerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      marginBottom: 14,
    },
    iconBadge: {
      width: 40,
      height: 40,
      borderRadius: 20,
      alignItems: 'center',
      justifyContent: 'center',
    },
    iconBadgeEmoji: {
      fontSize: 18,
    },
    headerTextCol: {
      flex: 1,
      minWidth: 0,
    },
    headerTitle: {
      fontSize: 15,
      fontWeight: '700',
      color: theme.textDark,
    },
    headerSubtext: {
      fontSize: 12,
      color: theme.textMuted,
      marginTop: 2,
    },
    timelineBar: {
      flexDirection: 'row',
      height: 8,
      borderRadius: 4,
      overflow: 'hidden',
    },
    timelineSegment: {
      height: 8,
    },
    timelineCaption: {
      fontSize: 11,
      color: theme.textMuted,
      marginTop: 6,
      marginBottom: 14,
    },
    statStrip: {
      flexDirection: 'row',
      gap: 8,
    },
    statBox: {
      flex: 1,
      backgroundColor: theme.background,
      borderWidth: 0.5,
      borderColor: theme.border,
      borderRadius: 12,
      paddingVertical: 10,
      alignItems: 'center',
    },
    statNum: {
      fontSize: 15,
      fontWeight: '600',
      color: theme.textDark,
    },
    statLabel: {
      fontSize: 10,
      color: theme.textMuted,
      marginTop: 2,
      textAlign: 'center',
    },
  });
}
