import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Theme, themes, getThemeById, getAccentColor } from './themes';

interface ThemeContextValue {
  theme: Theme;
  setTheme: (id: string) => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: themes[0],
  setTheme: () => {},
});

export function useTheme() {
  return useContext(ThemeContext);
}

function applyTheme(theme: Theme) {
  const root = document.documentElement;
  const accent = getAccentColor(theme);

  root.style.setProperty('--color-primary', theme.colors.primary);
  root.style.setProperty('--color-primary-dark', theme.colors['primary-dark']);
  root.style.setProperty('--color-primary-light', theme.colors['primary-light']);
  root.style.setProperty('--color-accent', accent);
  root.style.setProperty('--color-bg', theme.colors.bg);
  root.style.setProperty('--color-card-bg', theme.colors['card-bg']);
  root.style.setProperty('--color-text', theme.colors.text);
  root.style.setProperty('--color-text-secondary', theme.colors['text-secondary']);
  root.style.setProperty('--color-profit', theme.colors.profit);
  root.style.setProperty('--color-loss', theme.colors.loss);
  root.style.setProperty('--color-border', theme.colors.border);
  root.style.setProperty('--color-section-bg', theme.colors['section-bg']);
  root.style.setProperty('--color-input-bg', theme.colors['input-bg']);
  root.style.setProperty('--color-hover', theme.colors.hover);
}

const STORAGE_KEY = 'poker-tracker-theme';

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(() => {
    const savedId = localStorage.getItem(STORAGE_KEY);
    return savedId ? getThemeById(savedId) : themes[0];
  });

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  const setTheme = (id: string) => {
    const newTheme = getThemeById(id);
    setThemeState(newTheme);
    localStorage.setItem(STORAGE_KEY, id);
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}
