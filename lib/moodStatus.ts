import { DogMood } from '../types';
import { ThemeTokens } from './themes';

export type MoodStatusStyle = {
  label: string;
  badgeBg: string;
  borderColor: string;
  dotColor: string;
  textColor: string;
};

export function getMoodStatus(
  mood: DogMood['mood'] | null | undefined,
  theme: ThemeTokens,
  t: (key: string, opts?: Record<string, any>) => string
): MoodStatusStyle {
  if (!mood) {
    return {
      label: t('mood.checkInPrompt') || 'Daily Check-in',
      badgeBg: theme.surfaceAlt,
      borderColor: theme.border,
      dotColor: theme.textMuted,
      textColor: theme.textMuted,
    };
  }

  switch (mood) {
    case 'great':
      return {
        label: t('mood.thriving') || 'Thriving',
        badgeBg: '#EAF3ED',
        borderColor: '#C6DFCE',
        dotColor: '#2D8A4E',
        textColor: '#246B3E',
      };
    case 'good':
      return {
        label: t('mood.doingWell') || 'Doing Well',
        badgeBg: '#EEF3EE',
        borderColor: '#CCDDCB',
        dotColor: '#4A7C59',
        textColor: '#365C42',
      };
    case 'sleepy':
      return {
        label: t('mood.resting') || 'Resting & Calm',
        badgeBg: '#F3EEF6',
        borderColor: '#DCD0E5',
        dotColor: '#8C68A8',
        textColor: '#634878',
      };
    case 'off':
      return {
        label: t('mood.off') || 'A Bit Off',
        badgeBg: '#FEF3DC',
        borderColor: '#F5DCAA',
        dotColor: '#D9822B',
        textColor: '#995610',
      };
    case 'sick':
      return {
        label: t('mood.sick') || 'Needs Care',
        badgeBg: '#FDE8E8',
        borderColor: '#F5C2C2',
        dotColor: '#C44D4D',
        textColor: '#942B2B',
      };
    default:
      return {
        label: t('mood.checkInPrompt') || 'Daily Check-in',
        badgeBg: theme.surfaceAlt,
        borderColor: theme.border,
        dotColor: theme.textMuted,
        textColor: theme.textMuted,
      };
  }
}
