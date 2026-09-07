import { useMemo, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Alert, StyleSheet, ActivityIndicator } from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';
import { Dog, MealDetail, FoodType } from '../types';
import { useMealDetails } from '../lib/hooks/useMealDetails';
import { useProfile } from '../lib/hooks/useProfile';
import { computeAge } from '../lib/petAge';
import { buildReportHtml } from '../lib/pdfReport';
import { shareHtmlAsPdf } from '../lib/pdfExport';
import MealDetailSheet from '../components/MealDetailSheet';
import SwipeBackWrapper from '../components/SwipeBackWrapper';
import { useTheme } from '../lib/ThemeContext';
import { ThemeTokens } from '../lib/themes';

export function formatLongDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

type Props = {
  dog: Dog;
  mealDetails: MealDetail[];
  addMealDetail: ReturnType<typeof useMealDetails>['addMealDetail'];
  deleteMealDetail: ReturnType<typeof useMealDetails>['deleteMealDetail'];
  onBack: () => void;
};

const FOOD_TYPE_EMOJI: Record<FoodType, string> = {
  wet: '🥩',
  dry: '🌾',
  mixed: '🥣',
  raw: '🥚',
};

export const FOOD_TYPE_LABEL: Record<FoodType, string> = {
  wet: 'Wet',
  dry: 'Dry',
  mixed: 'Mixed',
  raw: 'Raw',
};

function foodTypeChipStyle(theme: ThemeTokens): Record<FoodType, { bg: string; text: string }> {
  return {
    wet: { bg: theme.communityBlueBg, text: theme.communityBlueText },
    dry: { bg: theme.pendingAmberBg, text: theme.pendingAmberText },
    mixed: { bg: theme.symptomBothBg, text: theme.symptomBothText },
    raw: { bg: theme.moodSelBg, text: theme.primary },
  };
}

function foodTypeDot(theme: ThemeTokens): Record<'wet' | 'dry' | 'raw', string> {
  return {
    wet: theme.communityBlueText,
    dry: theme.pending,
    raw: theme.primary,
  };
}

const FILTER_OPTIONS: { value: FoodType | 'all'; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'wet', label: '🥩 Wet' },
  { value: 'dry', label: '🌾 Dry' },
  { value: 'mixed', label: '🥣 Mixed' },
  { value: 'raw', label: '🥚 Raw' },
];

const WEEKDAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export function dateKey(iso: string): string {
  return iso.split('T')[0];
}

export function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
}

