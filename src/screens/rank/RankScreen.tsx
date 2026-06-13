import Ionicons from '@expo/vector-icons/Ionicons';
import { useFocusEffect } from '@react-navigation/native';
import React from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import CommonModal from '../../components/common/CommonModal';
import LeaderboardSwitcher from '../../components/rank/LeaderboardSwitcher';
import Loading from '../../components/common/Loading';
import { useAppTheme } from '../../hooks/useAppTheme';
import { rankService } from '../../services/rankService';
import { useAppStore } from '../../store/appStore';
import {
  CONTENT_LEADERBOARD_CODES,
  LeaderboardCode,
  LEADERBOARD_CONFIGS,
  UserScoreSnapshot,
} from '../../types/rank';

const formatPercentile = (value?: number) => {
  if (value === undefined || value === null || Number.isNaN(Number(value))) {
    return '暂无';
  }

  return `超过 ${Number(value).toFixed(0)}% 用户`;
};

const formatScore = (value?: number | null) => {
  if (value === undefined || value === null || Number.isNaN(Number(value))) {
    return '0.00';
  }

  return Number(value).toFixed(2);
};

const getScoreRuleLines = (code: LeaderboardCode) => {
  if (code === 'world_travel') {
    return [
      '成就分 = 国家数 × 4 + 覆盖洲数 × 5 + A类 × 0.20 + B类 × 0.40 + C类 × 0.80',
      '影响力分 = ln(1 + 点赞 × 1 + 评论 × 2 + 收藏 × 3) × 10',
      '总分 = 成就分 × 70% + 影响力分 × 30%',
    ];
  }

  if (code === 'china_travel') {
    return [
      '成就分 = 省级行政区数 × 2 + 覆盖中国大区数 × 5',
      '影响力分 = ln(1 + 点赞 × 1 + 评论 × 2 + 收藏 × 3) × 10',
      '总分 = 成就分 × 70% + 影响力分 × 30%',
    ];
  }

  if (code === 'activity') {
    return [
      '成就分 = 项目类型数 × 2 + 覆盖项目大类数 × 4',
      '影响力分 = ln(1 + 点赞 × 1 + 评论 × 2 + 收藏 × 3) × 10',
      '总分 = 成就分 × 70% + 影响力分 × 30%',
    ];
  }

  return [
    '综合总分 = 世界旅游总分 × 70% + 中国旅游总分 × 20% + 玩乐项目总分 × 10%',
  ];
};

const getScoreSourceHint = (code: LeaderboardCode) => {
  if (code === 'world_travel') {
    return '当前分数已经把国家数量、洲覆盖和 A/B/C 结构加成一起算进成就分。';
  }

  if (code === 'china_travel') {
    return '当前分数已经把省级行政区数量和中国大区覆盖一起算进成就分。';
  }

  if (code === 'activity') {
    return '当前分数已经把项目类型数量和项目大类覆盖一起算进成就分。';
  }

  return '当前分数已经把三个子榜总分按 0.7 / 0.2 / 0.1 权重合成。';
};

