// Single source of truth for every color/radius token in the app. Each dog can carry a
// `theme_family` (see types/index.ts's Dog type + supabase/sql/2026-08-27_dogs_theme_family.sql);
// the active family recolors the whole app via lib/ThemeContext.tsx, not just the Pets tab.
//
// ThemeTokens holds two kinds of fields:
//  - "brand" tokens (background/surface/primary/etc.) vary per palette below.
//  - "semantic" tokens (allergenBg, communityBlueBg, symptomBothBg, pendingAmberBg,
//    notStartedBg, and their *Text pairs) plus `radiiCard` signal MEANING (warning/info/
//    pending/etc.), not brand identity, carried over verbatim from the old lib/theme.ts.

export type ThemeFamily =
  | 'nordic_slate'
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
  done: string; // completed state (= meadow sage or primary)
  pending: string; // partial state (= primaryMid)

  // semantic tokens — same meaning across palettes
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

  // fixed heat-cycle phase colors
  phaseProestrus: string;
  phaseEstrus: string;
  phaseDiestrus: string;
  phaseAnestrus: string;

  // fixed notification-type colors
  notifHealthBorder: string;
  notifHealthBg: string;
  notifStreakBorder: string;
  notifStreakBg: string;
  notifCycleBorder: string;
  notifCycleBg: string;
  notifVaccineBorder: string;
  notifVaccineBg: string;
  notifHydrationBorder: string;
  notifHydrationBg: string;
  notifInfoBorder: string;
  notifInfoBg: string;

  // structural constant
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
  | 'phaseProestrus'
  | 'phaseEstrus'
  | 'phaseDiestrus'
  | 'phaseAnestrus'
  | 'notifHealthBorder'
  | 'notifHealthBg'
  | 'notifStreakBorder'
  | 'notifStreakBg'
  | 'notifCycleBorder'
  | 'notifCycleBg'
  | 'notifVaccineBorder'
  | 'notifVaccineBg'
  | 'notifHydrationBorder'
  | 'notifHydrationBg'
  | 'notifInfoBorder'
  | 'notifInfoBg'
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
  phaseProestrus: '#E8B870',
  phaseEstrus: '#D4607A',
  phaseDiestrus: '#A597B5',
  phaseAnestrus: '#D0D0DC',
  notifHealthBorder: '#C4607A',
  notifHealthBg: '#FDE8E8',
  notifStreakBorder: '#E8B870',
  notifStreakBg: '#FDF0DC',
  notifCycleBorder: '#D4A0B0',
  notifCycleBg: '#F5E8EE',
  notifVaccineBorder: '#8FA080',
  notifVaccineBg: '#EEF0EC',
  notifHydrationBorder: '#8AAAC0',
  notifHydrationBg: '#E0EEFF',
  notifInfoBorder: '#DDD5C8',
  notifInfoBg: '#F0EAE0',
  radiiCard: 16,
};

const SEMANTIC_DARK: typeof SEMANTIC = {
  allergenBg: '#361F20',
  allergenText: '#F87171',
  communityBlueBg: '#1B2A38',
  communityBlueText: '#60A5FA',
  symptomBothBg: '#2D1F38',
  symptomBothText: '#C084FC',
  pendingAmberBg: '#362B1A',
  pendingAmberText: '#FBBF24',
  notStartedBg: '#242B22',
  notStartedText: '#86EFAC',
  phaseProestrus: '#FBBF24',
  phaseEstrus: '#FB7185',
  phaseDiestrus: '#C084FC',
  phaseAnestrus: '#94A3B8',
  notifHealthBorder: '#E07088',
  notifHealthBg: '#361F26',
  notifStreakBorder: '#FBBF24',
  notifStreakBg: '#362B1A',
  notifCycleBorder: '#E07088',
  notifCycleBg: '#342028',
  notifVaccineBorder: '#5B936D',
  notifVaccineBg: '#1E2B22',
  notifHydrationBorder: '#60A5FA',
  notifHydrationBg: '#1A2838',
  notifInfoBorder: '#443C34',
  notifInfoBg: '#28231E',
  radiiCard: 16,
};

