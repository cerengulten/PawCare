// Single source of truth for every color/radius token in the app. Each dog can carry a
// `theme_family` (see types/index.ts's Dog type + supabase/sql/2026-08-27_dogs_theme_family.sql);
// the active family recolors the whole app via lib/ThemeContext.tsx, not just the Pets tab.
//
// ThemeTokens holds two kinds of fields:
//  - "brand" tokens (background/surface/primary/etc.) vary per palette below.
//  - "semantic" tokens (allergenBg, communityBlueBg, symptomBothBg, pendingAmberBg,
//    notStartedBg, and their *Text pairs) plus `radiiCard` signal MEANING (warning/info/
//    pending/etc.), not brand identity, so they're identical across all 8 palettes —
//    carried over verbatim from the old lib/theme.ts, which this file fully replaces.

export type ThemeFamily =
  | 'sage_clay'
  | 'warm_honey'
  | 'cool_ash'
  | 'deep_cocoa'
  | 'cream_chalk'
  | 'midnight'
  | 'dusty_bloom'
  | 'quiet_tide';

export type ThemeTokens = {
  // brand tokens — vary per palette
  background: string; // app background
  surface: string; // card backgrounds
  surfaceAlt: string; // icon bg, pill bg
  border: string; // card borders
  divider: string; // row dividers
  primary: string; // done rings, active tab, buttons
  primaryLight: string; // chip bg, mood selected bg
  primaryMid: string; // partial/pending rings
  primaryDark: string; // dark buttons, map btn
  textDark: string; // primary text
  textMuted: string; // secondary text
  chipText: string; // neutral chip labels
  streakBg: string; // streak pill background
  streakBorder: string; // streak pill border
  alertBg: string; // vet alert state bg
  alertBorder: string; // vet alert state border
  moodSelBg: string; // selected mood bg
  moodSelBorder: string; // selected mood border
  done: string; // completed state (= primary)
  pending: string; // partial state (= primaryMid)

  // semantic tokens — same value in every palette (carried over from lib/theme.ts)
  allergenBg: string;
  allergenText: string;
  communityBlueBg: string;
  communityBlueText: string;
  symptomBothBg: string;
  symptomBothText: string;
  pendingAmberBg: string;
  pendingAmberText: string;
  notStartedBg: string;
  notStartedText: string;

  // structural constant — same in every palette
  radiiCard: number;
};

const SEMANTIC: Pick<
  ThemeTokens,
  | 'allergenBg'
  | 'allergenText'
  | 'communityBlueBg'
  | 'communityBlueText'
  | 'symptomBothBg'
  | 'symptomBothText'
  | 'pendingAmberBg'
  | 'pendingAmberText'
  | 'notStartedBg'
  | 'notStartedText'
  | 'radiiCard'
> = {
  allergenBg: '#FDE8E8',
  allergenText: '#8A1A1A',
  communityBlueBg: '#E3EEFA',
  communityBlueText: '#2A5A9A',
  symptomBothBg: '#EEE0FF',
  symptomBothText: '#6A1A9A',
  pendingAmberBg: '#FDF0DC',
  pendingAmberText: '#8A5A0A',
  notStartedBg: '#EDF0EA',
  notStartedText: '#5A6A50',
  radiiCard: 14,
};

