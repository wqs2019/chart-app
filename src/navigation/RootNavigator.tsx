import { createNativeStackNavigator } from '@react-navigation/native-stack';

import UserDemoScreen from '../screens/user/UserDemoScreen';
import CheckinScreen from '../screens/rank/CheckinScreen';
import MainTabsScreen from '../screens/tabs/MainTabsScreen';
import { LeaderboardCode } from '../types/rank';

export type RootStackParamList = {
  MainTabs: undefined;
  UserDemo: undefined;
  Checkin: { code: LeaderboardCode };
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export const RootNavigator = () => {
  return (
    <Stack.Navigator>
      <Stack.Screen name="MainTabs" component={MainTabsScreen} options={{ headerShown: false }} />
      <Stack.Screen name="UserDemo" component={UserDemoScreen} options={{ title: 'User Demo' }} />
      <Stack.Screen name="Checkin" component={CheckinScreen} />
    </Stack.Navigator>
  );
};
