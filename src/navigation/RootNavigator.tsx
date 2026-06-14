import { createNativeStackNavigator } from '@react-navigation/native-stack';

import AppleLoginScreen from '../screens/auth/AppleLoginScreen';
import CheckinEntryDetailScreen from '../screens/checkin/CheckinEntryDetailScreen';
import CheckinEntryEditorScreen from '../screens/checkin/CheckinEntryEditorScreen';
import CheckinItemRecordsScreen from '../screens/checkin/CheckinItemRecordsScreen';
import CheckinScreen from '../screens/checkin/CheckinScreen';
import OverallDiaryFeedScreen from '../screens/rank/OverallDiaryFeedScreen';
import AboutAppScreen from '../screens/me/AboutAppScreen';
import AccountSecurityScreen from '../screens/me/AccountSecurityScreen';
import AppSettingsScreen from '../screens/me/AppSettingsScreen';
import EditProfileScreen from '../screens/me/EditProfileScreen';
import HelpFeedbackScreen from '../screens/me/HelpFeedbackScreen';
import YearReviewScreen from '../screens/me/YearReviewScreen';
import AchievementPosterScreen from '../screens/me/AchievementPosterScreen';
import MainTabsScreen from '../screens/tabs/MainTabsScreen';
import { useAppStore } from '../store/appStore';
import { LeaderboardCode, StandardItem, UserCheckin } from '../types/rank';

export type RootStackParamList = {
  Login: undefined;
  MainTabs: undefined;
  EditProfile: undefined;
  AccountSecurity: undefined;
  AppSettings: undefined;
  AboutApp: undefined;
  HelpFeedback: undefined;
  YearReview: undefined;
  AchievementPoster: undefined;
  OverallDiaryFeed: {
    viewedUserId: string;
    viewedUserName?: string;
    viewedAvatarUrl?: string;
  };
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
          <Stack.Screen name="EditProfile" component={EditProfileScreen} options={{ title: '编辑资料' }} />
          <Stack.Screen name="AccountSecurity" component={AccountSecurityScreen} options={{ title: '账户与安全' }} />
          <Stack.Screen name="AppSettings" component={AppSettingsScreen} options={{ title: '应用设置' }} />
          <Stack.Screen name="AboutApp" component={AboutAppScreen} options={{ title: '关于 App' }} />
          <Stack.Screen name="HelpFeedback" component={HelpFeedbackScreen} options={{ title: '帮助与反馈' }} />
          <Stack.Screen name="YearReview" component={YearReviewScreen} options={{ title: '年度回顾' }} />
          <Stack.Screen
            name="AchievementPoster"
            component={AchievementPosterScreen}
            options={{ title: '成就海报' }}
          />
          <Stack.Screen name="OverallDiaryFeed" component={OverallDiaryFeedScreen} options={{ title: '综合日记' }} />
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