export const THEMES: Record<ThemeFamily, ThemeTokens> = {
  // Option 2: Nordic Slate (Universal Default) - crisp porcelain · deep slate navy · minimal
  nordic_slate: {
    background: '#F8F9FA',
    surface: '#FFFFFF',
    surfaceAlt: '#F1F5F9',
    border: '#E2E8F0',
    divider: '#F1F5F9',
    primary: '#1E293B',
    primaryLight: '#EFF6FF',
    primaryMid: '#475569',
    primaryDark: '#0F172A',
    textDark: '#0F172A',
    textMuted: '#64748B',
    chipText: '#334155',
    streakBg: '#FEF3C7',
    streakBorder: '#FDE68A',
    alertBg: '#FEE2E2',
    alertBorder: '#EF4444',
    moodSelBg: '#EFF6FF',
    moodSelBorder: '#1E293B',
    done: '#16A34A',
    pending: '#F59E0B',
    ...SEMANTIC,
  },

  // Crisp Botanical Wellness: vibrant forest sage (#2A7A4C) primary, fresh pure crisp background (#F9FAF9),
  // warm terracotta (#E06D44) reserved for streaks/flames & alerts, deep charcoal text (#19211C).
  sage_clay: {
    background: '#F9FAF9',
    surface: '#FFFFFF',
    surfaceAlt: '#F0F4F1',
    border: '#DCE5DF',
    divider: '#E6ECE8',
    primary: '#2A7A4C',
    primaryLight: '#E6F4EC',
    primaryMid: '#489B6B',
    primaryDark: '#1E5A37',
    textDark: '#19211C',
    textMuted: '#4A5850',
    chipText: '#37473E',
    streakBg: '#FDF6EE',
    streakBorder: '#DCE5DF',
    alertBg: '#FDF0E8',
    alertBorder: '#E06D44',
    moodSelBg: '#E6F4EC',
    moodSelBorder: '#2A7A4C',
    done: '#2A7A4C',
    pending: '#E06D44',
    ...SEMANTIC,
  },

  // golden retriever · apricot · labrador
  warm_honey: {
    background: '#FAF6EE',
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
    done: '#4A7C59',
    pending: '#E8B870',
    ...SEMANTIC,
  },

  // grey · silver · Weimaraner (Crisp Nordic Ice & Deep Scandinavian Slate Navy)
  cool_ash: {
    background: '#F4F6F8',
    surface: '#FFFFFF',
    surfaceAlt: '#E6EBF0',
    border: '#CBD5E1',
    divider: '#E2E8F0',
    primary: '#334E68',
    primaryLight: '#D9E2EC',
    primaryMid: '#627D98',
    primaryDark: '#243B53',
    textDark: '#102A43',
    textMuted: '#627D98',
    chipText: '#334E68',
    streakBg: '#EEF2F6',
    streakBorder: '#CBD5E1',
    alertBg: '#F0E8EC',
    alertBorder: '#D0B8C8',
    moodSelBg: '#D9E2EC',
    moodSelBorder: '#334E68',
    done: '#2A7A4C',
    pending: '#627D98',
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
    done: '#4A7C59',
    pending: '#C09070',
    ...SEMANTIC,
  },

  // white · cream · light coats (Warm Alabaster & Rich Artisan Caramel Amber)
  cream_chalk: {
    background: '#FBF9F5',
    surface: '#FFFFFF',
    surfaceAlt: '#F3EFE6',
    border: '#E8E2D8',
    divider: '#EBE5DC',
    primary: '#9C6835',
    primaryLight: '#F5E9DC',
    primaryMid: '#B88450',
    primaryDark: '#704820',
    textDark: '#261E14',
    textMuted: '#6E6254',
    chipText: '#524638',
    streakBg: '#F6F1E8',
    streakBorder: '#E8E2D8',
    alertBg: '#F8F0E8',
    alertBorder: '#E0C8A8',
    moodSelBg: '#F5E9DC',
    moodSelBorder: '#9C6835',
    done: '#2A7A4C',
    pending: '#B88450',
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
    done: '#4A7C59',
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
    primary: '#7E6894',
    primaryLight: '#EDE4F0',
    primaryMid: '#9E8AA8',
    primaryDark: '#4A3B57',
    textDark: '#1E1428',
    textMuted: '#6E6078',
    chipText: '#5A4870',
    streakBg: '#F5F0FA',
    streakBorder: '#D8CCE4',
    alertBg: '#FAF0F8',
    alertBorder: '#D8B8D8',
    moodSelBg: '#EDE4F0',
    moodSelBorder: '#7E6894',
    done: '#4A7C59',
    pending: '#C28438',
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
    done: '#4A7C59',
    pending: '#E8C9A0',
    ...SEMANTIC,
  },
};

