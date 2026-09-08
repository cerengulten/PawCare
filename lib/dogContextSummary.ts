import { Dog, Allergen, MealDetail, DogMood, HealthLog, PoopLogDetails, VomitLogDetails, WaterLog } from '../types';
import { computeAge } from './petAge';

export type DogChatContext = {
  allergens: Allergen[];
  mealDetails: MealDetail[];
  moodHistoryByDate: Map<string, DogMood['mood']>;
  healthLogs: HealthLog[];
  vomitLogs: HealthLog[];
  waterLogs: WaterLog[];
};

function isWithinDays(isoDate: string, days: number): boolean {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  return new Date(isoDate) >= cutoff;
}

export function buildDogContextSummary(dog: Dog, ctx: DogChatContext): string {
  const lines: string[] = [];

  lines.push(`Name: ${dog.name}`);
  lines.push(`Species: ${dog.species ?? 'unknown'}`);
  lines.push(`Breed: ${dog.breed ?? 'unknown'}`);
  lines.push(`Sex: ${dog.sex ?? 'unknown'}`);
  const age = computeAge(dog.birth_date);
  lines.push(`Age: ${age || 'unknown'}`);
  lines.push(`Weight: ${dog.weight_kg != null ? `${dog.weight_kg} kg` : 'unknown'}`);

  lines.push(
    ctx.allergens.length > 0
      ? `Known food sensitivities/allergens: ${ctx.allergens.map(a => a.allergen).join(', ')}`
      : 'Known food sensitivities/allergens: none logged'
  );

  const recentMeal = [...ctx.mealDetails].sort((a, b) => b.logged_at.localeCompare(a.logged_at))[0];
  if (recentMeal) {
    const amountParts: string[] = [];
    if (recentMeal.wet_amount_grams != null) amountParts.push(`wet ${recentMeal.wet_amount_grams}g${recentMeal.brand_wet ? ` (${recentMeal.brand_wet})` : ''}`);
    if (recentMeal.dry_amount_grams != null) amountParts.push(`dry ${recentMeal.dry_amount_grams}g${recentMeal.brand_dry ? ` (${recentMeal.brand_dry})` : ''}`);
    if (recentMeal.raw_amount_grams != null) amountParts.push(`raw ${recentMeal.raw_amount_grams}g${recentMeal.brand_raw ? ` (${recentMeal.brand_raw})` : ''}`);
    lines.push(`Most recent logged food type: ${recentMeal.food_type}${amountParts.length ? ` — ${amountParts.join(', ')}` : ''}`);
  } else {
    lines.push('Most recent logged food type: no meal detail logged');
  }

  if (ctx.moodHistoryByDate.size > 0) {
    const moodEntries = [...ctx.moodHistoryByDate.entries()].sort((a, b) => b[0].localeCompare(a[0]));
    lines.push(`Mood log, last 7 days: ${moodEntries.map(([date, mood]) => `${date}=${mood}`).join(', ')}`);
  } else {
    lines.push('Mood log, last 7 days: no moods logged');
  }

  const recentPoop = ctx.healthLogs.filter(l => isWithinDays(l.logged_at, 7));
  if (recentPoop.length > 0) {
    lines.push(
      `Poop logs, last 7 days: ${recentPoop
        .map(l => {
          const d = l.details as PoopLogDetails;
          return `${l.logged_at.slice(0, 10)} consistency=${d.consistency} color=${d.color} frequency=${d.frequency}`;
        })
        .join('; ')}`
    );
  } else {
    lines.push('Poop logs, last 7 days: none logged');
  }

  const recentVomit = ctx.vomitLogs.filter(l => isWithinDays(l.logged_at, 7));
  if (recentVomit.length > 0) {
    lines.push(
      `Vomit logs, last 7 days: ${recentVomit
        .map(l => {
          const d = l.details as VomitLogDetails;
          return `${l.logged_at.slice(0, 10)} severity=${d.severity} possibleCause=${d.possibleCause} frequency=${d.frequency}`;
        })
        .join('; ')}`
    );
  } else {
    lines.push('Vomit logs, last 7 days: none logged');
  }

  if (ctx.waterLogs.length > 0) {
    const totalMl = ctx.waterLogs.reduce((sum, w) => sum + w.amount_ml, 0);
    lines.push(`Water intake, last 7 days: ${totalMl}ml total across ${ctx.waterLogs.length} log(s)`);
  } else {
    lines.push('Water intake, last 7 days: no water logged');
  }

  return lines.join('\n');
}
