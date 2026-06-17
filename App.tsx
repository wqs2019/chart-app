import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import StartupScreen from './src/components/common/StartupScreen';
import { ToastProvider } from './src/components/common/Toast';
import { useNotificationBootstrap } from './src/hooks/useNotificationBootstrap';
import { useAppTheme } from './src/hooks/useAppTheme';
import { Navigation } from './src/navigation';
import { useAppStore } from './src/store/appStore';

const Bootstrap = () => {
  const initTheme = useAppStore((state) => state.initTheme);
  const initAuth = useAppStore((state) => state.initAuth);
  const initialized = useAppStore((state) => state.initialized);
  const authInitialized = useAppStore((state) => state.authInitialized);

  useNotificationBootstrap();

  useEffect(() => {
    initTheme();
    initAuth();
  }, [initAuth, initTheme]);

  if (!initialized || !authInitialized) {
    return <StartupScreen />;
  }

  return <Navigation />;
};

export default function App() {
  const { isDark } = useAppTheme();

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ToastProvider>
          <StatusBar style={isDark ? 'light' : 'dark'} />
          <Bootstrap />
        </ToastProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
