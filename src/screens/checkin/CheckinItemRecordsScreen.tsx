import Ionicons from '@expo/vector-icons/Ionicons';
import { useFocusEffect, useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React from 'react';
import { Alert, Image, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import DiaryMasonryCard from '../../components/common/DiaryMasonryCard';
import { MediaPreviewer } from '../../components/common/MediaPreviewer';
import { useAppTheme } from '../../hooks/useAppTheme';
import { RootStackParamList } from '../../navigation/RootNavigator';
import { checkinService } from '../../services/checkinService';
import { useAppStore } from '../../store/appStore';
import { MediaResource } from '../../types/media';
import { UserCheckin } from '../../types/rank';

type ScreenRouteProp = RouteProp<RootStackParamList, 'CheckinItemRecords'>;
type ScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'CheckinItemRecords'>;

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

const getEntryInteraction = (entry: UserCheckin) => ({
  likes: entry.interaction?.likes_count || 0,
  comments: entry.interaction?.comments_count || 0,
  favorites: entry.interaction?.favorites_count || 0,
});

const isEntryModerated = (status?: string) => status === 'violating' || status === 'reviewing';

const getCardVisualHeight = (entry: UserCheckin, cardWidth: number) => {
  const titleLength = (entry.content?.title || '').length;
  const coverHeight = Math.round((cardWidth * 4) / 3);
  const infoHeight = titleLength > 22 ? 96 : 82;

  return {
    coverHeight,
    totalHeight: coverHeight + infoHeight,
  };
};

const CheckinItemRecordsScreen: React.FC = () => {
  const route = useRoute<ScreenRouteProp>();
  const navigation = useNavigation<ScreenNavigationProp>();
  const { colors, isDark } = useAppTheme();
  const { width } = useWindowDimensions();
  const currentUser = useAppStore((state) => state.currentUser);
  const { code, item, viewedUserId, viewedUserName, readOnly } = route.params;
  const userId = currentUser?._id;
  const targetUserId = viewedUserId || userId;
  const isViewerMode = Boolean(readOnly && targetUserId);
  const ownerLabel = viewedUserName || (isViewerMode ? '该用户' : '我');

  const [entries, setEntries] = React.useState<UserCheckin[]>([]);
  const [heroPreviewVisible, setHeroPreviewVisible] = React.useState(false);

  const horizontalPadding = 32;
  const columnGap = 12;
  const cardWidth = Math.max((width - horizontalPadding - columnGap) / 2, 140);

  const fetchEntries = React.useCallback(async () => {
    if (!targetUserId) {
      return;
    }

    try {
      const rows = await checkinService.getItemCheckinEntries(targetUserId, code, item._id, userId || targetUserId);
      setEntries(rows);
    } catch (error) {
      Alert.alert('加载失败', '该条目的录入记录暂时无法获取，请稍后重试。');
      setEntries([]);
    }
  }, [code, item._id, targetUserId, userId]);

  React.useEffect(() => {
    navigation.setOptions({ title: item.name_zh });
  }, [item.name_zh, navigation]);

  useFocusEffect(
    React.useCallback(() => {
      fetchEntries();
    }, [fetchEntries])
  );

  const columns = React.useMemo(() => {
    const left: Array<{ entry: UserCheckin; index: number; key: string; coverUri: string; coverHeight: number }> = [];
    const right: Array<{ entry: UserCheckin; index: number; key: string; coverUri: string; coverHeight: number }> = [];
    let leftHeight = 0;
    let rightHeight = 0;

    entries.forEach((entry, index) => {
      const key = entry._id || `${item._id}-${index}`;
      const coverUri = getEntryCoverUri(entry);
      const { coverHeight, totalHeight } = getCardVisualHeight(entry, cardWidth);
      const nextItem = { entry, index, key, coverUri, coverHeight };

      if (leftHeight <= rightHeight) {
        left.push(nextItem);
        leftHeight += totalHeight;
      } else {
        right.push(nextItem);
        rightHeight += totalHeight;
      }
    });

    return [left, right];
  }, [cardWidth, entries, item._id]);

  const heroPreviewMedia = React.useMemo<MediaResource[]>(
    () =>
      item.icon_original
        ? [
            {
              id: item._id,
              uri: item.icon_original,
              thumbnail: item.icon || item.icon_original,
              type: 'image',
              name: item.name_zh,
            },
          ]
        : [],
    [item._id, item.icon, item.icon_original, item.name_zh]
  );

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={[styles.heroCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.heroCardRow}>
            <View style={styles.heroContent}>
              <Text style={[styles.eyebrow, { color: colors.textSecondary }]}>ITEM DIARIES</Text>
              <Text style={[styles.title, { color: colors.text }]}>{item.name_zh}</Text>
              <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                {item.name_en || '暂无英文名'} · {item.category_label_zh || item.category}
              </Text>
              <View style={styles.heroMetaRow}>
                <View style={[styles.heroMetaChip, { backgroundColor: isDark ? 'rgba(255,155,122,0.14)' : 'rgba(255,122,89,0.08)' }]}>
                  <Text style={[styles.heroMetaText, { color: colors.primary }]}>{entries.length} 篇记录</Text>
                </View>
                <View style={[styles.heroMetaChip, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#F8EDE4' }]}>
                  <Text style={[styles.heroMetaText, { color: colors.textSecondary }]}>{ownerLabel}</Text>
                </View>
              </View>
            </View>

            <Pressable
              disabled={!item.icon}
              onPress={() => setHeroPreviewVisible(true)}
              style={[
                styles.heroImageWrap,
                { backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : '#FFF6F0' },
              ]}
            >
              {item.icon ? (
                <>
                  <Image source={{ uri: item.icon }} style={styles.heroImage} resizeMode="cover" />
                  <View style={styles.heroImageHint}>
                    <Ionicons name="expand-outline" size={14} color="#FFFFFF" />
                  </View>
                </>
              ) : (
                <View style={styles.heroImagePlaceholder}>
                  <Ionicons name="image-outline" size={22} color={colors.textSecondary} />
                </View>
              )}
            </Pressable>
          </View>
        </View>

        <View style={styles.headerRow}>
          <View>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>日记列表</Text>
            <Text style={[styles.sectionHint, { color: colors.textSecondary }]}>
              展示 {ownerLabel} 在这个条目下的所有日记记录。
            </Text>
          </View>
          {!isViewerMode ? (
            <Pressable
              onPress={() => navigation.navigate('CheckinEntryEditor', { code, item })}
              style={[styles.addButton, { backgroundColor: colors.primary }]}
            >
              <Ionicons name="add" size={16} color="#FFFFFF" />
              <Text style={styles.addButtonText}>录入数据</Text>
            </Pressable>
          ) : (
            <View style={styles.addButtonPlaceholder} />
          )}
        </View>

        {entries.length ? (
          <View style={styles.masonryRow}>
            {columns.map((column, columnIndex) => (
              <View
                key={`column-${columnIndex}`}
                style={[styles.masonryColumn, columnIndex === 1 ? styles.masonryColumnRight : null]}
              >
                {column.map(({ entry, index, key, coverUri, coverHeight }) => {
                  const interaction = getEntryInteraction(entry);
                  const isVideoCover = isVideoEntryCover(entry);

                  return (
                    <DiaryMasonryCard
                      key={key}
                      width={cardWidth}
                      coverHeight={coverHeight}
                      coverUri={coverUri}
                      showVideoBadge={isVideoCover}
                      placeholderText="暂无封面"
                      onPress={() =>
                        navigation.navigate('CheckinEntryDetail', {
                          entryId: entry._id || '',
                        })
                      }
                    >
                      {isEntryModerated(entry.content?.moderation_status) ? (
                        <View style={styles.entryBadgeRow}>
                          <View
                            style={[
                              styles.entryBadge,
                              { backgroundColor: isDark ? 'rgba(239,68,68,0.16)' : 'rgba(239,68,68,0.10)' },
                            ]}
                          >
                            <Text style={[styles.entryBadgeText, { color: '#EF4444' }]}>笔记违规</Text>
                          </View>
                        </View>
                      ) : null}
                      <Text numberOfLines={2} style={[styles.entryTitle, { color: colors.text }]}>
                        {entry.content?.title || `${item.name_zh} 游玩记录 ${index + 1}`}
                      </Text>

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
          <View style={[styles.emptyCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Ionicons name="document-text-outline" size={28} color={colors.textSecondary} />
            <Text style={[styles.emptyTitle, { color: colors.text }]}>还没有日记记录</Text>
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              {ownerLabel} 还没有为 {item.name_zh} 写下日记。
            </Text>
            {!isViewerMode ? (
              <Pressable
                onPress={() => navigation.navigate('CheckinEntryEditor', { code, item })}
                style={[styles.emptyButton, { backgroundColor: colors.primary }]}
              >
                <Text style={styles.emptyButtonText}>录入数据</Text>
              </Pressable>
            ) : (
              <View style={styles.emptyButtonPlaceholder} />
            )}
          </View>
        )}

        <MediaPreviewer
          visible={heroPreviewVisible}
          media={heroPreviewMedia}
          initialIndex={0}
          onClose={() => setHeroPreviewVisible(false)}
        />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  content: {
    padding: 16,
    paddingBottom: 40,
    gap: 16,
  },
  heroCard: {
    borderWidth: 0,
    borderRadius: 24,
    padding: 18,
  },
  heroCardRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 16,
  },
  heroContent: {
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
    fontWeight: '800',
  },
  subtitle: {
    marginTop: 8,
    fontSize: 14,
    lineHeight: 21,
  },
  heroMetaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 14,
  },
  heroMetaChip: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  heroMetaText: {
    fontSize: 12,
    fontWeight: '700',
  },
  heroImageWrap: {
    width: 132,
    height: 88,
    borderRadius: 18,
    overflow: 'hidden',
    flexShrink: 0,
  },
  heroImage: {
    width: '100%',
    height: '100%',
  },
  heroImagePlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroImageHint: {
    position: 'absolute',
    right: 8,
    bottom: 8,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(15,23,42,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
  },
  sectionHint: {
    marginTop: 6,
    fontSize: 13,
    lineHeight: 19,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  addButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  addButtonPlaceholder: {
    width: 84,
    height: 40,
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
  entryBadgeRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  entryBadge: {
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  entryBadgeText: {
    fontSize: 10,
    fontWeight: '800',
  },
  entryTitle: {
    fontSize: 14,
    fontWeight: '800',
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
    borderWidth: 0,
    borderRadius: 22,
    padding: 22,
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
  emptyButton: {
    marginTop: 16,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  emptyButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  emptyButtonPlaceholder: {
    marginTop: 16,
    height: 44,
  },
});

export default CheckinItemRecordsScreen;
