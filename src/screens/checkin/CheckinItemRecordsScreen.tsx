import Ionicons from '@expo/vector-icons/Ionicons';
import { useFocusEffect, useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React from 'react';
import { Alert, Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAppTheme } from '../../hooks/useAppTheme';
import { RootStackParamList } from '../../navigation/RootNavigator';
import { rankService } from '../../services/rankService';
import { useAppStore } from '../../store/appStore';
import { UserCheckin } from '../../types/rank';

type ScreenRouteProp = RouteProp<RootStackParamList, 'CheckinItemRecords'>;
type ScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'CheckinItemRecords'>;

const formatTime = (value?: string) => value || '未填写时间';

const getAttachmentSummary = (entry: UserCheckin) => {
  const attachments = entry.content?.attachments || [];
  if (!attachments.length) {
    return '无附件';
  }

  const imageCount = attachments.filter((attachment) => attachment.media_type === 'image').length;
  const videoCount = attachments.filter((attachment) => attachment.media_type === 'video').length;
  const parts = [];

  if (imageCount) {
    parts.push(`${imageCount} 张图片`);
  }

  if (videoCount) {
    parts.push(`${videoCount} 个视频`);
  }

  return parts.join(' · ');
};

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

const CheckinItemRecordsScreen: React.FC = () => {
  const route = useRoute<ScreenRouteProp>();
  const navigation = useNavigation<ScreenNavigationProp>();
  const { colors, isDark } = useAppTheme();
  const currentUser = useAppStore((state) => state.currentUser);
  const { code, item, viewedUserId, viewedUserName, readOnly } = route.params;
  const userId = currentUser?._id;
  const targetUserId = viewedUserId || userId;
  const isViewerMode = Boolean(readOnly && targetUserId);
  const ownerLabel = viewedUserName || (isViewerMode ? '该用户' : '我');

  const [entries, setEntries] = React.useState<UserCheckin[]>([]);

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
              这里展示 {ownerLabel} 在这个条目下的所有日记记录。
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
          entries.map((entry, index) => {
            const coverUri = getEntryCoverUri(entry);

            return (
              <Pressable
                key={entry._id || `${item._id}-${index}`}
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
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                  },
                ]}
              >
                <View style={styles.entryCardBody}>
                  <View style={styles.entryMain}>
                    <View style={styles.entryCardHeader}>
                      <View style={styles.entryTitleWrap}>
                        <Text style={[styles.entryTitle, { color: colors.text }]}>
                          {entry.content?.title || `${item.name_zh} 游玩记录`}
                        </Text>
                        <Text style={[styles.entryMeta, { color: colors.textSecondary }]}>
                          {formatTime(entry.content?.visit_time)} ·{' '}
                          {entry.content?.location_name || entry.content?.city_name || item.name_zh}
                        </Text>
                      </View>
                    </View>

                    {!!entry.content?.description && (
                      <Text numberOfLines={3} style={[styles.entryDescription, { color: colors.textSecondary }]}>
                        {entry.content.description}
                      </Text>
                    )}

                    <View style={styles.entryFooter}>
                      <View
                        style={[
                          styles.entryTag,
                          {
                            backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : '#F7FAFC',
                            borderColor: colors.border,
                          },
                        ]}
                      >
                        <Text style={[styles.entryTagText, { color: colors.textSecondary }]}>
                          {getAttachmentSummary(entry)}
                        </Text>
                      </View>
                      {entry.content?.weather ? (
                        <View
                          style={[
                            styles.entryTag,
                            {
                              backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : '#F7FAFC',
                              borderColor: colors.border,
                            },
                          ]}
                        >
                          <Text style={[styles.entryTagText, { color: colors.textSecondary }]}>
                            {entry.content.weather}
                          </Text>
                        </View>
                      ) : null}
                      {entry.content?.mood ? (
                        <View
                          style={[
                            styles.entryTag,
                            {
                              backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : '#F7FAFC',
                              borderColor: colors.border,
                            },
                          ]}
                        >
                          <Text style={[styles.entryTagText, { color: colors.textSecondary }]}>
                            {entry.content.mood}
                          </Text>
                        </View>
                      ) : null}
                    </View>
                  </View>

                  <View
                    style={[
                      styles.entryCoverWrap,
                      {
                        backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : '#F7FAFC',
                        borderColor: colors.border,
                      },
                    ]}
                  >
                    {coverUri ? <Image source={{ uri: coverUri }} style={styles.entryCover} /> : null}
                  </View>
                </View>
              </Pressable>
            );
          })
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
  entryCard: {
    borderWidth: 1,
    borderRadius: 20,
    padding: 16,
  },
  entryCardBody: {
    flexDirection: 'row',
    gap: 12,
  },
  entryMain: {
    flex: 1,
  },
  entryCardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  entryTitleWrap: {
    flex: 1,
  },
  entryTitle: {
    fontSize: 16,
    fontWeight: '800',
  },
  entryMeta: {
    marginTop: 6,
    fontSize: 13,
    lineHeight: 19,
  },
  entryDescription: {
    marginTop: 12,
    fontSize: 14,
    lineHeight: 21,
  },
  entryFooter: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 14,
  },
  entryTag: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  entryTagText: {
    fontSize: 12,
    fontWeight: '600',
  },
  entryCoverWrap: {
    width: 84,
    height: 84,
    borderWidth: 1,
    borderRadius: 14,
    overflow: 'hidden',
    flexShrink: 0,
  },
  entryCover: {
    width: '100%',
    height: '100%',
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
