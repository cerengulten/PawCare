import { CycleSpecies } from '../types';
import { i18n } from './i18n';

export type CyclePhaseName = 'proestrus' | 'estrus' | 'diestrus' | 'anestrus' | 'interestrus';

type PhaseParams = {
  minDays: number;
  maxDays: number;
  avgDays: number;
};

type SpeciesParams = {
  avgIntervalDays: number;
  intervalRangeDays: [number, number];
  phases: Partial<Record<CyclePhaseName, PhaseParams>>;
  phaseOrder: CyclePhaseName[];
  hasBleedingInProestrus: boolean;
  fertilePhase: CyclePhaseName;
  note?: string;
};

export const CYCLE_PARAMS: Record<CycleSpecies, SpeciesParams> = {
  dog: {
    avgIntervalDays: 210, // 6-7 months average
    intervalRangeDays: [180, 240],
    phases: {
      proestrus: { minDays: 7, maxDays: 10, avgDays: 8 },
      estrus: { minDays: 5, maxDays: 9, avgDays: 7 },
      diestrus: { minDays: 10, maxDays: 14, avgDays: 12 },
      anestrus: { minDays: 120, maxDays: 150, avgDays: 135 },
    },
    phaseOrder: ['proestrus', 'estrus', 'diestrus', 'anestrus'],
    hasBleedingInProestrus: true,
    fertilePhase: 'estrus',
  },
  cat: {
    avgIntervalDays: 21,
    intervalRangeDays: [14, 28],
    phases: {
      estrus: { minDays: 4, maxDays: 10, avgDays: 7 },
      interestrus: { minDays: 7, maxDays: 14, avgDays: 8 },
    },
    phaseOrder: ['estrus', 'interestrus'],
    hasBleedingInProestrus: false,
    fertilePhase: 'estrus',
    note: 'Seasonal breeder — active spring/summer, dormant winter',
  },
  rabbit: {
    avgIntervalDays: 16,
    intervalRangeDays: [14, 18],
    phases: {
      estrus: { minDays: 12, maxDays: 14, avgDays: 13 },
      diestrus: { minDays: 1, maxDays: 2, avgDays: 2 },
    },
    phaseOrder: ['estrus', 'diestrus'],
    hasBleedingInProestrus: false,
    fertilePhase: 'estrus',
  },
  guinea_pig: {
    avgIntervalDays: 16,
    intervalRangeDays: [15, 17],
    phases: {
      estrus: { minDays: 0, maxDays: 0, avgDays: 0.4 }, // ~10 hours
      diestrus: { minDays: 15, maxDays: 16, avgDays: 15 },
    },
    phaseOrder: ['estrus', 'diestrus'],
    hasBleedingInProestrus: false,
    fertilePhase: 'estrus',
  },
};

/**
 * `dogs.species` is free text from `lib/petSpecies.ts` ('Dog'/'Cat'/'Rabbit'/'Bird'/
 * 'Guinea Pig'/'Cow', or custom text, or null). Only 4 species are cycle-trackable.
 */
export function mapDogSpeciesToCycleSpecies(species: string | null): CycleSpecies | null {
  if (!species) return null;
  const normalized = species.trim().toLowerCase();
  if (normalized === 'dog') return 'dog';
  if (normalized === 'cat') return 'cat';
  if (normalized === 'rabbit') return 'rabbit';
  if (normalized === 'guinea pig') return 'guinea_pig';
  return null;
}

function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + Math.round(days));
  return result;
}

export function predictPhases(
  startDate: Date,
  species: CycleSpecies
): {
  phase: CyclePhaseName;
  startDate: Date;
  endDate: Date;
  isFertileWindow: boolean;
}[] {
  const params = CYCLE_PARAMS[species];
  const result: { phase: CyclePhaseName; startDate: Date; endDate: Date; isFertileWindow: boolean }[] = [];
  let cursor = startDate;
  for (const phase of params.phaseOrder) {
    const phaseParams = params.phases[phase];
    if (!phaseParams) continue;
    const phaseStart = cursor;
    const phaseEnd = addDays(phaseStart, phaseParams.avgDays);
    result.push({
      phase,
      startDate: phaseStart,
      endDate: phaseEnd,
      isFertileWindow: phase === params.fertilePhase,
    });
    cursor = phaseEnd;
  }
  return result;
}

