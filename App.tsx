import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { useNotificationBootstrap } from './src/hooks/useNotificationBootstrap';
import { useAppTheme } from './src/hooks/useAppTheme';
import { Navigation } from './src/navigation';
import { useAppStore } from './src/store/appStore';

const Bootstrap = () => {
  const initTheme = useAppStore((state) => state.initTheme);
  const initAuth = useAppStore((state) => state.initAuth);
  const initialized = useAppStore((state) => state.initialized);
  const authInitialized = useAppStore((state) => state.authInitialized);
  const { isDark } = useAppTheme();

  useNotificationBootstrap();

  useEffect(() => {
    initTheme();
    initAuth();
  }, [initAuth, initTheme]);

  if (!initialized || !authInitialized) {
    return (
      <View
        style={{
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: isDark ? '#111827' : '#FFF8FB',
        }}
      >
        <ActivityIndicator size="large" color="#EC4899" />
      </View>
    );
  }

  return <Navigation />;
};

export default function App() {
  const { isDark } = useAppTheme();

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <StatusBar style={isDark ? 'light' : 'dark'} />
        <Bootstrap />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
