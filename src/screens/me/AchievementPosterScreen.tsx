import Ionicons from '@expo/vector-icons/Ionicons';
import { useFocusEffect } from '@react-navigation/native';
import * as Sharing from 'expo-sharing';
import React from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { captureRef } from 'react-native-view-shot';

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
const formatRank = (value?: number | null) => (value ? `#${value}` : '未上榜');
const formatPercentile = (value?: number | null) => `${Math.round(Number(value || 0))}%`;

const getStrongestSnapshot = (summaryByCode: SummaryMap) =>
  CONTENT_LEADERBOARD_CODES.map((code) => ({
    code,
    snapshot: summaryByCode[code],
  })).sort((a, b) => (b.snapshot?.final_score || 0) - (a.snapshot?.final_score || 0))[0];

const AchievementPosterScreen: React.FC = () => {
  const { colors } = useAppTheme();
  const { width } = useWindowDimensions();
  const currentUser = useAppStore((state) => state.currentUser);
  const [loading, setLoading] = React.useState(false);
  const [sharing, setSharing] = React.useState(false);
  const [summaryByCode, setSummaryByCode] = React.useState<SummaryMap>({});
  const posterRef = React.useRef<View>(null);
  const displayName =
    currentUser?.fullName || currentUser?.profile?.nickname || currentUser?.username || '旅行玩家';
  const avatarUrl = currentUser?.profile?.avatar_url || '';
  const avatarFallback = displayName.trim().charAt(0).toUpperCase() || '旅';
  const posterWidth = Math.min(width - 32, 420);
  const posterYear = new Date().getFullYear();

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
    if (!posterRef.current) {
      return;
    }

    try {
      setSharing(true);

      const isAvailable = await Sharing.isAvailableAsync();
      if (!isAvailable) {
        Alert.alert('暂不支持', '当前设备暂不支持图片分享。');
        return;
      }

      const uri = await captureRef(posterRef, {
        format: 'png',
        quality: 1,
        result: 'tmpfile',
      });

      await Sharing.shareAsync(uri, {
        dialogTitle: '分享成就海报',
        mimeType: 'image/png',
        UTI: 'public.png',
      });
    } catch (error) {
      Alert.alert('分享失败', '海报图片生成失败，请稍后重试。');
    } finally {
      setSharing(false);
    }
  }, []);

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
            生成一张适合聊天、朋友圈和社交分享的成绩海报，把你的综合表现和最强榜单直接晒出去。
          </Text>
        </View>

        <View style={styles.posterPreviewWrap}>
          <View
            ref={posterRef}
            collapsable={false}
            style={[styles.posterCaptureWrap, { width: posterWidth, backgroundColor: '#FFF6F2' }]}
          >
            <View style={styles.posterBackgroundBase}>
              <View style={styles.posterGlowTop} />
              <View style={styles.posterGlowBottom} />
              <View style={styles.posterGridLineVertical} />
              <View style={styles.posterGridLineHorizontal} />
            </View>

            <View style={styles.posterTopBar}>
              <View style={styles.posterBadge}>
                <Ionicons name="sparkles-outline" size={12} color="#FFF7F1" />
                <Text style={styles.posterBadgeText}>TRAVEL ACHIEVEMENT POSTER</Text>
              </View>
              <Text style={styles.posterYear}>{posterYear}</Text>
            </View>

            <View style={styles.posterHeroCard}>
              <View style={styles.posterHeader}>
                <View style={styles.avatarWrap}>
                  {avatarUrl ? (
                    <Image source={{ uri: avatarUrl }} style={styles.avatar} resizeMode="cover" />
                  ) : (
                    <Text style={styles.avatarFallback}>{avatarFallback}</Text>
                  )}
                </View>
                <View style={styles.posterHeaderText}>
                  <Text style={styles.posterName}>{displayName}</Text>
                  <Text style={styles.posterTagline}>把走过的地方，变成看得见的个人成绩</Text>
                </View>
              </View>

              <View style={styles.posterMain}>
                <Text style={styles.posterScoreLabel}>综合总榜分数</Text>
                <Text style={styles.posterScoreValue}>{formatScore(overallSnapshot?.final_score)}</Text>
                <View style={styles.posterRankRow}>
                  <View style={styles.posterRankChip}>
                    <Text style={styles.posterRankChipText}>{formatRank(overallSnapshot?.rank)}</Text>
                  </View>
                  <Text style={styles.posterRankText}>超越 {formatPercentile(overallSnapshot?.percentile)} 用户</Text>
                </View>
              </View>
            </View>

            <View style={styles.posterHighlightCard}>
              <View style={styles.posterHighlightIconWrap}>
                <Ionicons name="flash-outline" size={18} color="#FF7A59" />
              </View>
              <View style={styles.posterHighlightContent}>
                <Text style={styles.posterHighlightLabel}>当前最强榜单</Text>
                <Text style={styles.posterHighlightTitle}>{strongestConfig.title}</Text>
              </View>
              <Text style={styles.posterHighlightScore}>{formatScore(strongestSnapshot?.final_score)}</Text>
            </View>

            <View style={styles.posterMiniGrid}>
              {CONTENT_LEADERBOARD_CODES.map((code) => {
                const config = LEADERBOARD_CONFIGS[code];
                const snapshot = summaryByCode[code];
                return (
                  <View key={code} style={styles.posterMiniCard}>
                    <Text style={styles.posterMiniTitle}>{config.title}</Text>
                    <Text style={styles.posterMiniValue}>{formatScore(snapshot?.final_score)}</Text>
                    <Text style={styles.posterMiniMeta}>{formatRank(snapshot?.rank)}</Text>
                  </View>
                );
              })}
            </View>

            <View style={styles.posterFooterCard}>
              <Text style={styles.posterFooterLead}>继续补录旅行经历，解锁更高排名与更强成就。</Text>
              <Text style={styles.posterFooterSub}>
                世界旅游、中国旅游、玩乐项目三大榜单都会持续累积到我的个人成绩单。
              </Text>
            </View>
          </View>
        </View>

        <Pressable
          disabled={loading || sharing}
          onPress={() => {
            void handleShare();
          }}
          style={[
            styles.primaryButton,
            { backgroundColor: colors.primary, opacity: loading || sharing ? 0.6 : 1 },
          ]}
        >
          {sharing ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Ionicons name="image-outline" size={18} color="#FFFFFF" />
          )}
          <Text style={styles.primaryButtonText}>{sharing ? '正在生成图片...' : '分享海报图片'}</Text>
        </Pressable>
        <Text style={[styles.shareHint, { color: colors.textSecondary }]}>
          分享时会先把海报导出成图片，再调起系统分享面板。
        </Text>
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
  posterPreviewWrap: {
    alignItems: 'center',
  },
  posterCaptureWrap: {
    borderRadius: 32,
    overflow: 'hidden',
    padding: 18,
    position: 'relative',
  },
  posterBackgroundBase: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#FFF6F2',
  },
  posterGlowTop: {
    position: 'absolute',
    top: -60,
    right: -40,
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: '#FF8A65',
    opacity: 0.22,
  },
  posterGlowBottom: {
    position: 'absolute',
    left: -70,
    bottom: -90,
    width: 240,
    height: 240,
    borderRadius: 120,
    backgroundColor: '#0F172A',
    opacity: 0.12,
  },
  posterGridLineVertical: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    right: 92,
    width: 1,
    backgroundColor: 'rgba(15,23,42,0.05)',
  },
  posterGridLineHorizontal: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 160,
    height: 1,
    backgroundColor: 'rgba(15,23,42,0.05)',
  },
  posterTopBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    zIndex: 1,
  },
  posterBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: '#0F172A',
  },
  posterBadgeText: {
    color: '#FFF7F1',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  posterYear: {
    color: '#7C2D12',
    fontSize: 12,
    fontWeight: '700',
  },
  posterHeroCard: {
    marginTop: 16,
    borderRadius: 28,
    padding: 18,
    backgroundColor: '#111827',
  },
  posterHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  avatarWrap: {
    width: 58,
    height: 58,
    borderRadius: 29,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.14)',
  },
  avatar: {
    width: '100%',
    height: '100%',
  },
  avatarFallback: {
    color: '#FFF7F1',
    fontSize: 24,
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
    marginTop: 26,
  },
  posterScoreLabel: {
    color: 'rgba(255,255,255,0.76)',
    fontSize: 13,
    fontWeight: '700',
  },
  posterScoreValue: {
    marginTop: 8,
    color: '#FFFFFF',
    fontSize: 54,
    fontWeight: '900',
    letterSpacing: -1,
  },
  posterRankRow: {
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 10,
  },
  posterRankChip: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: 'rgba(255,255,255,0.14)',
  },
  posterRankChipText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
  posterRankText: {
    color: 'rgba(255,255,255,0.86)',
    fontSize: 13,
    fontWeight: '600',
  },
  posterHighlightCard: {
    marginTop: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 24,
    padding: 16,
    backgroundColor: '#FFFFFF',
  },
  posterHighlightIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFF1E8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  posterHighlightContent: {
    flex: 1,
  },
  posterHighlightLabel: {
    color: '#6B7280',
    fontSize: 11,
    fontWeight: '700',
  },
  posterHighlightTitle: {
    marginTop: 4,
    color: '#111827',
    fontSize: 14,
    fontWeight: '800',
  },
  posterHighlightScore: {
    color: '#FF7A59',
    fontSize: 20,
    fontWeight: '900',
  },
  posterMiniGrid: {
    marginTop: 12,
    flexDirection: 'row',
    gap: 10,
  },
  posterMiniCard: {
    flex: 1,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    padding: 14,
    gap: 10,
  },
  posterMiniTitle: {
    color: '#6B7280',
    fontSize: 12,
    fontWeight: '700',
  },
  posterMiniValue: {
    marginTop: 6,
    color: '#111827',
    fontSize: 21,
    fontWeight: '900',
  },
  posterMiniMeta: {
    marginTop: 4,
    color: '#9CA3AF',
    fontSize: 12,
  },
  posterFooterCard: {
    marginTop: 12,
    borderRadius: 22,
    padding: 16,
    backgroundColor: '#FFE0D2',
  },
  posterFooterLead: {
    color: '#7C2D12',
    fontSize: 15,
    fontWeight: '800',
    lineHeight: 22,
  },
  posterFooterSub: {
    marginTop: 6,
    color: '#9A3412',
    fontSize: 12,
    lineHeight: 18,
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
  shareHint: {
    marginTop: -4,
    fontSize: 12,
    lineHeight: 18,
    textAlign: 'center',
  },
});

export default AchievementPosterScreen;