// High-quality dark companion palettes: warm charcoal (#181614), dark surfaces (#24201D),
// calming sage/terracotta accents and high-readability text (#F5F2EB).
export const DARK_THEMES: Record<ThemeFamily, ThemeTokens> = {
  // Option 2: Nordic Slate (Universal Dark Default)
  nordic_slate: {
    background: '#0B0F19',
    surface: '#151C2C',
    surfaceAlt: '#1E293B',
    border: '#26334D',
    divider: '#1E293B',
    primary: '#60A5FA',
    primaryLight: '#172554',
    primaryMid: '#3B82F6',
    primaryDark: '#93C5FD',
    textDark: '#F8FAFC',
    textMuted: '#94A3B8',
    chipText: '#CBD5E1',
    streakBg: '#2D231B',
    streakBorder: '#4E3E22',
    alertBg: '#36211C',
    alertBorder: '#EF4444',
    moodSelBg: '#172554',
    moodSelBorder: '#60A5FA',
    done: '#22C55E',
    pending: '#FBBF24',
    ...SEMANTIC_DARK,
  },

  sage_clay: {
    background: '#181614',
    surface: '#24201D',
    surfaceAlt: '#2D2824',
    border: '#38322B',
    divider: '#2E2822',
    primary: '#5B936D',
    primaryLight: '#1E2D24',
    primaryMid: '#4A7C59',
    primaryDark: '#86EFAC',
    textDark: '#F5F2EB',
    textMuted: '#A89F91',
    chipText: '#D6CEC5',
    streakBg: '#2D231B',
    streakBorder: '#4A3B2C',
    alertBg: '#36211C',
    alertBorder: '#D96B47',
    moodSelBg: '#1E2D24',
    moodSelBorder: '#5B936D',
    done: '#5B936D',
    pending: '#D96B47',
    ...SEMANTIC_DARK,
  },

  warm_honey: {
    background: '#181614',
    surface: '#24201D',
    surfaceAlt: '#2D2824',
    border: '#38322B',
    divider: '#2E2822',
    primary: '#E5A030',
    primaryLight: '#3A2F1B',
    primaryMid: '#C48322',
    primaryDark: '#FFD382',
    textDark: '#F5F2EB',
    textMuted: '#A89F91',
    chipText: '#D6CEC5',
    streakBg: '#2E2619',
    streakBorder: '#4E3E22',
    alertBg: '#362719',
    alertBorder: '#573D21',
    moodSelBg: '#382E1E',
    moodSelBorder: '#E5A030',
    done: '#5B936D',
    pending: '#E5A030',
    ...SEMANTIC_DARK,
  },

  cool_ash: {
    background: '#16181B',
    surface: '#202328',
    surfaceAlt: '#282B32',
    border: '#323740',
    divider: '#272B33',
    primary: '#8597A8',
    primaryLight: '#262F38',
    primaryMid: '#6B7E90',
    primaryDark: '#B8C8D8',
    textDark: '#F2F4F7',
    textMuted: '#9AA4B2',
    chipText: '#CCD4DE',
    streakBg: '#222830',
    streakBorder: '#384250',
    alertBg: '#322228',
    alertBorder: '#50343E',
    moodSelBg: '#27303A',
    moodSelBorder: '#8597A8',
    done: '#5B936D',
    pending: '#8597A8',
    ...SEMANTIC_DARK,
  },

  deep_cocoa: {
    background: '#181513',
    surface: '#241F1C',
    surfaceAlt: '#2E2723',
    border: '#3B322C',
    divider: '#2F2620',
    primary: '#B07550',
    primaryLight: '#38261C',
    primaryMid: '#945E3D',
    primaryDark: '#DE9F75',
    textDark: '#F5F2EB',
    textMuted: '#A89F91',
    chipText: '#D6CEC5',
    streakBg: '#2C221B',
    streakBorder: '#483528',
    alertBg: '#36211C',
    alertBorder: '#55332A',
    moodSelBg: '#36261E',
    moodSelBorder: '#B07550',
    done: '#5B936D',
    pending: '#B07550',
    ...SEMANTIC_DARK,
  },

  cream_chalk: {
    background: '#181716',
    surface: '#242220',
    surfaceAlt: '#2E2B28',
    border: '#3A3733',
    divider: '#2E2C28',
    primary: '#C4AF92',
    primaryLight: '#38332B',
    primaryMid: '#A89478',
    primaryDark: '#E4D3BC',
    textDark: '#F7F5F0',
    textMuted: '#A6A095',
    chipText: '#D8D3C8',
    streakBg: '#2C2822',
    streakBorder: '#464035',
    alertBg: '#362820',
    alertBorder: '#543D30',
    moodSelBg: '#353028',
    moodSelBorder: '#C4AF92',
    done: '#5B936D',
    pending: '#C4AF92',
    ...SEMANTIC_DARK,
  },

  midnight: {
    background: '#13131A',
    surface: '#1E1E2A',
    surfaceAlt: '#272738',
    border: '#32324A',
    divider: '#262638',
    primary: '#7E7EB8',
    primaryLight: '#26263D',
    primaryMid: '#636398',
    primaryDark: '#B2B2EC',
    textDark: '#F2F2FC',
    textMuted: '#9B9BC2',
    chipText: '#D0D0EB',
    streakBg: '#222238',
    streakBorder: '#383858',
    alertBg: '#322030',
    alertBorder: '#502E4C',
    moodSelBg: '#272740',
    moodSelBorder: '#7E7EB8',
    done: '#5B936D',
    pending: '#7E7EB8',
    ...SEMANTIC_DARK,
  },

  dusty_bloom: {
    background: '#18151A',
    surface: '#241E28',
    surfaceAlt: '#2E2634',
    border: '#3C3044',
    divider: '#2E2434',
    primary: '#BAABC9',
    primaryLight: '#34293D',
    primaryMid: '#9E8EA8',
    primaryDark: '#E0D2EC',
    textDark: '#F6F2F8',
    textMuted: '#A99DB3',
    chipText: '#D7CEE0',
    streakBg: '#2B2032',
    streakBorder: '#463252',
    alertBg: '#361F2E',
    alertBorder: '#552E46',
    moodSelBg: '#32253B',
    moodSelBorder: '#BAABC9',
    done: '#5B936D',
    pending: '#BAABC9',
    ...SEMANTIC_DARK,
  },

  quiet_tide: {
    background: '#131817',
    surface: '#1D2523',
    surfaceAlt: '#252F2D',
    border: '#2F3C3A',
    divider: '#242F2D',
    primary: '#679B92',
    primaryLight: '#213330',
    primaryMid: '#52827A',
    primaryDark: '#9BC7BF',
    textDark: '#EFF6F4',
    textMuted: '#93A7A3',
    chipText: '#C8DBD7',
    streakBg: '#1F2B28',
    streakBorder: '#314440',
    alertBg: '#34221D',
    alertBorder: '#52342A',
    moodSelBg: '#223431',
    moodSelBorder: '#679B92',
    done: '#5B936D',
    pending: '#679B92',
    ...SEMANTIC_DARK,
  },
};

export const THEME_LABELS: Record<ThemeFamily, string> = {
  nordic_slate: 'Nordic Slate',
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
  nordic_slate: 'crisp porcelain · deep slate navy · minimal',
  sage_clay: 'meadow sage · warm oat · honey terracotta',
  warm_honey: 'golden retriever · apricot · labrador',
  cool_ash: 'grey · silver · Weimaraner',
  deep_cocoa: 'brown · chocolate · dark warm coats',
  cream_chalk: 'white · cream · light coats',
  midnight: 'black · very dark coats',
  dusty_bloom: 'mixed · tabby · brindle',
  quiet_tide: 'teal · blue-grey · cool coats',
};