function formatDateHeader(key: string, todayKey: string, yesterdayKey: string): string {
  if (key === todayKey) return 'Today';
  if (key === yesterdayKey) return 'Yesterday';
  return new Date(key).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

// Meal name is derived purely for display from time-of-day, not stored on meal_details.
export function mealNameFor(iso: string): string {
  const hour = new Date(iso).getHours();
  if (hour >= 5 && hour < 11) return 'Breakfast';
  if (hour >= 11 && hour < 16) return 'Lunch';
  if (hour >= 16 && hour < 21) return 'Dinner';
  return 'Snack';
}

// `sub` doubles as the key into foodTypeDot(theme) at render time — kept color-free here
// since this pure function is shared with lib/reportBuilders.ts, which renders a fixed
// static palette (see lib/reportTheme.ts) rather than the live in-app theme.
type AmountPillInfo = { amount: number; sub: 'wet' | 'dry' | 'raw' };

export function amountPillsFor(detail: MealDetail): AmountPillInfo[] {
  if (detail.food_type === 'mixed') {
    const pills: AmountPillInfo[] = [];
    if (detail.wet_amount_grams) pills.push({ amount: detail.wet_amount_grams, sub: 'wet' });
    if (detail.dry_amount_grams) pills.push({ amount: detail.dry_amount_grams, sub: 'dry' });
    return pills;
  }
  const amount = detail.food_type === 'wet' ? detail.wet_amount_grams
    : detail.food_type === 'dry' ? detail.dry_amount_grams
    : detail.raw_amount_grams;
  if (!amount) return [];
  return [{ amount, sub: detail.food_type as 'wet' | 'dry' | 'raw' }];
}

export function formatBrands(detail: MealDetail): { emoji: string; label: string; brand: string }[] {
  if (detail.food_type === 'mixed') {
    const parts: { emoji: string; label: string; brand: string }[] = [];
    if (detail.brand_wet) parts.push({ emoji: FOOD_TYPE_EMOJI.wet, label: 'Wet', brand: detail.brand_wet });
    if (detail.brand_dry) parts.push({ emoji: FOOD_TYPE_EMOJI.dry, label: 'Dry', brand: detail.brand_dry });
    return parts;
  }
  const brand = detail.food_type === 'wet' ? detail.brand_wet
    : detail.food_type === 'dry' ? detail.brand_dry
    : detail.brand_raw;
  return brand ? [{ emoji: FOOD_TYPE_EMOJI[detail.food_type], label: 'Brand', brand }] : [];
}

export function mostCommon<T extends string>(items: T[]): T | null {
  const counts = new Map<T, number>();
  for (const item of items) counts.set(item, (counts.get(item) ?? 0) + 1);
  let best: T | null = null;
  let bestCount = 0;
  for (const [item, count] of counts) {
    if (count > bestCount) { best = item; bestCount = count; }
  }
  return best;
}

export function totalGrams(detail: MealDetail): number {
  return (detail.wet_amount_grams ?? 0) + (detail.dry_amount_grams ?? 0) + (detail.raw_amount_grams ?? 0);
}

type MealEntryRowProps = {
  detail: MealDetail;
  onEdit: () => void;
  onDelete: () => void;
};

function MealEntryRow({ detail, onEdit, onDelete }: MealEntryRowProps) {
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const swipeableRef = useRef<Swipeable>(null);

  function confirmDelete() {
    Alert.alert(
      'Delete meal detail?',
      'This permanently deletes this meal record.',
      [
        { text: 'Cancel', style: 'cancel', onPress: () => swipeableRef.current?.close() },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => { swipeableRef.current?.close(); onDelete(); },
        },
      ]
    );
  }

  const renderRightActions = () => (
    <View style={styles.swipeActions}>
      <TouchableOpacity
        style={[styles.actionButton, styles.editAction]}
        onPress={() => { swipeableRef.current?.close(); onEdit(); }}
      >
        <Text style={styles.actionText}>Edit</Text>
      </TouchableOpacity>
      <TouchableOpacity style={[styles.actionButton, styles.deleteAction]} onPress={confirmDelete}>
        <Text style={styles.actionText}>Delete</Text>
      </TouchableOpacity>
    </View>
  );

  const chip = foodTypeChipStyle(theme)[detail.food_type];
  const dot = foodTypeDot(theme);
  const pills = amountPillsFor(detail);
  const brandParts = formatBrands(detail);

  return (
    <Swipeable ref={swipeableRef} renderRightActions={renderRightActions} overshootRight={false}>
      <TouchableOpacity style={styles.entryCard} onPress={onEdit} activeOpacity={0.8}>
        <View style={styles.entryTop}>
          <Text style={styles.entryEmoji}>{FOOD_TYPE_EMOJI[detail.food_type]}</Text>
          <View style={styles.entryBody}>
            <Text style={styles.entryName}>{mealNameFor(detail.logged_at)} · {FOOD_TYPE_LABEL[detail.food_type]}</Text>
            <Text style={styles.entryTime}>{formatTime(detail.logged_at)}</Text>
            {detail.notes ? <Text style={styles.entryNotes}>"{detail.notes}"</Text> : null}
          </View>
          <View style={[styles.chip, { backgroundColor: chip.bg }]}>
            <Text style={[styles.chipText, { color: chip.text }]}>{FOOD_TYPE_LABEL[detail.food_type]}</Text>
          </View>
        </View>

        {pills.length > 0 ? (
          <View style={styles.amountsRow}>
            {pills.map((p, i) => (
              <View key={i} style={styles.amountPill}>
                <View style={[styles.amountDot, { backgroundColor: dot[p.sub] }]} />
                <Text style={styles.amountText}>{p.amount}g</Text>
                <Text style={styles.amountSub}>{p.sub}</Text>
              </View>
            ))}
          </View>
        ) : null}

        {brandParts.length > 0 ? (
          <>
            <View style={styles.entryDivider} />
            <View style={styles.brandRow}>
              {brandParts.map((b, i) => (
                <Text key={i} style={styles.brandText}>
                  {i > 0 ? '  ' : ''}{b.emoji} {b.label}: <Text style={styles.brandStrong}>{b.brand}</Text>
                </Text>
              ))}
            </View>
          </>
        ) : null}
      </TouchableOpacity>
    </Swipeable>
  );
}

