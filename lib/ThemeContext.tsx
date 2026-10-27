import { createContext, useContext, useMemo, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { THEMES, DARK_THEMES, ThemeFamily, ThemeTokens } from './themes';

const DARK_MODE_STORAGE_KEY = '@pawcare_dark_mode';

type ThemeContextValue = {
  activeTheme: ThemeTokens;
  activeFamily: ThemeFamily;
  setTheme: (family: ThemeFamily) => void;
  /** Alias of activeTheme — the short name used by call sites. */
  theme: ThemeTokens;
  isDarkMode: boolean;
  setIsDarkMode: (val: boolean) => Promise<void>;
  toggleDarkMode: () => Promise<void>;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [activeFamily, setActiveFamily] = useState<ThemeFamily>('sage_clay');
  const [isDarkMode, setIsDarkModeState] = useState<boolean>(false);

  useEffect(() => {
    AsyncStorage.getItem(DARK_MODE_STORAGE_KEY)
      .then((val) => {
        if (val !== null) {
          setIsDarkModeState(val === 'true');
        }
      })
      .catch((err) => {
        console.warn('Failed to load dark mode preference:', err);
      });
  }, []);

  const setIsDarkMode = async (val: boolean) => {
    setIsDarkModeState(val);
    try {
      await AsyncStorage.setItem(DARK_MODE_STORAGE_KEY, String(val));
    } catch (err) {
      console.warn('Failed to persist dark mode preference:', err);
    }
  };

  const toggleDarkMode = async () => {
    await setIsDarkMode(!isDarkMode);
  };

  const activeTheme = useMemo(() => {
    if (isDarkMode) {
      return DARK_THEMES[activeFamily] ?? DARK_THEMES.sage_clay;
    }
    return THEMES[activeFamily] ?? THEMES.sage_clay;
  }, [activeFamily, isDarkMode]);

  const value = useMemo<ThemeContextValue>(
    () => ({
      activeTheme,
      activeFamily,
      setTheme: setActiveFamily,
      theme: activeTheme,
      isDarkMode,
      setIsDarkMode,
      toggleDarkMode,
    }),
    [activeTheme, activeFamily, isDarkMode]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme() must be used within a ThemeProvider');
  return ctx;
}
