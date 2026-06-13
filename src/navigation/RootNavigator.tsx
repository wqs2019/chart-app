import { createNativeStackNavigator } from '@react-navigation/native-stack';

import AppleLoginScreen from '../screens/auth/AppleLoginScreen';
import UserDemoScreen from '../screens/user/UserDemoScreen';
import CheckinScreen from '../screens/rank/CheckinScreen';
import MainTabsScreen from '../screens/tabs/MainTabsScreen';
import { useAppStore } from '../store/appStore';
import { LeaderboardCode } from '../types/rank';

export type RootStackParamList = {
  Login: undefined;
  MainTabs: undefined;
  UserDemo: undefined;
  Checkin: { code: LeaderboardCode };
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export const RootNavigator = () => {
  const isAuthenticated = useAppStore((state) => state.isAuthenticated);

  return (
    <Stack.Navigator screenOptions={{ headerShadowVisible: false }}>
      {isAuthenticated ? (
        <>
          <Stack.Screen name="MainTabs" component={MainTabsScreen} options={{ headerShown: false }} />
          <Stack.Screen name="UserDemo" component={UserDemoScreen} options={{ title: 'User Demo' }} />
          <Stack.Screen name="Checkin" component={CheckinScreen} />
        </>
      ) : (
        <Stack.Screen name="Login" component={AppleLoginScreen} options={{ headerShown: false }} />
      )}
    </Stack.Navigator>
  );
};
