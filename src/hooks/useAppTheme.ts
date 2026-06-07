import { useColorScheme } from 'react-native';

import { THEMES } from '../config/theme';
import { useAppStore } from '../store/appStore';

export const useAppTheme = () => {
  const theme = useAppStore((state) => state.theme);
  const systemTheme = useColorScheme();
  const themeName = theme === 'system' ? systemTheme || 'light' : theme;
  const currentTheme = THEMES[themeName];

  return {
    themeName,
    isDark: themeName === 'dark',
    colors: currentTheme.colors,
  };
};
