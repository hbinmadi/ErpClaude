import { createContext, useContext, useEffect, useState } from 'react';

export type Theme = 'dark' | 'light' | 'ocean' | 'violet';

export interface ThemeInfo {
  id: Theme;
  label: string;
  description: string;
  preview: { bg: string; accent: string; surface: string };
}

export const THEMES: ThemeInfo[] = [
  {
    id: 'dark',
    label: 'Dark',
    description: 'Slate dark with indigo accent',
    preview: { bg: '#0f172a', surface: '#1e293b', accent: '#6366f1' },
  },
  {
    id: 'light',
    label: 'Light',
    description: 'Clean white with indigo accent',
    preview: { bg: '#f8fafc', surface: '#ffffff', accent: '#6366f1' },
  },
  {
    id: 'ocean',
    label: 'Ocean',
    description: 'Deep blue with sky accent',
    preview: { bg: '#04111e', surface: '#061828', accent: '#0ea5e9' },
  },
  {
    id: 'violet',
    label: 'Violet',
    description: 'Dark purple with violet accent',
    preview: { bg: '#0d0b14', surface: '#16122a', accent: '#8b5cf6' },
  },
];

interface ThemeCtx {
  theme: Theme;
  setTheme: (t: Theme) => void;
}

const ThemeContext = createContext<ThemeCtx>({ theme: 'dark', setTheme: () => {} });

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(() => {
    const saved = localStorage.getItem('erp-theme') as Theme | null;
    return saved && ['dark', 'light', 'ocean', 'violet'].includes(saved) ? saved : 'dark';
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('erp-theme', theme);
  }, [theme]);

  const setTheme = (t: Theme) => setThemeState(t);

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
