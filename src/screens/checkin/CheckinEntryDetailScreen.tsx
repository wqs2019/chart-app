import Ionicons from '@expo/vector-icons/Ionicons';
import { useFocusEffect, useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React from 'react';
import {
  Alert,
  Image,
  Keyboard,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import Loading from '../../components/common/Loading';
import { NineGridMedia } from '../../components/common/NineGridMedia';
import { useAppTheme } from '../../hooks/useAppTheme';
import authService from '../../services/authService';
import checkinInteractionService from '../../services/checkinInteractionService';
import { RootStackParamList } from '../../navigation/RootNavigator';
import { useAppStore } from '../../store/appStore';
import { MediaResource } from '../../types/media';
import { CheckinAttachment, CheckinComment, UserCheckin } from '../../types/rank';
import { User } from '../../types/user';

type ScreenRouteProp = RouteProp<RootStackParamList, 'CheckinEntryDetail'>;
type ScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'CheckinEntryDetail'>;

const formatTime = (value?: string) => value || '未填写时间';

const mapAttachmentsToMedia = (attachments: CheckinAttachment[]): MediaResource[] =>
  attachments
    .filter((attachment) => Boolean(attachment.temp_url || attachment.thumbnail_temp_url))
    .map((attachment, index) => ({
      id: attachment.file_id || `attachment-${index}`,
      uri: attachment.temp_url || attachment.thumbnail_temp_url || '',
      thumbnail:
        attachment.media_type === 'video'
          ? attachment.thumbnail_temp_url || attachment.temp_url
          : attachment.thumbnail_temp_url || attachment.temp_url,
      type:
        attachment.media_type === 'video'
          ? 'video'
          : attachment.media_type === 'livePhoto'
            ? 'livePhoto'
            : 'image',
      name: attachment.name,
      durationMs: attachment.duration_ms,
      livePhotoVideoUri: attachment.live_photo_video_temp_url,
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
const formatCommentTime = (value?: Date | string) => {
  if (!value) {
    return '刚刚';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '刚刚';
  }

  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  const hour = `${date.getHours()}`.padStart(2, '0');
  const minute = `${date.getMinutes()}`.padStart(2, '0');
  return `${month}-${day} ${hour}:${minute}`;
};

const getCommentDisplayName = (comment: CheckinComment) =>
  comment.author.full_name || comment.author.username || '旅行用户';

const getCommentAvatarFallback = (comment: CheckinComment) => getAvatarFallback(getCommentDisplayName(comment));

const CheckinEntryDetailScreen: React.FC = () => {
  const route = useRoute<ScreenRouteProp>();
  const navigation = useNavigation<ScreenNavigationProp>();
  const { colors, isDark } = useAppTheme();
  const insets = useSafeAreaInsets();
  const currentUser = useAppStore((state) => state.currentUser);
  const { code, item, entry, viewedUserId, viewedUserName, readOnly } = route.params;
  const userId = currentUser?._id;
  const targetUserId = viewedUserId || userId;
  const isViewerMode = Boolean(readOnly && targetUserId);

  const [loading, setLoading] = React.useState(true);
  const [currentEntry, setCurrentEntry] = React.useState<UserCheckin>(entry);
  const [authorProfile, setAuthorProfile] = React.useState<User | null>(null);
  const [commentInput, setCommentInput] = React.useState('');
  const [submittingComment, setSubmittingComment] = React.useState(false);
  const [interactionSubmitting, setInteractionSubmitting] = React.useState<'like' | 'favorite' | null>(null);
  const [replyTarget, setReplyTarget] = React.useState<CheckinComment | null>(null);
  const [composerExpanded, setComposerExpanded] = React.useState(false);
  const [keyboardHeight, setKeyboardHeight] = React.useState(0);
  const commentInputRef = React.useRef<TextInput>(null);

  const attachments = currentEntry.content?.attachments || [];
  const noteMedia = React.useMemo(() => mapAttachmentsToMedia(attachments), [attachments]);
  const interaction = currentEntry.interaction || {
    likes_count: 0,
    comments_count: 0,
    favorites_count: 0,
    viewer_has_liked: false,
    viewer_has_favorited: false,
  };
  const comments = currentEntry.comments || currentEntry.content?.comments || [];
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
      const [nextEntry, profile] = await Promise.all([
        checkinInteractionService.getEntryDetail({
          viewerUserId: userId || targetUserId || '',
          ownerUserId: targetUserId,
          code,
          itemId: item._id,
          entryId: entry._id || '',
        }),
        isViewerMode ? authService.getUser(targetUserId).catch(() => null) : Promise.resolve(null),
      ]);
      setCurrentEntry(nextEntry);
      setAuthorProfile(profile);
    } catch (error) {
      Alert.alert('加载失败', '这篇记录详情暂时无法获取，请稍后重试。');
      setCurrentEntry(entry);
      setAuthorProfile(null);
    } finally {
      setLoading(false);
    }
  }, [code, entry, isViewerMode, item._id, targetUserId, userId]);

  const interactionPayload = React.useMemo(
    () => ({
      userId: userId || '',
      ownerUserId: targetUserId || '',
      code,
      itemId: item._id,
      entryId: currentEntry._id || entry._id || '',
    }),
    [code, currentEntry._id, entry._id, item._id, targetUserId, userId]
  );

  React.useEffect(() => {
    navigation.setOptions({ title: currentEntry.content?.title || item.name_zh });
  }, [currentEntry.content?.title, item.name_zh, navigation]);

  useFocusEffect(
    React.useCallback(() => {
      fetchEntryDetail();
    }, [fetchEntryDetail])
  );

  const openComposer = React.useCallback(() => {
    setComposerExpanded(true);
    setTimeout(() => {
      commentInputRef.current?.focus();
    }, 80);
  }, []);

  React.useEffect(() => {
    if (replyTarget) {
      openComposer();
    }
  }, [openComposer, replyTarget]);

  React.useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const showSubscription = Keyboard.addListener(showEvent, (event) => {
      const nextHeight = Math.max((event.endCoordinates?.height || 0) - insets.bottom, 0);
      setKeyboardHeight(nextHeight);
    });
    const hideSubscription = Keyboard.addListener(hideEvent, () => {
      setKeyboardHeight(0);
    });

    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, [insets.bottom]);

  const bottomBarPaddingBottom = Math.max(insets.bottom, 10);
  const composerOffsetBottom = keyboardHeight;

  if (loading) {
    return <Loading message="正在加载记录详情..." />;
  }

  const handleToggleLike = async () => {
    if (!userId || !targetUserId) {
      return;
    }

    try {
      setInteractionSubmitting('like');
      const nextEntry = await checkinInteractionService.toggleLike(interactionPayload);
      setCurrentEntry(nextEntry);
    } catch (error) {
      Alert.alert('操作失败', '点赞暂时不可用，请稍后重试。');
    } finally {
      setInteractionSubmitting(null);
    }
  };

  const handleToggleFavorite = async () => {
    if (!userId || !targetUserId) {
      return;
    }

    try {
      setInteractionSubmitting('favorite');
      const nextEntry = await checkinInteractionService.toggleFavorite(interactionPayload);
      setCurrentEntry(nextEntry);
    } catch (error) {
      Alert.alert('操作失败', '收藏暂时不可用，请稍后重试。');
    } finally {
      setInteractionSubmitting(null);
    }
  };

  const handleSubmitComment = async () => {
    const trimmed = commentInput.trim();
    if (!trimmed || !userId || !targetUserId) {
      return;
    }

    try {
      setSubmittingComment(true);
      const nextEntry = replyTarget
        ? await checkinInteractionService.replyComment({
            ...interactionPayload,
            commentId: replyTarget.comment_id,
            content: trimmed,
          })
        : await checkinInteractionService.addComment({
            ...interactionPayload,
            content: trimmed,
          });
      setCurrentEntry(nextEntry);
      setCommentInput('');
      setReplyTarget(null);
      setComposerExpanded(false);
    } catch (error) {
      Alert.alert('发送失败', replyTarget ? '回复暂时发送失败，请稍后重试。' : '评论暂时发送失败，请稍后重试。');
    } finally {
      setSubmittingComment(false);
    }
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]} edges={['bottom']}>
      <View style={styles.safeArea}>
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
              styles.commentSection,
              { borderTopColor: isDark ? 'rgba(255,255,255,0.08)' : '#E5E7EB' },
            ]}
          >
            <View style={styles.commentHeader}>
              <Text style={[styles.commentTitle, { color: colors.text }]}>评论区</Text>
              <Text style={[styles.commentCount, { color: colors.textSecondary }]}>{comments.length} 条主评论</Text>
            </View>

            {comments.length ? (
              <View style={styles.commentList}>
                {comments.map((comment) => (
                  <View key={comment.comment_id} style={styles.commentCard}>
                    <View style={styles.commentRow}>
                      {comment.author.avatar_url ? (
                        <Image source={{ uri: comment.author.avatar_url }} style={styles.commentAvatar} />
                      ) : (
                        <View
                          style={[
                            styles.commentAvatarFallback,
                            {
                              backgroundColor: isDark ? 'rgba(255,155,122,0.16)' : 'rgba(255,122,89,0.08)',
                            },
                          ]}
                        >
                          <Text style={[styles.commentAvatarFallbackText, { color: colors.primary }]}>
                            {getCommentAvatarFallback(comment)}
                          </Text>
                        </View>
                      )}
                      <View style={styles.commentBodyWrap}>
                        <View style={styles.commentMetaRow}>
                          <Text style={[styles.commentAuthorName, { color: colors.text }]}>
                            {getCommentDisplayName(comment)}
                          </Text>
                          <Text style={[styles.commentTimeText, { color: colors.textSecondary }]}>
                            {formatCommentTime(comment.created_at)}
                          </Text>
                        </View>
                        <Text style={[styles.commentContentText, { color: colors.textSecondary }]}>
                          {comment.content}
                        </Text>
                        <Pressable onPress={() => setReplyTarget(comment)} style={styles.replyButton}>
                          <Text style={[styles.replyButtonText, { color: colors.primary }]}>回复</Text>
                        </Pressable>

                        {comment.replies?.length ? (
                          <View style={styles.replyList}>
                            {comment.replies.map((reply) => (
                              <View key={reply.comment_id} style={styles.replyItem}>
                                <Text style={[styles.replyMetaText, { color: colors.text }]}>
                                  {getCommentDisplayName(reply)}
                                  <Text style={[styles.replyTimeInline, { color: colors.textSecondary }]}>
                                    {' · '}
                                    {formatCommentTime(reply.created_at)}
                                  </Text>
                                </Text>
                                <Text style={[styles.replyContentText, { color: colors.textSecondary }]}>
                                  {reply.content}
                                </Text>
                              </View>
                            ))}
                          </View>
                        ) : null}
                      </View>
                    </View>
                  </View>
                ))}
              </View>
            ) : (
              <Text style={[styles.commentEmptyText, { color: colors.textSecondary }]}>
                还没有评论，来留下第一条互动吧。
              </Text>
            )}
          </View>
          </View>
        </ScrollView>

        {composerExpanded || commentInput.trim() || replyTarget ? (
          <View
            pointerEvents="box-none"
            style={[
              styles.composerOverlay,
              {
                bottom: composerOffsetBottom,
              },
            ]}
          >
            {replyTarget ? (
              <View
                style={[
                  styles.replyBanner,
                  { backgroundColor: isDark ? 'rgba(255,155,122,0.14)' : 'rgba(255,122,89,0.08)' },
                ]}
              >
                <Text style={[styles.replyBannerText, { color: colors.primary }]}>
                  正在回复 {getCommentDisplayName(replyTarget)}
                </Text>
                <Pressable onPress={() => setReplyTarget(null)}>
                  <Text style={[styles.replyCancelText, { color: colors.primary }]}>取消</Text>
                </Pressable>
              </View>
            ) : null}

            <View
              style={[
                styles.floatingComposer,
                {
                  backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : '#F8FBFF',
                  borderColor: colors.border,
                },
              ]}
            >
              <TextInput
                ref={commentInputRef}
                value={commentInput}
                onChangeText={setCommentInput}
                placeholder={replyTarget ? `回复 ${getCommentDisplayName(replyTarget)}...` : '说点什么...'}
                placeholderTextColor={colors.textSecondary}
                multiline
                autoFocus={composerExpanded}
                textAlignVertical="top"
                style={[styles.floatingComposerInput, { color: colors.text }]}
                onBlur={() => {
                  if (!commentInput.trim() && !replyTarget) {
                    setComposerExpanded(false);
                  }
                }}
              />
              <View style={styles.floatingComposerFooter}>
                <Pressable
                  onPress={() => {
                    setReplyTarget(null);
                    if (!commentInput.trim()) {
                      setComposerExpanded(false);
                    }
                  }}
                  style={styles.floatingComposerGhostButton}
                >
                  <Text style={[styles.floatingComposerGhostText, { color: colors.textSecondary }]}>收起</Text>
                </Pressable>
                <Pressable
                  onPress={handleSubmitComment}
                  disabled={!commentInput.trim() || submittingComment}
                  style={[
                    styles.floatingComposerSendButton,
                    {
                      backgroundColor: commentInput.trim() ? colors.primary : colors.border,
                    },
                  ]}
                >
                  <Text style={styles.floatingComposerSendText}>{submittingComment ? '发送中' : '发送'}</Text>
                </Pressable>
              </View>
            </View>
          </View>
        ) : null}

        <View
          style={[
            styles.bottomBar,
            {
              backgroundColor: colors.background,
              borderTopColor: isDark ? 'rgba(255,255,255,0.08)' : '#E5E7EB',
              paddingBottom: bottomBarPaddingBottom,
            },
          ]}
        >

          <View style={styles.bottomBarRow}>
            <View
              style={[
                styles.bottomInputWrap,
                {
                  backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : '#F8FBFF',
                  borderColor: colors.border,
                },
              ]}
            >
              <Pressable onPress={openComposer} style={styles.bottomInputFake}>
                <Ionicons name="create-outline" size={15} color={colors.textSecondary} />
                <Text
                  numberOfLines={1}
                  style={[
                    styles.bottomInputPlaceholder,
                    { color: commentInput.trim() ? colors.text : colors.textSecondary },
                  ]}
                >
                  {commentInput.trim() || (replyTarget ? `回复 ${getCommentDisplayName(replyTarget)}...` : '说点什么...')}
                </Text>
              </Pressable>
            </View>

            <View style={styles.bottomStats}>
              <Pressable
                onPress={handleToggleLike}
                style={styles.bottomStatItem}
                disabled={interactionSubmitting !== null}
              >
                <Ionicons
                  name={interaction.viewer_has_liked ? 'heart' : 'heart-outline'}
                  size={22}
                  color={interaction.viewer_has_liked ? colors.primary : colors.textSecondary}
                />
                <Text
                  style={[
                    styles.bottomStatText,
                    { color: interaction.viewer_has_liked ? colors.primary : colors.textSecondary },
                  ]}
                >
                  {interaction.likes_count || 0}
                </Text>
              </Pressable>

              <Pressable onPress={openComposer} style={styles.bottomStatItem}>
                <Ionicons name="chatbubble-ellipses-outline" size={22} color={colors.textSecondary} />
                <Text style={[styles.bottomStatText, { color: colors.textSecondary }]}>{interaction.comments_count || 0}</Text>
              </Pressable>

              <Pressable
                onPress={handleToggleFavorite}
                style={styles.bottomStatItem}
                disabled={interactionSubmitting !== null}
              >
                <Ionicons
                  name={interaction.viewer_has_favorited ? 'star' : 'star-outline'}
                  size={22}
                  color={interaction.viewer_has_favorited ? colors.primary : colors.textSecondary}
                />
                <Text
                  style={[
                    styles.bottomStatText,
                    { color: interaction.viewer_has_favorited ? colors.primary : colors.textSecondary },
                  ]}
                >
                  {interaction.favorites_count || 0}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingBottom: 160,
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
  commentSection: {
    marginTop: 20,
    paddingTop: 16,
    borderTopWidth: 1,
  },
  commentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  commentTitle: {
    fontSize: 18,
    fontWeight: '800',
  },
  commentCount: {
    fontSize: 12,
    fontWeight: '600',
  },
  replyBanner: {
    marginTop: 14,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  replyBannerText: {
    fontSize: 12,
    fontWeight: '700',
  },
  replyCancelText: {
    fontSize: 12,
    fontWeight: '700',
  },
  commentList: {
    marginTop: 16,
    gap: 16,
  },
  commentCard: {
    gap: 10,
  },
  commentRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  commentAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  commentAvatarFallback: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  commentAvatarFallbackText: {
    fontSize: 14,
    fontWeight: '800',
  },
  commentBodyWrap: {
    flex: 1,
  },
  commentMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  commentAuthorName: {
    fontSize: 13,
    fontWeight: '800',
    flex: 1,
  },
  commentTimeText: {
    fontSize: 11,
  },
  commentContentText: {
    marginTop: 6,
    fontSize: 14,
    lineHeight: 20,
  },
  replyButton: {
    marginTop: 8,
    alignSelf: 'flex-start',
  },
  replyButtonText: {
    fontSize: 12,
    fontWeight: '700',
  },
  replyList: {
    marginTop: 10,
    gap: 10,
    paddingLeft: 12,
    borderLeftWidth: 2,
    borderLeftColor: '#F0B6A6',
  },
  replyItem: {
    gap: 4,
  },
  replyMetaText: {
    fontSize: 12,
    fontWeight: '700',
  },
  replyTimeInline: {
    fontSize: 11,
    fontWeight: '500',
  },
  replyContentText: {
    fontSize: 13,
    lineHeight: 18,
  },
  commentEmptyText: {
    marginTop: 16,
    fontSize: 13,
    lineHeight: 20,
  },
  composerOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    zIndex: 20,
    gap: 0,
  },
  bottomBar: {
    borderTopWidth: 1,
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  bottomBarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  bottomInputWrap: {
    flex: 1,
    minHeight: 42,
    borderRadius: 999,
    borderWidth: 1,
    paddingLeft: 14,
    paddingRight: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  bottomInputFake: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  bottomInputPlaceholder: {
    flex: 1,
    fontSize: 13,
  },
  bottomStats: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  bottomStatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 6,
  },
  bottomStatText: {
    fontSize: 16,
    fontWeight: '800',
  },
  floatingComposer: {
    borderWidth: 1,
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    paddingTop: 12,
    paddingBottom: 12,
    paddingHorizontal: 16,
    gap: 10,
  },
  floatingComposerInput: {
    minHeight: 40,
    fontSize: 14,
    lineHeight: 20,
  },
  floatingComposerFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  floatingComposerGhostButton: {
    paddingHorizontal: 4,
    paddingVertical: 6,
  },
  floatingComposerGhostText: {
    fontSize: 12,
    fontWeight: '700',
  },
  floatingComposerSendButton: {
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  floatingComposerSendText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
});

export default CheckinEntryDetailScreen;
