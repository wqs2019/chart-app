import Ionicons from '@expo/vector-icons/Ionicons';
import { RouteProp, useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React from 'react';
import { Alert, Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAppTheme } from '../../hooks/useAppTheme';
import { RootStackParamList } from '../../navigation/RootNavigator';
import { notificationService } from '../../services/notificationService';
import { useAppStore } from '../../store/appStore';
import { AppNotification, AppNotificationType } from '../../types/notification';

type ScreenNavigationProp = NativeStackNavigationProp<RootStackParamList>;
type ScreenRouteProp = RouteProp<RootStackParamList, 'NotificationCenter'>;

const getAvatarFallback = (name: string) => name.trim().charAt(0).toUpperCase() || '旅';

const resolveNotificationRoute = (item: AppNotification) => {
  const screen = item.extra_data?.screen || '';
  const params = item.extra_data?.params || {};

  if (screen === 'CheckinEntryDetail') {
    const entryId = params.entryId || item.extra_data?.entryId || item.related_id || '';
    return entryId ? { screen: 'CheckinEntryDetail' as const, params: { entryId } } : null;
  }

  if (screen === 'OverallDiaryFeed' || item.type === 'follow') {
    const viewedUserId = params.viewedUserId || item.extra_data?.viewed_user_id || '';
    if (!viewedUserId) {
      return null;
    }

    return {
      screen: 'OverallDiaryFeed' as const,
      params: {
        viewedUserId,
        viewedUserName: params.viewedUserName || item.extra_data?.viewed_user_name,
        viewedAvatarUrl: params.viewedAvatarUrl || item.extra_data?.viewed_avatar_url,
      },
    };
  }

  return null;
};

const NotificationCenterScreen: React.FC = () => {
  const navigation = useNavigation<ScreenNavigationProp>();
  const route = useRoute<ScreenRouteProp>();
  const { colors, isDark } = useAppTheme();
  const currentUser = useAppStore((state) => state.currentUser);
  const setUnreadNotificationCount = useAppStore((state) => state.setUnreadNotificationCount);
  const setUnreadLikeFavoriteCount = useAppStore((state) => state.setUnreadLikeFavoriteCount);
  const setUnreadCommentCount = useAppStore((state) => state.setUnreadCommentCount);
  const [notifications, setNotifications] = React.useState<AppNotification[]>([]);
  const [loading, setLoading] = React.useState(true);
  const selectedTypes = route.params?.types;
  const screenTitle = route.params?.title || '消息通知';

  React.useLayoutEffect(() => {
    navigation.setOptions({
      title: screenTitle,
    });
  }, [navigation, screenTitle]);

  const resetFilteredUnreadState = React.useCallback(
    (totalUnreadCount: number, types?: AppNotificationType[]) => {
      setUnreadNotificationCount(totalUnreadCount);

      if (types?.includes('like') || types?.includes('favorite')) {
        setUnreadLikeFavoriteCount(0);
      }

      if (types?.includes('comment') || types?.includes('reply')) {
        setUnreadCommentCount(0);
      }
    },
    [setUnreadCommentCount, setUnreadLikeFavoriteCount, setUnreadNotificationCount]
  );

  const fetchNotifications = React.useCallback(async () => {
    if (!currentUser?._id) {
      setNotifications([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const result = await notificationService.getNotifications(currentUser._id, 1, 50, selectedTypes);
      const nextList = result.list || [];
      const unreadIds = (result.list || []).filter((item) => !item.is_read).map((item) => item._id);
      if (unreadIds.length > 0) {
        await notificationService.markRead(currentUser._id, unreadIds);
      }
      const totalUnreadCount = await notificationService.getUnreadCount(currentUser._id);
      setNotifications(nextList.map((item) => ({ ...item, is_read: true })));
      resetFilteredUnreadState(totalUnreadCount, selectedTypes);
    } catch (error) {
      Alert.alert('加载失败', '通知列表暂时无法获取，请稍后重试。');
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  }, [currentUser?._id, resetFilteredUnreadState, selectedTypes]);

  useFocusEffect(
    React.useCallback(() => {
      void fetchNotifications();
    }, [fetchNotifications])
  );

  const handlePressNotification = React.useCallback(
    (item: AppNotification) => {
      const routeTarget = resolveNotificationRoute(item);
      if (routeTarget?.screen === 'CheckinEntryDetail') {
        navigation.navigate(routeTarget.screen, routeTarget.params);
        return;
      }

      if (routeTarget?.screen === 'OverallDiaryFeed') {
        navigation.navigate(routeTarget.screen, routeTarget.params);
      }
    },
    [navigation]
  );

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {loading ? (
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>加载中...</Text>
        ) : notifications.length === 0 ? (
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>暂时还没有消息通知</Text>
        ) : (
          notifications.map((item) => {
            const avatarUrl = item.sender_snapshot?.avatar_url || '';
            const displayName = item.sender_snapshot?.display_name || item.title;
            return (
              <Pressable
                key={item._id}
                onPress={() => handlePressNotification(item)}
                style={[styles.card, { backgroundColor: colors.surface }]}
              >
                <View
                  style={[
                    styles.avatarWrap,
                    {
                      backgroundColor: isDark ? 'rgba(255,155,122,0.14)' : 'rgba(255,122,89,0.08)',
                    },
                  ]}
                >
                  {avatarUrl ? (
                    <Image source={{ uri: avatarUrl }} style={styles.avatar} />
                  ) : (
                    <Text style={[styles.avatarFallback, { color: colors.primary }]}>
                      {getAvatarFallback(displayName)}
                    </Text>
                  )}
                </View>
                <View style={styles.textWrap}>
                  <View style={styles.titleRow}>
                    <Text style={[styles.title, { color: colors.text }]}>{item.title}</Text>
                    {!item.is_read ? <View style={styles.unreadDot} /> : null}
                  </View>
                  <Text style={[styles.contentText, { color: colors.textSecondary }]}>{item.content}</Text>
                  <View style={styles.metaRow}>
                    <Ionicons name="chevron-forward" size={14} color={colors.textSecondary} />
                    <Text style={[styles.metaText, { color: colors.textSecondary }]}>点击查看</Text>
                  </View>
                </View>
              </Pressable>
            );
          })
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
    paddingBottom: 120,
    gap: 12,
  },
  emptyText: {
    marginTop: 64,
    textAlign: 'center',
    fontSize: 14,
  },
  card: {
    borderRadius: 20,
    padding: 14,
    flexDirection: 'row',
    gap: 12,
  },
  avatarWrap: {
    width: 50,
    height: 50,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatar: {
    width: '100%',
    height: '100%',
  },
  avatarFallback: {
    fontSize: 18,
    fontWeight: '800',
  },
  textWrap: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  title: {
    flex: 1,
    fontSize: 15,
    fontWeight: '800',
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 999,
    backgroundColor: '#EF4444',
  },
  contentText: {
    marginTop: 6,
    fontSize: 13,
    lineHeight: 19,
  },
  metaRow: {
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 12,
    fontWeight: '600',
  },
});

export default NotificationCenterScreen;
