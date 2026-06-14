import Ionicons from '@expo/vector-icons/Ionicons';
import { useFocusEffect } from '@react-navigation/native';
import React from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAppTheme } from '../../hooks/useAppTheme';
import { checkinService } from '../../services/checkinService';
import { rankService } from '../../services/rankService';
import { useAppStore } from '../../store/appStore';
import {
  CONTENT_LEADERBOARD_CODES,
  LeaderboardCode,
  LEADERBOARD_CONFIGS,
  RANK_LEADERBOARD_CODES,
  UserCheckin,
  UserScoreSnapshot,
} from '../../types/rank';

type SummaryMap = Partial<Record<LeaderboardCode, UserScoreSnapshot | null>>;
type YearlyCountMap = Partial<Record<LeaderboardCode, number>>;

const formatScore = (value?: number | null) => Number(value || 0).toFixed(2);

const countCurrentYearCheckins = (checkins: UserCheckin[], currentYear: number) =>
  checkins.filter((checkin) => {
    const timeValue = checkin.checked_in_at || checkin.created_at;
    return new Date(timeValue || 0).getFullYear() === currentYear;
  }).length;

const getStrongestCode = (summaryByCode: SummaryMap): LeaderboardCode => {
  const contentScores = CONTENT_LEADERBOARD_CODES.map((code) => ({
    code,
    score: summaryByCode[code]?.final_score || 0,
  })).sort((a, b) => b.score - a.score);

  return contentScores[0]?.code || 'world_travel';
};

const getNextMilestone = (code: LeaderboardCode, currentCount: number) => {
  const milestoneMap: Record<'world_travel' | 'china_travel' | 'activity', number[]> = {
    world_travel: [10, 20, 30, 50, 80],
    china_travel: [5, 10, 15, 25, 34],
    activity: [5, 10, 20, 30, 50],
  };

  if (code === 'overall') {
    return null;
  }

  const next = milestoneMap[code].find((value) => value > currentCount);
  if (!next) {
    return null;
  }

  return {
    target: next,
    remaining: next - currentCount,
  };
};

