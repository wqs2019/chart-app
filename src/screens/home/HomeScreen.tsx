import AsyncStorage from '@react-native-async-storage/async-storage';
import Ionicons from '@expo/vector-icons/Ionicons';
import { NavigationProp, useFocusEffect, useNavigation } from '@react-navigation/native';
import React, { useEffect, useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import ChampionIcon from '../../../assets/champion.svg';
import EarthIcon from '../../../assets/earth.svg';
import MapAssetIcon from '../../../assets/map.svg';
import NextIcon from '../../../assets/next.svg';
import RankIcon from '../../../assets/rank.svg';
import StrongIcon from '../../../assets/strong.svg';
import TotalIcon from '../../../assets/total.svg';
import { UpdateModal } from '../../components/common/UpdateModal';
import { useAppTheme } from '../../hooks/useAppTheme';
import { getThumbnailUrl } from '../../utils/image';
import { RootStackParamList } from '../../navigation/RootNavigator';
import authService from '../../services/authService';
import { rankService } from '../../services/rankService';
import { useAppStore } from '../../store/appStore';
import { LEADERBOARD_CONFIGS, LeaderboardCode, UserScoreSnapshot } from '../../types/rank';
import { checkAppUpdate } from '../../utils/update';

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

const formatRank = (value?: number | null) => (value ? `NO.${value}` : '未上榜');

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

  const [updateInfo, setUpdateInfo] = useState<{ visible: boolean; currentVersion: string; latestVersion: string }>({
    visible: false,
    currentVersion: '',
    latestVersion: '',
  });

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

  useEffect(() => {
    const checkUpdate = async () => {
      const info = await checkAppUpdate();
      if (info?.hasUpdate && info.latestVersion && info.currentVersion) {
        // 检查是否已经提示过该版本以及上次提示的时间
        const lastPromptedVersion = await AsyncStorage.getItem('last_prompted_update_version');
        const lastPromptedTimeStr = await AsyncStorage.getItem('last_prompted_update_time');

        const now = Date.now();
        const lastPromptedTime = lastPromptedTimeStr ? parseInt(lastPromptedTimeStr, 10) : 0;
        const thirtyDaysInMs = 30 * 24 * 60 * 60 * 1000;

        // 如果是新版本，或者距离上次提示已经超过30天，则再次提示
        if (lastPromptedVersion !== info.latestVersion || (now - lastPromptedTime) > thirtyDaysInMs) {
          setUpdateInfo({
            visible: true,
            currentVersion: info.currentVersion,
            latestVersion: info.latestVersion,
          });
          // 记录已提示的版本和时间
          await AsyncStorage.setItem('last_prompted_update_version', info.latestVersion);
          await AsyncStorage.setItem('last_prompted_update_time', now.toString());
        }
      }
    };
    checkUpdate();
  }, []);

  useEffect(() => {
    if (!currentUser) {
      return;
    }

    if (currentUser._id) {
      const now = Date.now();
      if (!currentUser.lastActiveAt || now - currentUser.lastActiveAt > 5 * 60 * 1000) {
        useAppStore.getState().updateProfile(currentUser._id, { lastActiveAt: now }).catch((e) => {
          console.log('Failed to update lastActiveAt', e);
        });
        void authService.updateLastActiveAt(currentUser._id).catch((e) => {
          console.log('Failed to sync lastActiveAt to server', e);
        });
      }
    }
  }, [currentUser]);

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
  const focusInfoValueColor = isDark ? 'rgba(255,248,243,0.9)' : 'rgba(24,33,47,0.82)';

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
              <Text style={[styles.eyebrow, { color: colors.textSecondary }]}>欢迎回来</Text>
              <Text style={[styles.titleName, { color: colors.text }]}>{displayName}</Text>
              <Text style={[styles.title, { color: colors.text }]}>你的旅行记录和成就变化，都在这里</Text>
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
                <Image source={{ uri: getThumbnailUrl(avatarUrl, 200, 200) }} style={styles.heroAvatar} />
              ) : (
                <Text style={[styles.heroAvatarFallback, { color: colors.primary }]}>{avatarFallback}</Text>
              )}
            </View>
          </View>

          <View style={styles.heroStatsGrid}>
            <View style={styles.heroStatsTopRow}>
              <View
                style={[
                  styles.heroMetricCard,
                  {
                    backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : '#FFFFFF',
                    borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(15,23,42,0.06)',
                  },
                ]}
              >
                <View style={[styles.heroMetricDecoration, styles.heroMetricCardDecoration]}>
                  <RankIcon width={58} height={58} />
                </View>
                <View style={styles.heroMetricTopRow}>
                  <View
                    style={[
                      styles.heroMetricIconWrap,
                      { backgroundColor: isDark ? 'rgba(125,211,252,0.10)' : 'rgba(125,211,252,0.14)' },
                    ]}
                  >
                    <Ionicons name="podium-outline" size={15} color={colors.text} />
                  </View>
                  <Text style={[styles.heroMetricLabel, { color: colors.textSecondary }]}>当前综合排名</Text>
                </View>
                <Text style={[styles.heroMetricValue, { color: colors.text }]}>
                  {loadingSummary ? '--' : formatRank(overallSnapshot?.rank)}
                </Text>
                <View style={styles.heroMetricBreakdownRow}>
                  <View
                    style={[
                      styles.heroMetricBreakdownItem,
                      { backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : '#F8FAFC' },
                    ]}
                  >
                    <View style={styles.heroMetricBreakdownInline}>
                      <View style={styles.heroMetricBreakdownLabelWrap}>
                        <View
                          style={[
                            styles.heroMetricBreakdownDot,
                            { backgroundColor: isDark ? '#7DD3FC' : '#38BDF8' },
                          ]}
                        />
                        <Text style={[styles.heroMetricBreakdownLabel, { color: colors.textSecondary }]}>世界旅行</Text>
                      </View>
                      <Text style={[styles.heroMetricBreakdownValue, { color: colors.text }]}>
                        {loadingSummary ? '--' : formatRank(summaryByCode.world_travel?.rank)}
                      </Text>
                    </View>
                  </View>
                  <View
                    style={[
                      styles.heroMetricBreakdownItem,
                      { backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : '#F8FAFC' },
                    ]}
                  >
                    <View style={styles.heroMetricBreakdownInline}>
                      <View style={styles.heroMetricBreakdownLabelWrap}>
                        <View
                          style={[
                            styles.heroMetricBreakdownDot,
                            { backgroundColor: isDark ? '#86EFAC' : '#4ADE80' },
                          ]}
                        />
                        <Text style={[styles.heroMetricBreakdownLabel, { color: colors.textSecondary }]}>中国足迹</Text>
                      </View>
                      <Text style={[styles.heroMetricBreakdownValue, { color: colors.text }]}>
                        {loadingSummary ? '--' : formatRank(summaryByCode.china_travel?.rank)}
                      </Text>
                    </View>
                  </View>
                  <View
                    style={[
                      styles.heroMetricBreakdownItem,
                      { backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : '#F8FAFC' },
                    ]}
                  >
                    <View style={styles.heroMetricBreakdownInline}>
                      <View style={styles.heroMetricBreakdownLabelWrap}>
                        <View
                          style={[
                            styles.heroMetricBreakdownDot,
                            { backgroundColor: isDark ? '#FCD34D' : '#F59E0B' },
                          ]}
                        />
                        <Text style={[styles.heroMetricBreakdownLabel, { color: colors.textSecondary }]}>玩乐活动</Text>
                      </View>
                      <Text style={[styles.heroMetricBreakdownValue, { color: colors.text }]}>
                        {loadingSummary ? '--' : formatRank(summaryByCode.activity?.rank)}
                      </Text>
                    </View>
                  </View>
                </View>
              </View>

              <View style={styles.heroStatsSideColumn}>
                <View
                  style={[
                    styles.heroMetricSideCard,
                    {
                      backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : '#F8FAFC',
                      borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(15,23,42,0.06)',
                    },
                  ]}
                >
                  <View style={styles.heroMetricDecoration}>
                    <ChampionIcon width={58} height={58} />
                  </View>
                  <View style={styles.heroMetricTopRow}>
                    <View
                      style={[
                        styles.heroMetricIconWrap,
                        { backgroundColor: isDark ? 'rgba(255,155,122,0.10)' : 'rgba(255,122,89,0.08)' },
                      ]}
                    >
                      <Ionicons name="trophy-outline" size={15} color={colors.primary} />
                    </View>
                    <Text style={[styles.heroMetricLabel, { color: colors.textSecondary }]}>综合总分</Text>
                  </View>
                  <Text style={[styles.heroMetricValue, styles.heroMetricSideValue, { color: colors.text }]}>
                    {loadingSummary ? '--.--' : formatScore(overallSnapshot?.final_score)}
                  </Text>
                </View>

                <View
                  style={[
                    styles.heroMetricSideCard,
                    {
                      backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : '#F8FAFC',
                      borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(15,23,42,0.06)',
                    },
                  ]}
                >
                  <View style={styles.heroMetricDecoration}>
                    <TotalIcon width={58} height={58} />
                  </View>
                  <View style={styles.heroMetricTopRow}>
                    <View
                      style={[
                        styles.heroMetricIconWrap,
                        { backgroundColor: isDark ? 'rgba(196,181,253,0.12)' : 'rgba(196,181,253,0.16)' },
                      ]}
                    >
                      <Ionicons name="albums-outline" size={15} color={colors.text} />
                    </View>
                    <Text style={[styles.heroMetricLabel, { color: colors.textSecondary }]}>累计录入</Text>
                  </View>
                  <Text style={[styles.heroMetricValue, styles.heroMetricSideValue, { color: colors.text }]}>
                    {totalCheckins}
                  </Text>
                </View>
              </View>
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
          </View>
        </View>

        <View style={[styles.card, { backgroundColor: colors.surface }]}>
          <View style={styles.secondaryFeatureGrid}>
            <Pressable
              onPress={() => navigation.navigate('AchievementPoster')}
              style={[
                styles.secondaryFeatureCard,
                { backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : '#F8FBFF' },
              ]}
            >
              <View style={[styles.secondaryFeatureRow, { backgroundColor: 'transparent' }]}>
                <View style={styles.featureIconWrap}>
                  <MapAssetIcon width={18} height={18} />
                </View>
                <View style={styles.secondaryFeatureTextWrap}>
                  <Text style={[styles.secondaryFeatureTitle, { color: colors.text }]}>成就海报</Text>
                  <Text style={[styles.secondaryFeatureDesc, { color: colors.textSecondary }]}>把当前成绩快速分享出去。</Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color={colors.textSecondary} />
              </View>
            </Pressable>

            <Pressable
              onPress={() => navigation.navigate('TravelFootprintMap')}
              style={[
                styles.secondaryFeatureCard,
                { backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : '#F8FBFF' },
              ]}
            >
              <View style={[styles.secondaryFeatureRow, { backgroundColor: 'transparent' }]}>
                <View style={styles.featureIconWrap}>
                  <EarthIcon width={18} height={18} />
                </View>
                <View style={styles.secondaryFeatureTextWrap}>
                  <Text style={[styles.secondaryFeatureTitle, { color: colors.text }]}>地图足迹</Text>
                  <Text style={[styles.secondaryFeatureDesc, { color: colors.textSecondary }]}>查看世界和中国的点亮区域。</Text>
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
                { backgroundColor: isDark ? '#26402E' : '#DFF4D1' },
              ]}
            >
              <View style={[styles.focusCardHero, { backgroundColor: 'transparent', paddingHorizontal: 4 }]}>
                <Text style={[styles.focusLabel, { color: isDark ? '#BFE6C6' : '#67B84F' }]}>当前最强榜单</Text>
              </View>
              <View style={[styles.focusBodyCard, { backgroundColor: colors.surface, flex: 1 }]}>
                <View style={styles.focusArtworkPanel}>
                  <StrongIcon width={64} height={64} />
                </View>
                <Text style={[styles.focusHeading, { color: colors.text }]} numberOfLines={3}>
                  {strongestConfig.title}
                </Text>
                <View style={styles.focusInfoRow}>
                  <Text style={[styles.focusInfoTitle, { color: colors.textSecondary }]}>综合得分</Text>
                  <Text style={[styles.focusInfoValue, { color: focusInfoValueColor }]}>
                    {formatScore(strongestSnapshot?.final_score)} 分
                  </Text>
                </View>
                <View style={styles.focusInfoRow}>
                  <Text style={[styles.focusInfoTitle, { color: colors.textSecondary }]}>当前榜位</Text>
                  <Text style={[styles.focusInfoValue, { color: focusInfoValueColor }]}>
                    {formatRank(strongestSnapshot?.rank)}
                  </Text>
                </View>
                <View style={styles.focusInfoRow}>
                  <Text style={[styles.focusInfoTitle, { color: colors.textSecondary }]}>累计录入</Text>
                  <Text style={[styles.focusInfoValue, { color: focusInfoValueColor }]}>
                    {strongestSnapshot?.raw_count ?? 0} {strongestConfig.unit}
                  </Text>
                </View>
              </View>
            </View>

            <View
              style={[
                styles.focusCard,
                { backgroundColor: isDark ? '#4B4222' : '#F8E8A6' },
              ]}
            >
              <View style={[styles.focusCardHero, { backgroundColor: 'transparent', paddingHorizontal: 4 }]}>
                <Text style={[styles.focusLabel, { color: isDark ? '#F6E7AE' : '#D89A1D' }]}>下一里程碑</Text>
              </View>
              <View style={[styles.focusBodyCard, { backgroundColor: colors.surface, flex: 1 }]}>
                <View style={styles.focusArtworkPanel}>
                  <NextIcon width={64} height={64} />
                </View>
                <Text style={[styles.focusHeading, { color: colors.text }]} numberOfLines={3}>
                  {recommendedConfig.title}
                </Text>
                <View style={styles.focusInfoRow}>
                  <Text style={[styles.focusInfoTitle, { color: colors.textSecondary }]}>目标榜单</Text>
                  <Text style={[styles.focusInfoValue, { color: focusInfoValueColor }]}>
                    {recommendedConfig.title}
                  </Text>
                </View>
                <View style={styles.focusInfoRow}>
                  <Text style={[styles.focusInfoTitle, { color: colors.textSecondary }]}>还差</Text>
                  <Text style={[styles.focusInfoValue, { color: focusInfoValueColor }]}>
                    {nextMilestoneGap}
                  </Text>
                </View>
                <View style={styles.focusInfoRow}>
                  <Text style={[styles.focusInfoTitle, { color: colors.textSecondary }]}>达成</Text>
                  <Text style={[styles.focusInfoValue, { color: focusInfoValueColor }]}>
                    {nextMilestoneValue} {recommendedConfig.unit}
                  </Text>
                </View>
              </View>
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

      <UpdateModal
        visible={updateInfo.visible}
        currentVersion={updateInfo.currentVersion}
        latestVersion={updateInfo.latestVersion}
        onClose={() => setUpdateInfo((prev) => ({ ...prev, visible: false }))}
      />
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
    fontWeight: '600',
    letterSpacing: 0.4,
  },
  title: {
    marginTop: 6,
    fontSize: 16,
    fontWeight: '600',
    lineHeight: 24,
  },
  titleName: {
    marginTop: 6,
    fontSize: 22,
    fontWeight: '800',
    lineHeight: 28,
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
  heroStatsGrid: {
    marginTop: 18,
    gap: 10,
  },
  heroStatsTopRow: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'stretch',
  },
  heroMetricCard: {
    width: '50%',
    borderRadius: 22,
    borderWidth: 1,
    padding: 14,
    minHeight: 118,
    overflow: 'hidden',
    position: 'relative',
  },
  heroStatsSideColumn: {
    width: '50%',
    gap: 10,
  },
  heroMetricSideCard: {
    flex: 1,
    borderRadius: 22,
    borderWidth: 1,
    padding: 14,
    minHeight: 76,
    overflow: 'hidden',
    position: 'relative',
  },
  heroMetricDecoration: {
    position: 'absolute',
    right: 10,
    bottom: 8,
    opacity: 0.24,
  },
  heroMetricCardDecoration: {
    right: 8,
    bottom: 144,
    opacity: 0.3,
  },
  heroMetricTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  heroMetricIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroStatBadge: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  heroStatBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  heroMetricLabel: {
    fontSize: 12,
    fontWeight: '700',
  },
  heroMetricValue: {
    marginTop: 14,
    fontSize: 24,
    fontWeight: '900',
  },
  heroMetricBreakdownRow: {
    width: '100%',
    gap: 8,
    marginTop: 14,
  },
  heroMetricBreakdownItem: {
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 9,
  },
  heroMetricBreakdownInline: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 6,
  },
  heroMetricBreakdownLabelWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  heroMetricBreakdownDot: {
    width: 6,
    height: 6,
    borderRadius: 999,
  },
  heroMetricBreakdownLabel: {
    fontSize: 11,
    fontWeight: '600',
  },
  heroMetricBreakdownValue: {
    fontSize: 13,
    fontWeight: '800',
  },
  heroMetricSideValue: {
    marginTop: 10,
  },
  heroMetricDesc: {
    marginTop: 6,
    fontSize: 12,
    lineHeight: 16,
  },
  heroMetricStrip: {
    borderRadius: 22,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 13,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  heroMetricStripLeft: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  heroMetricStripCopy: {
    flex: 1,
    minWidth: 0,
  },
  heroMetricStripValue: {
    fontSize: 24,
    fontWeight: '900',
  },
  heroMetricStripDesc: {
    marginTop: 6,
    fontSize: 12,
    lineHeight: 16,
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
  featureCardFollowUp: {
    marginTop: 8,
  },
  secondaryFeatureGrid: {
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
    padding: 8,
    paddingTop: 10,
    justifyContent: 'space-between',
    overflow: 'hidden',
  },
  focusLabel: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '900',
  },
  focusCardHero: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  focusArtworkPanel: {
    position: 'absolute',
    right: 0,
    top: 0,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 0,
    opacity: 0.2,
  },
  focusHeading: {
    fontSize: 22,
    lineHeight: 28,
    fontWeight: '900',
    marginBottom: 16,
    zIndex: 1,
  },
  focusBodyCard: {
    paddingHorizontal: 6,
    paddingVertical: 6,
    gap: 12,
    position: 'relative',
    overflow: 'hidden',
    marginTop: 6,
    borderRadius: 14,
  },
  focusInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  focusInfoTitle: {
    fontSize: 12,
    fontWeight: '600',
  },
  focusInfoValue: {
    fontSize: 12,
    fontWeight: '600',
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
