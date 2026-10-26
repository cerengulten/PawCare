import { colors } from './reportTheme';
import { computeAge } from './petAge';
import { daysAway, formatDate as formatDueDate } from './vaccineDisplay';
import { ReportKeyValue, escapeHtml } from './pdfReport';
import { i18n } from './i18n';
import { longDate, weekdayShort } from './i18n/calendar';
import { parseLocalDate, toLocalDateString } from './dateUtils';
import {
  Dog,
  Profile,
  DogMood,
  MealDetail,
  HealthLog,
  VaccineRecord,
  PoopConsistency,
  PoopColor,
  VomitSeverity,
} from '../types';
import { MOOD_EMOJI, MOOD_COLOR } from '../screens/MoodHistoryScreen';
import {
  foodTypeLabel,
  dateKey as mealDateKey,
  formatTime as formatMealTime,
  mealNameFor,
  amountPillsFor,
  formatBrands,
  mostCommon,
  totalGrams,
} from '../screens/MealHistoryScreen';
import {
  dateKey as symptomDateKey,
  formatTime as formatSymptomTime,
} from '../screens/SymptomHistoryScreen';

const t = (k: string, o?: Record<string, unknown>) => i18n.t(k, o);
const formatMoodDate = longDate;
const formatMealDate = longDate;
const formatSymptomDate = longDate;
const formatWeekday = weekdayShort;

export type ReportSection = {
  heading: string;
  tableHeaders: string[];
  tableRowsHtml: string;
  summaryRows: ReportKeyValue[];
};

export type ReportBuild = ReportSection & {
  filename: string;
  title: string;
};

function exportedLabel(formatDate: (d: string) => string): string {
  const today = toLocalDateString();
  return t('reports.exportedValue', { date: formatDate(today) });
}

function exportedRow(formatDate: (d: string) => string): ReportKeyValue {
  return { key: t('reports.exported'), value: exportedLabel(formatDate) };
}

function generatedByRow(): ReportKeyValue {
  return { key: t('reports.generatedBy'), value: 'Bisco' };
}

export function buildDogInfoRows(dog: Dog, profile: Profile | null): ReportKeyValue[] {
  const unknown = t('reports.unknown');
  const sexLabel = dog.sex === 'male' ? t('reports.male') : dog.sex === 'female' ? t('reports.female') : unknown;
  const ageLabel = computeAge(dog.birth_date) || unknown;
  const weightLabel = dog.weight_kg != null ? `${dog.weight_kg} kg` : unknown;
  const ownerLabel = `${profile?.full_name ?? unknown}${profile?.username ? ` (@${profile.username})` : ''}`;
  return [
    { key: t('reports.dogName'), value: dog.name },
    { key: t('reports.breed'), value: `${dog.breed ?? unknown} · ${sexLabel}` },
    { key: t('reports.ageWeight'), value: `${ageLabel} · ${weightLabel}` },
    { key: t('reports.owner'), value: ownerLabel },
  ];
}

export function buildMoodReport(
  dog: Dog,
  historyByDate: Map<string, DogMood['mood']>
): ReportBuild | null {
  if (historyByDate.size === 0) return null;

  const entriesNewestFirst = Array.from(historyByDate.entries())
    .sort(([a], [b]) => b.localeCompare(a));
  const dates = entriesNewestFirst.map(([date]) => date);
  const newestDate = dates[0];
  const oldestDate = dates[dates.length - 1];

  const totalDaysInPeriod = Math.round(
    (parseLocalDate(newestDate).getTime() - parseLocalDate(oldestDate).getTime()) / 86400000
  ) + 1;

  const moodCounts = new Map<DogMood['mood'], number>();
  let concerningDays = 0;
  for (const [, mood] of entriesNewestFirst) {
    moodCounts.set(mood, (moodCounts.get(mood) ?? 0) + 1);
    if (mood === 'off' || mood === 'sick') concerningDays += 1;
  }
  let mostCommonMood: DogMood['mood'] | null = null;
  let mostCommonCount = 0;
  for (const [mood, count] of moodCounts) {
    if (count > mostCommonCount) { mostCommonMood = mood; mostCommonCount = count; }
  }

  const periodLabel = oldestDate === newestDate
    ? formatMoodDate(newestDate)
    : `${formatMoodDate(oldestDate)} – ${formatMoodDate(newestDate)}`;

  const tableRows = entriesNewestFirst.map(([date, mood], i) => `
    <tr style="background:${i % 2 === 1 ? '#F8FCF6' : '#FFFFFF'};">
      <td>${escapeHtml(formatMoodDate(date))}</td>
      <td>${escapeHtml(formatWeekday(date))}</td>
      <td style="color:${MOOD_COLOR[mood]};font-weight:600;">${escapeHtml(t('mood.' + mood))}</td>
      <td>${MOOD_EMOJI[mood]}</td>
    </tr>
  `).join('');

  const newest = parseLocalDate(newestDate);
  const monthAbbrev = newest.toLocaleDateString('en-US', { month: 'short' });

  return {
    heading: t('reports.mood.heading'),
    filename: `${dog.name.replace(/\s+/g, '_')}_mood_history_${monthAbbrev}${newest.getFullYear()}.pdf`,
    title: t('reports.mood.title'),
    tableHeaders: [t('reports.mood.colDate'), t('reports.mood.colDay'), t('reports.mood.colMood'), t('reports.mood.colEmoji')],
    tableRowsHtml: tableRows,
    summaryRows: [
      { key: t('reports.mood.mostCommonMood'), value: mostCommonMood ? t('reports.mood.mostCommonMoodValue', { mood: t('mood.' + mostCommonMood), count: mostCommonCount }) : '—' },
      { key: t('reports.mood.daysLogged'), value: t('reports.mood.daysLoggedValue', { logged: historyByDate.size, total: totalDaysInPeriod }) },
      { key: t('reports.mood.concerningDays'), value: `${concerningDays}` },
      { key: t('reports.period'), value: periodLabel },
      exportedRow(formatMoodDate),
      generatedByRow(),
    ],
  };
}

