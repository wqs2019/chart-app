import Ionicons from '@expo/vector-icons/Ionicons';
import { useFocusEffect } from '@react-navigation/native';
import React from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAppTheme } from '../../hooks/useAppTheme';
import { rankService } from '../../services/rankService';
import { useAppStore } from '../../store/appStore';
import {
  CONTENT_LEADERBOARD_CODES,
  LeaderboardCode,
  LEADERBOARD_CONFIGS,
  RANK_LEADERBOARD_CODES,
  UserScoreSnapshot,
} from '../../types/rank';

type SummaryMap = Partial<Record<LeaderboardCode, UserScoreSnapshot | null>>;

const formatScore = (value?: number | null) => Number(value || 0).toFixed(2);

const getStrongestSnapshot = (summaryByCode: SummaryMap) =>
  CONTENT_LEADERBOARD_CODES.map((code) => ({
    code,
    snapshot: summaryByCode[code],
  })).sort((a, b) => (b.snapshot?.final_score || 0) - (a.snapshot?.final_score || 0))[0];

const AchievementPosterScreen: React.FC = () => {
  const { colors, isDark } = useAppTheme();
  const currentUser = useAppStore((state) => state.currentUser);
  const [loading, setLoading] = React.useState(false);
  const [summaryByCode, setSummaryByCode] = React.useState<SummaryMap>({});
  const displayName =
    currentUser?.fullName || currentUser?.profile?.nickname || currentUser?.username || '旅行玩家';
  const avatarUrl = currentUser?.profile?.avatar_url || '';
  const avatarFallback = displayName.trim().charAt(0).toUpperCase() || '旅';

  const fetchData = React.useCallback(async () => {
    if (!currentUser?._id) {
      setSummaryByCode({});
      return;
    }

    try {
      setLoading(true);
      const rows = await Promise.all(
        RANK_LEADERBOARD_CODES.map(async (code) => [code, await rankService.getMyRank(currentUser._id, code)] as const)
      );
      setSummaryByCode(Object.fromEntries(rows));
    } finally {
      setLoading(false);
    }
  }, [currentUser?._id]);

  useFocusEffect(
    React.useCallback(() => {
      void fetchData();
    }, [fetchData])
  );

  const overallSnapshot = summaryByCode.overall;
  const strongestEntry = getStrongestSnapshot(summaryByCode);
  const strongestCode = strongestEntry?.code || 'world_travel';
  const strongestSnapshot = strongestEntry?.snapshot;
  const strongestConfig = LEADERBOARD_CONFIGS[strongestCode];

  const handleShare = React.useCallback(async () => {
    const message = [
      `${displayName} 的成就海报`,
      `综合总榜：${formatScore(overallSnapshot?.final_score)} 分，排名 ${overallSnapshot?.rank ? `#${overallSnapshot.rank}` : '未上榜'}`,
      `最强榜单：${strongestConfig.title} ${formatScore(strongestSnapshot?.final_score)} 分`,
      '我在排行榜里持续补录经历，正在解锁更高成就。',
    ].join('\n');

    await Share.share({
      message,
    });
  }, [displayName, overallSnapshot?.final_score, overallSnapshot?.rank, strongestConfig.title, strongestSnapshot?.final_score]);

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={[styles.heroCard, { backgroundColor: colors.surface }]}>
          <View style={styles.heroHeader}>
            <View>
              <Text style={[styles.eyebrow, { color: colors.textSecondary }]}>ACHIEVEMENT POSTER</Text>
              <Text style={[styles.title, { color: colors.text }]}>成就海报</Text>
            </View>
            {loading ? <ActivityIndicator size="small" color={colors.primary} /> : null}
          </View>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            当前先提供海报预览和系统分享，方便你把综合成绩和最强榜单快速发出去。
          </Text>
        </View>

        <View
          style={[
            styles.posterCard,
            {
              backgroundColor: isDark ? '#171B27' : '#FF7A59',
            },
          ]}
        >
          <View style={styles.posterHeader}>
            <View
              style={[
                styles.avatarWrap,
                { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.74)' },
              ]}
            >
              {avatarUrl ? (
                <Image source={{ uri: avatarUrl }} style={styles.avatar} />
              ) : (
                <Text style={[styles.avatarFallback, { color: colors.primary }]}>{avatarFallback}</Text>
              )}
            </View>
            <View style={styles.posterHeaderText}>
              <Text style={styles.posterName}>{displayName}</Text>
              <Text style={styles.posterTagline}>把经历沉淀成可展示的个人成就资产</Text>
            </View>
          </View>

          <View style={styles.posterMain}>
            <Text style={styles.posterScoreLabel}>综合总榜分数</Text>
            <Text style={styles.posterScoreValue}>{formatScore(overallSnapshot?.final_score)}</Text>
            <Text style={styles.posterRankText}>
              当前排名 {overallSnapshot?.rank ? `#${overallSnapshot.rank}` : '未上榜'} · 超越 {overallSnapshot?.percentile ?? 0}%
              用户
            </Text>
          </View>

          <View style={styles.posterHighlight}>
            <View style={styles.posterHighlightBadge}>
              <Ionicons name="flash-outline" size={14} color="#FFF7F1" />
            </View>
            <Text style={styles.posterHighlightText}>
              最强榜单：{strongestConfig.title} · {formatScore(strongestSnapshot?.final_score)} 分
            </Text>
          </View>

          <View style={styles.posterGrid}>
            {CONTENT_LEADERBOARD_CODES.map((code) => {
              const config = LEADERBOARD_CONFIGS[code];
              const snapshot = summaryByCode[code];
              return (
                <View key={code} style={styles.posterMiniCard}>
                  <Text style={styles.posterMiniTitle}>{config.title}</Text>
                  <Text style={styles.posterMiniValue}>{formatScore(snapshot?.final_score)}</Text>
                  <Text style={styles.posterMiniMeta}>排名 {snapshot?.rank ? `#${snapshot.rank}` : '未上榜'}</Text>
                </View>
              );
            })}
          </View>
        </View>

        <Pressable
          onPress={() => {
            void handleShare();
          }}
          style={[styles.primaryButton, { backgroundColor: colors.primary }]}
        >
          <Ionicons name="share-social-outline" size={18} color="#FFFFFF" />
          <Text style={styles.primaryButtonText}>系统分享</Text>
        </Pressable>
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
  heroHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
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
  posterCard: {
    borderRadius: 28,
    padding: 20,
  },
  posterHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  avatarWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatar: {
    width: '100%',
    height: '100%',
  },
  avatarFallback: {
    fontSize: 22,
    fontWeight: '900',
  },
  posterHeaderText: {
    flex: 1,
  },
  posterName: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '900',
  },
  posterTagline: {
    marginTop: 4,
    color: 'rgba(255,255,255,0.76)',
    fontSize: 12,
    lineHeight: 18,
  },
  posterMain: {
    marginTop: 28,
  },
  posterScoreLabel: {
    color: 'rgba(255,255,255,0.76)',
    fontSize: 13,
    fontWeight: '700',
  },
  posterScoreValue: {
    marginTop: 8,
    color: '#FFFFFF',
    fontSize: 48,
    fontWeight: '900',
  },
  posterRankText: {
    marginTop: 8,
    color: 'rgba(255,255,255,0.86)',
    fontSize: 14,
    lineHeight: 22,
  },
  posterHighlight: {
    marginTop: 18,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  posterHighlightBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.16)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  posterHighlightText: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  posterGrid: {
    marginTop: 20,
    gap: 10,
  },
  posterMiniCard: {
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.10)',
    padding: 14,
  },
  posterMiniTitle: {
    color: 'rgba(255,255,255,0.76)',
    fontSize: 12,
    fontWeight: '700',
  },
  posterMiniValue: {
    marginTop: 6,
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '900',
  },
  posterMiniMeta: {
    marginTop: 4,
    color: 'rgba(255,255,255,0.76)',
    fontSize: 12,
  },
  primaryButton: {
    height: 50,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
});

export default AchievementPosterScreen;