// Breed-aware interval adjustment — dogs only. Small/toy breeds cycle noticeably more
// often (~4-6mo) than giant breeds (~8-12mo+); cat/rabbit/guinea_pig have no comparably
// documented breed-size cycle variance, so they always use CYCLE_PARAMS[species].avgIntervalDays.
// Only affects the single-cycle "estimated" fallback in predictNextCycleStart below — once
// 2+ real cycles are recorded, the dog's own history is used instead and breed is ignored.
export type BreedSizeTier = 'toy' | 'small' | 'medium' | 'large' | 'giant';

const BREED_SIZE_KEYWORDS: Record<BreedSizeTier, string[]> = {
  toy: [
    'chihuahua', 'yorkshire terrier', 'yorkie', 'toy poodle', 'pomeranian', 'maltese',
    'papillon', 'shih tzu', 'pug', 'miniature pinscher', 'japanese chin',
  ],
  small: [
    'dachshund', 'beagle', 'french bulldog', 'frenchie', 'boston terrier', 'jack russell',
    'cavalier king charles spaniel', 'cavalier', 'corgi', 'pembroke welsh corgi',
    'miniature schnauzer', 'west highland', 'westie', 'cocker spaniel', 'cocker',
  ],
  medium: [
    'border collie', 'bulldog', 'basset hound', 'australian shepherd', 'aussie',
    'standard poodle', 'whippet', 'shiba inu', 'shiba', 'brittany',
  ],
  large: [
    'labrador', 'golden retriever', 'german shepherd', 'gsd', 'doberman', 'boxer', 'husky',
    'siberian husky', 'rottweiler', 'weimaraner', 'vizsla', 'standard schnauzer',
  ],
  giant: [
    'great dane', 'saint bernard', 'st bernard', 'mastiff', 'newfoundland',
    'irish wolfhound', 'bernese mountain dog', 'leonberger', 'anatolian shepherd',
    'giant schnauzer',
  ],
};

const BREED_SIZE_INTERVAL_DAYS: Record<BreedSizeTier, number> = {
  toy: 150, // ~5 months
  small: 180, // ~6 months
  medium: 210, // ~7 months — matches the flat dog species default
  large: 240, // ~8 months
  giant: 300, // ~10 months
};

// Flattened and sorted longest-keyword-first, same technique as lib/themeSuggestion.ts's
// suggestThemeFamily(), so a more specific phrase always wins over a shorter generic one.
const ALL_BREED_SIZE_KEYWORDS: { keyword: string; tier: BreedSizeTier }[] = Object.entries(BREED_SIZE_KEYWORDS)
  .flatMap(([tier, keywords]) => keywords.map(keyword => ({ keyword, tier: tier as BreedSizeTier })))
  .sort((a, b) => b.keyword.length - a.keyword.length);

export function matchBreedSizeTier(breed: string | null | undefined): BreedSizeTier | null {
  if (!breed) return null;
  const trimmed = breed.trim().toLowerCase();
  if (!trimmed) return null;
  const match = ALL_BREED_SIZE_KEYWORDS.find(({ keyword }) => trimmed.includes(keyword));
  return match?.tier ?? null;
}

function estimatedIntervalDays(species: CycleSpecies, breed?: string | null): number {
  if (species !== 'dog') return CYCLE_PARAMS[species].avgIntervalDays;
  const tier = matchBreedSizeTier(breed);
  return tier ? BREED_SIZE_INTERVAL_DAYS[tier] : CYCLE_PARAMS.dog.avgIntervalDays;
}

export function predictNextCycleStart(
  pastCycles: { start_date: string; end_date?: string | null }[],
  species: CycleSpecies,
  breed?: string | null
): { predictedDate: Date; confidenceLevel: 'estimated' | 'predicted' } {
  const sorted = [...pastCycles].sort((a, b) => a.start_date.localeCompare(b.start_date));

  if (sorted.length >= 2) {
    const intervals: number[] = [];
    for (let i = 1; i < sorted.length; i++) {
      const prev = parseDateOnly(sorted[i - 1].start_date);
      const curr = parseDateOnly(sorted[i].start_date);
      intervals.push((curr.getTime() - prev.getTime()) / (1000 * 60 * 60 * 24));
    }
    const avgInterval = intervals.reduce((sum, d) => sum + d, 0) / intervals.length;
    const lastStart = parseDateOnly(sorted[sorted.length - 1].start_date);
    return {
      predictedDate: addDays(lastStart, avgInterval),
      confidenceLevel: 'predicted',
    };
  }

  const lastStart = parseDateOnly(sorted[sorted.length - 1].start_date);
  return {
    predictedDate: addDays(lastStart, estimatedIntervalDays(species, breed)),
    confidenceLevel: 'estimated',
  };
}

