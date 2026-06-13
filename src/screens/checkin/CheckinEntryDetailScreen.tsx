import Ionicons from '@expo/vector-icons/Ionicons';
import { useFocusEffect, useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React from 'react';
import {
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import Loading from '../../components/common/Loading';
import { NineGridMedia } from '../../components/common/NineGridMedia';
import { useAppTheme } from '../../hooks/useAppTheme';
import authService from '../../services/authService';
import { RootStackParamList } from '../../navigation/RootNavigator';
import { rankService } from '../../services/rankService';
import { useAppStore } from '../../store/appStore';
import { MediaResource } from '../../types/media';
import { CheckinAttachment, UserCheckin } from '../../types/rank';
import { User } from '../../types/user';

type ScreenRouteProp = RouteProp<RootStackParamList, 'CheckinEntryDetail'>;
type ScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'CheckinEntryDetail'>;

const formatTime = (value?: string) => value || '未填写时间';

const formatAttachmentSummary = (attachments: CheckinAttachment[]) => {
  if (!attachments.length) {
    return '无附件';
  }

  const imageCount = attachments.filter((attachment) => attachment.media_type === 'image').length;
  const videoCount = attachments.filter((attachment) => attachment.media_type === 'video').length;
  const parts: string[] = [];

  if (imageCount) {
    parts.push(`${imageCount} 张图片`);
  }

  if (videoCount) {
    parts.push(`${videoCount} 个视频`);
  }

  return parts.join(' · ');
};

const mapAttachmentsToMedia = (attachments: CheckinAttachment[]): MediaResource[] =>
  attachments
    .filter((attachment) => Boolean(attachment.temp_url || attachment.thumbnail_temp_url))
    .map((attachment, index) => ({
      id: attachment.file_id || `attachment-${index}`,
      uri: attachment.temp_url || attachment.thumbnail_temp_url || '',
      thumbnail:
        attachment.media_type === 'video'
          ? attachment.thumbnail_temp_url || attachment.temp_url
          : attachment.temp_url,
      type: attachment.media_type === 'video' ? 'video' : 'image',
      name: attachment.name,
      durationMs: attachment.duration_ms,
    }));

type DisplayUser = {
  fullName?: string | null;
  full_name?: string;
  username?: string;
  profile?: {
    nickname?: string;
    avatar_url?: string;
  };
} | null;

const getDisplayName = (user: DisplayUser) =>
  user?.fullName || user?.full_name || user?.profile?.nickname || user?.username || '旅行用户';

const getAvatarUri = (user: DisplayUser) => user?.profile?.avatar_url || null;

const getAvatarFallback = (name: string) => name.trim().charAt(0).toUpperCase() || '游';

const CheckinEntryDetailScreen: React.FC = () => {
  const route = useRoute<ScreenRouteProp>();
  const navigation = useNavigation<ScreenNavigationProp>();
  const { colors, isDark } = useAppTheme();
  const currentUser = useAppStore((state) => state.currentUser);
  const { code, item, entry, viewedUserId, viewedUserName, readOnly } = route.params;
  const userId = currentUser?._id;
  const targetUserId = viewedUserId || userId;
  const isViewerMode = Boolean(readOnly && targetUserId);

  const [loading, setLoading] = React.useState(true);
  const [currentEntry, setCurrentEntry] = React.useState<UserCheckin>(entry);
  const [authorProfile, setAuthorProfile] = React.useState<User | null>(null);

  const attachments = currentEntry.content?.attachments || [];
  const noteMedia = React.useMemo(() => mapAttachmentsToMedia(attachments), [attachments]);
  const interaction = currentEntry.interaction || {
    likes_count: 0,
    comments_count: 0,
    favorites_count: 0,
  };
  const authorUser: DisplayUser = isViewerMode ? authorProfile : currentUser;
  const displayName = isViewerMode && viewedUserName ? viewedUserName : getDisplayName(authorUser);
  const avatarUri = getAvatarUri(authorUser);
  const locationText = currentEntry.content?.location_name || currentEntry.content?.city_name || item.name_zh;

  const fetchEntryDetail = React.useCallback(async () => {
    if (!targetUserId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const [rows, profile] = await Promise.all([
        rankService.getItemCheckinEntries(targetUserId, code, item._id),
        isViewerMode ? authService.getUser(targetUserId).catch(() => null) : Promise.resolve(null),
      ]);
      const nextEntry = rows.find((row) => row._id === entry._id) || entry;
      setCurrentEntry(nextEntry);
      setAuthorProfile(profile);
    } catch (error) {
      Alert.alert('加载失败', '这篇记录详情暂时无法获取，请稍后重试。');
      setCurrentEntry(entry);
      setAuthorProfile(null);
    } finally {
      setLoading(false);
    }
  }, [code, entry, isViewerMode, item._id, targetUserId]);

  React.useEffect(() => {
    navigation.setOptions({ title: currentEntry.content?.title || item.name_zh });
  }, [currentEntry.content?.title, item.name_zh, navigation]);

  useFocusEffect(
    React.useCallback(() => {
      fetchEntryDetail();
    }, [fetchEntryDetail])
  );

  if (loading) {
    return <Loading message="正在加载记录详情..." />;
  }

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.noteContent}>
          <View style={styles.authorRow}>
            <View style={styles.authorLeft}>
              {avatarUri ? (
                <Image source={{ uri: avatarUri }} style={styles.avatar} />
              ) : (
                <View
                  style={[
                    styles.avatarFallback,
                    {
                      backgroundColor: isDark ? 'rgba(255,155,122,0.18)' : 'rgba(255,122,89,0.10)',
                    },
                  ]}
                >
                  <Text style={[styles.avatarFallbackText, { color: colors.primary }]}>
                    {getAvatarFallback(displayName)}
                  </Text>
                </View>
              )}

              <View style={styles.authorTextWrap}>
                <Text style={[styles.authorName, { color: colors.text }]}>{displayName}</Text>
                <Text style={[styles.authorMeta, { color: colors.textSecondary }]}>
                  {formatTime(currentEntry.content?.visit_time)} · {locationText}
                </Text>
              </View>
            </View>

            {!isViewerMode ? (
              <Pressable
                onPress={() => navigation.navigate('CheckinEntryEditor', { code, item, entry: currentEntry })}
                style={[
                  styles.editPill,
                  {
                    backgroundColor: isDark ? 'rgba(255,155,122,0.16)' : 'rgba(255,122,89,0.08)',
                  },
                ]}
              >
                <Ionicons name="create-outline" size={15} color={colors.primary} />
                <Text style={[styles.editPillText, { color: colors.primary }]}>编辑</Text>
              </Pressable>
            ) : (
              <View style={styles.editPillPlaceholder} />
            )}
          </View>

          <Text style={[styles.noteTitle, { color: colors.text }]}>
            {currentEntry.content?.title || `${item.name_zh} 游玩记录`}
          </Text>

          <Text style={[styles.noteBody, { color: colors.textSecondary }]}>
            {currentEntry.content?.description || '这篇记录还没有填写正文内容。'}
          </Text>

          {currentEntry.content?.weather || currentEntry.content?.mood || attachments.length ? (
            <View style={styles.noteTagRow}>
              <View
                style={[
                  styles.noteTag,
                  {
                    backgroundColor: isDark ? 'rgba(255,155,122,0.14)' : 'rgba(255,122,89,0.08)',
                  },
                ]}
              >
                <Text style={[styles.noteTagText, { color: colors.primary }]}>{formatAttachmentSummary(attachments)}</Text>
              </View>
              {currentEntry.content?.weather ? (
                <View
                  style={[
                    styles.noteTag,
                    {
                      backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#F5F7FB',
                    },
                  ]}
                >
                  <Text style={[styles.noteTagText, { color: colors.textSecondary }]}>
                    {currentEntry.content.weather}
                  </Text>
                </View>
              ) : null}
              {currentEntry.content?.mood ? (
                <View
                  style={[
                    styles.noteTag,
                    {
                      backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#F5F7FB',
                    },
                  ]}
                >
                  <Text style={[styles.noteTagText, { color: colors.textSecondary }]}>
                    {currentEntry.content.mood}
                  </Text>
                </View>
              ) : null}
            </View>
          ) : null}

          {attachments.length ? (
            <View style={styles.mediaGridWrap}>
              <NineGridMedia media={noteMedia} />
            </View>
          ) : null}

          <View
            style={[
              styles.interactionBar,
              {
                borderTopColor: isDark ? 'rgba(255,255,255,0.08)' : '#E5E7EB',
              },
            ]}
          >
            <View style={styles.interactionItem}>
              <Ionicons name="heart-outline" size={18} color={colors.textSecondary} />
              <Text style={[styles.interactionValue, { color: colors.text }]}>{interaction.likes_count || 0}</Text>
              <Text style={[styles.interactionLabel, { color: colors.textSecondary }]}>点赞</Text>
            </View>
            <View style={styles.interactionItem}>
              <Ionicons name="chatbubble-ellipses-outline" size={18} color={colors.textSecondary} />
              <Text style={[styles.interactionValue, { color: colors.text }]}>{interaction.comments_count || 0}</Text>
              <Text style={[styles.interactionLabel, { color: colors.textSecondary }]}>评论</Text>
            </View>
            <View style={styles.interactionItem}>
              <Ionicons name="star-outline" size={18} color={colors.textSecondary} />
              <Text style={[styles.interactionValue, { color: colors.text }]}>{interaction.favorites_count || 0}</Text>
              <Text style={[styles.interactionLabel, { color: colors.textSecondary }]}>收藏</Text>
            </View>
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
  },
  noteContent: {
    paddingTop: 6,
  },
  authorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  authorLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  avatarFallback: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarFallbackText: {
    fontSize: 18,
    fontWeight: '800',
  },
  authorTextWrap: {
    flex: 1,
  },
  authorName: {
    fontSize: 15,
    fontWeight: '800',
  },
  authorMeta: {
    marginTop: 4,
    fontSize: 12,
    lineHeight: 17,
  },
  editPill: {
    height: 34,
    borderRadius: 999,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  editPillText: {
    fontSize: 13,
    fontWeight: '700',
  },
  editPillPlaceholder: {
    width: 56,
    height: 34,
  },
  noteTitle: {
    marginTop: 18,
    fontSize: 24,
    fontWeight: '800',
    lineHeight: 32,
  },
  noteBody: {
    marginTop: 12,
    fontSize: 14,
    lineHeight: 24,
  },
  noteTagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 14,
  },
  noteTag: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  noteTagText: {
    fontSize: 12,
    fontWeight: '700',
  },
  mediaGridWrap: {
    marginTop: 14,
  },
  interactionBar: {
    marginTop: 18,
    paddingTop: 14,
    borderTopWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  interactionItem: {
    flex: 1,
    alignItems: 'center',
  },
  interactionValue: {
    marginTop: 6,
    fontSize: 15,
    fontWeight: '800',
  },
  interactionLabel: {
    marginTop: 2,
    fontSize: 12,
  },
});

export default CheckinEntryDetailScreen;
