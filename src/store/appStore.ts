import { create } from 'zustand';

import { STORAGE_KEYS } from '../config/constant';
import { ThemeMode } from '../config/theme';
import StorageUtil from '../utils/storage';

type AppState = {
  theme: ThemeMode;
  initialized: boolean;
  setTheme: (theme: ThemeMode) => Promise<void>;
  initTheme: () => Promise<void>;
};

export const useAppStore = create<AppState>((set) => ({
  theme: 'system',
  initialized: false,
  setTheme: async (theme) => {
    await StorageUtil.set(STORAGE_KEYS.theme, theme);
    set({ theme });
  },
  initTheme: async () => {
    const savedTheme = await StorageUtil.get<ThemeMode>(STORAGE_KEYS.theme);
    set({
      theme: savedTheme || 'system',
      initialized: true,
    });
  },
}));