export function buildMealReport(dog: Dog, mealDetails: MealDetail[]): ReportBuild | null {
  if (mealDetails.length === 0) return null;

  const allSorted = mealDetails.slice().sort((a, b) => b.logged_at.localeCompare(a.logged_at));
  const newestDate = mealDateKey(allSorted[0].logged_at);
  const oldestDate = mealDateKey(allSorted[allSorted.length - 1].logged_at);

  const mostCommonType = mostCommon(mealDetails.map(d => d.food_type));
  const avgGramsPerMeal = Math.round(
    mealDetails.reduce((sum, d) => sum + totalGrams(d), 0) / mealDetails.length
  );

  const periodLabel = oldestDate === newestDate
    ? formatMealDate(newestDate)
    : `${formatMealDate(oldestDate)} – ${formatMealDate(newestDate)}`;

  const tableRows = allSorted.map((d, i) => {
    const amount = amountPillsFor(d).map(p => `${p.amount}g ${p.sub}`).join(', ') || '—';
    const brand = formatBrands(d).map(b => `${b.label}: ${b.brand}`).join(', ') || '—';
    return `
      <tr style="background:${i % 2 === 1 ? '#F8FCF6' : '#FFFFFF'};">
        <td>${escapeHtml(formatMealDate(mealDateKey(d.logged_at)))}</td>
        <td>${escapeHtml(formatMealTime(d.logged_at))}</td>
        <td>${escapeHtml(mealNameFor(d.logged_at))}</td>
        <td>${escapeHtml(foodTypeLabel(d.food_type))}</td>
        <td>${escapeHtml(amount)}</td>
        <td>${escapeHtml(brand)}</td>
      </tr>
    `;
  }).join('');

  const newest = parseLocalDate(newestDate);
  const monthAbbrev = newest.toLocaleDateString('en-US', { month: 'short' });

  return {
    heading: t('reports.meal.heading'),
    filename: `${dog.name.replace(/\s+/g, '_')}_meal_history_${monthAbbrev}${newest.getFullYear()}.pdf`,
    title: t('reports.meal.title'),
    tableHeaders: [t('reports.meal.colDate'), t('reports.meal.colTime'), t('reports.meal.colMeal'), t('reports.meal.colType'), t('reports.meal.colAmount'), t('reports.meal.colBrand')],
    tableRowsHtml: tableRows,
    summaryRows: [
      { key: t('reports.meal.totalMeals'), value: `${mealDetails.length}` },
      { key: t('reports.meal.mostCommonType'), value: mostCommonType ? foodTypeLabel(mostCommonType) : '—' },
      { key: t('reports.meal.avgGrams'), value: `${avgGramsPerMeal}g` },
      { key: t('reports.period'), value: periodLabel },
      exportedRow(formatMealDate),
      generatedByRow(),
    ],
  };
}

