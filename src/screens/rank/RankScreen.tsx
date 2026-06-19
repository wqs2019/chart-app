import Ionicons from '@expo/vector-icons/Ionicons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
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

import CommonModal from '../../components/common/CommonModal';
import LeaderboardSwitcher from '../../components/rank/LeaderboardSwitcher';
import { useAppTheme } from '../../hooks/useAppTheme';
import { RootStackParamList } from '../../navigation/RootNavigator';
import { rankService } from '../../services/rankService';
import { useAppStore } from '../../store/appStore';
import {
  LeaderboardCode,
  LEADERBOARD_CONFIGS,
  RANK_LEADERBOARD_CODES,
  UserScoreSnapshot,
} from '../../types/rank';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

const formatPercentile = (value?: number) => {
  if (value === undefined || value === null || Number.isNaN(Number(value))) {
    return '暂无';
  }

  return `超越 ${Number(value).toFixed(0)}% 用户`;
};

const formatScore = (value?: number | null) => {
  if (value === undefined || value === null || Number.isNaN(Number(value))) {
    return '0.00';
  }

  return Number(value).toFixed(2);
};

const getRawCountLabel = (code: LeaderboardCode, snapshot?: Pick<
  UserScoreSnapshot,
  'raw_count' | 'world_raw_count' | 'china_raw_count' | 'activity_raw_count'
> | null) => {
  const safeCount = snapshot?.raw_count ?? 0;

  if (code === 'overall') {
    return `世界 ${snapshot?.world_raw_count ?? 0} 项 · 中国 ${snapshot?.china_raw_count ?? 0} 项 · 玩乐 ${snapshot?.activity_raw_count ?? 0} 项`;
  }

  return `已录入 ${safeCount}${LEADERBOARD_CONFIGS[code].unit}`;
};

const getOverallScoreBreakdownLines = (
  snapshot?: Pick<UserScoreSnapshot, 'world_final_score' | 'china_final_score' | 'activity_final_score'> | null
) => {
  const worldScore = Number(snapshot?.world_final_score ?? 0);
  const chinaScore = Number(snapshot?.china_final_score ?? 0);
  const activityScore = Number(snapshot?.activity_final_score ?? 0);

  return [
    `世界旅游 ${formatScore(worldScore)} × 70% = ${formatScore(worldScore * 0.7)}`,
    `中国旅游 ${formatScore(chinaScore)} × 20% = ${formatScore(chinaScore * 0.2)}`,
    `玩乐项目 ${formatScore(activityScore)} × 10% = ${formatScore(activityScore * 0.1)}`,
  ];
};

const getAvatarUri = (row: UserScoreSnapshot, currentAvatarUrl?: string) =>
  row.avatar_url || currentAvatarUrl || '';

const getAvatarFallback = (name: string) => name.trim().charAt(0).toUpperCase() || '游';

const getScoreRuleLines = (code: LeaderboardCode) => {
  if (code === 'world_travel') {
    return [
      '去过更多国家、覆盖更多洲，世界旅游分数会更高。',
      'A / B / C 三类国家也会带来不同的额外加成。',
      '点赞、评论、收藏越多，互动带来的影响力分也会继续上涨。',
      '最终成绩由成就分占 70%，影响力分占 30%。',
    ];
  }

  if (code === 'china_travel') {
    return [
      '去过更多省级行政区、覆盖更多中国大区，分数会更高。',
      '点赞、评论、收藏越多，互动带来的影响力分也会继续上涨。',
      '最终成绩由成就分占 70%，影响力分占 30%。',
    ];
  }

  if (code === 'activity') {
    return [
      '体验过更多项目类型、覆盖更多项目大类，分数会更高。',
      '点赞、评论、收藏越多，互动带来的影响力分也会继续上涨。',
      '最终成绩由成就分占 70%，影响力分占 30%。',
    ];
  }

  return [
    '综合榜会把世界旅游、中国旅游、玩乐项目三个子榜的总分合并计算。',
    '权重分配：世界旅游 70%，中国旅游 20%，玩乐项目 10%。',
    '你的综合榜表现越均衡，综合总分通常越高。',
  ];
};

