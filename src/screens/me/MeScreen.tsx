import Ionicons from '@expo/vector-icons/Ionicons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAppTheme } from '../../hooks/useAppTheme';
import { RootStackParamList } from '../../navigation/RootNavigator';
import { rankService } from '../../services/rankService';
import { useAppStore } from '../../store/appStore';
import {
  CONTENT_LEADERBOARD_CODES,
  LeaderboardCode,
  LEADERBOARD_CONFIGS,
  RANK_LEADERBOARD_CODES,
  UserScoreSnapshot,
} from '../../types/rank';

const formatScore = (value?: number | null) => Number(value || 0).toFixed(2);

const formatRank = (value?: number | null) => (value ? `#${value}` : '未上榜');

const summaryCodes: LeaderboardCode[] = RANK_LEADERBOARD_CODES;

type SummaryMap = Partial<Record<LeaderboardCode, UserScoreSnapshot | null>>;

const MeScreen: React.FC = () => {
  const navigation = useNavigation();
  const { colors, isDark } = useAppTheme();
  const currentUser = useAppStore((state) => state.currentUser);
  const rootNavigation = navigation.getParent<NativeStackNavigationProp<RootStackParamList>>();
  const [summaryByCode, setSummaryByCode] = React.useState<SummaryMap>({});
  const [loadingSummary, setLoadingSummary] = React.useState(false);

  const displayName =
    currentUser?.fullName || currentUser?.profile?.nickname || currentUser?.username || '旅行玩家';
  const avatarUrl = currentUser?.profile?.avatar_url || '';
  const bio = currentUser?.profile?.bio || '还没有填写个人简介，去补充一句你的旅行宣言吧。';
  const avatarFallback = displayName.trim().charAt(0).toUpperCase() || '我';
  const gender = currentUser?.profile?.gender || 'unspecified';
  const genderMeta =
    gender === 'male'
      ? { icon: 'male' as const, backgroundColor: '#60A5FA' }
      : gender === 'female'
        ? { icon: 'female' as const, backgroundColor: '#F472B6' }
        : gender === 'other'
          ? { icon: 'transgender-outline' as const, backgroundColor: '#A78BFA' }
          : null;

  const primaryMenuItems: Array<{
    title: string;
    subtitle: string;
    icon: keyof typeof Ionicons.glyphMap;
    route: 'AccountSecurity' | 'AppSettings';
  }> = [
    {
      title: '账户与安全',
      subtitle: '查看 Apple 登录身份、邮箱、会话状态和安全信息',
      icon: 'shield-checkmark-outline',
      route: 'AccountSecurity',
    },
    {
      title: '应用设置',
      subtitle: '切换主题模式、清除缓存，统一管理体验偏好',
      icon: 'options-outline',
      route: 'AppSettings',
    },
  ];

  const supportMenuItems: Array<{
    title: string;
    subtitle: string;
    icon: keyof typeof Ionicons.glyphMap;
    route: 'AboutApp' | 'HelpFeedback';
  }> = [
    {
      title: '关于 App',
      subtitle: '查看产品定位、版本信息和当前版本亮点',
      icon: 'information-circle-outline',
      route: 'AboutApp',
    },
    {
      title: '帮助与反馈',
      subtitle: '查看常见问题，并发送问题反馈或功能建议',
      icon: 'help-circle-outline',
      route: 'HelpFeedback',
    },
  ];

  const fetchSummary = React.useCallback(async () => {
    if (!currentUser?._id) {
      setSummaryByCode({});
      return;
    }

    try {
      setLoadingSummary(true);
      const rows = await Promise.all(
        summaryCodes.map(async (code) => [code, await rankService.getMyRank(currentUser._id, code)] as const)
      );
      setSummaryByCode(Object.fromEntries(rows));
    } finally {
      setLoadingSummary(false);
    }
  }, [currentUser?._id]);

  useFocusEffect(
    React.useCallback(() => {
      void fetchSummary();
    }, [fetchSummary])
  );

  const overallSnapshot = summaryByCode.overall;

  const handleOpenEditProfile = () => {
    rootNavigation?.navigate('EditProfile');
  };

  const handleOpenRoute = (
    route:
      | 'AccountSecurity'
      | 'AppSettings'
      | 'AboutApp'
      | 'HelpFeedback'
      | 'YearReview'
      | 'AchievementPoster'
  ) => {
    rootNavigation?.navigate(route);
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={[styles.heroCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.eyebrow, { color: colors.textSecondary }]}>PROFILE CENTER</Text>
          <View style={styles.heroMain}>
            <View
              style={[
                styles.avatarWrap,
                {
                  backgroundColor: isDark ? 'rgba(255,155,122,0.14)' : 'rgba(255,122,89,0.08)',
                  borderColor: colors.border,
                },
              ]}
            >
              {avatarUrl ? (
                <Image source={{ uri: avatarUrl }} style={styles.avatar} />
              ) : (
                <Text style={[styles.avatarFallback, { color: colors.primary }]}>{avatarFallback}</Text>
              )}
              {genderMeta ? (
                <View
                  style={[
                    styles.genderBadge,
                    {
                      backgroundColor: genderMeta.backgroundColor,
                      borderColor: colors.surface,
                    },
                  ]}
                >
                  <Ionicons name={genderMeta.icon} size={12} color="#FFFFFF" />
                </View>
              ) : null}
            </View>

            <View style={styles.heroTextWrap}>
              <View style={styles.nameRow}>
                <Text style={[styles.title, { color: colors.text }]}>{displayName}</Text>
                <Pressable
                  onPress={handleOpenEditProfile}
                  hitSlop={10}
                  style={[
                    styles.nameEditButton,
                    { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : '#FFF7F1' },
                  ]}
                >
                  <Ionicons name="create-outline" size={15} color={colors.primary} />
                </Pressable>
              </View>
              <Text style={[styles.subtitle, { color: colors.textSecondary }]}>{bio}</Text>
            </View>
          </View>
        </View>

        <View style={[styles.menuCard, styles.summaryCard, { backgroundColor: colors.surface }]}>
          <View style={styles.summaryHeader}>
            <View>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>成就概览</Text>
              <Text style={[styles.sectionSubtitle, { color: colors.textSecondary }]}>
                综合总榜和三大子榜的表现汇总。
              </Text>
            </View>
            {loadingSummary ? <ActivityIndicator size="small" color={colors.primary} /> : null}
          </View>

          {overallSnapshot ? (
            <View
              style={[
                styles.overallHighlight,
                {
                  backgroundColor: isDark ? 'rgba(255,155,122,0.12)' : 'rgba(255,122,89,0.08)',
                },
              ]}
            >
              <View style={styles.overallTopRow}>
                <View style={styles.overallInfo}>
                  <Text style={[styles.overallLabel, { color: colors.textSecondary }]}>综合总榜</Text>
                  <Text style={[styles.overallMeta, { color: colors.primary }]}>
                    当前排名 {formatRank(overallSnapshot.rank)} · 超越 {overallSnapshot.percentile ?? 0}% 用户
                  </Text>
                </View>
                <Text style={[styles.overallValue, { color: colors.text }]}>
                  {formatScore(overallSnapshot.final_score)}
                </Text>
              </View>
            </View>
          ) : null}

          <View style={styles.summaryGrid}>
            {CONTENT_LEADERBOARD_CODES.map((code) => {
              const config = LEADERBOARD_CONFIGS[code];
              const snapshot = summaryByCode[code];

              return (
                <View
                  key={code}
                  style={[
                    styles.summaryItem,
                    {
                      backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : '#F8FBFF',
                      borderColor: colors.border,
                    },
                  ]}
                >
                  <Text style={[styles.summaryTitle, { color: colors.text }]}>{config.title}</Text>
                  <Text style={[styles.summaryValue, { color: colors.text }]}>
                    {formatScore(snapshot?.final_score)}
                  </Text>
                  <Text style={[styles.summaryMeta, { color: colors.textSecondary }]}>
                    {formatRank(snapshot?.rank)}
                  </Text>
                </View>
              );
            })}
          </View>
        </View>

        <View style={[styles.menuCard, { backgroundColor: colors.surface }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>回顾与分享</Text>
          <Text style={[styles.sectionSubtitle, { color: colors.textSecondary }]}>
            年度回顾负责讲述你的成长，成就海报负责把结果快速分享出去。
          </Text>

          <View style={styles.actionGrid}>
            <Pressable
              onPress={() => handleOpenRoute('YearReview')}
              style={[
                styles.actionCard,
                { backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : '#F8FBFF', borderColor: colors.border },
              ]}
            >
              <View style={[styles.actionIconWrap, { backgroundColor: isDark ? 'rgba(99,102,241,0.22)' : '#EEF2FF' }]}>
                <Ionicons name="sparkles-outline" size={18} color={colors.primary} />
              </View>
              <Text style={[styles.actionTitle, { color: colors.text }]}>年度回顾</Text>
              <Text style={[styles.actionSubtitle, { color: colors.textSecondary }]}>
                查看今年新增记录、当前最强榜单和下一阶段建议。
              </Text>
            </Pressable>

            <Pressable
              onPress={() => handleOpenRoute('AchievementPoster')}
              style={[
                styles.actionCard,
                { backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : '#F8FBFF', borderColor: colors.border },
              ]}
            >
              <View style={[styles.actionIconWrap, { backgroundColor: isDark ? 'rgba(255,155,122,0.18)' : '#FFF1E8' }]}>
                <Ionicons name="image-outline" size={18} color={colors.primary} />
              </View>
              <Text style={[styles.actionTitle, { color: colors.text }]}>成就海报</Text>
              <Text style={[styles.actionSubtitle, { color: colors.textSecondary }]}>
                生成你的成就预览卡，并通过系统分享发给朋友。
              </Text>
            </Pressable>
          </View>
        </View>

        <View style={[styles.menuCard, { backgroundColor: colors.surface }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>常用设置</Text>
          {primaryMenuItems.map((item, index) => (
            <Pressable
              key={item.title}
              onPress={() => handleOpenRoute(item.route)}
              style={[
                styles.menuRow,
                index === primaryMenuItems.length - 1 ? styles.menuRowLast : null,
                { borderBottomColor: colors.border },
              ]}
            >
              <View
                style={[
                  styles.menuIconWrap,
                  { backgroundColor: isDark ? 'rgba(255,155,122,0.16)' : 'rgba(255,122,89,0.10)' },
                ]}
              >
                <Ionicons name={item.icon} size={18} color={colors.primary} />
              </View>
              <View style={styles.menuTextWrap}>
                <Text style={[styles.menuTitle, { color: colors.text }]}>{item.title}</Text>
                <Text style={[styles.menuSubtitle, { color: colors.textSecondary }]}>{item.subtitle}</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
            </Pressable>
          ))}
        </View>

        <View style={[styles.menuCard, { backgroundColor: colors.surface }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>帮助与说明</Text>
          {supportMenuItems.map((item, index) => (
            <Pressable
              key={item.title}
              onPress={() => handleOpenRoute(item.route)}
              style={[
                styles.menuRow,
                index === supportMenuItems.length - 1 ? styles.menuRowLast : null,
                { borderBottomColor: colors.border },
              ]}
            >
              <View
                style={[
                  styles.menuIconWrap,
                  { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#FFF7F1' },
                ]}
              >
                <Ionicons name={item.icon} size={18} color={colors.primary} />
              </View>
              <View style={styles.menuTextWrap}>
                <Text style={[styles.menuTitle, { color: colors.text }]}>{item.title}</Text>
                <Text style={[styles.menuSubtitle, { color: colors.textSecondary }]}>{item.subtitle}</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
            </Pressable>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingBottom: 120,
    gap: 16,
  },
  heroCard: {
    borderWidth: 0,
    borderRadius: 28,
    padding: 20,
  },
  eyebrow: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1,
  },
  heroMain: {
    marginTop: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  avatarWrap: {
    width: 84,
    height: 84,
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  avatar: {
    width: '100%',
    height: '100%',
  },
  avatarFallback: {
    fontSize: 30,
    fontWeight: '900',
  },
  genderBadge: {
    position: 'absolute',
    right: 2,
    bottom: 2,
    width: 20,
    height: 20,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroTextWrap: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontSize: 28,
    fontWeight: '900',
    flexShrink: 1,
  },
  nameEditButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  subtitle: {
    marginTop: 10,
    fontSize: 14,
    lineHeight: 21,
  },
  menuCard: {
    borderRadius: 22,
    padding: 18,
  },
  summaryCard: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
  },
  sectionSubtitle: {
    marginTop: 4,
    fontSize: 12,
    lineHeight: 17,
  },
  summaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  overallHighlight: {
    marginTop: 10,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  overallTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  overallInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  overallLabel: {
    fontSize: 12,
    fontWeight: '700',
  },
  overallValue: {
    fontSize: 22,
    fontWeight: '900',
  },
  overallMeta: {
    marginTop: 3,
    fontSize: 12,
    fontWeight: '700',
  },
  summaryGrid: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 10,
  },
  summaryItem: {
    flex: 1,
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 11,
    minWidth: 0,
  },
  summaryTitle: {
    fontSize: 12,
    fontWeight: '700',
  },
  summaryValue: {
    marginTop: 6,
    fontSize: 17,
    fontWeight: '900',
  },
  summaryMeta: {
    marginTop: 2,
    fontSize: 11,
  },
  actionGrid: {
    marginTop: 14,
    gap: 12,
  },
  actionCard: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 14,
  },
  actionIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionTitle: {
    marginTop: 12,
    fontSize: 16,
    fontWeight: '800',
  },
  actionSubtitle: {
    marginTop: 6,
    fontSize: 13,
    lineHeight: 19,
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    marginTop: 12,
  },
  menuRowLast: {
    borderBottomWidth: 0,
    paddingBottom: 0,
  },
  menuIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuTextWrap: {
    flex: 1,
  },
  menuTitle: {
    fontSize: 15,
    fontWeight: '800',
  },
  menuSubtitle: {
    marginTop: 4,
    fontSize: 13,
    lineHeight: 19,
  },
});

export default MeScreen;
