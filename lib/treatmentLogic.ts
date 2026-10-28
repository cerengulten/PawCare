import { i18n } from './i18n';

export type TreatmentType = 
  | 'vaccine' 
  | 'internal_parasite' 
  | 'external_parasite' 
  | 'heartworm';

export type TreatmentPreset = {
  nameKey: string;
  defaultName: string;
  type: TreatmentType;
  cadenceMonths: number;
  emoji: string;
};

export const TREATMENT_PRESETS: Record<TreatmentType, TreatmentPreset[]> = {
  external_parasite: [
    { nameKey: 'treatments.presets.bravecto', defaultName: 'Bravecto (Chewable)', type: 'external_parasite', cadenceMonths: 3, emoji: '🪲' },
    { nameKey: 'treatments.presets.nexgard', defaultName: 'NexGard (Chewable)', type: 'external_parasite', cadenceMonths: 1, emoji: '🪲' },
    { nameKey: 'treatments.presets.simparica', defaultName: 'Simparica Trio', type: 'external_parasite', cadenceMonths: 1, emoji: '🪲' },
    { nameKey: 'treatments.presets.frontline', defaultName: 'Frontline Spot-on', type: 'external_parasite', cadenceMonths: 1, emoji: '🪲' },
    { nameKey: 'treatments.presets.genericFlea', defaultName: 'External Parasite / Flea & Tick', type: 'external_parasite', cadenceMonths: 1, emoji: '🪲' },
  ],
  internal_parasite: [
    { nameKey: 'treatments.presets.drontal', defaultName: 'Drontal Plus', type: 'internal_parasite', cadenceMonths: 3, emoji: '🪱' },
    { nameKey: 'treatments.presets.milbemax', defaultName: 'Milbemax Dewormer', type: 'internal_parasite', cadenceMonths: 3, emoji: '🪱' },
    { nameKey: 'treatments.presets.panacur', defaultName: 'Panacur Paste/Tablet', type: 'internal_parasite', cadenceMonths: 3, emoji: '🪱' },
    { nameKey: 'treatments.presets.genericDeworm', defaultName: 'Internal Parasite / Deworming', type: 'internal_parasite', cadenceMonths: 3, emoji: '🪱' },
  ],
  heartworm: [
    { nameKey: 'treatments.presets.heartgard', defaultName: 'Heartgard Plus', type: 'heartworm', cadenceMonths: 1, emoji: '❤️' },
    { nameKey: 'treatments.presets.interceptor', defaultName: 'Interceptor Plus', type: 'heartworm', cadenceMonths: 1, emoji: '❤️' },
    { nameKey: 'treatments.presets.genericHeartworm', defaultName: 'Heartworm Preventative', type: 'heartworm', cadenceMonths: 1, emoji: '❤️' },
  ],
  vaccine: [
    { nameKey: 'treatments.presets.rabies', defaultName: 'Rabies Vaccine (Kuduz)', type: 'vaccine', cadenceMonths: 12, emoji: '💉' },
    { nameKey: 'treatments.presets.dhpp', defaultName: 'DHPP / Core Vaccine (Karma)', type: 'vaccine', cadenceMonths: 12, emoji: '💉' },
    { nameKey: 'treatments.presets.bordetella', defaultName: 'Bordetella (Kennel Cough)', type: 'vaccine', cadenceMonths: 12, emoji: '💉' },
    { nameKey: 'treatments.presets.leishmania', defaultName: 'Leishmania Vaccine', type: 'vaccine', cadenceMonths: 12, emoji: '💉' },
  ],
};

const META_PREFIX = '__bisco_meta:';
const META_SUFFIX = '__';

export function encodeTreatmentMeta(type: TreatmentType, cadenceMonths: number, userNotes?: string | null): string {
  const clean = cleanTreatmentNotes(userNotes);
  const tag = `${META_PREFIX}type=${type};cadence=${cadenceMonths}${META_SUFFIX}`;
  return clean ? `${tag}\n${clean}` : tag;
}

