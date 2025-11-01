'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export type ThemeMode = 'light' | 'dark' | 'matte' | 'cave' | 'dhaka' | 'nyc' | 'custom';

export interface CustomThemeColors {
  background: string;
  foreground: string;
  primary: string;
  secondary: string;
  accent: string;
  card: string;
  cardForeground: string;
  border: string;
  muted: string;
  mutedForeground: string;
}

export interface ThemeContextType {
  mode: ThemeMode;
  customColors: CustomThemeColors;
  setMode: (mode: ThemeMode) => void;
  updateCustomColors: (colors: Partial<CustomThemeColors>) => void;
  resetCustomColors: () => void;
}

const defaultCustomColors: CustomThemeColors = {
  background: '#ffffff',
  foreground: '#171717',
  primary: '#3b82f6',
  secondary: '#8b5cf6',
  accent: '#ec4899',
  card: 'rgba(255, 255, 255, 0.25)',
  cardForeground: '#1f2937',
  border: 'rgba(255, 255, 255, 0.18)',
  muted: 'rgba(0, 0, 0, 0.05)',
  mutedForeground: '#6b7280',
};

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<ThemeMode>('light');
  const [customColors, setCustomColors] = useState<CustomThemeColors>(defaultCustomColors);

  // Load theme from localStorage on mount
  useEffect(() => {
    const savedMode = localStorage.getItem('theme-mode') as ThemeMode | null;
    if (savedMode && ['light', 'dark', 'matte', 'cave', 'dhaka', 'nyc', 'custom'].includes(savedMode)) {
      setModeState(savedMode);
    }

    const savedColors = localStorage.getItem('theme-custom-colors');
    if (savedColors) {
      try {
        const colors = JSON.parse(savedColors);
        setCustomColors({ ...defaultCustomColors, ...colors });
      } catch (error) {
        console.error('Failed to parse saved custom colors:', error);
      }
    }
  }, []);

  // Apply theme to document (only after mount to prevent hydration mismatch)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const root = document.documentElement;
    root.classList.remove('theme-light', 'theme-dark', 'theme-matte', 'theme-cave', 'theme-dhaka', 'theme-nyc', 'theme-custom');

    if (mode === 'custom') {
      root.classList.add('theme-custom');
      // Apply custom colors as CSS variables with custom- prefix
      Object.entries(customColors).forEach(([key, value]) => {
        // Convert camelCase to kebab-case for CSS variables
        const cssKey = key.replace(/([A-Z])/g, '-$1').toLowerCase();
        root.style.setProperty(`--custom-${cssKey}`, value);
        // Also set as --color- for compatibility
        root.style.setProperty(`--color-${cssKey}`, value);
      });
      // Set gradient variables for custom theme
      root.style.setProperty('--gradient-start', customColors.primary);
      root.style.setProperty('--gradient-middle', customColors.secondary);
      root.style.setProperty('--gradient-end', customColors.accent);
    } else {
      root.classList.add(`theme-${mode}`);
      // Clear custom CSS variables when not in custom mode
      const customColorKeys = Object.keys(customColors);
      customColorKeys.forEach((key) => {
        const cssKey = key.replace(/([A-Z])/g, '-$1').toLowerCase();
        root.style.removeProperty(`--custom-${cssKey}`);
      });
      // Clear gradient variables
      root.style.removeProperty('--gradient-start');
      root.style.removeProperty('--gradient-middle');
      root.style.removeProperty('--gradient-end');
    }

    localStorage.setItem('theme-mode', mode);
  }, [mode, customColors]);

  const setMode = (newMode: ThemeMode) => {
    setModeState(newMode);
  };

  const updateCustomColors = (colors: Partial<CustomThemeColors>) => {
    const updated = { ...customColors, ...colors };
    setCustomColors(updated);
    localStorage.setItem('theme-custom-colors', JSON.stringify(updated));
  };

  const resetCustomColors = () => {
    setCustomColors(defaultCustomColors);
    localStorage.removeItem('theme-custom-colors');
  };

  // Always provide context, but only apply theme changes after mount
  return (
    <ThemeContext.Provider
      value={{
        mode,
        customColors,
        setMode,
        updateCustomColors,
        resetCustomColors,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}