const RankScreen: React.FC = () => {
  const { colors, isDark } = useAppTheme();
  const currentUser = useAppStore((state) => state.currentUser);
  const userId = currentUser?._id;

  const [selectedCode, setSelectedCode] = React.useState<LeaderboardCode>('world_travel');
  const [loading, setLoading] = React.useState(true);
  const [myRank, setMyRank] = React.useState<UserScoreSnapshot | null>(null);
  const [rows, setRows] = React.useState<UserScoreSnapshot[]>([]);
  const [showScoreGuide, setShowScoreGuide] = React.useState(false);

  const currentConfig = LEADERBOARD_CONFIGS[selectedCode];
  const scoreRuleLines = React.useMemo(() => getScoreRuleLines(selectedCode), [selectedCode]);
  const scoreSourceHint = React.useMemo(() => getScoreSourceHint(selectedCode), [selectedCode]);

  const fetchData = React.useCallback(async () => {
    if (!userId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const [me, leaderboard] = await Promise.all([
        rankService.getMyRank(userId, selectedCode),
        rankService.getLeaderboardRankings(selectedCode, 1, 20),
      ]);
      setMyRank(me);
      setRows(leaderboard);
    } catch (error) {
      setMyRank(null);
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [selectedCode, userId]);

  React.useEffect(() => {
    fetchData();
  }, [fetchData]);

  useFocusEffect(
    React.useCallback(() => {
      fetchData();
    }, [fetchData])
  );

  if (loading) {
    return <Loading message="正在加载当前榜单排行..." />;
  }

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={[styles.heroCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.eyebrow, { color: colors.primary }]}>LEADERBOARD</Text>
          <Text style={[styles.title, { color: colors.text }]}>榜单</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            当前页面只展示一个榜单的排行榜，你可以在顶部切换查看其他榜单。
          </Text>
        </View>

        <LeaderboardSwitcher
          codes={CONTENT_LEADERBOARD_CODES}
          selectedCode={selectedCode}
          onChange={setSelectedCode}
        />

        <View style={[styles.summaryCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>我的当前成绩</Text>
          {myRank ? (
            <View style={styles.summaryGrid}>
              <View style={styles.summaryItem}>
                <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>当前名次</Text>
                <Text style={[styles.summaryValue, { color: colors.text }]}>#{myRank.rank || '--'}</Text>
              </View>
              <View style={styles.summaryItem}>
                <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>榜单分数</Text>
                <Text style={[styles.summaryValue, { color: colors.text }]}>
                  {formatScore(myRank.final_score)}
                </Text>
              </View>
              <View style={styles.summaryItem}>
                <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>录入数量</Text>
                <Text style={[styles.summaryValue, { color: colors.text }]}>{myRank.raw_count ?? 0}</Text>
              </View>
              <View style={styles.summaryItem}>
                <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>排名表现</Text>
                <Text style={[styles.summaryMinor, { color: colors.primary }]}>
                  {formatPercentile(myRank.percentile)}
                </Text>
              </View>
            </View>
          ) : (
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              你当前还没有进入 {currentConfig.title} 排行，先去录入这个榜单的内容吧。
            </Text>
          )}
        </View>

        <View style={[styles.listCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.sectionHeaderRow}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              {currentConfig.title} 排行榜
            </Text>
            <Pressable
              onPress={() => setShowScoreGuide(true)}
              style={[
                styles.infoButton,
                {
                  backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(17,24,39,0.05)',
                  borderColor: colors.border,
                },
              ]}
            >
              <Ionicons
                name="information-circle-outline"
                size={18}
                color={colors.textSecondary}
              />
            </Pressable>
          </View>
          <Text style={[styles.listHint, { color: colors.textSecondary }]}>
            当前只展示 {currentConfig.title} 的排行榜数据。
          </Text>

          {rows.length ? (
            rows.map((row, index) => {
              const isMine = row.user_id === userId;
              const displayRank = row.rank || index + 1;
              const displayName = isMine ? '我' : `用户 ${String(row.user_id).slice(-6)}`;

              return (
                <View
                  key={`${row.user_id}-${displayRank}`}
                  style={[
                    styles.rankRow,
                    {
                      backgroundColor: isMine
                        ? isDark
                          ? 'rgba(244,114,182,0.14)'
                          : 'rgba(236,72,153,0.08)'
                        : colors.background,
                      borderColor: isMine ? colors.primary : colors.border,
                    },
                  ]}
                >
                  <View style={[styles.rankBadge, { backgroundColor: isMine ? colors.primary : colors.surface }]}>
                    <Text style={{ color: isMine ? '#FFFFFF' : colors.text, fontWeight: '800' }}>
                      {displayRank}
                    </Text>
                  </View>
                  <View style={styles.rankMain}>
                    <Text style={[styles.rankName, { color: colors.text }]}>{displayName}</Text>
                    <Text style={[styles.rankMeta, { color: colors.textSecondary }]}>
                      已录入 {row.raw_count ?? 0}{currentConfig.unit}
                    </Text>
                    {!!row.tags?.length && (
                      <View style={styles.tagsRow}>
                        {row.tags.slice(0, 3).map((tag) => (
                          <View
                            key={tag}
                            style={[styles.tag, { backgroundColor: colors.surface, borderColor: colors.border }]}
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
                    <Text style={[styles.rankScoreLabel, { color: colors.textSecondary }]}>总分</Text>
                  </View>
                </View>
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
          {myRank && (
            <View
              style={[
                styles.scoreBreakdownCard,
                {
                  backgroundColor: isDark ? 'rgba(244,114,182,0.12)' : 'rgba(236,72,153,0.08)',
                  borderColor: colors.primary,
                },
              ]}
            >
              <Text style={[styles.scoreGuideTitle, { color: colors.text }]}>你的当前分数拆解</Text>
              <Text style={[styles.scoreGuideText, { color: colors.textSecondary }]}>
                已录入 {myRank.raw_count ?? 0}{currentConfig.unit}
              </Text>
              {selectedCode === 'overall' ? (
                <Text style={[styles.scoreBreakdownValue, { color: colors.text }]}>
                  综合总分 = {formatScore(myRank.final_score)}
                </Text>
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
  heroCard: {
    borderWidth: 1,
    borderRadius: 24,
    padding: 20,
  },
  eyebrow: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1,
  },
  title: {
    marginTop: 10,
    fontSize: 30,
    fontWeight: '800',
  },
  subtitle: {
    marginTop: 10,
    fontSize: 15,
    lineHeight: 22,
  },
  summaryCard: {
    borderWidth: 1,
    borderRadius: 22,
    padding: 18,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  summaryGrid: {
    marginTop: 14,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  summaryItem: {
    width: '47%',
  },
  summaryLabel: {
    fontSize: 13,
  },
  summaryValue: {
    marginTop: 6,
    fontSize: 24,
    fontWeight: '800',
  },
  summaryMinor: {
    marginTop: 8,
    fontSize: 15,
    fontWeight: '700',
  },
  listCard: {
    borderWidth: 1,
    borderRadius: 22,
    padding: 18,
  },
  listHint: {
    marginTop: 8,
    fontSize: 14,
    lineHeight: 21,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  infoButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 12,
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
    borderWidth: 1,
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
    borderWidth: 1,
    borderRadius: 18,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
  },
  rankBadge: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  rankMain: {
    flex: 1,
  },
  rankName: {
    fontSize: 16,
    fontWeight: '700',
  },
  rankMeta: {
    marginTop: 4,
    fontSize: 13,
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  tag: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  rankScoreWrap: {
    alignItems: 'flex-end',
    marginLeft: 12,
  },
  rankScore: {
    fontSize: 22,
    fontWeight: '800',
  },
  rankScoreLabel: {
    marginTop: 4,
    fontSize: 12,
  },
  emptyCard: {
    marginTop: 14,
    borderWidth: 1,
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