export default function MealHistoryScreen({ dog, mealDetails, addMealDetail, deleteMealDetail, onBack }: Props) {
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const { profile } = useProfile();
  const [exporting, setExporting] = useState(false);
  const [filter, setFilter] = useState<FoodType | 'all'>('all');
  const [editingDetail, setEditingDetail] = useState<MealDetail | null>(null);

  const now = new Date();
  const todayKey = dateKey(now.toISOString());
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayKey = dateKey(yesterday.toISOString());

  // This screen's "week" is Monday-first (matching the mockup's bar chart), unlike the
  // Sunday-first month calendars elsewhere in the app (MoodHistoryScreen/SymptomHistoryScreen)
  // — a deliberate, screen-local choice since this is a 7-day bar list, not a calendar grid.
  const todayDow = now.getDay(); // 0=Sun..6=Sat
  const diffToMonday = todayDow === 0 ? -6 : 1 - todayDow;
  const monday = new Date(now);
  monday.setDate(monday.getDate() + diffToMonday);
  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(d.getDate() + i);
    return { key: dateKey(d.toISOString()), label: WEEKDAY_LABELS[i] };
  });
  const weekStartKey = weekDays[0].key;
  const weekEndKey = weekDays[6].key;

  const weekEntries = mealDetails.filter(d => {
    const k = dateKey(d.logged_at);
    return k >= weekStartKey && k <= weekEndKey;
  });
  const daysWithLogs = new Set(weekEntries.map(d => dateKey(d.logged_at)));
  const weekTotalGrams = weekEntries.reduce((sum, d) => sum + totalGrams(d), 0);
  const avgDailyIntake = daysWithLogs.size > 0 ? Math.round(weekTotalGrams / daysWithLogs.size) : null;
  const mostCommonType = mostCommon(weekEntries.map(d => d.food_type));

  const dayTotals = weekDays.map(wd => weekEntries
    .filter(d => dateKey(d.logged_at) === wd.key)
    .reduce((sum, d) => sum + totalGrams(d), 0));
  const maxDayTotal = Math.max(...dayTotals, 1);

  const filtered = filter === 'all' ? mealDetails : mealDetails.filter(d => d.food_type === filter);
  const sorted = filtered.slice().sort((a, b) => b.logged_at.localeCompare(a.logged_at));

  const groups: { key: string; label: string; entries: MealDetail[] }[] = [];
  for (const d of sorted) {
    const key = dateKey(d.logged_at);
    let group = groups.find(g => g.key === key);
    if (!group) {
      group = { key, label: formatDateHeader(key, todayKey, yesterdayKey), entries: [] };
      groups.push(group);
    }
    group.entries.push(d);
  }

  async function handleDelete(id: string) {
    await deleteMealDetail(id);
  }

  const handleExport = async () => {
    if (mealDetails.length === 0) {
      Alert.alert('No Data', 'No meal history to export yet.');
      return;
    }
    setExporting(true);
    try {
      const allSorted = mealDetails.slice().sort((a, b) => b.logged_at.localeCompare(a.logged_at));
      const newestDate = dateKey(allSorted[0].logged_at);
      const oldestDate = dateKey(allSorted[allSorted.length - 1].logged_at);

      const mostCommonType = mostCommon(mealDetails.map(d => d.food_type));
      const avgGramsPerMeal = Math.round(
        mealDetails.reduce((sum, d) => sum + totalGrams(d), 0) / mealDetails.length
      );

      const sexLabel = dog.sex === 'male' ? 'Male' : dog.sex === 'female' ? 'Female' : 'Unknown';
      const ageLabel = computeAge(dog.birth_date) || 'Unknown';
      const weightLabel = dog.weight_kg != null ? `${dog.weight_kg} kg` : 'Unknown';
      const ownerLabel = `${profile?.full_name ?? 'Unknown'}${profile?.username ? ` (@${profile.username})` : ''}`;
      const periodLabel = oldestDate === newestDate
        ? formatLongDate(newestDate)
        : `${formatLongDate(oldestDate)} – ${formatLongDate(newestDate)}`;
      const exportedLabel = `${formatLongDate(todayKey)} · Bisco app`;

      const tableRows = allSorted.map((d, i) => {
        const amount = amountPillsFor(d).map(p => `${p.amount}g ${p.sub}`).join(', ') || '—';
        const brand = formatBrands(d).map(b => `${b.label}: ${b.brand}`).join(', ') || '—';
        return `
          <tr style="background:${i % 2 === 1 ? '#F8FCF6' : '#FFFFFF'};">
            <td>${formatLongDate(dateKey(d.logged_at))}</td>
            <td>${formatTime(d.logged_at)}</td>
            <td>${mealNameFor(d.logged_at)}</td>
            <td>${FOOD_TYPE_LABEL[d.food_type]}</td>
            <td>${amount}</td>
            <td>${brand}</td>
          </tr>
        `;
      }).join('');

      const html = buildReportHtml({
        title: '🐾 Bisco — Meal History Report',
        infoRows: [
          { key: 'Dog name:', value: dog.name },
          { key: 'Breed:', value: `${dog.breed ?? 'Unknown'} · ${sexLabel}` },
          { key: 'Age / Weight:', value: `${ageLabel} · ${weightLabel}` },
          { key: 'Owner:', value: ownerLabel },
          { key: 'Period:', value: periodLabel },
          { key: 'Exported:', value: exportedLabel },
        ],
        tableHeaders: ['Date', 'Time', 'Meal', 'Type', 'Amount', 'Brand'],
        tableRowsHtml: tableRows,
        summaryRows: [
          { key: 'Total meals logged:', value: `${mealDetails.length}` },
          { key: 'Most common type:', value: mostCommonType ? FOOD_TYPE_LABEL[mostCommonType] : '—' },
          { key: 'Avg grams per meal:', value: `${avgGramsPerMeal}g` },
          { key: 'Generated by:', value: 'Bisco' },
        ],
      });

      const newest = new Date(newestDate);
      const monthAbbrev = newest.toLocaleDateString('en-US', { month: 'short' });
      const filename = `${dog.name.replace(/\s+/g, '_')}_meal_history_${monthAbbrev}${newest.getFullYear()}.pdf`;

      await shareHtmlAsPdf(filename, html);
    } catch {
      Alert.alert('Export Failed', 'Could not export meal history. Please try again.');
    } finally {
      setExporting(false);
    }
  };

  return (
    <SwipeBackWrapper onBack={onBack}>
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <TouchableOpacity onPress={onBack} style={styles.backRow}>
          <Text style={styles.backText}>‹ Back</Text>
        </TouchableOpacity>

        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.headerDogName}>{dog.name}</Text>
            <Text style={styles.title}>Meal History</Text>
          </View>
          <TouchableOpacity style={styles.downloadBtn} onPress={handleExport} disabled={exporting}>
            {exporting ? (
              <ActivityIndicator size="small" color={theme.primary} />
            ) : (
              <Text style={styles.downloadIcon}>⬇</Text>
            )}
          </TouchableOpacity>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterRow} contentContainerStyle={styles.filterRowContent}>
          {FILTER_OPTIONS.map(opt => {
            const selected = filter === opt.value;
            return (
              <TouchableOpacity
                key={opt.value}
                style={[styles.filterPill, selected && styles.filterPillSelected]}
                onPress={() => setFilter(opt.value)}
              >
                <Text style={[styles.filterPillText, selected && styles.filterPillTextSelected]}>{opt.label}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        <View style={styles.statStrip}>
          <View style={styles.statBox}>
            <Text style={styles.statNum}>{avgDailyIntake != null ? `${avgDailyIntake}g` : '—'}</Text>
            <Text style={styles.statLabel}>avg / day</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={[styles.statNum, styles.statNumPurple]}>
              {mostCommonType ? FOOD_TYPE_LABEL[mostCommonType] : '—'}
            </Text>
            <Text style={styles.statLabel}>most common</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statNum}>{daysWithLogs.size}<Text style={styles.statNumSuffix}>/7</Text></Text>
            <Text style={styles.statLabel}>days logged</Text>
          </View>
        </View>

        <View style={styles.barCard}>
          <Text style={styles.barCardTitle}>Daily intake this week (g)</Text>
          {weekDays.map((wd, i) => {
            const total = dayTotals[i];
            const hasEntry = total > 0;
            const barColor = !hasEntry ? theme.notStartedBg : total >= (avgDailyIntake ?? 0) ? theme.done : theme.pending;
            const width = hasEntry ? Math.max((total / maxDayTotal) * 100, 4) : 0;
            return (
              <View key={wd.key} style={styles.barRow}>
                <Text style={styles.barLabel}>{wd.label}</Text>
                <View style={styles.barTrack}>
                  <View style={[styles.barFill, { width: `${width}%`, backgroundColor: barColor }]} />
                </View>
                <Text style={[styles.barVal, !hasEntry && styles.barValMuted]}>{hasEntry ? `${total}g` : '—'}</Text>
              </View>
            );
          })}
        </View>

        {mealDetails.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>
              No meals logged yet — tap + Add meal detail on any completed feeding to start.
            </Text>
          </View>
        ) : groups.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>No {FOOD_TYPE_LABEL[filter as FoodType]} meals logged.</Text>
          </View>
        ) : (
          groups.map(group => (
            <View key={group.key} style={styles.group}>
              <Text style={styles.groupLabel}>{group.label}</Text>
              {group.entries.map(d => (
                <MealEntryRow
                  key={d.id}
                  detail={d}
                  onEdit={() => setEditingDetail(d)}
                  onDelete={() => handleDelete(d.id)}
                />
              ))}
            </View>
          ))
        )}
      </ScrollView>

      <MealDetailSheet
        visible={editingDetail !== null}
        initial={editingDetail}
        onClose={() => setEditingDetail(null)}
        onSave={async (details) => {
          if (!editingDetail) return { error: new Error('No meal detail selected') };
          const { error } = await addMealDetail(editingDetail.completion_id, dog.id, details);
          if (!error) setEditingDetail(null);
          return { error };
        }}
      />
    </View>
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
      paddingTop: 20,
    },
    backRow: {
      marginBottom: 16,
    },
    backText: {
      color: theme.primary,
      fontSize: 16,
      fontWeight: '600',
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 16,
    },
    headerLeft: {
      flex: 1,
      minWidth: 0,
    },
    headerDogName: {
      fontSize: 12,
      color: theme.textMuted,
      marginBottom: 1,
    },
    title: {
      fontSize: 20,
      fontWeight: '600',
      color: theme.textDark,
    },
    downloadBtn: {
      width: 34,
      height: 34,
      borderRadius: 10,
      backgroundColor: theme.moodSelBg,
      borderWidth: 0.5,
      borderColor: theme.moodSelBorder,
      alignItems: 'center',
      justifyContent: 'center',
    },
    downloadIcon: {
      fontSize: 15,
    },
    filterRow: {
      marginBottom: 14,
    },
    filterRowContent: {
      gap: 8,
    },
    filterPill: {
      paddingVertical: 8,
      paddingHorizontal: 14,
      borderRadius: 20,
      backgroundColor: theme.surface,
      borderWidth: 1,
      borderColor: theme.border,
    },
    filterPillSelected: {
      backgroundColor: theme.primary,
      borderColor: theme.primary,
    },
    filterPillText: {
      fontSize: 12,
      fontWeight: '600',
      color: theme.textDark,
    },
    filterPillTextSelected: {
      color: 'white',
    },
    statStrip: {
      flexDirection: 'row',
      gap: 8,
      marginBottom: 12,
    },
    statBox: {
      flex: 1,
      backgroundColor: theme.surface,
      borderWidth: 0.5,
      borderColor: theme.border,
      borderRadius: 12,
      paddingVertical: 10,
      alignItems: 'center',
    },
    statNum: {
      fontSize: 16,
      fontWeight: '500',
      color: theme.textDark,
    },
    statNumSuffix: {
      fontSize: 11,
      color: theme.textMuted,
    },
    statNumPurple: {
      color: theme.symptomBothText,
      fontSize: 14,
    },
    statLabel: {
      fontSize: 10,
      color: theme.textMuted,
      marginTop: 2,
      textAlign: 'center',
    },
    barCard: {
      backgroundColor: theme.surface,
      borderWidth: 0.5,
      borderColor: theme.border,
      borderRadius: theme.radiiCard,
      padding: 13,
      marginBottom: 16,
    },
    barCardTitle: {
      fontSize: 10,
      fontWeight: '600',
      color: theme.textMuted,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
      marginBottom: 8,
    },
    barRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 7,
      marginBottom: 6,
    },
    barLabel: {
      fontSize: 10,
      color: theme.textMuted,
      width: 26,
      textAlign: 'right',
    },
    barTrack: {
      flex: 1,
      height: 6,
      backgroundColor: theme.notStartedBg,
      borderRadius: 3,
      overflow: 'hidden',
    },
    barFill: {
      height: '100%',
      borderRadius: 3,
    },
    barVal: {
      fontSize: 10,
      fontWeight: '500',
      color: theme.textDark,
      width: 34,
    },
    barValMuted: {
      color: theme.textMuted,
    },
    emptyState: {
      paddingVertical: 40,
      paddingHorizontal: 20,
    },
    emptyStateText: {
      textAlign: 'center',
      fontSize: 14,
      color: theme.textMuted,
      lineHeight: 20,
    },
    group: {
      marginBottom: 14,
    },
    groupLabel: {
      fontSize: 11,
      fontWeight: '600',
      color: theme.textMuted,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
      marginBottom: 8,
    },
    entryCard: {
      backgroundColor: theme.surface,
      borderRadius: theme.radiiCard,
      borderWidth: 0.5,
      borderColor: theme.border,
      marginBottom: 8,
      overflow: 'hidden',
    },
    entryTop: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 10,
      padding: 12,
    },
    entryEmoji: {
      fontSize: 20,
      marginTop: 1,
    },
    entryBody: {
      flex: 1,
      minWidth: 0,
    },
    entryName: {
      fontSize: 13,
      fontWeight: '500',
      color: theme.textDark,
      marginBottom: 2,
    },
    entryTime: {
      fontSize: 11,
      color: theme.textMuted,
    },
    entryNotes: {
      fontSize: 11,
      color: theme.textMuted,
      fontStyle: 'italic',
      marginTop: 2,
    },
    chip: {
      borderRadius: 20,
      paddingHorizontal: 9,
      paddingVertical: 3,
    },
    chipText: {
      fontSize: 11,
      fontWeight: '500',
    },
    amountsRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 6,
      paddingHorizontal: 12,
      paddingBottom: 10,
    },
    amountPill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      backgroundColor: theme.background,
      borderWidth: 0.5,
      borderColor: theme.border,
      borderRadius: 8,
      paddingVertical: 5,
      paddingHorizontal: 9,
    },
    amountDot: {
      width: 7,
      height: 7,
      borderRadius: 4,
    },
    amountText: {
      fontSize: 11,
      fontWeight: '500',
      color: theme.textDark,
    },
    amountSub: {
      fontSize: 10,
      color: theme.textMuted,
    },
    entryDivider: {
      height: 0.5,
      backgroundColor: theme.divider,
    },
    brandRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      paddingHorizontal: 12,
      paddingVertical: 8,
    },
    brandText: {
      fontSize: 11,
      color: theme.textMuted,
    },
    brandStrong: {
      fontSize: 11,
      color: theme.textDark,
      fontWeight: '500',
    },
    swipeActions: {
      flexDirection: 'row',
      marginBottom: 8,
    },
    actionButton: {
      width: 64,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: theme.radiiCard,
      marginLeft: 4,
    },
    editAction: {
      backgroundColor: theme.primary,
    },
    deleteAction: {
      backgroundColor: theme.allergenText,
    },
    actionText: {
      color: 'white',
      fontSize: 13,
      fontWeight: '600',
    },
  });
}
