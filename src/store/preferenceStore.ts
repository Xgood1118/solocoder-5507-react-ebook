import { create } from 'zustand';
import type { ReaderPreferences, FontSize, LineHeight, ThemeVariant } from '../types';

const STORAGE_KEY = 'reader_preferences';

const defaultPreferences: ReaderPreferences = {
  fontSize: 'medium',
  lineHeight: 'normal',
  theme: 'light1',
};

function loadPreferences(): ReaderPreferences {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return { ...defaultPreferences, ...JSON.parse(stored) };
    }
  } catch (e) {
    console.error('Failed to load preferences:', e);
  }
  return defaultPreferences;
}

interface PreferenceStore extends ReaderPreferences {
  setFontSize: (size: FontSize) => void;
  setLineHeight: (height: LineHeight) => void;
  setTheme: (theme: ThemeVariant) => void;
  resetPreferences: () => void;
  exportPreferences: () => string;
  importPreferences: (json: string) => boolean;
}

export const usePreferenceStore = create<PreferenceStore>((set, get) => ({
  ...loadPreferences(),

  setFontSize: (size) => {
    set({ fontSize: size });
    localStorage.setItem(STORAGE_KEY, JSON.stringify(get()));
  },

  setLineHeight: (height) => {
    set({ lineHeight: height });
    localStorage.setItem(STORAGE_KEY, JSON.stringify(get()));
  },

  setTheme: (theme) => {
    set({ theme });
    localStorage.setItem(STORAGE_KEY, JSON.stringify(get()));
  },

  resetPreferences: () => {
    set(defaultPreferences);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(defaultPreferences));
  },

  exportPreferences: () => {
    return JSON.stringify(get(), null, 2);
  },

  importPreferences: (json: string) => {
    try {
      const imported = JSON.parse(json);
      const valid: Partial<ReaderPreferences> = {};

      if (['small', 'medium', 'large', 'xlarge'].includes(imported.fontSize)) {
        valid.fontSize = imported.fontSize;
      }
      if (['compact', 'normal', 'loose'].includes(imported.lineHeight)) {
        valid.lineHeight = imported.lineHeight;
      }
      if (['light1', 'light2', 'light3', 'dark1', 'dark2', 'dark3'].includes(imported.theme)) {
        valid.theme = imported.theme;
      }

      const merged = { ...defaultPreferences, ...valid };
      set(merged);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
      return true;
    } catch (e) {
      console.error('Failed to import preferences:', e);
      return false;
    }
  },
}));
