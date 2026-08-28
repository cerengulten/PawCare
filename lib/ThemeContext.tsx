import { createContext, useContext, useMemo, useState, ReactNode } from 'react';
import { THEMES, ThemeFamily, ThemeTokens } from './themes';

type ThemeContextValue = {
  activeTheme: ThemeTokens;
  activeFamily: ThemeFamily;
  setTheme: (family: ThemeFamily) => void;
  /** Alias of activeTheme — the short name used by the ~30 migrated call sites. */
  theme: ThemeTokens;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [activeFamily, setActiveFamily] = useState<ThemeFamily>('sage_clay');
  const activeTheme = useMemo(() => THEMES[activeFamily], [activeFamily]);

  const value = useMemo<ThemeContextValue>(
    () => ({
      activeTheme,
      activeFamily,
      setTheme: setActiveFamily,
      theme: activeTheme,
    }),
    [activeTheme, activeFamily]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme() must be used within a ThemeProvider');
  return ctx;
}
