import React from 'react';
import {
  createBottomTabNavigator,
  type BottomTabBarProps,
} from '@react-navigation/bottom-tabs';
import { BlurView } from 'expo-blur';
import { Animated, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAppTheme } from '../../hooks/useAppTheme';

type TabKey = 'home' | 'rank' | 'checkin' | 'me';
type MainTabParamList = {
  Home: undefined;
  Rank: undefined;
  Checkin: undefined;
  Me: undefined;
};

type TabConfig = {
  routeName: keyof MainTabParamList;
  key: TabKey;
  label: string;
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

type PlaceholderProps = {
  title: string;
  subtitle: string;
  points: string[];
  actions: string[];
};

const PlaceholderScreen: React.FC<PlaceholderProps> = ({ title, subtitle, points, actions }) => {
  const { colors, isDark } = useAppTheme();

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]} edges={['top']}>
      <ScrollView
        style={styles.contentArea}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        <View
          style={[
            styles.heroCard,
            {
              backgroundColor: hexToRgba(colors.surface, isDark ? 0.78 : 0.9),
              borderColor: colors.border,
            },
          ]}
        >
          <Text style={[styles.eyebrow, { color: colors.primary }]}>CUSTOM TABBAR</Text>
          <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>{subtitle}</Text>
        </View>

        <View
          style={[
            styles.card,
            {
              backgroundColor: hexToRgba(colors.surface, isDark ? 0.76 : 0.86),
              borderColor: colors.border,
            },
          ]}
        >
          <Text style={[styles.sectionTitle, { color: colors.text }]}>当前页面会承载</Text>
          <View style={styles.list}>
            {points.map((point) => (
              <View key={point} style={styles.listItem}>
                <View style={[styles.dot, { backgroundColor: colors.primary }]} />
                <Text style={[styles.listText, { color: colors.text }]}>{point}</Text>
              </View>
            ))}
          </View>
        </View>

        <View
          style={[
            styles.card,
            {
              backgroundColor: hexToRgba(colors.surface, isDark ? 0.76 : 0.86),
              borderColor: colors.border,
            },
          ]}
        >
          <Text style={[styles.sectionTitle, { color: colors.text }]}>操作占位</Text>
          <View style={styles.actionGrid}>
            {actions.map((action) => (
              <View
                key={action}
                style={[
                  styles.actionCard,
                  {
                    backgroundColor: hexToRgba(colors.background, isDark ? 0.55 : 0.82),
                    borderColor: colors.border,
                  },
                ]}
              >
                <Text style={[styles.actionTitle, { color: colors.text }]}>{action}</Text>
                <Text style={[styles.actionDesc, { color: colors.textSecondary }]}>后续接真实交互</Text>
              </View>
            ))}
          </View>
        </View>

        <View
          style={[
            styles.card,
            {
              backgroundColor: hexToRgba(colors.surface, isDark ? 0.76 : 0.86),
              borderColor: colors.border,
            },
          ]}
        >
          <Text style={[styles.sectionTitle, { color: colors.text }]}>开发说明</Text>
          <Text style={[styles.note, { color: colors.textSecondary }]}>
            当前底部栏改为标准 `createBottomTabNavigator` + 自定义 Blur TabBar
            结构，便于按设计稿继续微调玻璃感和交互细节。
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const createPlaceholderComponent = (config: TabConfig) => {
  const ScreenComponent: React.FC = () => (
    <PlaceholderScreen
      title={config.title}
      subtitle={config.subtitle}
      points={config.points}
      actions={config.actions}
    />
  );

  ScreenComponent.displayName = `${config.key}PlaceholderScreen`;
  return ScreenComponent;
};

const HomeTabScreen = createPlaceholderComponent(TAB_CONFIGS[0]);
const RankTabScreen = createPlaceholderComponent(TAB_CONFIGS[1]);
const CheckinTabScreen = createPlaceholderComponent(TAB_CONFIGS[2]);
const MeTabScreen = createPlaceholderComponent(TAB_CONFIGS[3]);

const CustomTabBar: React.FC<BottomTabBarProps> = ({ state, descriptors, navigation }) => {
  const { colors, isDark } = useAppTheme();
  const insets = useSafeAreaInsets();
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
      <SafeAreaView
        edges={['bottom']}
        style={[styles.tabBarSafeArea, { paddingBottom: Math.max(insets.bottom - 24, 0) }]}
      >
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
                        transform: [{ scale: getTabScale(route.key) }],
                      },
                    ]}
                  >
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
  },
  tabButton: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tabButtonInner: {
    minWidth: 68,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  tabLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  note: {
    marginTop: 12,
    fontSize: 14,
    lineHeight: 21,
  },
});

export default MainTabsScreen;
