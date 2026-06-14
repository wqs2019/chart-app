import Ionicons from '@expo/vector-icons/Ionicons';
import { NavigationProp, useFocusEffect, useNavigation } from '@react-navigation/native';
import React from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAppTheme } from '../../hooks/useAppTheme';
import { RootStackParamList } from '../../navigation/RootNavigator';
import { rankService } from '../../services/rankService';
import { useAppStore } from '../../store/appStore';
import { LEADERBOARD_CONFIGS, LeaderboardCode, UserScoreSnapshot } from '../../types/rank';

const rankOptions: LeaderboardCode[] = ['world_travel', 'china_travel', 'activity'];
const summaryCodes: LeaderboardCode[] = ['overall', ...rankOptions];

type SummaryMap = Partial<Record<LeaderboardCode, UserScoreSnapshot | null>>;
type HomeTabParamList = {
  Home: undefined;
  Rank: undefined;
  Checkin: { code?: LeaderboardCode } | undefined;
  Me: undefined;
};

type Props = object;

const formatScore = (value?: number | null) => Number(value || 0).toFixed(2);

const formatRank = (value?: number | null) => (value ? `#${value}` : '未上榜');

const getLeaderboardIcon = (code: LeaderboardCode): keyof typeof Ionicons.glyphMap => {
  if (code === 'world_travel') {
    return 'earth-outline';
  }

  if (code === 'china_travel') {
    return 'map-outline';
  }

  if (code === 'activity') {
    return 'flash-outline';
  }

  return 'trophy-outline';
};

const MILESTONE_MAP: Record<Exclude<LeaderboardCode, 'overall'>, number[]> = {
  world_travel: [5, 10, 20, 30, 50, 80, 100],
  china_travel: [5, 10, 15, 20, 25, 31],
  activity: [10, 20, 30, 50, 80, 100],
};

const getStrongestCode = (summaryByCode: SummaryMap): LeaderboardCode =>
  rankOptions
    .slice()
    .sort((a, b) => (summaryByCode[b]?.final_score || 0) - (summaryByCode[a]?.final_score || 0))[0] || 'world_travel';

const getRecommendedCode = (summaryByCode: SummaryMap): LeaderboardCode => {
  const missingCode = rankOptions.find((code) => !summaryByCode[code]?.raw_count);
  if (missingCode) {
    return missingCode;
  }

  return (
    rankOptions
      .slice()
      .sort((a, b) => (summaryByCode[a]?.raw_count || 0) - (summaryByCode[b]?.raw_count || 0))[0] || 'world_travel'
  );
};

const getNextMilestoneValue = (code: LeaderboardCode, rawCount: number) => {
  if (code === 'overall') {
    return rawCount;
  }

  const target = MILESTONE_MAP[code].find((value) => value > rawCount);
  return target ?? rawCount + 5;
};

