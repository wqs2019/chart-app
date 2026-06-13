import { createNativeStackNavigator } from '@react-navigation/native-stack';

import AppleLoginScreen from '../screens/auth/AppleLoginScreen';
import CheckinEntryDetailScreen from '../screens/checkin/CheckinEntryDetailScreen';
import CheckinEntryEditorScreen from '../screens/checkin/CheckinEntryEditorScreen';
import CheckinItemRecordsScreen from '../screens/checkin/CheckinItemRecordsScreen';
import CheckinScreen from '../screens/checkin/CheckinScreen';
import MainTabsScreen from '../screens/tabs/MainTabsScreen';
import { useAppStore } from '../store/appStore';
import { LeaderboardCode, StandardItem, UserCheckin } from '../types/rank';

export type RootStackParamList = {
  Login: undefined;
  MainTabs: undefined;
  Checkin: {
    code: LeaderboardCode;
    viewedUserId?: string;
    viewedUserName?: string;
    readOnly?: boolean;
  };
  CheckinItemRecords: {
    code: LeaderboardCode;
    item: StandardItem;
    viewedUserId?: string;
    viewedUserName?: string;
    readOnly?: boolean;
  };
  CheckinEntryDetail: {
    code: LeaderboardCode;
    item: StandardItem;
    entry: UserCheckin;
    viewedUserId?: string;
    viewedUserName?: string;
    readOnly?: boolean;
  };
  CheckinEntryEditor: { code: LeaderboardCode; item: StandardItem; entry?: UserCheckin };
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export const RootNavigator = () => {
  const isAuthenticated = useAppStore((state) => state.isAuthenticated);

  return (
    <Stack.Navigator screenOptions={{ headerShadowVisible: false }}>
      {isAuthenticated ? (
        <>
          <Stack.Screen name="MainTabs" component={MainTabsScreen} options={{ headerShown: false }} />
          <Stack.Screen name="Checkin" component={CheckinScreen} />
          <Stack.Screen name="CheckinItemRecords" component={CheckinItemRecordsScreen} />
          <Stack.Screen name="CheckinEntryDetail" component={CheckinEntryDetailScreen} />
          <Stack.Screen name="CheckinEntryEditor" component={CheckinEntryEditorScreen} />
        </>
      ) : (
        <Stack.Screen name="Login" component={AppleLoginScreen} options={{ headerShown: false }} />
      )}
    </Stack.Navigator>
  );
};
