import { createContext, useCallback, useContext, useEffect, useMemo, useState, ReactNode } from 'react';
import { View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { i18n, Lang, isSupportedLang, resolveDeviceLang } from './i18n';

const STORAGE_KEY = '@bisco/language';

type TranslateOptions = Record<string, unknown>;

type LanguageContextValue = {
  lang: Lang;
  setLang: (lang: Lang) => void;
  t: (key: string, options?: TranslateOptions) => string;
};

const LanguageContext = createContext<LanguageContextValue | null>(null);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>('en');
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    (async () => {
      let next: Lang;
      try {
        const stored = await AsyncStorage.getItem(STORAGE_KEY);
        next = isSupportedLang(stored) ? stored : resolveDeviceLang();
      } catch {
        next = resolveDeviceLang();
      }
      i18n.locale = next;
      setLangState(next);
      setLoaded(true);
    })();
  }, []);

  const setLang = useCallback((next: Lang) => {
    i18n.locale = next;
    setLangState(next);
    AsyncStorage.setItem(STORAGE_KEY, next).catch(() => {});
  }, []);

  // `lang` in the dep list is what re-renders every consumer when the language changes.
  const t = useCallback(
    (key: string, options?: TranslateOptions) => i18n.t(key, options),
    [lang]
  );

  const value = useMemo<LanguageContextValue>(() => ({ lang, setLang, t }), [lang, setLang, t]);

  if (!loaded) return <View style={{ flex: 1 }} />;

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useT(): LanguageContextValue {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error('useT() must be used within a LanguageProvider');
  return ctx;
}