export function buildSymptomReport(
  dog: Dog,
  logs: HealthLog[],
  vomitLogs: HealthLog[]
): ReportBuild | null {
  if (logs.length === 0 && vomitLogs.length === 0) return null;

  const entriesNewestFirst = [...logs, ...vomitLogs]
    .slice()
    .sort((a, b) => b.logged_at.localeCompare(a.logged_at));
  const newestDate = symptomDateKey(entriesNewestFirst[0].logged_at);
  const oldestDate = symptomDateKey(entriesNewestFirst[entriesNewestFirst.length - 1].logged_at);

  const consistencyCounts = new Map<PoopConsistency, number>();
  for (const l of logs) {
    const c = (l.details as { consistency?: PoopConsistency } | undefined)?.consistency;
    if (c) consistencyCounts.set(c, (consistencyCounts.get(c) ?? 0) + 1);
  }
  let mostCommonConsistency: PoopConsistency | null = null;
  let mostCommonCount = 0;
  for (const [c, count] of consistencyCounts) {
    if (count > mostCommonCount) { mostCommonConsistency = c; mostCommonCount = count; }
  }

  const periodLabel = oldestDate === newestDate
    ? formatSymptomDate(newestDate)
    : `${formatSymptomDate(oldestDate)} – ${formatSymptomDate(newestDate)}`;

  const tableRows = entriesNewestFirst.map((l, i) => {
    const isPoop = l.type === 'poop';
    const typeColor = isPoop ? colors.pendingAmberText : colors.allergenText;
    const detailsObj = (l.details || {}) as Record<string, unknown>;
    const details = isPoop
      ? `${detailsObj.consistency ? t('poop.consistencyOpt.' + detailsObj.consistency) : '—'} · ${detailsObj.color ? t('poop.colorOpt.' + detailsObj.color) : '—'}`
      : `${detailsObj.severity ? t('vomit.severityOpt.' + detailsObj.severity) : '—'} · ${detailsObj.possibleCause ? t('vomit.causeOpt.' + detailsObj.possibleCause) : '—'}`;
    const frequency = typeof detailsObj.frequency === 'number' ? detailsObj.frequency : 1;
    return `
      <tr style="background:${i % 2 === 1 ? '#F8FCF6' : '#FFFFFF'};">
        <td>${escapeHtml(formatSymptomDate(symptomDateKey(l.logged_at)))}</td>
        <td>${escapeHtml(formatSymptomTime(l.logged_at))}</td>
        <td style="color:${typeColor};font-weight:600;">${escapeHtml(isPoop ? t('reports.poop') : t('reports.vomit'))}</td>
        <td>${escapeHtml(details)}</td>
        <td>${escapeHtml(String(frequency))}</td>
        <td>${escapeHtml(l.notes ?? '—')}</td>
      </tr>
    `;
  }).join('');

  const newest = parseLocalDate(newestDate);
  const monthAbbrev = newest.toLocaleDateString('en-US', { month: 'short' });

  return {
    heading: t('reports.symptom.heading'),
    filename: `${dog.name.replace(/\s+/g, '_')}_symptom_history_${monthAbbrev}${newest.getFullYear()}.pdf`,
    title: t('reports.symptom.title'),
    tableHeaders: [t('reports.symptom.colDate'), t('reports.symptom.colTime'), t('reports.symptom.colType'), t('reports.symptom.colDetails'), t('reports.symptom.colFrequency'), t('reports.symptom.colNotes')],
    tableRowsHtml: tableRows,
    summaryRows: [
      { key: t('reports.symptom.poopLogs'), value: `${logs.length}` },
      { key: t('reports.symptom.vomitLogs'), value: `${vomitLogs.length}` },
      { key: t('reports.symptom.mostCommonStool'), value: mostCommonConsistency ? t('poop.consistencyOpt.' + mostCommonConsistency) : '—' },
      { key: t('reports.period'), value: periodLabel },
      exportedRow(formatSymptomDate),
      generatedByRow(),
    ],
  };
}

export function buildVaccineReport(
  dog: Dog,
  overdue: VaccineRecord[],
  upcoming: VaccineRecord[]
): ReportBuild | null {
  const allVaccines = [...overdue, ...upcoming];
  if (allVaccines.length === 0) return null;

  const statusFor = (v: VaccineRecord) => {
    const isOverdue = overdue.includes(v);
    const days = daysAway(v.next_due_date);
    if (isOverdue) return { label: t('vaccines.overdue'), color: colors.allergenText };
    if (days <= 30) return { label: t('vaccines.soon'), color: colors.pendingAmberText };
    return { label: t('vaccines.scheduled'), color: colors.primaryGreen };
  };

  const tableRows = allVaccines.map((v, i) => {
    const status = statusFor(v);
    return `
      <tr style="background:${i % 2 === 1 ? '#F8FCF6' : '#FFFFFF'};">
        <td>${escapeHtml(v.vaccine_name)}</td>
        <td>${escapeHtml(v.date_given ? formatDueDate(v.date_given) : '—')}</td>
        <td>${escapeHtml(formatDueDate(v.next_due_date))}</td>
        <td style="color:${status.color};font-weight:600;">${escapeHtml(status.label)}</td>
        <td>${escapeHtml(v.notes ?? '—')}</td>
      </tr>
    `;
  }).join('');

  const today = new Date();
  const monthAbbrev = today.toLocaleDateString('en-US', { month: 'short' });

  return {
    heading: t('reports.vaccine.heading'),
    filename: `${dog.name.replace(/\s+/g, '_')}_vaccine_history_${monthAbbrev}${today.getFullYear()}.pdf`,
    title: t('reports.vaccine.title'),
    tableHeaders: [t('reports.vaccine.colVaccine'), t('reports.vaccine.colDateGiven'), t('reports.vaccine.colNextDue'), t('reports.vaccine.colStatus'), t('reports.vaccine.colNotes')],
    tableRowsHtml: tableRows,
    summaryRows: [
      { key: t('reports.vaccine.totalTracked'), value: `${allVaccines.length}` },
      { key: t('reports.vaccine.overdue'), value: `${overdue.length}` },
      { key: t('reports.vaccine.upcoming30'), value: `${allVaccines.filter(v => !overdue.includes(v) && daysAway(v.next_due_date) <= 30).length}` },
      exportedRow(formatDueDate),
      generatedByRow(),
    ],
  };
}
