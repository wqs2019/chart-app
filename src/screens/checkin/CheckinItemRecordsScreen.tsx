import Ionicons from '@expo/vector-icons/Ionicons';
import { useFocusEffect, useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React from 'react';
import { Alert, Image, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAppTheme } from '../../hooks/useAppTheme';
import { RootStackParamList } from '../../navigation/RootNavigator';
import { rankService } from '../../services/rankService';
import { useAppStore } from '../../store/appStore';
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

  const horizontalPadding = 32;
  const columnGap = 12;
  const cardWidth = Math.max((width - horizontalPadding - columnGap) / 2, 140);

  const fetchEntries = React.useCallback(async () => {
    if (!targetUserId) {
      return;
    }

    try {
      const rows = await rankService.getItemCheckinEntries(targetUserId, code, item._id);
      setEntries(rows);
    } catch (error) {
      Alert.alert('加载失败', '该条目的录入记录暂时无法获取，请稍后重试。');
      setEntries([]);
    }
  }, [code, item._id, targetUserId]);

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

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={[styles.heroCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.eyebrow, { color: colors.textSecondary }]}>ITEM DIARIES</Text>
          <Text style={[styles.title, { color: colors.text }]}>{item.name_zh}</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            {item.name_en || '暂无英文名'} · {item.category_label_zh || item.category}
          </Text>
          <View style={styles.heroMetaRow}>
            <View style={[styles.heroMetaChip, { backgroundColor: isDark ? 'rgba(124,140,255,0.14)' : 'rgba(79,70,229,0.08)' }]}>
              <Text style={[styles.heroMetaText, { color: colors.primary }]}>{entries.length} 篇记录</Text>
            </View>
            <View style={[styles.heroMetaChip, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#EEF3F9' }]}>
              <Text style={[styles.heroMetaText, { color: colors.textSecondary }]}>{ownerLabel}</Text>
            </View>
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
                    <Pressable
                      key={key}
                      onPress={() =>
                        navigation.navigate('CheckinEntryDetail', {
                          code,
                          item,
                          entry,
                          viewedUserId,
                          viewedUserName,
                          readOnly,
                        })
                      }
                      style={[
                        styles.entryCard,
                        {
                          width: cardWidth,
                          backgroundColor: colors.surface,
                          borderColor: colors.border,
                        },
                      ]}
                    >
                      <View
                        style={[
                          styles.entryCoverWrap,
                          {
                            height: coverHeight,
                            backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : '#F7FAFC',
                          },
                        ]}
                      >
                        {coverUri ? (
                          <>
                            <Image source={{ uri: coverUri }} style={styles.entryCover} resizeMode="cover" />
                            {isVideoCover ? (
                              <View style={styles.videoBadge}>
                                <Ionicons name="play" size={12} color="#FFFFFF" />
                              </View>
                            ) : null}
                          </>
                        ) : (
                          <View style={styles.entryCoverPlaceholder}>
                            <Ionicons name="image-outline" size={24} color={colors.textSecondary} />
                            <Text style={[styles.entryCoverPlaceholderText, { color: colors.textSecondary }]}>
                              暂无封面
                            </Text>
                          </View>
                        )}
                      </View>

                      <View style={styles.entryInfo}>
                        <Text numberOfLines={2} style={[styles.entryTitle, { color: colors.text }]}>
                          {entry.content?.title || `${item.name_zh} 游玩记录 ${index + 1}`}
                        </Text>

                        <View style={styles.entryStatsRow}>
                          <View style={styles.entryStatItem}>
                            <Ionicons name="heart-outline" size={14} color={colors.textSecondary} />
                            <Text style={[styles.entryStatText, { color: colors.textSecondary }]}>
                              {interaction.likes}
                            </Text>
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
                      </View>
                    </Pressable>
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
    borderWidth: 1,
    borderRadius: 24,
    padding: 18,
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
  entryCard: {
    borderWidth: 1,
    borderRadius: 18,
    overflow: 'hidden',
  },
  entryTitle: {
    fontSize: 14,
    fontWeight: '800',
  },
  entryCoverWrap: {
    overflow: 'hidden',
  },
  entryCoverPlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  entryCoverPlaceholderText: {
    fontSize: 12,
    fontWeight: '600',
  },
  entryCover: {
    width: '100%',
    height: '100%',
  },
  videoBadge: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(15,23,42,0.7)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  entryInfo: {
    paddingHorizontal: 12,
    paddingVertical: 12,
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
    borderWidth: 1,
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
