// Fixed, non-dynamic color palette for PDF/CSV report exports (lib/pdfReport.ts,
// lib/reportBuilders.ts). These build raw HTML strings for expo-print outside any
// component, so they can't call useTheme() — and by design they shouldn't: reports are
// documents meant to look consistent regardless of whichever pet's theme is active in
// the app when the export happens, not live themed UI. Always renders as `sage_clay`.
// Field names match the old (now-retired) lib/theme.ts so pdfReport.ts/reportBuilders.ts
// needed no call-site changes, just this import swap.
import { THEMES } from './themes';

const t = THEMES.sage_clay;

export const colors = {
  background: t.background,
  card: t.surface,
  cardBorder: t.border,
  primaryGreen: t.primary,
  doneGreen: t.done,
  pendingAmber: t.pending,
  pendingAmberBg: t.pendingAmberBg,
  pendingAmberText: t.pendingAmberText,
  notStartedBg: t.notStartedBg,
  notStartedText: t.notStartedText,
  allergenBg: t.allergenBg,
  allergenText: t.allergenText,
  textMuted: t.textMuted,
  moodSelectedBg: t.moodSelBg,
  moodSelectedBorder: t.moodSelBorder,
  textDark: t.textDark,
  streakAccent: t.streakBorder,
  streakAccentBg: t.streakBg,
  communityBlueBg: t.communityBlueBg,
  communityBlueText: t.communityBlueText,
  symptomBothBg: t.symptomBothBg,
  symptomBothText: t.symptomBothText,
  alertCardBg: t.alertBg,
  alertBorder: t.alertBorder,
} as const;