const YearReviewScreen: React.FC = () => {
  const { colors, isDark } = useAppTheme();
  const currentUser = useAppStore((state) => state.currentUser);
  const [loading, setLoading] = React.useState(false);
  const [summaryByCode, setSummaryByCode] = React.useState<SummaryMap>({});
  const [yearlyCounts, setYearlyCounts] = React.useState<YearlyCountMap>({});
  const currentYear = new Date().getFullYear();
  const displayName =
    currentUser?.fullName || currentUser?.profile?.nickname || currentUser?.username || '旅行玩家';

  const fetchData = React.useCallback(async () => {
    if (!currentUser?._id) {
      setSummaryByCode({});
      setYearlyCounts({});
      return;
    }

    try {
      setLoading(true);
      const [summaryRows, checkinRows] = await Promise.all([
        Promise.all(
          RANK_LEADERBOARD_CODES.map(async (code) => [code, await rankService.getMyRank(currentUser._id, code)] as const)
        ),
        Promise.all(
          CONTENT_LEADERBOARD_CODES.map(async (code) => [
            code,
            await checkinService.getUserCheckins(currentUser._id, code),
          ] as const)
        ),
      ]);

      setSummaryByCode(Object.fromEntries(summaryRows));
      setYearlyCounts(
        Object.fromEntries(
          checkinRows.map(([code, rows]) => [code, countCurrentYearCheckins(rows, currentYear)])
        )
      );
    } finally {
      setLoading(false);
    }
  }, [currentUser?._id, currentYear]);

  useFocusEffect(
    React.useCallback(() => {
      void fetchData();
    }, [fetchData])
  );

  const strongestCode = getStrongestCode(summaryByCode);
  const strongestSnapshot = summaryByCode[strongestCode];
  const strongestConfig = LEADERBOARD_CONFIGS[strongestCode];
  const strongestCount = summaryByCode[strongestCode]?.raw_count || 0;
  const nextMilestone = getNextMilestone(strongestCode, strongestCount);
  const totalYearlyAdds = CONTENT_LEADERBOARD_CODES.reduce(
    (sum, code) => sum + Number(yearlyCounts[code] || 0),
    0
  );

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={[styles.heroCard, { backgroundColor: colors.surface }]}>
          <Text style={[styles.eyebrow, { color: colors.textSecondary }]}>YEAR IN REVIEW</Text>
          <Text style={[styles.title, { color: colors.text }]}>{currentYear} 年度回顾</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            {displayName}，这一年你的足迹和体验继续累积，当前成绩已经可以清晰看见。
          </Text>
        </View>

        <View style={[styles.card, { backgroundColor: colors.surface }]}>
          <View style={styles.cardHeader}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>年度新增总览</Text>
            {loading ? <ActivityIndicator size="small" color={colors.primary} /> : null}
          </View>

          <View style={styles.statsGrid}>
            {CONTENT_LEADERBOARD_CODES.map((code) => {
              const config = LEADERBOARD_CONFIGS[code];
              return (
                <View
                  key={code}
                  style={[
                    styles.statCard,
                    {
                      backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : '#F8FBFF',
                    },
                  ]}
                >
                  <Text style={[styles.statLabel, { color: colors.textSecondary }]}>{config.title}</Text>
                  <Text style={[styles.statValue, { color: colors.text }]}>{yearlyCounts[code] || 0}</Text>
                  <Text style={[styles.statMeta, { color: colors.textSecondary }]}>今年新增</Text>
                </View>
              );
            })}
            <View
              style={[
                styles.statCard,
                {
                  backgroundColor: isDark ? 'rgba(255,155,122,0.12)' : 'rgba(255,122,89,0.08)',
                },
              ]}
            >
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>总新增记录</Text>
              <Text style={[styles.statValue, { color: colors.text }]}>{totalYearlyAdds}</Text>
              <Text style={[styles.statMeta, { color: colors.primary }]}>本年累计</Text>
            </View>
          </View>
        </View>

        <View style={[styles.card, { backgroundColor: colors.surface }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>当前榜单进度</Text>
          <View style={styles.scoreList}>
            {RANK_LEADERBOARD_CODES.map((code) => {
              const config = LEADERBOARD_CONFIGS[code];
              const snapshot = summaryByCode[code];
              return (
                <View
                  key={code}
                  style={[
                    styles.scoreRow,
                    {
                      borderBottomColor: colors.border,
                    },
                  ]}
                >
                  <View style={styles.scoreRowMain}>
                    <Text style={[styles.scoreRowTitle, { color: colors.text }]}>{config.title}</Text>
                    <Text style={[styles.scoreRowMeta, { color: colors.textSecondary }]}>
                      {code === 'overall'
                        ? '三个子榜总分加权后的综合成绩'
                        : `已录入 ${snapshot?.raw_count || 0}${config.unit}`}
                    </Text>
                  </View>
                  <View style={styles.scoreRowValueWrap}>
                    <Text style={[styles.scoreRowValue, { color: colors.text }]}>
                      {formatScore(snapshot?.final_score)}
                    </Text>
                    <Text style={[styles.scoreRowMeta, { color: colors.textSecondary }]}>
                      排名 {snapshot?.rank ? `#${snapshot.rank}` : '未上榜'}
                    </Text>
                  </View>
                </View>
              );
            })}
          </View>
        </View>

        <View style={[styles.card, { backgroundColor: colors.surface }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>年度最强维度</Text>
          <View
            style={[
              styles.highlightCard,
              {
                backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : '#F8FBFF',
              },
            ]}
          >
            <View style={styles.highlightHeader}>
              <View style={[styles.highlightIconWrap, { backgroundColor: isDark ? 'rgba(255,155,122,0.16)' : '#FFF1E8' }]}>
                <Ionicons name="trophy-outline" size={18} color={colors.primary} />
              </View>
              <View style={styles.highlightTextWrap}>
                <Text style={[styles.highlightTitle, { color: colors.text }]}>{strongestConfig.title}</Text>
                <Text style={[styles.highlightMeta, { color: colors.textSecondary }]}>
                  当前总分 {formatScore(strongestSnapshot?.final_score)}
                </Text>
              </View>
            </View>

            <Text style={[styles.highlightBody, { color: colors.textSecondary }]}>
              {strongestSnapshot?.tags?.slice(0, 2).join(' · ') || '持续探索'} 是你当前最突出的成就标签。
              {nextMilestone
                ? ` 再新增 ${nextMilestone.remaining}${strongestConfig.unit}，就能冲到 ${nextMilestone.target}${strongestConfig.unit} 的下一里程碑。`
                : ' 你已经进入当前里程碑高位区间，可以继续扩大领先优势。'}
            </Text>
          </View>
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
    paddingBottom: 40,
    gap: 16,
  },
  heroCard: {
    borderRadius: 24,
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
    fontWeight: '900',
  },
  subtitle: {
    marginTop: 10,
    fontSize: 14,
    lineHeight: 21,
  },
  card: {
    borderRadius: 22,
    padding: 18,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 14,
  },
  statCard: {
    width: '48%',
    borderRadius: 18,
    padding: 14,
  },
  statLabel: {
    fontSize: 12,
    fontWeight: '700',
  },
  statValue: {
    marginTop: 8,
    fontSize: 26,
    fontWeight: '900',
  },
  statMeta: {
    marginTop: 4,
    fontSize: 12,
  },
  scoreList: {
    marginTop: 14,
  },
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  scoreRowMain: {
    flex: 1,
  },
  scoreRowTitle: {
    fontSize: 15,
    fontWeight: '800',
  },
  scoreRowMeta: {
    marginTop: 4,
    fontSize: 12,
  },
  scoreRowValueWrap: {
    alignItems: 'flex-end',
  },
  scoreRowValue: {
    fontSize: 18,
    fontWeight: '900',
  },
  highlightCard: {
    marginTop: 14,
    borderRadius: 18,
    padding: 16,
  },
  highlightHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  highlightIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  highlightTextWrap: {
    flex: 1,
  },
  highlightTitle: {
    fontSize: 16,
    fontWeight: '800',
  },
  highlightMeta: {
    marginTop: 4,
    fontSize: 12,
  },
  highlightBody: {
    marginTop: 14,
    fontSize: 14,
    lineHeight: 22,
  },
});

export default YearReviewScreen;
