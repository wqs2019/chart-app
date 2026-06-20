import { getFocusedRouteNameFromRoute, type RouteProp } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import AppleLoginScreen from '../screens/auth/AppleLoginScreen';
import CheckinEntryDetailScreen from '../screens/checkin/CheckinEntryDetailScreen';
import CheckinEntryEditorScreen from '../screens/checkin/CheckinEntryEditorScreen';
import CheckinItemRecordsScreen from '../screens/checkin/CheckinItemRecordsScreen';
import CheckinScreen from '../screens/checkin/CheckinScreen';
import OverallDiaryFeedScreen from '../screens/rank/OverallDiaryFeedScreen';
import AboutAppScreen from '../screens/me/AboutAppScreen';
import AccountSecurityScreen from '../screens/me/AccountSecurityScreen';
import AdminCenterScreen from '../screens/me/AdminCenterScreen';
import AdminFeedbackReportsScreen from '../screens/me/AdminFeedbackReportsScreen';
import AppSettingsScreen from '../screens/me/AppSettingsScreen';
import EditProfileScreen from '../screens/me/EditProfileScreen';
import HelpFeedbackScreen from '../screens/me/HelpFeedbackScreen';
import NotificationCenterScreen from '../screens/me/NotificationCenterScreen';
import YearReviewScreen from '../screens/me/YearReviewScreen';
import AchievementPosterScreen from '../screens/me/AchievementPosterScreen';
import MainTabsScreen from '../screens/tabs/MainTabsScreen';
import { useAppStore } from '../store/appStore';
import { AppNotificationType } from '../types/notification';
import { LeaderboardCode, StandardItem, UserCheckin } from '../types/rank';
import { FollowTabKey } from '../types/social';
import AdminFeedbackInboxScreen from '../screens/me/AdminFeedbackInboxScreen';

export type RootStackParamList = {
  Login: undefined;
  MainTabs: undefined;
  EditProfile: undefined;
  AccountSecurity: undefined;
  AdminCenter: undefined;
  AdminFeedbackInbox: undefined;
  AdminFeedbackReports: undefined;
  AppSettings: undefined;
  AboutApp: undefined;
  HelpFeedback: undefined;
  ActivityItemRequest: {
    code: LeaderboardCode;
    searchKeyword?: string;
    selectedCategory?: string;
    selectedCategoryLabel?: string;
    categoryOptions?: Array<{
      value: string;
      label: string;
    }>;
  };
  NotificationCenter:
    | undefined
    | {
        title?: string;
        types?: AppNotificationType[];
      };
  FollowCenter: {
    userId?: string;
    initialTab?: FollowTabKey;
  };
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
    entryId: string;
  };
  CheckinEntryEditor: { code: LeaderboardCode; item: StandardItem; entry?: UserCheckin };
};

const Stack = createNativeStackNavigator<RootStackParamList>();

const TAB_TITLE_MAP: Record<string, string> = {
  Home: '首页',
  Rank: '榜单',
  Checkin: '录入',
  Me: '我的',
};

const getMainTabsTitle = (route: RouteProp<RootStackParamList, 'MainTabs'>) => {
  const routeName = getFocusedRouteNameFromRoute(route) ?? 'Home';
  return TAB_TITLE_MAP[routeName] || '首页';
};

export const RootNavigator = () => {
  const isAuthenticated = useAppStore((state) => state.isAuthenticated);

  return (
    <Stack.Navigator screenOptions={{ headerShadowVisible: false }}>
      {isAuthenticated ? (
        <>
          <Stack.Screen
            name="MainTabs"
            component={MainTabsScreen}
            options={({ route }) => ({
              headerShown: false,
              title: getMainTabsTitle(route),
            })}
          />
          <Stack.Screen name="EditProfile" component={EditProfileScreen} options={{ title: '编辑资料' }} />
          <Stack.Screen name="AccountSecurity" component={AccountSecurityScreen} options={{ title: '账户与安全' }} />
          <Stack.Screen name="AdminCenter" component={AdminCenterScreen} options={{ title: '管理员中心' }} />
          <Stack.Screen
            name="AdminFeedbackInbox"
            component={AdminFeedbackInboxScreen}
            options={{ title: '意见反馈' }}
          />
          <Stack.Screen
            name="AdminFeedbackReports"
            component={AdminFeedbackReportsScreen}
            options={{ title: '举报处理' }}
          />
          <Stack.Screen name="AppSettings" component={AppSettingsScreen} options={{ title: '应用设置' }} />
          <Stack.Screen name="AboutApp" component={AboutAppScreen} options={{ title: '关于 App' }} />
          <Stack.Screen name="HelpFeedback" component={HelpFeedbackScreen} options={{ title: '帮助与反馈' }} />
          <Stack.Screen
            name="ActivityItemRequest"
            component={require('../screens/checkin/ActivityItemRequestScreen').default}
            options={{ title: '申请收录项目' }}
          />
          <Stack.Screen
            name="NotificationCenter"
            component={NotificationCenterScreen}
            options={{ title: '消息通知' }}
          />
          <Stack.Screen
            name="FollowCenter"
            component={require('../screens/me/FollowCenterScreen').default}
            options={{ title: '粉丝关注' }}
          />
          <Stack.Screen name="YearReview" component={YearReviewScreen} options={{ title: '年度回顾' }} />
          <Stack.Screen
            name="AchievementPoster"
            component={AchievementPosterScreen}
            options={{ title: '成就海报' }}
          />
          <Stack.Screen name="OverallDiaryFeed" component={OverallDiaryFeedScreen} options={{ headerShown: false }} />
          <Stack.Screen name="Checkin" component={CheckinScreen} options={{ headerShown: false }} />
          <Stack.Screen name="CheckinItemRecords" component={CheckinItemRecordsScreen} options={{ headerShown: false }} />
          <Stack.Screen name="CheckinEntryDetail" component={CheckinEntryDetailScreen} options={{ headerShown: false }} />
          <Stack.Screen name="CheckinEntryEditor" component={CheckinEntryEditorScreen} />
        </>
      ) : (
        <Stack.Screen name="Login" component={AppleLoginScreen} options={{ headerShown: false }} />
      )}
    </Stack.Navigator>
  );
};