export function getCurrentPhase(
  cycleStartDate: Date,
  today: Date,
  species: CycleSpecies
): {
  phaseName: CyclePhaseName;
  dayOfPhase: number;
  dayOfCycle: number;
  isFertileWindow: boolean;
  phaseEndDate: Date;
} {
  const params = CYCLE_PARAMS[species];
  const dayOfCycle = Math.floor((today.getTime() - cycleStartDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;

  let cumulativeDays = 0;
  let lastPhase = params.phaseOrder[params.phaseOrder.length - 1];
  let lastPhaseStartDay = 0;

  for (const phase of params.phaseOrder) {
    const phaseParams = params.phases[phase];
    if (!phaseParams) continue;
    const phaseStartDay = cumulativeDays + 1;
    const phaseEndDay = cumulativeDays + phaseParams.avgDays;
    if (dayOfCycle <= phaseEndDay || phase === params.phaseOrder[params.phaseOrder.length - 1]) {
      const phaseStart = addDays(cycleStartDate, phaseStartDay - 1);
      const phaseEnd = addDays(cycleStartDate, phaseEndDay);
      return {
        phaseName: phase,
        dayOfPhase: dayOfCycle - phaseStartDay + 1,
        dayOfCycle,
        isFertileWindow: phase === params.fertilePhase,
        phaseEndDate: phaseEnd,
      };
    }
    cumulativeDays = phaseEndDay;
    lastPhase = phase;
    lastPhaseStartDay = phaseStartDay;
  }

  // Clamp to the last phase if dayOfCycle exceeds every defined phase's length
  // (e.g. the owner hasn't tapped "End cycle" yet).
  const phaseEnd = addDays(cycleStartDate, cumulativeDays);
  return {
    phaseName: lastPhase,
    dayOfPhase: dayOfCycle - lastPhaseStartDay + 1,
    dayOfCycle,
    isFertileWindow: lastPhase === params.fertilePhase,
    phaseEndDate: phaseEnd,
  };
}

function parseDateOnly(s: string): Date {
  const [y, m, day] = s.split('-').map(Number);
  return new Date(y, m - 1, day);
}

export const DOG_SYMPTOMS = [
  'bleeding',
  'discharge',
  'swelling',
  'restlessness',
  'appetite_change',
  'increased_urination',
  'male_attraction',
  'nesting_behavior',
  'lethargy',
  'mood_change',
];

export const CAT_SYMPTOMS = [
  'vocalization',
  'rolling',
  'restlessness',
  'loss_of_appetite',
  'affection_increase',
  'raised_hindquarters',
  'frequent_urination',
];

export const RABBIT_SYMPTOMS = [
  'restlessness',
  'chin_rubbing',
  'aggression',
  'nesting',
  'appetite_change',
  'lordosis',
];

export const GUINEA_PIG_SYMPTOMS = [
  'restlessness',
  'lordosis',
  'vocalization',
  'mounting_behavior',
];

export const SYMPTOMS_BY_SPECIES: Record<CycleSpecies, string[]> = {
  dog: DOG_SYMPTOMS,
  cat: CAT_SYMPTOMS,
  rabbit: RABBIT_SYMPTOMS,
  guinea_pig: GUINEA_PIG_SYMPTOMS,
};

export function cycleStartTip(species: CycleSpecies): string {
  return i18n.t('cycle.startTip.' + species);
}

/** Localized display label for a cycle phase. */
export function phaseLabel(phase: CyclePhaseName): string {
  return i18n.t('cycle.phase.' + phase);
}

export function phaseColorToken(phase: CyclePhaseName): 'phaseProestrus' | 'phaseEstrus' | 'phaseDiestrus' | 'phaseAnestrus' {
  if (phase === 'proestrus') return 'phaseProestrus';
  if (phase === 'estrus') return 'phaseEstrus';
  if (phase === 'anestrus') return 'phaseAnestrus';
  // 'diestrus' and 'interestrus' (cat) both share the non-fertile post-estrus color.
  return 'phaseDiestrus';
}

/** Localized display label for a cycle-symptom key. */
export function symptomLabel(key: string): string {
  const translated = i18n.t('cycle.symptom.' + key);
  return translated === 'cycle.symptom.' + key ? key : translated;
}