const getScoreSourceHint = (code: LeaderboardCode) => {
  if (code === 'world_travel') {
    return '简单理解：去得更广、覆盖更完整、内容互动更高，世界旅游榜分数就会更高。';
  }

  if (code === 'china_travel') {
    return '简单理解：去过的省份越多、覆盖的大区越完整，外加更高互动，就越容易冲到前排。';
  }

  if (code === 'activity') {
    return '简单理解：玩过的项目越丰富、覆盖的大类越广，加上更高互动，玩乐项目榜分数就会更高。';
  }

  return '综合榜不直接按录入数量计分，而是把三个子榜的总分按权重合成为最终成绩。';
};

const SCORE_ROUNDING_HINT = '分数展示保留两位小数，并按四舍五入显示。';

type RankScreenData = {
  myRank: UserScoreSnapshot | null;
  rows: UserScoreSnapshot[];
};

const RankScreen: React.FC = () => {
  const { colors, isDark } = useAppTheme();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const currentUser = useAppStore((state) => state.currentUser);
  const userId = currentUser?._id;

  const [selectedCode, setSelectedCode] = React.useState<LeaderboardCode>('overall');
  const [dataByCode, setDataByCode] = React.useState<Partial<Record<LeaderboardCode, RankScreenData>>>({});
  const [switchingCode, setSwitchingCode] = React.useState<LeaderboardCode | null>(null);
  const [showScoreGuide, setShowScoreGuide] = React.useState(false);
  const requestIdRef = React.useRef(0);

  const currentConfig = LEADERBOARD_CONFIGS[selectedCode];
  const scoreRuleLines = React.useMemo(() => getScoreRuleLines(selectedCode), [selectedCode]);
  const scoreSourceHint = React.useMemo(() => getScoreSourceHint(selectedCode), [selectedCode]);
  const currentData = dataByCode[selectedCode];
  const myRank = currentData?.myRank ?? null;
  const rows = currentData?.rows ?? [];
  const isCurrentLoading = switchingCode === selectedCode;
  const shouldShowInlineLoading = !currentData && isCurrentLoading;
  const currentUserDisplayName = currentUser?.fullName || currentUser?.username || '我';

  const openCheckinScreen = React.useCallback(
    (params: RootStackParamList['Checkin']) => {
      const rootNavigation = navigation.getParent<NativeStackNavigationProp<RootStackParamList>>();
      if (rootNavigation) {
        rootNavigation.navigate('Checkin', params);
        return;
      }

      navigation.navigate('Checkin', params);
    },
    [navigation]
  );

  const openOverallDiaryFeed = React.useCallback(
    (params: RootStackParamList['OverallDiaryFeed']) => {
      const rootNavigation = navigation.getParent<NativeStackNavigationProp<RootStackParamList>>();
      if (rootNavigation) {
        rootNavigation.navigate('OverallDiaryFeed', params);
        return;
      }

      navigation.navigate('OverallDiaryFeed', params);
    },
    [navigation]
  );

  const fetchData = React.useCallback(async (code: LeaderboardCode) => {
    if (!userId) {
      setDataByCode({});
      setSwitchingCode(null);
      return;
    }

    const currentRequestId = requestIdRef.current + 1;
    requestIdRef.current = currentRequestId;
    setSwitchingCode(code);

    try {
      const [me, leaderboard] = await Promise.all([
        rankService.getMyRank(userId, code),
        rankService.getLeaderboardRankings(code, 1, 20),
      ]);

      if (requestIdRef.current !== currentRequestId) {
        return;
      }

      setDataByCode((prev) => ({
        ...prev,
        [code]: {
          myRank: me,
          rows: leaderboard,
        },
      }));
    } catch (error) {
      if (requestIdRef.current !== currentRequestId) {
        return;
      }

      setDataByCode((prev) => ({
        ...prev,
        [code]: {
          myRank: null,
          rows: [],
        },
      }));
    } finally {
      if (requestIdRef.current === currentRequestId) {
        setSwitchingCode((current) => (current === code ? null : current));
      }
    }
  }, [userId]);

  useFocusEffect(
    React.useCallback(() => {
      fetchData(selectedCode);
    }, [fetchData, selectedCode])
  );

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.topHeader}>
          <View>
            <Text style={[styles.eyebrow, { color: colors.textSecondary }]}>RANKING CENTER</Text>
            <Text style={[styles.title, { color: colors.text }]}>{currentConfig.title}</Text>
          </View>
          <Pressable
            onPress={() => setShowScoreGuide(true)}
            style={[
              styles.infoButton,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
              },
            ]}
          >
            <Ionicons name="information-circle-outline" size={18} color={colors.textSecondary} />
          </Pressable>
        </View>

        <LeaderboardSwitcher
          codes={RANK_LEADERBOARD_CODES}
          selectedCode={selectedCode}
          onChange={setSelectedCode}
        />

        <View
          style={[
            styles.listCard,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
              shadowOpacity: isDark ? 0 : 0.08,
            },
          ]}
        >
          <View style={styles.sectionHeaderRow}>
            <View>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>{currentConfig.title} 排行榜</Text>
              <Text style={[styles.listHint, { color: colors.textSecondary }]}>按总分实时排序</Text>
            </View>
            <View
              style={[
                styles.inlineBadge,
                {
                  backgroundColor: isDark ? 'rgba(148,163,184,0.10)' : '#EEF3F9',
                },
              ]}
            >
              <Text style={[styles.inlineBadgeText, { color: colors.textSecondary }]}>
                {isCurrentLoading ? '同步中...' : `TOP ${rows.length}`}
              </Text>
            </View>
          </View>

          {shouldShowInlineLoading ? (
            <View
              style={[
                styles.inlineLoadingCard,
                {
                  backgroundColor: isDark ? 'rgba(255,255,255,0.02)' : '#F8FBFF',
                  borderColor: colors.border,
                },
              ]}
            >
              <ActivityIndicator size="small" color={colors.primary} />
              <Text style={[styles.inlineLoadingText, { color: colors.textSecondary }]}>
                正在切换 {currentConfig.title} 榜单...
              </Text>
            </View>
          ) : (
            <>
              <Pressable
                disabled={!myRank}
                onPress={() => {
                  if (!myRank || !userId) {
                    return;
                  }

                  if (selectedCode === 'overall') {
                    openOverallDiaryFeed({
                      viewedUserId: userId,
                      viewedUserName: currentUserDisplayName,
                      viewedAvatarUrl: currentUser?.profile?.avatar_url || '',
                    });
                    return;
                  }

                  openCheckinScreen({
                    code: selectedCode,
                    viewedUserId: userId,
                    viewedUserName: currentUserDisplayName,
                    readOnly: true,
                  });
                }}
                style={[
                  styles.compactSummaryCard,
                  {
                    backgroundColor: isDark ? 'rgba(255,255,255,0.02)' : '#F8FBFF',
                    borderColor: myRank ? colors.primary : colors.border,
                  },
                ]}
              >
                {myRank ? (
                  <View style={styles.compactSummaryInline}>
                    <View style={styles.compactSummaryMain}>
                      <Text style={[styles.compactSummaryLabel, { color: colors.textSecondary }]}>我的排名</Text>
                      <Text style={[styles.compactSummaryRank, { color: colors.text }]}>#{myRank.rank || '--'}</Text>
                    </View>
                    <View style={styles.compactSummaryMetrics}>
                      <View style={styles.compactMetricRow}>
                        <View style={styles.compactMetricItem}>
                          <Text style={[styles.compactMetricValue, { color: colors.text }]}>
                            {formatScore(myRank.final_score)}
                          </Text>
                          <Text style={[styles.compactMetricLabel, { color: colors.textSecondary }]}>总分</Text>
                        </View>
                        <View style={styles.compactMetricItem}>
                          <Text style={[styles.compactMetricValue, { color: colors.text }]}>
                            {myRank.raw_count ?? 0}
                          </Text>
                          <Text style={[styles.compactMetricLabel, { color: colors.textSecondary }]}>
                            {selectedCode === 'overall' ? '累计录入项目' : `已录入${currentConfig.unit}`}
                          </Text>
                        </View>
                      </View>
                      <View style={styles.compactPercentileRow}>
                        <Text
                          style={[styles.compactMetricValue, styles.compactMetricValueMultiline, { color: colors.primary }]}
                        >
                          {formatPercentile(myRank.percentile)}
                        </Text>
                      </View>
                    </View>
                  </View>
                ) : (
                  <View style={styles.compactSummaryEmpty}>
                    <Ionicons name="flag-outline" size={16} color={colors.textSecondary} />
                    <Text style={[styles.compactSummaryEmptyText, { color: colors.textSecondary }]}>
                      你当前还没有进入 {currentConfig.title} 排行，先去录入这个榜单的内容吧。
                    </Text>
                  </View>
                )}
              </Pressable>
              {rows.length ? (
                rows.map((row, index) => {
                  const isMine = row.user_id === userId;
                  const displayRank = row.rank || index + 1;
                  const displayName =
                    (isMine ? currentUser?.fullName : row.full_name) ||
                    row.username ||
                    `用户 ${String(row.user_id).slice(-6)}`;
                  const avatarUri = getAvatarUri(row, isMine ? currentUser?.profile?.avatar_url || '' : '');
                  const avatarFallback = getAvatarFallback(displayName);

                  return (
                    <Pressable
                      onPress={() => {
                        if (selectedCode === 'overall') {
                          openOverallDiaryFeed({
                            viewedUserId: row.user_id,
                            viewedUserName: displayName,
                            viewedAvatarUrl: avatarUri,
                          });
                          return;
                        }

                        openCheckinScreen({
                          code: selectedCode,
                          viewedUserId: row.user_id,
                          viewedUserName: displayName,
                          readOnly: true,
                        });
                      }}
                      key={`${row.user_id}-${displayRank}`}
                      style={[
                        styles.rankRow,
                        {
                          backgroundColor: isMine
                            ? isDark
                              ? 'rgba(255,155,122,0.12)'
                              : 'rgba(255,122,89,0.06)'
                            : isDark
                              ? 'rgba(255,255,255,0.02)'
                              : '#F8FBFF',
                          borderColor: isMine ? colors.primary : colors.border,
                        },
                      ]}
                    >
                      <View
                        style={[
                          styles.rankCornerBadge,
                          {
                            backgroundColor: isMine
                              ? colors.primary
                              : isDark
                                ? 'rgba(148,163,184,0.12)'
                                : '#E9EEF6',
                          },
                        ]}
                      >
                        <Text style={[styles.rankCornerText, { color: isMine ? '#FFFFFF' : colors.text }]}>
                          #{displayRank}
                        </Text>
                      </View>
                      <View style={styles.rankBody}>
                        <View
                          style={[
                            styles.avatarWrap,
                            {
                              backgroundColor: avatarUri
                                ? 'transparent'
                                : isDark
                                  ? 'rgba(255,255,255,0.05)'
                                  : '#EEF3F9',
                              borderWidth: avatarUri ? 0 : 1,
                              borderColor: avatarUri ? 'transparent' : isMine ? colors.primary : colors.border,
                            },
                          ]}
                        >
                          {avatarUri ? (
                            <Image source={{ uri: avatarUri }} style={styles.avatar} />
                          ) : (
                            <Text style={[styles.avatarFallback, { color: colors.primary }]}>{avatarFallback}</Text>
                          )}
                        </View>
                        <View style={styles.rankMain}>
                          <View style={styles.rankNameRow}>
                            <Text style={[styles.rankName, { color: colors.text }]}>{displayName}</Text>
                            {isMine ? (
                              <View
                                style={[
                                  styles.mineTag,
                                  {
                                    backgroundColor: isDark ? 'rgba(255,155,122,0.14)' : 'rgba(255,122,89,0.08)',
                                  },
                                ]}
                              >
                                <Text style={[styles.mineTagText, { color: colors.primary }]}>我</Text>
                              </View>
                            ) : null}
                          </View>
                          <Text style={[styles.rankMeta, { color: colors.textSecondary }]}>
                            {getRawCountLabel(selectedCode, row)} · {formatPercentile(row.percentile)}
                          </Text>
                          {!!row.tags?.length && (
                            <View style={styles.tagsRow}>
                              {row.tags.slice(0, 3).map((tag) => (
                                <View
                                  key={tag}
                                  style={[
                                    styles.tag,
                                    {
                                      backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : '#F7FAFC',
                                      borderColor: colors.border,
                                    },
                                  ]}
                                >
                                  <Text style={{ color: colors.textSecondary, fontSize: 12 }}>{tag}</Text>
                                </View>
                              ))}
                            </View>
                          )}
                        </View>
                        <View style={styles.rankScoreWrap}>
                          <Text style={[styles.rankScore, { color: colors.text }]}>
                            {formatScore(row.final_score)}
                          </Text>
                          <Text style={[styles.rankScoreLabel, { color: colors.textSecondary }]}>
                            {selectedCode === 'overall' ? '综合成绩' : '查看列表'}
                          </Text>
                        </View>
                      </View>
                    </Pressable>
                  );
                })
              ) : (
                <View style={[styles.emptyCard, { backgroundColor: colors.background, borderColor: colors.border }]}>
                  <Text style={[styles.emptyTitle, { color: colors.text }]}>当前榜单还没有排行数据</Text>
                  <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                    可以先去录入当前榜单内容，等分数快照生成后这里就会有数据。
                  </Text>
                </View>
              )}
            </>
          )}
        </View>
      </ScrollView>
      <CommonModal
        visible={showScoreGuide}
        onClose={() => setShowScoreGuide(false)}
        title={`${currentConfig.title} 分数说明`}
      >
        <View>
          <Text style={[styles.scoreGuideTitle, { color: colors.text }]}>分数计算规则</Text>
          {scoreRuleLines.map((line) => (
            <Text key={line} style={[styles.scoreGuideText, { color: colors.textSecondary }]}>
              {line}
            </Text>
          ))}
          <Text style={[styles.scoreGuideHint, { color: colors.textSecondary }]}>
            {scoreSourceHint}
          </Text>
          <Text style={[styles.scoreGuideHint, { color: colors.textSecondary }]}>
            {SCORE_ROUNDING_HINT}
          </Text>
          {myRank && (
            <View
              style={[
                styles.scoreBreakdownCard,
                {
                  backgroundColor: isDark ? 'rgba(255,155,122,0.12)' : 'rgba(255,122,89,0.08)',
                  borderColor: colors.primary,
                },
              ]}
            >
              <Text style={[styles.scoreGuideTitle, { color: colors.text }]}>你的当前分数拆解</Text>
              <Text style={[styles.scoreGuideText, { color: colors.textSecondary }]}>
                {getRawCountLabel(selectedCode, myRank)}
              </Text>
              {selectedCode === 'overall' ? (
                <>
                  {getOverallScoreBreakdownLines(myRank).map((line) => (
                    <Text key={line} style={[styles.scoreGuideText, { color: colors.textSecondary }]}>
                      {line}
                    </Text>
                  ))}
                  <Text style={[styles.scoreBreakdownValue, { color: colors.text }]}>
                    综合总分 = <Text style={{ color: colors.primary }}>{formatScore(myRank.final_score)}</Text>
                  </Text>
                </>
              ) : (
                <Text style={[styles.scoreBreakdownValue, { color: colors.text }]}>
                  {formatScore(myRank.achievement_score)} × 70% + {formatScore(myRank.influence_score)} × 30% ={' '}
                  <Text style={{ color: colors.primary }}>{formatScore(myRank.final_score)}</Text>
                </Text>
              )}
            </View>
          )}
        </View>
      </CommonModal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingBottom: 140,
    gap: 16,
  },
  topHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  eyebrow: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1,
  },
  title: {
    marginTop: 6,
    fontSize: 32,
    fontWeight: '800',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
  },
  inlineBadge: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  inlineBadgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  listCard: {
    borderWidth: 0,
    borderRadius: 26,
    padding: 18,
    shadowColor: '#020617',
    shadowOffset: { width: 0, height: 12 },
    shadowRadius: 24,
    elevation: 3,
  },
  listHint: {
    marginTop: 6,
    fontSize: 13,
    lineHeight: 19,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  inlineLoadingCard: {
    marginTop: 14,
    marginBottom: 14,
    borderWidth: 0,
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  inlineLoadingText: {
    fontSize: 13,
    fontWeight: '500',
  },
  compactSummaryCard: {
    marginTop: 14,
    borderWidth: 0,
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  compactSummaryInline: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 16,
  },
  compactSummaryMain: {
    minWidth: 72,
  },
  compactSummaryLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  compactSummaryRank: {
    marginTop: 4,
    fontSize: 22,
    fontWeight: '900',
  },
  compactSummaryMetrics: {
    flex: 1,
    gap: 10,
  },
  compactMetricRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  compactMetricItem: {
    flex: 1,
  },
  compactMetricValue: {
    fontSize: 14,
    fontWeight: '800',
  },
  compactMetricValueMultiline: {
    lineHeight: 18,
    flexShrink: 1,
  },
  compactPercentileRow: {
    paddingTop: 2,
  },
  compactMetricLabel: {
    marginTop: 4,
    fontSize: 11,
    lineHeight: 15,
  },
  compactSummaryEmpty: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  compactSummaryEmptyText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
  },
  infoButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scoreGuideTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  scoreGuideText: {
    marginTop: 8,
    fontSize: 13,
    lineHeight: 20,
  },
  scoreGuideHint: {
    marginTop: 10,
    fontSize: 13,
    lineHeight: 20,
  },
  scoreBreakdownCard: {
    marginTop: 14,
    borderWidth: 0,
    borderRadius: 16,
    padding: 14,
  },
  scoreBreakdownValue: {
    marginTop: 8,
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '700',
  },
  rankRow: {
    marginTop: 14,
    borderWidth: 0,
    borderRadius: 20,
    padding: 14,
    position: 'relative',
  },
  rankCornerBadge: {
    position: 'absolute',
    top: 0,
    left: 0,
    minWidth: 44,
    height: 26,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 0,
    borderBottomRightRadius: 14,
    borderBottomLeftRadius: 0,
    paddingHorizontal: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rankCornerText: {
    fontSize: 12,
    fontWeight: '800',
  },
  rankBody: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 22,
  },
  rankMain: {
    flex: 1,
  },
  avatarWrap: {
    width: 64,
    height: 64,
    borderRadius: 24,
    borderWidth: 1,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  avatar: {
    width: '100%',
    height: '100%',
  },
  avatarFallback: {
    fontSize: 22,
    fontWeight: '800',
  },
  rankNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  rankName: {
    fontSize: 16,
    fontWeight: '800',
  },
  mineTag: {
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  mineTagText: {
    fontSize: 11,
    fontWeight: '700',
  },
  rankMeta: {
    marginTop: 4,
    fontSize: 13,
    lineHeight: 18,
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  tag: {
    borderWidth: 0,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  rankScoreWrap: {
    alignItems: 'flex-end',
    marginLeft: 12,
  },
  rankScore: {
    fontSize: 24,
    fontWeight: '900',
  },
  rankScoreLabel: {
    marginTop: 4,
    fontSize: 12,
  },
  emptyCard: {
    marginTop: 14,
    borderWidth: 0,
    borderRadius: 18,
    padding: 18,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  emptyText: {
    marginTop: 8,
    fontSize: 14,
    lineHeight: 21,
  },
});

export default RankScreen;
