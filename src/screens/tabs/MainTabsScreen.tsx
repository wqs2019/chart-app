import React from 'react';
import {
  createBottomTabNavigator,
  type BottomTabBarProps,
} from '@react-navigation/bottom-tabs';
import Ionicons from '@expo/vector-icons/Ionicons';
import { BlurView } from 'expo-blur';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAppTheme } from '../../hooks/useAppTheme';
import HomeScreen from '../home/HomeScreen';
import MeScreen from '../me/MeScreen';
import RankScreen from '../rank/RankScreen';
import CheckinTabScreen from '../rank/CheckinTabScreen';
import { LeaderboardCode } from '../../types/rank';

type TabKey = 'home' | 'rank' | 'checkin' | 'me';
type MainTabParamList = {
  Home: undefined;
  Rank: undefined;
  Checkin: { code?: LeaderboardCode } | undefined;
  Me: undefined;
};
type TabIconName = React.ComponentProps<typeof Ionicons>['name'];

type TabConfig = {
  routeName: keyof MainTabParamList;
  key: TabKey;
  label: string;
  icon: TabIconName;
  activeIcon: TabIconName;
  title: string;
  subtitle: string;
  points: string[];
  actions: string[];
};

const TAB_CONFIGS: TabConfig[] = [
  {
    routeName: 'Home',
    key: 'home',
    label: '首页',
    icon: 'home-outline',
    activeIcon: 'home',
    title: '首页内容占位',
    subtitle: '承接产品入口、我的成绩卡片、推荐补录、年度回顾和海报入口。',
    points: [
      '展示综合总分、排名、超过用户比例',
      '展示三大榜单入口和个人成就入口',
      '提供年度回顾和海报的快捷入口',
    ],
    actions: ['查看成绩', '继续补录', '打开回顾'],
  },
  {
    routeName: 'Rank',
    key: 'rank',
    label: '榜单',
    icon: 'trophy-outline',
    activeIcon: 'trophy',
    title: '榜单页内容占位',
    subtitle: '用于展示综合总榜、世界旅游榜、中国旅游榜和玩乐项目榜。',
    points: [
      '支持子榜切换和综合榜切换',
      '展示用户排名、分数、标签和差距提示',
      '榜单条目后续可扩展为进入他人主页',
    ],
    actions: ['切换榜单', '查看规则', '去补录'],
  },
  {
    routeName: 'Checkin',
    key: 'checkin',
    label: '录入',
    icon: 'add-circle-outline',
    activeIcon: 'add-circle',
    title: '录入中心占位',
    subtitle: '承接世界旅游、中国旅游、玩乐项目三类快速建档与持续补录。',
    points: [
      '支持按国家、省份、项目类型快速勾选',
      '后续可补时间、城市、图片、描述等信息',
      '补录完成后即时刷新榜单分数和排名',
    ],
    actions: ['世界旅游录入', '中国旅游录入', '玩乐项目录入'],
  },
  {
    routeName: 'Me',
    key: 'me',
    label: '我的',
    icon: 'person-outline',
    activeIcon: 'person',
    title: '我的页内容占位',
    subtitle: '展示综合成就、单榜表现、互动数据、年度回顾和海报入口。',
    points: [
      '展示综合标签、三大子榜成绩与影响力汇总',
      '展示最近新增记录和代表性成就',
      '承接年度回顾、海报和个人展示能力',
    ],
    actions: ['查看主页', '生成海报', '年度回顾'],
  },
];

const Tab = createBottomTabNavigator<MainTabParamList>();
const TAB_CONFIG_BY_ROUTE = Object.fromEntries(
  TAB_CONFIGS.map((config) => [config.routeName, config]),
) as Record<keyof MainTabParamList, TabConfig>;