export const THEMES: Record<ThemeFamily, ThemeTokens> = {
  // calm · natural · grounded
  sage_clay: {
    background: '#FAF6EF',
    surface: '#FFFFFF',
    surfaceAlt: '#F0EAE0',
    border: '#DDD5C8',
    divider: '#F0EAE0',
    primary: '#8FA080',
    primaryLight: '#DFF0D8',
    primaryMid: '#C97F5C',
    primaryDark: '#4F5D45',
    textDark: '#2A2018',
    textMuted: '#8A8070',
    chipText: '#5A5048',
    streakBg: '#F5EFE5',
    streakBorder: '#DDD5C8',
    alertBg: '#FDF0E8',
    alertBorder: '#E0C0A0',
    moodSelBg: '#DFF0D8',
    moodSelBorder: '#8FA080',
    done: '#8FA080',
    pending: '#C97F5C',
    ...SEMANTIC,
  },

  // golden retriever · apricot · labrador
  warm_honey: {
    background: '#FBF6EE',
    surface: '#FFFFFF',
    surfaceAlt: '#F5EAD8',
    border: '#E8D8B8',
    divider: '#F5EAD8',
    primary: '#D4922A',
    primaryLight: '#FAE8C0',
    primaryMid: '#E8B870',
    primaryDark: '#8A5A10',
    textDark: '#281800',
    textMuted: '#8A7040',
    chipText: '#6A5028',
    streakBg: '#FEF4DC',
    streakBorder: '#E8D8B8',
    alertBg: '#FDF0D8',
    alertBorder: '#E8C888',
    moodSelBg: '#FAE8C0',
    moodSelBorder: '#D4922A',
    done: '#D4922A',
    pending: '#E8B870',
    ...SEMANTIC,
  },

  // grey · silver · Weimaraner
  cool_ash: {
    background: '#F6F7F9',
    surface: '#FFFFFF',
    surfaceAlt: '#ECEEF2',
    border: '#D4D8E0',
    divider: '#ECEEF2',
    primary: '#6A7A8A',
    primaryLight: '#D8E0EA',
    primaryMid: '#9AAABB',
    primaryDark: '#384858',
    textDark: '#18202A',
    textMuted: '#7A8898',
    chipText: '#4A5868',
    streakBg: '#EEF0F5',
    streakBorder: '#D4D8E0',
    alertBg: '#F0E8EC',
    alertBorder: '#D0B8C8',
    moodSelBg: '#D8E0EA',
    moodSelBorder: '#6A7A8A',
    done: '#6A7A8A',
    pending: '#9AAABB',
    ...SEMANTIC,
  },

  // brown · chocolate · dark warm coats
  deep_cocoa: {
    background: '#FAF5F0',
    surface: '#FFFFFF',
    surfaceAlt: '#F0E8E0',
    border: '#DEC8B8',
    divider: '#F0E8E0',
    primary: '#8A5A3A',
    primaryLight: '#F0D8C8',
    primaryMid: '#C09070',
    primaryDark: '#4A2A10',
    textDark: '#20100A',
    textMuted: '#8A6858',
    chipText: '#6A4838',
    streakBg: '#F8EFE8',
    streakBorder: '#DEC8B8',
    alertBg: '#FDF0E8',
    alertBorder: '#E0C0A0',
    moodSelBg: '#F0D8C8',
    moodSelBorder: '#8A5A3A',
    done: '#8A5A3A',
    pending: '#C09070',
    ...SEMANTIC,
  },

  // white · cream · light coats
  cream_chalk: {
    background: '#FAFAF8',
    surface: '#FFFFFF',
    surfaceAlt: '#F2F0EB',
    border: '#E0DDD8',
    divider: '#F2F0EB',
    primary: '#B09878',
    primaryLight: '#EDE8DF',
    primaryMid: '#C8B898',
    primaryDark: '#706050',
    textDark: '#201E18',
    textMuted: '#908878',
    chipText: '#606050',
    streakBg: '#F5F2EC',
    streakBorder: '#E0DDD8',
    alertBg: '#F8F0E8',
    alertBorder: '#E0C8A8',
    moodSelBg: '#EDE8DF',
    moodSelBorder: '#B09878',
    done: '#B09878',
    pending: '#C8B898',
    ...SEMANTIC,
  },

  // black · very dark coats
  midnight: {
    background: '#F4F4F6',
    surface: '#FFFFFF',
    surfaceAlt: '#EAEAF0',
    border: '#D0D0DC',
    divider: '#EAEAF0',
    primary: '#4A4A6A',
    primaryLight: '#D8D8F0',
    primaryMid: '#8080A8',
    primaryDark: '#1A1A38',
    textDark: '#0E0E18',
    textMuted: '#7070A0',
    chipText: '#4A4A70',
    streakBg: '#EEEEFC',
    streakBorder: '#D0D0E8',
    alertBg: '#F0E8F8',
    alertBorder: '#C8B8E0',
    moodSelBg: '#D8D8F0',
    moodSelBorder: '#4A4A6A',
    done: '#4A4A6A',
    pending: '#8080A8',
    ...SEMANTIC,
  },

  // mixed · tabby · brindle
  dusty_bloom: {
    background: '#FBF7F2',
    surface: '#FFFFFF',
    surfaceAlt: '#F2EBF5',
    border: '#D8CCE4',
    divider: '#EDE4F0',
    primary: '#A597B5',
    primaryLight: '#EDE4F0',
    primaryMid: '#E0A458',
    primaryDark: '#4A3B57',
    textDark: '#1E1428',
    textMuted: '#8A7898',
    chipText: '#5A4870',
    streakBg: '#F5F0FA',
    streakBorder: '#D8CCE4',
    alertBg: '#FAF0F8',
    alertBorder: '#D8B8D8',
    moodSelBg: '#EDE4F0',
    moodSelBorder: '#A597B5',
    done: '#A597B5',
    pending: '#E0A458',
    ...SEMANTIC,
  },

  // teal · blue-grey · cool coats
  quiet_tide: {
    background: '#FAF5EC',
    surface: '#FFFFFF',
    surfaceAlt: '#EEF0EC',
    border: '#C8D8D0',
    divider: '#EEF0EC',
    primary: '#4C7A73',
    primaryLight: '#D8E8E4',
    primaryMid: '#E8C9A0',
    primaryDark: '#2C4A44',
    textDark: '#141E1C',
    textMuted: '#7A9088',
    chipText: '#3A5850',
    streakBg: '#F5F0E4',
    streakBorder: '#DDD0B8',
    alertBg: '#F8F0E8',
    alertBorder: '#E0C8A0',
    moodSelBg: '#D8E8E4',
    moodSelBorder: '#4C7A73',
    done: '#4C7A73',
    pending: '#E8C9A0',
    ...SEMANTIC,
  },
};

// Display metadata for the theme picker (screens/PetFormScreen.tsx). Descriptions are the
// same taglines used as the comments above each THEMES entry, promoted to real values so
// the picker UI can show them without duplicating the copy.
export const THEME_LABELS: Record<ThemeFamily, string> = {
  sage_clay: 'Sage & Clay',
  warm_honey: 'Warm Honey',
  cool_ash: 'Cool Ash',
  deep_cocoa: 'Deep Cocoa',
  cream_chalk: 'Cream Chalk',
  midnight: 'Midnight',
  dusty_bloom: 'Dusty Bloom',
  quiet_tide: 'Quiet Tide',
};

export const THEME_DESCRIPTIONS: Record<ThemeFamily, string> = {
  sage_clay: 'calm · natural · grounded',
  warm_honey: 'golden retriever · apricot · labrador',
  cool_ash: 'grey · silver · Weimaraner',
  deep_cocoa: 'brown · chocolate · dark warm coats',
  cream_chalk: 'white · cream · light coats',
  midnight: 'black · very dark coats',
  dusty_bloom: 'mixed · tabby · brindle',
  quiet_tide: 'teal · blue-grey · cool coats',
};