export function cleanTreatmentNotes(notes?: string | null): string {
  if (!notes) return '';
  return notes.replace(/__bisco_meta:[^_\n]+__\n?/g, '').trim();
}

export function detectTreatmentType(name: string, notes?: string | null): TreatmentType {
  if (notes && notes.includes(META_PREFIX)) {
    const match = notes.match(/type=([a-z_]+)/);
    if (match && (['vaccine', 'internal_parasite', 'external_parasite', 'heartworm'] as string[]).includes(match[1])) {
      return match[1] as TreatmentType;
    }
  }

  const lower = (name || '').toLowerCase();
  if (lower.includes('heartgard') || lower.includes('heartworm') || lower.includes('kalp kurdu') || lower.includes('interceptor')) {
    return 'heartworm';
  }
  if (
    lower.includes('bravecto') ||
    lower.includes('nexgard') ||
    lower.includes('simparica') ||
    lower.includes('frontline') ||
    lower.includes('dış parazit') ||
    lower.includes('dis parazit') ||
    lower.includes('external') ||
    lower.includes('flea') ||
    lower.includes('tick') ||
    lower.includes('pire') ||
    lower.includes('kene')
  ) {
    return 'external_parasite';
  }
  if (
    lower.includes('drontal') ||
    lower.includes('milbemax') ||
    lower.includes('panacur') ||
    lower.includes('dolpac') ||
    lower.includes('cazitel') ||
    lower.includes('iç parazit') ||
    lower.includes('ic parazit') ||
    lower.includes('internal') ||
    lower.includes('deworm') ||
    lower.includes('worm') ||
    lower.includes('tenya') ||
    lower.includes('kurt')
  ) {
    return 'internal_parasite';
  }
  return 'vaccine';
}

export function detectCadenceMonths(treatmentType: TreatmentType, notes?: string | null, name?: string): number {
  if (notes && notes.includes(META_PREFIX)) {
    const match = notes.match(/cadence=(\d+)/);
    if (match) {
      const num = parseInt(match[1], 10);
      if (!isNaN(num) && num > 0) return num;
    }
  }

  const lower = (name || '').toLowerCase();
  if (lower.includes('bravecto')) return 3;
  if (lower.includes('drontal') || lower.includes('milbemax') || lower.includes('panacur')) return 3;

  switch (treatmentType) {
    case 'external_parasite':
      return 1;
    case 'internal_parasite':
      return 3;
    case 'heartworm':
      return 1;
    case 'vaccine':
    default:
      return 12;
  }
}

export function treatmentCategoryVisuals(type: TreatmentType, isDark = false) {
  switch (type) {
    case 'external_parasite':
      return {
        labelKey: 'treatments.types.external',
        defaultLabel: 'Flea & Tick',
        emoji: '🪲',
        bg: isDark ? '#1C2E24' : '#EBF5F0',
        text: isDark ? '#6EE7B7' : '#2D7A58',
        border: isDark ? '#2B4A3A' : '#C3E6D6',
      };
    case 'internal_parasite':
      return {
        labelKey: 'treatments.types.internal',
        defaultLabel: 'Deworming',
        emoji: '🪱',
        bg: isDark ? '#2D1F3D' : '#F3E8FF',
        text: isDark ? '#D8B4FE' : '#6B21A8',
        border: isDark ? '#4A3266' : '#E0C7FE',
      };
    case 'heartworm':
      return {
        labelKey: 'treatments.types.heartworm',
        defaultLabel: 'Heartworm',
        emoji: '❤️',
        bg: isDark ? '#3D1C1E' : '#FEE2E2',
        text: isDark ? '#FCA5A5' : '#B91C1C',
        border: isDark ? '#632A2D' : '#FECACA',
      };
    case 'vaccine':
    default:
      return {
        labelKey: 'treatments.types.vaccine',
        defaultLabel: 'Vaccine',
        emoji: '💉',
        bg: isDark ? '#1A2938' : '#E0F2FE',
        text: isDark ? '#7DD3FC' : '#0369A1',
        border: isDark ? '#284661' : '#BAE6FD',
      };
  }
}