const HomeScreen: React.FC<Props> = () => {
  const tabNavigation = useNavigation<NavigationProp<HomeTabParamList>>();
  const navigation = tabNavigation.getParent<NavigationProp<RootStackParamList>>();
  const { colors, isDark } = useAppTheme();
  const currentUser = useAppStore((state) => state.currentUser);
  const [summaryByCode, setSummaryByCode] = React.useState<SummaryMap>({});
  const [loadingSummary, setLoadingSummary] = React.useState(false);

  const displayName =
    currentUser?.fullName || currentUser?.profile?.nickname || currentUser?.username || '旅行玩家';
  const avatarUrl = currentUser?.profile?.avatar_url || '';
  const avatarFallback = displayName.trim().charAt(0).toUpperCase() || '旅';

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
  const strongestCode = React.useMemo(() => getStrongestCode(summaryByCode), [summaryByCode]);
  const recommendedCode = React.useMemo(() => getRecommendedCode(summaryByCode), [summaryByCode]);
  const strongestConfig = LEADERBOARD_CONFIGS[strongestCode];
  const recommendedConfig = LEADERBOARD_CONFIGS[recommendedCode];
  const strongestSnapshot = summaryByCode[strongestCode];
  const recommendedSnapshot = summaryByCode[recommendedCode];
  const totalCheckins = rankOptions.reduce((sum, code) => sum + (summaryByCode[code]?.raw_count || 0), 0);
  const nextMilestoneValue = React.useMemo(
    () => getNextMilestoneValue(recommendedCode, recommendedSnapshot?.raw_count || 0),
    [recommendedCode, recommendedSnapshot?.raw_count]
  );
  const nextMilestoneGap = Math.max(nextMilestoneValue - (recommendedSnapshot?.raw_count || 0), 1);

  const openCheckin = React.useCallback(
    (code: LeaderboardCode) => {
      tabNavigation.navigate('Checkin', { code });
    },
    [tabNavigation]
  );

  const openRankTab = React.useCallback(() => {
    tabNavigation.navigate('Rank');
  }, [tabNavigation]);

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View
          style={[
            styles.heroCard,
            {
              backgroundColor: isDark ? 'rgba(255,155,122,0.12)' : '#FFF4EC',
            },
          ]}
        >
          <View style={styles.heroTopRow}>
            <View style={styles.heroCopyWrap}>
              <Text style={[styles.eyebrow, { color: colors.textSecondary }]}>ACHIEVEMENT HOME</Text>
              <Text style={[styles.title, { color: colors.text }]}>
                {displayName}，继续刷新你的成就排行榜
              </Text>
              <Text style={[styles.desc, { color: colors.textSecondary }]}>
                首页先告诉你现在到了哪一步，再把你送到最值得继续行动的地方。
              </Text>
            </View>
            <View
              style={[
                styles.heroAvatarWrap,
                {
                  backgroundColor: avatarUrl ? 'transparent' : isDark ? 'rgba(255,255,255,0.06)' : '#FFFFFF',
                },
              ]}
            >
              {avatarUrl ? (
                <Image source={{ uri: avatarUrl }} style={styles.heroAvatar} />
              ) : (
                <Text style={[styles.heroAvatarFallback, { color: colors.primary }]}>{avatarFallback}</Text>
              )}
            </View>
          </View>

          <View style={styles.heroStatsRow}>
            <View style={[styles.heroStatCard, { backgroundColor: colors.surface }]}>
              <Text style={[styles.heroStatLabel, { color: colors.textSecondary }]}>综合总分</Text>
              <Text style={[styles.heroStatValue, { color: colors.text }]}>
                {loadingSummary ? '--.--' : formatScore(overallSnapshot?.final_score)}
              </Text>
            </View>
            <View style={[styles.heroStatCard, { backgroundColor: colors.surface }]}>
              <Text style={[styles.heroStatLabel, { color: colors.textSecondary }]}>当前排名</Text>
              <Text style={[styles.heroStatValue, { color: colors.text }]}>
                {loadingSummary ? '--' : formatRank(overallSnapshot?.rank)}
              </Text>
            </View>
            <View style={[styles.heroStatCard, { backgroundColor: colors.surface }]}>
              <Text style={[styles.heroStatLabel, { color: colors.textSecondary }]}>累计录入</Text>
              <Text style={[styles.heroStatValue, { color: colors.text }]}>{totalCheckins}</Text>
            </View>
          </View>

          <View style={styles.heroActionRow}>
            <Pressable
              onPress={openRankTab}
              style={[styles.primaryButton, { backgroundColor: colors.primary }]}
            >
              <Text style={styles.primaryButtonText}>查看榜单</Text>
              <Ionicons name="arrow-forward" size={16} color="#FFFFFF" />
            </Pressable>
            <Pressable
              onPress={() => navigation?.navigate('YearReview')}
              style={[styles.secondaryButton, { backgroundColor: colors.surface }]}
            >
              <Ionicons name="sparkles-outline" size={16} color={colors.primary} />
              <Text style={[styles.secondaryButtonText, { color: colors.text }]}>年度回顾</Text>
            </Pressable>
          </View>
        </View>

        <View style={[styles.card, { backgroundColor: colors.surface }]}>
          <Pressable
            onPress={openRankTab}
            style={[
              styles.primaryFeatureCard,
              {
                backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : '#F8FBFF',
              },
            ]}
          >
            <View style={[styles.featureIconWrap, { backgroundColor: isDark ? 'rgba(255,155,122,0.14)' : '#FFF1E8' }]}>
              <Ionicons name="trophy-outline" size={20} color={colors.primary} />
            </View>
            <View style={styles.featureTextWrap}>
              <Text style={[styles.featureTitle, { color: colors.text }]}>综合榜单与三大子榜</Text>
              <Text style={[styles.featureDesc, { color: colors.textSecondary }]}>
                查看综合总榜、世界旅游榜、中国旅游榜和玩乐项目榜的当前表现。
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
          </Pressable>

          <View style={styles.secondaryFeatureGrid}>
            <Pressable
              onPress={() => navigation.navigate('YearReview')}
              style={[
                styles.secondaryFeatureCard,
                { backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : '#F8FBFF' },
              ]}
            >
              <View style={[styles.secondaryFeatureRow, { backgroundColor: 'transparent' }]}>
                <View style={[styles.featureIconWrap, { backgroundColor: isDark ? 'rgba(99,102,241,0.22)' : '#EEF2FF' }]}>
                  <Ionicons name="sparkles-outline" size={16} color={colors.primary} />
                </View>
                <View style={styles.secondaryFeatureTextWrap}>
                  <Text style={[styles.secondaryFeatureTitle, { color: colors.text }]}>年度回顾</Text>
                  <Text style={[styles.secondaryFeatureDesc, { color: colors.textSecondary }]}>回顾今年新增与成长轨迹。</Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color={colors.textSecondary} />
              </View>
            </Pressable>

            <Pressable
              onPress={() => navigation.navigate('AchievementPoster')}
              style={[
                styles.secondaryFeatureCard,
                { backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : '#F8FBFF' },
              ]}
            >
              <View style={[styles.secondaryFeatureRow, { backgroundColor: 'transparent' }]}>
                <View style={[styles.featureIconWrap, { backgroundColor: isDark ? 'rgba(255,155,122,0.18)' : '#FFF1E8' }]}>
                  <Ionicons name="image-outline" size={16} color={colors.primary} />
                </View>
                <View style={styles.secondaryFeatureTextWrap}>
                  <Text style={[styles.secondaryFeatureTitle, { color: colors.text }]}>成就海报</Text>
                  <Text style={[styles.secondaryFeatureDesc, { color: colors.textSecondary }]}>把当前成绩快速分享出去。</Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color={colors.textSecondary} />
              </View>
            </Pressable>
          </View>
        </View>

        <View style={[styles.card, { backgroundColor: colors.surface }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>阶段焦点</Text>
          <View style={styles.focusGrid}>
            <View
              style={[
                styles.focusCard,
                { backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : '#F8FBFF' },
              ]}
            >
              <Text style={[styles.focusLabel, { color: colors.textSecondary }]}>当前最强榜单</Text>
              <View style={styles.focusTitleRow}>
                <Ionicons name={getLeaderboardIcon(strongestCode)} size={16} color={colors.primary} />
                <Text style={[styles.focusTitle, { color: colors.text }]}>{strongestConfig.title}</Text>
              </View>
              <Text style={[styles.focusValue, { color: colors.text }]}>
                {formatScore(strongestSnapshot?.final_score)}
              </Text>
              <Text style={[styles.focusMeta, { color: colors.textSecondary }]}>
                {formatRank(strongestSnapshot?.rank)} · 已录入 {strongestSnapshot?.raw_count ?? 0}
              </Text>
            </View>

            <View
              style={[
                styles.focusCard,
                { backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : '#F8FBFF' },
              ]}
            >
              <Text style={[styles.focusLabel, { color: colors.textSecondary }]}>下一里程碑</Text>
              <View style={styles.focusTitleRow}>
                <Ionicons name="flag-outline" size={16} color={colors.primary} />
                <Text style={[styles.focusTitle, { color: colors.text }]}>{recommendedConfig.title}</Text>
              </View>
              <Text style={[styles.focusValue, { color: colors.text }]}>还差 {nextMilestoneGap}</Text>
              <Text style={[styles.focusMeta, { color: colors.textSecondary }]}>
                达到 {nextMilestoneValue} {recommendedConfig.unit}
              </Text>
            </View>
          </View>

          <Pressable
            onPress={() => openCheckin(recommendedCode)}
            style={[
              styles.focusActionRow,
              { backgroundColor: isDark ? 'rgba(255,155,122,0.12)' : '#FFF4EC' },
            ]}
          >
            <View style={[styles.focusActionIconWrap, { backgroundColor: colors.surface }]}>
              <Ionicons name={getLeaderboardIcon(recommendedCode)} size={16} color={colors.primary} />
            </View>
            <View style={styles.focusActionTextWrap}>
              <Text style={[styles.focusActionTitle, { color: colors.text }]}>下一步建议</Text>
              <Text style={[styles.focusActionDesc, { color: colors.textSecondary }]}>
                当前更建议补录 {recommendedConfig.title}。
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
          </Pressable>
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
  card: {
    borderRadius: 24,
    padding: 14,
  },
  heroCard: {
    borderRadius: 28,
    padding: 14,
  },
  heroTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 16,
  },
  heroCopyWrap: {
    flex: 1,
  },
  eyebrow: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1,
  },
  title: {
    marginTop: 8,
    fontSize: 28,
    fontWeight: '900',
  },
  desc: {
    marginTop: 10,
    fontSize: 14,
    lineHeight: 21,
  },
  heroAvatarWrap: {
    width: 64,
    height: 64,
    borderRadius: 24,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroAvatar: {
    width: '100%',
    height: '100%',
  },
  heroAvatarFallback: {
    fontSize: 24,
    fontWeight: '900',
  },
  heroStatsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 18,
  },
  heroStatCard: {
    flex: 1,
    borderRadius: 18,
    paddingHorizontal: 12,
    paddingVertical: 14,
  },
  heroStatLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  heroStatValue: {
    marginTop: 6,
    fontSize: 18,
    fontWeight: '900',
  },
  heroActionRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 16,
  },
  primaryButton: {
    flex: 1,
    minHeight: 46,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 14,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
  secondaryButton: {
    minHeight: 46,
    borderRadius: 16,
    paddingHorizontal: 14,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  secondaryButtonText: {
    fontSize: 14,
    fontWeight: '700',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  sectionHeaderText: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
  },
  sectionSubtitle: {
    marginTop: 6,
    fontSize: 13,
    lineHeight: 19,
  },
  primaryFeatureCard: {
    borderRadius: 18,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  secondaryFeatureGrid: {
    marginTop: 8,
    flexDirection: 'row',
    gap: 8,
  },
  secondaryFeatureCard: {
    flex: 1,
    borderRadius: 18,
    paddingHorizontal: 8,
    paddingVertical: 8,
  },
  secondaryFeatureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  secondaryFeatureTextWrap: {
    flex: 1,
    minWidth: 0,
  },
  secondaryFeatureTitle: {
    fontSize: 13,
    fontWeight: '800',
  },
  secondaryFeatureDesc: {
    marginTop: 2,
    fontSize: 11,
    lineHeight: 15,
  },
  featureIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureTextWrap: {
    flex: 1,
  },
  featureTitle: {
    marginTop: 8,
    fontSize: 14,
    fontWeight: '800',
  },
  featureDesc: {
    marginTop: 4,
    fontSize: 12,
    lineHeight: 17,
  },
  focusGrid: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 12,
  },
  focusCard: {
    flex: 1,
    borderRadius: 18,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  focusLabel: {
    fontSize: 11,
    fontWeight: '700',
  },
  focusTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
  },
  focusTitle: {
    fontSize: 14,
    fontWeight: '800',
    flexShrink: 1,
  },
  focusValue: {
    marginTop: 10,
    fontSize: 20,
    fontWeight: '900',
  },
  focusMeta: {
    marginTop: 4,
    fontSize: 11,
    lineHeight: 16,
  },
  focusActionRow: {
    marginTop: 12,
    borderRadius: 18,
    paddingHorizontal: 12,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  focusActionIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  focusActionTextWrap: {
    flex: 1,
  },
  focusActionTitle: {
    fontSize: 14,
    fontWeight: '800',
  },
  focusActionDesc: {
    marginTop: 4,
    fontSize: 12,
    lineHeight: 17,
  },
});

export default HomeScreen;
