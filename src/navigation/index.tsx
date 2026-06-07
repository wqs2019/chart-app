import { DarkTheme, DefaultTheme, NavigationContainer } from '@react-navigation/native';
import React from 'react';

import { useAppTheme } from '../hooks/useAppTheme';
import { RootNavigator } from './RootNavigator';

export const Navigation = () => {
  const { isDark, colors } = useAppTheme();

  const navigationTheme = {
    ...(isDark ? DarkTheme : DefaultTheme),
    colors: {
      ...(isDark ? DarkTheme.colors : DefaultTheme.colors),
      primary: colors.primary,
      background: colors.background,
      card: colors.surface,
      text: colors.text,
      border: colors.border,
    },
  };

  return (
    <NavigationContainer theme={navigationTheme}>
      <RootNavigator />
    </NavigationContainer>
  );
};
