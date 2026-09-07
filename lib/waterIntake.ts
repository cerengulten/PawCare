export const ML_PER_KG_MIN = 50;
export const ML_PER_KG_MAX = 60;
export const ML_PER_KG_DEFAULT = 55;
const WET_FOOD_MAX_REDUCTION = 0.2; // up to 20% less at 100% wet food

export function calculateWaterTargetMl(
  weightKg: number | null,
  wetDryRatioPercent: number | null, // 0-100 (% wet); null = unknown, treated as fully dry
): number | null {
  if (weightKg == null || weightKg <= 0) return null;
  const base = weightKg * ML_PER_KG_DEFAULT;
  const wetFraction = Math.min(100, Math.max(0, wetDryRatioPercent ?? 0)) / 100;
  const adjusted = base * (1 - wetFraction * WET_FOOD_MAX_REDUCTION);
  return Math.round(adjusted / 10) * 10; // round to nearest 10ml
}