const hexToRgba = (hex: string, alpha: number) => {
  const normalized = hex.replace('#', '');
  const fullHex =
    normalized.length === 3
      ? normalized
          .split('')
          .map((char) => char + char)
          .join('')
      : normalized;

  const value = parseInt(fullHex, 16);
  const r = (value >> 16) & 255;
  const g = (value >> 8) & 255;
  const b = value & 255;

  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

const HomeTabScreen = HomeScreen;
const RankTabScreen = RankScreen;
const MeTabScreen = MeScreen;

const CustomTabBar: React.FC<BottomTabBarProps> = ({ state, descriptors, navigation }) => {
  const { colors, isDark } = useAppTheme();
  const tabScaleMapRef = React.useRef<Record<string, Animated.Value>>({});
  const currentRoute = state.routes[state.index];
  const currentOptions = descriptors[currentRoute.key]?.options;

  const getTabScale = (routeKey: string) => {
    if (!tabScaleMapRef.current[routeKey]) {
      tabScaleMapRef.current[routeKey] = new Animated.Value(1);
    }

    return tabScaleMapRef.current[routeKey];
  };

  const animateTabScale = (routeKey: string, toValue: number, bounciness: number) => {
    Animated.spring(getTabScale(routeKey), {
      toValue,
      bounciness,
      speed: 22,
      useNativeDriver: true,
    }).start();
  };

  if (currentOptions?.tabBarStyle && 'display' in currentOptions.tabBarStyle) {
    const display = currentOptions.tabBarStyle.display;
    if (display === 'none') {
      return null;
    }
  }

  return (
    <View pointerEvents="box-none" style={styles.tabBarOuter}>
      <SafeAreaView edges={['bottom']} style={styles.tabBarSafeArea}>
        <BlurView
          intensity={35}
          tint={isDark ? 'dark' : 'light'}
          style={[
            styles.blurShell,
            {
              borderColor: hexToRgba(colors.border, isDark ? 0.68 : 0.85),
              backgroundColor: hexToRgba(colors.surface, isDark ? 0.36 : 0.6),
            },
          ]}
        >
          <View style={styles.tabBarRow}>
            {state.routes.map((route, index) => {
              const { options } = descriptors[route.key];
              const config = TAB_CONFIG_BY_ROUTE[route.name as keyof MainTabParamList];
              const tabLabel =
                typeof options.tabBarLabel === 'string'
                  ? options.tabBarLabel
                  : options.title || config?.label || route.name;
              const isFocused = state.index === index;
              const iconName = isFocused
                ? config?.activeIcon || config?.icon || 'ellipse'
                : config?.icon || 'ellipse-outline';

              const handleTabPress = () => {
                const tabPressEvent = navigation.emit({
                  type: 'tabPress',
                  target: route.key,
                  canPreventDefault: true,
                });

                if (!isFocused && !tabPressEvent.defaultPrevented) {
                  navigation.navigate(route.name);
                }
              };

              const handleTabLongPress = () => {
                navigation.emit({
                  type: 'tabLongPress',
                  target: route.key,
                });
              };

              return (
                <Pressable
                  key={route.key}
                  onLongPress={handleTabLongPress}
                  onPressIn={() => animateTabScale(route.key, 0.92, 0)}
                  onPress={handleTabPress}
                  onPressOut={() => animateTabScale(route.key, 1, 12)}
                  style={styles.tabButton}
                >
                  <Animated.View
                    style={[
                      styles.tabButtonInner,
                      {
                        backgroundColor: isFocused
                          ? hexToRgba(colors.primary, isDark ? 0.2 : 0.14)
                          : 'transparent',
                        minWidth: isFocused ? 84 : 68,
                        transform: [{ scale: getTabScale(route.key) }],
                      },
                    ]}
                  >
                    <Ionicons
                      name={iconName}
                      size={20}
                      color={isFocused ? colors.primary : colors.textSecondary}
                      style={styles.tabIcon}
                    />
                    <Text
                      style={[
                        styles.tabLabel,
                        {
                          color: isFocused ? colors.primary : colors.textSecondary,
                        },
                      ]}
                    >
                      {tabLabel}
                    </Text>
                  </Animated.View>
                </Pressable>
              );
            })}
          </View>
        </BlurView>
      </SafeAreaView>
    </View>
  );
};

const MainTabsScreen: React.FC = () => {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
      }}
      tabBar={(props) => <CustomTabBar {...props} />}
    >
      <Tab.Screen
        name="Home"
        component={HomeTabScreen}
        options={{
          title: TAB_CONFIGS[0].label,
          tabBarLabel: TAB_CONFIGS[0].label,
        }}
      />
      <Tab.Screen
        name="Rank"
        component={RankTabScreen}
        options={{
          title: TAB_CONFIGS[1].label,
          tabBarLabel: TAB_CONFIGS[1].label,
        }}
      />
      <Tab.Screen
        name="Checkin"
        component={CheckinTabScreen}
        options={{
          title: TAB_CONFIGS[2].label,
          tabBarLabel: TAB_CONFIGS[2].label,
        }}
      />
      <Tab.Screen
        name="Me"
        component={MeTabScreen}
        options={{
          title: TAB_CONFIGS[3].label,
          tabBarLabel: TAB_CONFIGS[3].label,
        }}
      />
    </Tab.Navigator>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  contentArea: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 120,
    gap: 16,
  },
  heroCard: {
    borderWidth: 1,
    borderRadius: 20,
    padding: 20,
  },
  eyebrow: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1,
  },
  title: {
    marginTop: 8,
    fontSize: 28,
    fontWeight: '800',
  },
  subtitle: {
    marginTop: 10,
    fontSize: 15,
    lineHeight: 22,
  },
  card: {
    borderWidth: 1,
    borderRadius: 18,
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  list: {
    marginTop: 14,
    gap: 12,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 999,
    marginTop: 6,
  },
  listText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 21,
  },
  actionGrid: {
    marginTop: 14,
    gap: 12,
  },
  actionCard: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
  },
  actionTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  actionDesc: {
    marginTop: 6,
    fontSize: 13,
  },
  tabBarOuter: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
  },
  tabBarSafeArea: {
    paddingHorizontal: 12,
    paddingBottom: 0,
  },
  blurShell: {
    overflow: 'hidden',
    borderWidth: 1,
    borderRadius: 26,
  },
  tabBarRow: {
    flexDirection: 'row',
    minHeight: 72,
    paddingHorizontal: 8,
    paddingTop: 8,
    paddingBottom: 12,
  },
  tabButton: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tabButtonInner: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 8,
    gap: 4,
  },
  tabLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  tabIcon: {
    lineHeight: 20,
  },
  note: {
    marginTop: 12,
    fontSize: 14,
    lineHeight: 21,
  },
});

export default MainTabsScreen;
