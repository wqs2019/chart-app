import Ionicons from '@expo/vector-icons/Ionicons';
import { useFocusEffect, useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import DiaryMasonryCard from '../../components/common/DiaryMasonryCard';
import { useAppTheme } from '../../hooks/useAppTheme';
import { RootStackParamList } from '../../navigation/RootNavigator';
import { rankService } from '../../services/rankService';
import { useAppStore } from '../../store/appStore';
import {
  CONTENT_LEADERBOARD_CODES,
  LEADERBOARD_CONFIGS,
  LeaderboardCode,
  StandardItem,
  UserCheckin,
} from '../../types/rank';

type ScreenRouteProp = RouteProp<RootStackParamList, 'OverallDiaryFeed'>;
type ScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'OverallDiaryFeed'>;

type OverallDiaryEntry = UserCheckin & {
  item: StandardItem;
};

const getDisplayName = (fallbackName?: string, currentUserName?: string | null) =>
  fallbackName || currentUserName || '旅行玩家';

const getAvatarFallback = (name: string) => name.trim().charAt(0).toUpperCase() || '旅';

const getEntryCoverUri = (entry: UserCheckin) => {
  const firstAttachment = entry.content?.attachments?.[0];
  if (!firstAttachment) {
    return '';
  }

  if (firstAttachment.media_type === 'video') {
    return firstAttachment.thumbnail_temp_url || firstAttachment.temp_url || '';
  }

  return firstAttachment.temp_url || firstAttachment.thumbnail_temp_url || '';
};

const isVideoEntryCover = (entry: UserCheckin) => entry.content?.attachments?.[0]?.media_type === 'video';

const getCardVisualHeight = (entry: UserCheckin, cardWidth: number) => {
  const hasCover = Boolean(getEntryCoverUri(entry));
  const titleLength = (entry.content?.title || '').length;
  const coverHeight = hasCover ? Math.round((cardWidth * 4) / 3) : Math.round(cardWidth * 0.78);
  const infoHeight = titleLength > 20 ? 112 : 98;

  return {
    coverHeight,
    totalHeight: coverHeight + infoHeight,
  };
};

const getSummaryLabel = (code: LeaderboardCode) => {
  if (code === 'world_travel') {
    return '世界旅游榜';
  }

  if (code === 'china_travel') {
    return '中国旅游榜';
  }

  if (code === 'activity') {
    return '玩乐项目榜';
  }

  return '综合';
};

const getEntryInteraction = (entry: UserCheckin) => ({
  likes: entry.interaction?.likes_count || 0,
  comments: entry.interaction?.comments_count || 0,
  favorites: entry.interaction?.favorites_count || 0,
});

const getCheckinEntries = (checkin: UserCheckin) => {
  if (Array.isArray(checkin.contents) && checkin.contents.length) {
    return checkin.contents;
  }

  if (
    checkin.content &&
    (checkin.content.title ||
      checkin.content.description ||
      checkin.content.attachments?.length ||
      checkin.content.visit_time)
  ) {
    return [checkin.content];
  }

  return [];
};

const buildEntryView = (checkin: UserCheckin, item: StandardItem, entry: NonNullable<UserCheckin['content']>): OverallDiaryEntry => ({
  ...checkin,
  _id: entry.entry_id || checkin._id,
  parent_checkin_id: checkin._id,
  checked_in_at: entry.created_at || checkin.checked_in_at,
  created_at: entry.created_at || checkin.created_at,
  updated_at: entry.updated_at || checkin.updated_at,
  content: {
    title: entry.title || '',
    description: entry.description || '',
    attachments: Array.isArray(entry.attachments) ? entry.attachments : [],
    visit_time: entry.visit_time || '',
    city_name: entry.city_name || '',
    location_name: entry.location_name || '',
    weather: entry.weather || '',
    mood: entry.mood || '',
    is_complete: Boolean(entry.is_complete),
  },
  item,
});

const OverallDiaryFeedScreen: React.FC = () => {
  const route = useRoute<ScreenRouteProp>();
  const navigation = useNavigation<ScreenNavigationProp>();
  const { colors, isDark } = useAppTheme();
  const { width } = useWindowDimensions();
  const currentUser = useAppStore((state) => state.currentUser);
  const { viewedUserId, viewedUserName, viewedAvatarUrl } = route.params;
  const currentUserId = currentUser?._id;
  const isSelf = viewedUserId === currentUserId;
  const displayName = getDisplayName(
    viewedUserName,
    currentUser?.fullName || currentUser?.profile?.nickname || currentUser?.username
  );
  const avatarUri = isSelf ? currentUser?.profile?.avatar_url || viewedAvatarUrl || '' : viewedAvatarUrl || '';
  const avatarFallback = getAvatarFallback(displayName);

  const [entries, setEntries] = React.useState<OverallDiaryEntry[]>([]);
  const [loading, setLoading] = React.useState(true);

  const horizontalPadding = 32;
  const columnGap = 12;
  const cardWidth = Math.max((width - horizontalPadding - columnGap) / 2, 140);

  React.useEffect(() => {
    navigation.setOptions({
      title: '综合日记',
    });
  }, [navigation]);

  const fetchEntries = React.useCallback(async () => {
    if (!viewedUserId) {
      setEntries([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const results = await Promise.all(
        CONTENT_LEADERBOARD_CODES.map(async (code) => {
          const [items, checkins] = await Promise.all([
            rankService.getStandardItems(code),
            rankService.getUserCheckins(viewedUserId, code),
          ]);

          const itemMap = new Map(items.map((item) => [item._id, item]));
          return checkins.flatMap((checkin) => {
            const item = itemMap.get(checkin.item_id);
            if (!item) {
              return [];
            }

            return getCheckinEntries(checkin).map((entry) => buildEntryView(checkin, item, entry));
          });
        })
      );

      const mergedEntries = results
        .flat()
        .sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());

      setEntries(mergedEntries);
    } catch (error) {
      Alert.alert('加载失败', '综合成就榜的日记数据暂时无法获取，请稍后重试。');
      setEntries([]);
    } finally {
      setLoading(false);
    }
  }, [viewedUserId]);

  useFocusEffect(
    React.useCallback(() => {
      void fetchEntries();
    }, [fetchEntries])
  );

  const columns = React.useMemo(() => {
    const left: Array<{ entry: OverallDiaryEntry; coverUri: string; coverHeight: number; key: string }> = [];
    const right: Array<{ entry: OverallDiaryEntry; coverUri: string; coverHeight: number; key: string }> = [];
    let leftHeight = 0;
    let rightHeight = 0;

    entries.forEach((entry, index) => {
      const key = entry._id || `${entry.item._id}-${index}`;
      const coverUri = getEntryCoverUri(entry);
      const { coverHeight, totalHeight } = getCardVisualHeight(entry, cardWidth);
      const nextItem = { entry, coverUri, coverHeight, key };

      if (leftHeight <= rightHeight) {
        left.push(nextItem);
        leftHeight += totalHeight;
      } else {
        right.push(nextItem);
        rightHeight += totalHeight;
      }
    });

    return [left, right];
  }, [cardWidth, entries]);

  const summaryCounts = React.useMemo(
    () =>
      CONTENT_LEADERBOARD_CODES.map((code) => ({
        code,
        count: entries.filter((entry) => entry.leaderboard_code === code).length,
      })),
    [entries]
  );

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={[styles.heroCard, { backgroundColor: colors.surface }]}>
          <View style={styles.heroTopRow}>
            <View style={styles.authorRow}>
              {avatarUri ? (
                <Image source={{ uri: avatarUri }} style={styles.avatar} />
              ) : (
                <View
                  style={[
                    styles.avatarFallbackWrap,
                    {
                      backgroundColor: isDark ? 'rgba(255,155,122,0.16)' : 'rgba(255,122,89,0.08)',
                    },
                  ]}
                >
                  <Text style={[styles.avatarFallbackText, { color: colors.primary }]}>{avatarFallback}</Text>
                </View>
              )}

              <View style={styles.authorTextWrap}>
                <Text style={[styles.eyebrow, { color: colors.textSecondary }]}>ALL DIARIES</Text>
                <Text style={[styles.title, { color: colors.text }]}>{displayName} 的全部日记</Text>
                <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                  综合展示世界旅游、中国旅游和玩乐项目的全部记录，不再区分榜单。
                </Text>
              </View>
            </View>

            <View style={[styles.totalBadge, { backgroundColor: isDark ? 'rgba(255,155,122,0.14)' : '#FFF1E8' }]}>
              <Text style={[styles.totalBadgeLabel, { color: colors.primary }]}>共 {entries.length} 篇</Text>
            </View>
          </View>

          <View style={styles.summaryRow}>
            {summaryCounts.map(({ code, count }) => (
              <View
                key={code}
                style={[
                  styles.summaryChip,
                  { backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : '#F8FBFF' },
                ]}
              >
                <Ionicons name={getLeaderboardIcon(code)} size={14} color={colors.primary} />
                <Text numberOfLines={1} style={[styles.summaryChipText, { color: colors.textSecondary }]}>
                  {getSummaryLabel(code)} {count}
                </Text>
              </View>
            ))}
          </View>
        </View>

        {loading ? (
          <View style={[styles.loadingCard, { backgroundColor: colors.surface }]}>
            <ActivityIndicator size="small" color={colors.primary} />
            <Text style={[styles.loadingText, { color: colors.textSecondary }]}>正在汇总全部日记...</Text>
          </View>
        ) : entries.length ? (
          <View style={styles.masonryRow}>
            {columns.map((column, columnIndex) => (
              <View
                key={`column-${columnIndex}`}
                style={[styles.masonryColumn, columnIndex === 1 ? styles.masonryColumnRight : null]}
              >
                {column.map(({ entry, coverUri, coverHeight, key }) => {
                  const interaction = getEntryInteraction(entry);

                  return (
                    <DiaryMasonryCard
                      key={key}
                      width={cardWidth}
                      coverHeight={coverHeight}
                      coverUri={coverUri}
                      showVideoBadge={isVideoEntryCover(entry)}
                      placeholderText={entry.item.name_zh}
                      placeholderIconName={getLeaderboardIcon(entry.leaderboard_code)}
                      placeholderIconColor={colors.primary}
                      onPress={() =>
                        navigation.navigate('CheckinEntryDetail', {
                          code: entry.leaderboard_code,
                          item: entry.item,
                          entry,
                          viewedUserId: isSelf ? undefined : viewedUserId,
                          viewedUserName: isSelf ? undefined : viewedUserName,
                          readOnly: !isSelf,
                        })
                      }
                    >
                      <View style={styles.entryTagRow}>
                        <View
                          style={[
                            styles.entryTag,
                            { backgroundColor: isDark ? 'rgba(255,155,122,0.14)' : '#FFF1E8' },
                          ]}
                        >
                          <Text style={[styles.entryTagText, { color: colors.primary }]}>
                            {LEADERBOARD_CONFIGS[entry.leaderboard_code].title}
                          </Text>
                        </View>
                      </View>

                      <Text numberOfLines={2} style={[styles.entryTitle, { color: colors.text }]}>
                        {entry.content?.title || entry.item.name_zh}
                      </Text>
                      <View style={styles.entryInfoRow}>
                        <Text numberOfLines={1} style={[styles.entrySubtitle, { color: colors.textSecondary }]}>
                          {entry.content?.location_name || entry.item.name_zh}
                        </Text>

                        <Text numberOfLines={1} style={[styles.entryMetaText, { color: colors.textSecondary }]}>
                          {entry.content?.visit_time || '未填写时间'}
                        </Text>
                      </View>

                      <View style={styles.entryStatsRow}>
                        <View style={styles.entryStatItem}>
                          <Ionicons name="heart-outline" size={14} color={colors.textSecondary} />
                          <Text style={[styles.entryStatText, { color: colors.textSecondary }]}>{interaction.likes}</Text>
                        </View>
                        <View style={styles.entryStatItem}>
                          <Ionicons name="chatbubble-ellipses-outline" size={14} color={colors.textSecondary} />
                          <Text style={[styles.entryStatText, { color: colors.textSecondary }]}>
                            {interaction.comments}
                          </Text>
                        </View>
                        <View style={styles.entryStatItem}>
                          <Ionicons name="bookmark-outline" size={14} color={colors.textSecondary} />
                          <Text style={[styles.entryStatText, { color: colors.textSecondary }]}>
                            {interaction.favorites}
                          </Text>
                        </View>
                      </View>
                    </DiaryMasonryCard>
                  );
                })}
              </View>
            ))}
          </View>
        ) : (
          <View style={[styles.emptyCard, { backgroundColor: colors.surface }]}>
            <Ionicons name="document-text-outline" size={28} color={colors.textSecondary} />
            <Text style={[styles.emptyTitle, { color: colors.text }]}>还没有综合日记</Text>
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              {displayName} 还没有可展示的日记记录。
            </Text>
          </View>
        )}
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
    padding: 16,
  },
  heroTopRow: {
    gap: 12,
  },
  authorRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  avatarFallbackWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarFallbackText: {
    fontSize: 20,
    fontWeight: '800',
  },
  authorTextWrap: {
    flex: 1,
  },
  eyebrow: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1,
  },
  title: {
    marginTop: 6,
    fontSize: 24,
    fontWeight: '800',
  },
  subtitle: {
    marginTop: 8,
    fontSize: 13,
    lineHeight: 19,
  },
  totalBadge: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  totalBadgeLabel: {
    fontSize: 12,
    fontWeight: '800',
  },
  summaryRow: {
    flexDirection: 'row',
    flexWrap: 'nowrap',
    gap: 6,
    marginTop: 14,
  },
  summaryChip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  summaryChipText: {
    fontSize: 11,
    fontWeight: '700',
    flexShrink: 1,
  },
  loadingCard: {
    borderRadius: 20,
    paddingVertical: 24,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  loadingText: {
    fontSize: 13,
  },
  masonryRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  masonryColumn: {
    flex: 1,
    gap: 12,
  },
  masonryColumnRight: {
    marginLeft: 12,
  },
  entryTagRow: {
    flexDirection: 'row',
  },
  entryTag: {
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  entryTagText: {
    fontSize: 10,
    fontWeight: '800',
  },
  entryTitle: {
    marginTop: 8,
    fontSize: 14,
    fontWeight: '800',
    lineHeight: 20,
  },
  entrySubtitle: {
    marginTop: 4,
    fontSize: 12,
    flex: 1,
  },
  entryInfoRow: {
    marginTop: 4,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  entryMetaText: {
    fontSize: 11,
    flexShrink: 0,
  },
  entryStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 10,
  },
  entryStatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  entryStatText: {
    fontSize: 12,
    fontWeight: '600',
  },
  emptyCard: {
    borderRadius: 22,
    padding: 24,
    alignItems: 'center',
  },
  emptyTitle: {
    marginTop: 12,
    fontSize: 17,
    fontWeight: '800',
  },
  emptyText: {
    marginTop: 8,
    fontSize: 14,
    lineHeight: 21,
    textAlign: 'center',
  },
});

function getLeaderboardIcon(code: LeaderboardCode): keyof typeof Ionicons.glyphMap {
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
}

export default OverallDiaryFeedScreen;
