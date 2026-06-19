import Ionicons from '@expo/vector-icons/Ionicons';
import { useFocusEffect, useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React from 'react';
import {
  Animated,
  Alert,
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import Loading from '../../components/common/Loading';
import { NineGridMedia } from '../../components/common/NineGridMedia';
import { useToast } from '../../components/common/Toast';
import { useAppTheme } from '../../hooks/useAppTheme';
import authService from '../../services/authService';
import checkinService from '../../services/checkinService';
import checkinInteractionService from '../../services/checkinInteractionService';
import feedbackService from '../../services/feedbackService';
import { RootStackParamList } from '../../navigation/RootNavigator';
import { useAppStore } from '../../store/appStore';
import { ReportReason } from '../../types/feedback';
import { MediaResource } from '../../types/media';
import { CheckinAttachment, CheckinComment, LeaderboardCode, StandardItem, UserCheckin } from '../../types/rank';
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

const getDefaultInteraction = () => ({
  likes_count: 0,
  comments_count: 0,
  favorites_count: 0,
  viewer_has_liked: false,
  viewer_has_favorited: false,
});

const isEntryModerated = (status?: string) => status === 'violating' || status === 'reviewing';

const REPORT_REASON_OPTIONS: Array<{ value: ReportReason; label: string }> = [
  { value: 'spam', label: '垃圾广告' },
  { value: 'abuse', label: '辱骂攻击' },
  { value: 'harassment', label: '骚扰恶意' },
  { value: 'pornography', label: '低俗色情' },
  { value: 'violence', label: '暴力血腥' },
  { value: 'fraud', label: '诈骗欺诈' },
  { value: 'other', label: '其他原因' },
];

const CheckinEntryDetailScreen: React.FC = () => {
  const route = useRoute<ScreenRouteProp>();
  const navigation = useNavigation<ScreenNavigationProp>();
  const { colors, isDark } = useAppTheme();
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const currentUser = useAppStore((state) => state.currentUser);
  const { entryId } = route.params;
  const userId = currentUser?._id;

  const [loading, setLoading] = React.useState(true);
  const [resolvedCode, setResolvedCode] = React.useState<LeaderboardCode | null>(null);
  const [resolvedItem, setResolvedItem] = React.useState<StandardItem | null>(null);
  const [currentEntry, setCurrentEntry] = React.useState<UserCheckin | null>(null);
  const [resolvedViewedUserId, setResolvedViewedUserId] = React.useState<string | undefined>(undefined);
  const [resolvedViewedUserName, setResolvedViewedUserName] = React.useState<string | undefined>(undefined);
  const [resolvedReadOnly, setResolvedReadOnly] = React.useState(true);
  const [authorProfile, setAuthorProfile] = React.useState<User | null>(null);
  const [commentInput, setCommentInput] = React.useState('');
  const [submittingComment, setSubmittingComment] = React.useState(false);
  const [interactionSubmitting, setInteractionSubmitting] = React.useState<'like' | 'favorite' | null>(null);
  const [replyTarget, setReplyTarget] = React.useState<CheckinComment | null>(null);
  const [composerExpanded, setComposerExpanded] = React.useState(false);
  const [keyboardHeight, setKeyboardHeight] = React.useState(0);
  const [moreActionsVisible, setMoreActionsVisible] = React.useState(false);
  const [reportModalVisible, setReportModalVisible] = React.useState(false);
  const [selectedReportReason, setSelectedReportReason] = React.useState<ReportReason>('spam');
  const [reportDescription, setReportDescription] = React.useState('');
  const [reportSubmitting, setReportSubmitting] = React.useState(false);
  const [deletingEntry, setDeletingEntry] = React.useState(false);
  const commentInputRef = React.useRef<TextInput>(null);
  const likeButtonScale = React.useRef(new Animated.Value(1)).current;
  const commentButtonScale = React.useRef(new Animated.Value(1)).current;
  const favoriteButtonScale = React.useRef(new Animated.Value(1)).current;

  const targetUserId = resolvedViewedUserId || userId;
  const isViewerMode = Boolean(resolvedReadOnly && targetUserId);
  const attachments = currentEntry?.content?.attachments || [];
  const noteMedia = React.useMemo(() => mapAttachmentsToMedia(attachments), [attachments]);
  const interaction = currentEntry?.interaction || getDefaultInteraction();
  const comments = currentEntry?.comments || currentEntry?.content?.comments || [];
  const authorUser: DisplayUser = isViewerMode ? authorProfile : currentUser;
  const displayName = isViewerMode && resolvedViewedUserName ? resolvedViewedUserName : getDisplayName(authorUser);
  const avatarUri = getAvatarUri(authorUser);
  const locationText = currentEntry?.content?.location_name || currentEntry?.content?.city_name || resolvedItem?.name_zh || '';
  const hasViolationBadge = isEntryModerated(currentEntry?.content?.moderation_status);
  const canReportEntry = Boolean(userId && targetUserId && userId !== targetUserId);
  const canDeleteEntry = Boolean(userId && targetUserId && userId === targetUserId && currentEntry?._id);

  const fetchEntryDetail = React.useCallback(async () => {
    try {
      setLoading(true);
      const context = await checkinInteractionService.getEntryContextById({
        entryId,
        viewerUserId: userId || '',
        viewerAppleUserId: currentUser?.appleUserId || '',
      });
      const profile = await authService.getUser(context.ownerUserId).catch(() => null);
      setResolvedCode(context.code);
      setResolvedItem(context.item);
      setResolvedViewedUserId(context.ownerUserId);
      setResolvedViewedUserName(profile?.full_name || profile?.profile?.nickname || profile?.username || '该用户');
      setResolvedReadOnly(context.ownerUserId !== userId);
      setCurrentEntry(context.entry);
      setAuthorProfile(profile);
    } catch (error) {
      Alert.alert('加载失败', '这篇记录详情暂时无法获取，请稍后重试。');
      setResolvedCode(null);
      setResolvedItem(null);
      setCurrentEntry(null);
      setAuthorProfile(null);
    } finally {
      setLoading(false);
    }
  }, [currentUser?.appleUserId, entryId, userId]);

  const interactionPayload = React.useMemo(
    () =>
      resolvedCode && resolvedItem && currentEntry?._id
        ? {
            userId: userId || '',
            ownerUserId: targetUserId || '',
            code: resolvedCode,
            itemId: resolvedItem._id,
            entryId: currentEntry._id,
          }
        : null,
    [currentEntry?._id, resolvedCode, resolvedItem, targetUserId, userId]
  );

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
      const nextHeight = Math.max(event.endCoordinates?.height || 0, 0);
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

  const bottomBarPaddingBottom = 12;
  const composerOffsetBottom = keyboardHeight;

  const playButtonFeedback = React.useCallback((scaleValue: Animated.Value) => {
    Animated.sequence([
      Animated.timing(scaleValue, {
        toValue: 0.9,
        duration: 70,
        useNativeDriver: true,
      }),
      Animated.spring(scaleValue, {
        toValue: 1,
        friction: 5,
        tension: 220,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const applyOptimisticInteraction = React.useCallback(
    (type: 'like' | 'favorite') => {
      setCurrentEntry((prev) => {
        if (!prev) {
          return prev;
        }
        const previousInteraction = prev.interaction || prev.content?.interaction || getDefaultInteraction();
        const nextInteraction =
          type === 'like'
            ? {
                ...previousInteraction,
                viewer_has_liked: !previousInteraction.viewer_has_liked,
                likes_count: Math.max(
                  0,
                  previousInteraction.likes_count + (previousInteraction.viewer_has_liked ? -1 : 1)
                ),
              }
            : {
                ...previousInteraction,
                viewer_has_favorited: !previousInteraction.viewer_has_favorited,
                favorites_count: Math.max(
                  0,
                  previousInteraction.favorites_count + (previousInteraction.viewer_has_favorited ? -1 : 1)
                ),
              };

        return {
          ...prev,
          interaction: nextInteraction,
          content: prev.content
            ? {
                ...prev.content,
                interaction: nextInteraction,
              }
            : prev.content,
        };
      });
    },
    [setCurrentEntry]
  );

  const handleToggleLike = async () => {
    if (!userId || !targetUserId || !interactionPayload || !currentEntry) {
      return;
    }

    const previousEntry = currentEntry;
    try {
      setInteractionSubmitting('like');
      playButtonFeedback(likeButtonScale);
      applyOptimisticInteraction('like');
      const nextEntry = await checkinInteractionService.toggleLike(interactionPayload);
      setCurrentEntry(nextEntry);
    } catch (error) {
      setCurrentEntry(previousEntry);
      Alert.alert('操作失败', '点赞暂时不可用，请稍后重试。');
    } finally {
      setInteractionSubmitting(null);
    }
  };

  const handleToggleFavorite = async () => {
    if (!userId || !targetUserId || !interactionPayload || !currentEntry) {
      return;
    }

    const previousEntry = currentEntry;
    try {
      setInteractionSubmitting('favorite');
      playButtonFeedback(favoriteButtonScale);
      applyOptimisticInteraction('favorite');
      const nextEntry = await checkinInteractionService.toggleFavorite(interactionPayload);
      setCurrentEntry(nextEntry);
    } catch (error) {
      setCurrentEntry(previousEntry);
      Alert.alert('操作失败', '收藏暂时不可用，请稍后重试。');
    } finally {
      setInteractionSubmitting(null);
    }
  };

  const handleSubmitComment = async () => {
    const trimmed = commentInput.trim();
    if (!trimmed || !userId || !targetUserId || !interactionPayload) {
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

  const handleOpenReportModal = React.useCallback(() => {
    if (!canReportEntry) {
      return;
    }

    setMoreActionsVisible(false);
    setSelectedReportReason('spam');
    setReportDescription('');
    setTimeout(() => {
      setReportModalVisible(true);
    }, 160);
  }, [canReportEntry]);

  const handleSubmitReport = React.useCallback(async () => {
    if (!userId || !targetUserId || !currentEntry || !resolvedItem) {
      Alert.alert('提示', '请先登录后再举报。');
      return;
    }

    const trimmedDescription = reportDescription.trim();
    if (!trimmedDescription) {
      Alert.alert('提示', '请补充举报说明。');
      return;
    }

    try {
      setReportSubmitting(true);
      await feedbackService.submitEntryReport({
        user_id: userId,
        target_user_id: targetUserId,
        target_entry_id: currentEntry._id || '',
        target_item_id: resolvedItem._id,
        report_reason: selectedReportReason,
        content: trimmedDescription,
        source: 'app_checkin_entry_report',
        user_snapshot: {
          full_name: currentUser?.fullName || '',
          email: currentUser?.email || '',
          avatar_url: currentUser?.profile?.avatar_url || '',
        },
        target_user_snapshot: {
          full_name: displayName,
          avatar_url: avatarUri || '',
        },
        target_entry_snapshot: {
          title: currentEntry.content?.title || `${resolvedItem.name_zh} 游玩记录`,
          description: currentEntry.content?.description || '',
          media_count: attachments.length,
          item_name_zh: resolvedItem.name_zh,
        },
      });

      setReportModalVisible(false);
      setReportDescription('');
      setSelectedReportReason('spam');
      toast.success('举报已提交，我们会尽快处理');
    } catch (error) {
      Alert.alert('提交失败', error instanceof Error ? error.message : '举报提交失败，请稍后再试。');
    } finally {
      setReportSubmitting(false);
    }
  }, [
    attachments.length,
    avatarUri,
    currentEntry?._id,
    currentEntry?.content?.description,
    currentEntry?.content?.title,
    currentUser?.email,
    currentUser?.fullName,
    currentUser?.profile?.avatar_url,
    displayName,
    currentEntry,
    reportDescription,
    resolvedItem,
    selectedReportReason,
    targetUserId,
    toast,
    userId,
  ]);

  const handleDeleteEntry = React.useCallback(() => {
    if (!canDeleteEntry || !userId || !resolvedCode || !resolvedItem || !currentEntry?._id) {
      return;
    }

    const currentEntryId = currentEntry._id;

    Alert.alert('删除记录', '删除后将无法恢复，这条记录的内容、图片和互动数据都会从当前条目中移除。确认继续吗？', [
      { text: '取消', style: 'cancel' },
      {
        text: '删除',
        style: 'destructive',
        onPress: async () => {
          try {
            setDeletingEntry(true);
            setMoreActionsVisible(false);
            await checkinService.deleteCheckinEntry(userId, resolvedCode, resolvedItem._id, currentEntryId);
            toast.success('记录已删除');
            navigation.goBack();
          } catch (error) {
            Alert.alert('删除失败', error instanceof Error ? error.message : '删除记录失败，请稍后重试。');
          } finally {
            setDeletingEntry(false);
          }
        },
      },
    ]);
  }, [canDeleteEntry, currentEntry?._id, navigation, resolvedCode, resolvedItem, toast, userId]);

  if (loading || !currentEntry || !resolvedItem || !resolvedCode) {
    return <Loading message="正在加载记录详情..." />;
  }

  const code = resolvedCode;
  const item = resolvedItem;

  return (
    <View style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <View style={[styles.pageHeader, { paddingTop: insets.top + 8 }]}>
        <View style={styles.pageHeaderRow}>
          <Pressable
            onPress={() => navigation.goBack()}
            style={[
              styles.headerIconButton,
              { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.92)' },
            ]}
          >
            <Ionicons name="chevron-back" size={20} color={colors.text} />
          </Pressable>

          <View style={styles.pageHeaderCenter}>
            <Text numberOfLines={1} style={[styles.pageHeaderTitle, { color: colors.text }]}>
              {currentEntry.content?.title || resolvedItem.name_zh}
            </Text>
          </View>

          {canReportEntry || canDeleteEntry ? (
            <Pressable
              onPress={() => setMoreActionsVisible(true)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              style={[
                styles.headerIconButton,
                { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.92)' },
              ]}
            >
              <Ionicons name="ellipsis-horizontal" size={20} color={colors.text} />
            </Pressable>
          ) : (
            <View style={styles.headerIconPlaceholder} />
          )}
        </View>
      </View>

      <View style={styles.safeArea}>
        <ScrollView
          contentContainerStyle={[styles.content, { paddingTop: insets.top + 72 }]}
          showsVerticalScrollIndicator={false}
          contentInsetAdjustmentBehavior="never"
        >
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

          {hasViolationBadge || currentEntry.content?.weather || currentEntry.content?.mood || attachments.length ? (
            <View style={styles.noteTagRow}>
              {hasViolationBadge ? (
                <View
                  style={[
                    styles.noteTag,
                    {
                      backgroundColor: isDark ? 'rgba(239,68,68,0.16)' : 'rgba(239,68,68,0.10)',
                    },
                  ]}
                >
                  <Text style={[styles.noteTagText, { color: '#EF4444' }]}>笔记违规</Text>
                </View>
              ) : null}
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
              <Animated.View style={{ transform: [{ scale: likeButtonScale }] }}>
                <Pressable
                  onPress={handleToggleLike}
                  style={styles.bottomStatItem}
                  disabled={interactionSubmitting === 'like'}
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
              </Animated.View>

              <Animated.View style={{ transform: [{ scale: commentButtonScale }] }}>
                <Pressable
                  onPress={() => {
                    playButtonFeedback(commentButtonScale);
                    openComposer();
                  }}
                  style={styles.bottomStatItem}
                >
                  <Ionicons name="chatbubble-ellipses-outline" size={22} color={colors.textSecondary} />
                  <Text style={[styles.bottomStatText, { color: colors.textSecondary }]}>
                    {interaction.comments_count || 0}
                  </Text>
                </Pressable>
              </Animated.View>

              <Animated.View style={{ transform: [{ scale: favoriteButtonScale }] }}>
                <Pressable
                  onPress={handleToggleFavorite}
                  style={styles.bottomStatItem}
                  disabled={interactionSubmitting === 'favorite'}
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
              </Animated.View>
            </View>
          </View>
        </View>

        <Modal
          visible={moreActionsVisible}
          transparent
          animationType="fade"
          onRequestClose={() => setMoreActionsVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <Pressable style={styles.modalBackdrop} onPress={() => setMoreActionsVisible(false)} />
            <View
              style={[
                styles.popupCard,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.border,
                },
              ]}
            >
              <Text style={[styles.popupTitle, { color: colors.text }]}>更多操作</Text>
              {canReportEntry ? (
                <Pressable style={styles.popupAction} onPress={handleOpenReportModal}>
                  <Ionicons name="flag-outline" size={18} color="#F59E0B" />
                  <Text style={[styles.popupActionText, { color: colors.text }]}>举报日记</Text>
                </Pressable>
              ) : null}
              {canDeleteEntry ? (
                <Pressable style={styles.popupAction} onPress={handleDeleteEntry} disabled={deletingEntry}>
                  <Ionicons name="trash-outline" size={18} color="#EF4444" />
                  <Text style={[styles.popupActionText, { color: '#EF4444' }]}>
                    {deletingEntry ? '删除中...' : '删除记录'}
                  </Text>
                </Pressable>
              ) : null}
              <Pressable style={styles.popupCancel} onPress={() => setMoreActionsVisible(false)}>
                <Text style={[styles.popupCancelText, { color: colors.textSecondary }]}>取消</Text>
              </Pressable>
            </View>
          </View>
        </Modal>

        <Modal
          visible={reportModalVisible}
          transparent
          animationType="fade"
          onRequestClose={() => setReportModalVisible(false)}
        >
          <KeyboardAvoidingView
            style={styles.modalOverlay}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            keyboardVerticalOffset={0}
          >
            <Pressable style={styles.modalBackdrop} onPress={() => setReportModalVisible(false)} />
            <ScrollView
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={styles.reportModalContent}
              showsVerticalScrollIndicator={false}
            >
              <View
                style={[
                  styles.reportCard,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                  },
                ]}
              >
                <Text style={[styles.popupTitle, { color: colors.text }]}>举报日记</Text>
                <Text style={[styles.reportHint, { color: colors.textSecondary }]}>
                  请选择举报原因，并补充说明，帮助我们更快判断是否需要处理这篇记录。
                </Text>
                <View style={styles.reasonList}>
                  {REPORT_REASON_OPTIONS.map((option) => {
                    const active = selectedReportReason === option.value;

                    return (
                      <Pressable
                        key={option.value}
                        onPress={() => setSelectedReportReason(option.value)}
                        style={[
                          styles.reasonChip,
                          {
                            backgroundColor: active ? colors.primary : isDark ? 'rgba(255,255,255,0.04)' : '#F9FAFB',
                            borderColor: active ? colors.primary : colors.border,
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.reasonChipText,
                            { color: active ? '#FFFFFF' : colors.text },
                          ]}
                        >
                          {option.label}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
                <TextInput
                  value={reportDescription}
                  onChangeText={setReportDescription}
                  placeholder="请补充违规内容描述，便于我们核查"
                  placeholderTextColor={colors.textSecondary}
                  multiline
                  maxLength={200}
                  textAlignVertical="top"
                  style={[
                    styles.reportInput,
                    {
                      color: colors.text,
                      borderColor: colors.border,
                      backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : '#F8FBFF',
                    },
                  ]}
                />
                <Text style={[styles.reportCounter, { color: colors.textSecondary }]}>
                  {reportDescription.length}/200
                </Text>
                <View style={styles.reportActions}>
                  <Pressable
                    onPress={() => setReportModalVisible(false)}
                    disabled={reportSubmitting}
                    style={[styles.reportSecondaryButton, { borderColor: colors.border }]}
                  >
                    <Text style={[styles.reportSecondaryText, { color: colors.textSecondary }]}>取消</Text>
                  </Pressable>
                  <Pressable
                    onPress={handleSubmitReport}
                    disabled={reportSubmitting}
                    style={[
                      styles.reportPrimaryButton,
                      { backgroundColor: colors.primary, opacity: reportSubmitting ? 0.7 : 1 },
                    ]}
                  >
                    <Text style={styles.reportPrimaryText}>{reportSubmitting ? '提交中...' : '提交举报'}</Text>
                  </Pressable>
                </View>
              </View>
            </ScrollView>
          </KeyboardAvoidingView>
        </Modal>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingBottom: 148,
  },
  noteContent: {
    paddingTop: 0,
  },
  pageHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 20,
    paddingHorizontal: 16,
  },
  pageHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  pageHeaderCenter: {
    flex: 1,
  },
  pageHeaderTitle: {
    fontSize: 16,
    fontWeight: '800',
  },
  headerIconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerIconPlaceholder: {
    width: 40,
    height: 40,
  },
  authorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  headerMoreButton: {
    padding: 4,
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
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(15,23,42,0.28)',
  },
  modalBackdrop: {
    flex: 1,
  },
  reportModalContent: {
    flexGrow: 1,
    justifyContent: 'flex-end',
  },
  popupCard: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 24,
    gap: 12,
  },
  popupTitle: {
    fontSize: 17,
    fontWeight: '800',
    textAlign: 'center',
  },
  popupAction: {
    minHeight: 48,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: 'rgba(245,158,11,0.10)',
  },
  popupActionText: {
    fontSize: 15,
    fontWeight: '700',
  },
  popupCancel: {
    minHeight: 46,
    alignItems: 'center',
    justifyContent: 'center',
  },
  popupCancelText: {
    fontSize: 14,
    fontWeight: '600',
  },
  reportCard: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 24,
  },
  reportHint: {
    marginTop: 10,
    fontSize: 13,
    lineHeight: 20,
  },
  reasonList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 16,
  },
  reasonChip: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  reasonChipText: {
    fontSize: 12,
    fontWeight: '700',
  },
  reportInput: {
    minHeight: 120,
    borderWidth: 1,
    borderRadius: 18,
    marginTop: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    lineHeight: 20,
  },
  reportCounter: {
    marginTop: 8,
    textAlign: 'right',
    fontSize: 12,
  },
  reportActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
  reportSecondaryButton: {
    flex: 1,
    minHeight: 46,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reportPrimaryButton: {
    flex: 1,
    minHeight: 46,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reportSecondaryText: {
    fontSize: 14,
    fontWeight: '700',
  },
  reportPrimaryText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
});

export default CheckinEntryDetailScreen;
