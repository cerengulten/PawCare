import { I18n } from 'i18n-js';
import { getLocales } from 'expo-localization';
import en from './en';
import tr from './tr';
import it from './it';

export const SUPPORTED_LANGS = ['en', 'tr', 'it'] as const;
export type Lang = (typeof SUPPORTED_LANGS)[number];

export const LANG_LABELS: Record<Lang, string> = {
  en: 'English',
  tr: 'Türkçe',
  it: 'Italiano',
};

export const i18n = new I18n({ en, tr, it });
i18n.enableFallback = true;
i18n.defaultLocale = 'en';
i18n.locale = 'en';

export function isSupportedLang(value: string | null | undefined): value is Lang {
  return !!value && (SUPPORTED_LANGS as readonly string[]).includes(value);
}

/** Device locale mapped to a supported language, else English. */
export function resolveDeviceLang(): Lang {
  const code = getLocales()[0]?.languageCode?.toLowerCase();
  return isSupportedLang(code) ? code : 'en';
}

const LOCALE_TAGS: Record<Lang, string> = { en: 'en-US', tr: 'tr-TR', it: 'it-IT' };

/** BCP-47 tag for the active language — for Intl / toLocaleDateString calls. */
export function localeTag(): string {
  return LOCALE_TAGS[isSupportedLang(i18n.locale) ? i18n.locale : 'en'];
}
