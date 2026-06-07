import { COLORS, DARK_COLORS } from './constant';

export type ThemeMode = 'light' | 'dark' | 'system';

export const THEMES = {
  light: {
    name: 'light' as const,
    colors: COLORS,
  },
  dark: {
    name: 'dark' as const,
    colors: DARK_COLORS,
  },
};
