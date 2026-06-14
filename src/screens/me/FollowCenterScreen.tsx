import Ionicons from '@expo/vector-icons/Ionicons';
import { RouteProp, useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React from 'react';
import { Alert, Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAppTheme } from '../../hooks/useAppTheme';
import { notificationService } from '../../services/notificationService';
import { socialService } from '../../services/socialService';
import { useAppStore } from '../../store/appStore';
import { FollowCenterData, FollowTabKey, FollowUserRow } from '../../types/social';
import type { RootStackParamList } from '../../navigation/RootNavigator';

type ScreenRouteProp = RouteProp<RootStackParamList, 'FollowCenter'>;
type ScreenNavigationProp = NativeStackNavigationProp<RootStackParamList>;

const EMPTY_CENTER_DATA: FollowCenterData = {
  summary: {
    follower_count: 0,
    following_count: 0,
    unread_follower_count: 0,
    viewer_is_following: false,
  },
  followers: [],
  following: [],
};

const getAvatarFallback = (name: string) => name.trim().charAt(0).toUpperCase() || '旅';

const FollowCenterScreen: React.FC = () => {
  const route = useRoute<ScreenRouteProp>();
  const navigation = useNavigation<ScreenNavigationProp>();
  const { colors, isDark } = useAppTheme();
  const currentUser = useAppStore((state) => state.currentUser);
  const setUnreadFollowerCount = useAppStore((state) => state.setUnreadFollowerCount);
  const setUnreadNotificationCount = useAppStore((state) => state.setUnreadNotificationCount);
  const [activeTab, setActiveTab] = React.useState<FollowTabKey>(route.params?.initialTab || 'followers');
  const [centerData, setCenterData] = React.useState<FollowCenterData>(EMPTY_CENTER_DATA);
  const [loading, setLoading] = React.useState(true);
  const [submittingUserId, setSubmittingUserId] = React.useState('');

  const targetUserId = route.params?.userId || currentUser?._id || '';
  const currentUserId = currentUser?._id || '';
  const isSelf = targetUserId === currentUserId;

  const fetchCenterData = React.useCallback(async () => {
    if (!targetUserId) {
      setCenterData(EMPTY_CENTER_DATA);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const result = await socialService.getFollowCenter(targetUserId, currentUserId, isSelf);
      setCenterData(result);
      if (isSelf) {
        setUnreadFollowerCount(0);
        await notificationService.markFollowNotificationsRead(targetUserId);
        const unreadCount = await notificationService.getUnreadCount(targetUserId);
        setUnreadNotificationCount(unreadCount);
      }
    } catch (error) {
      Alert.alert('加载失败', '粉丝关注数据暂时无法获取，请稍后重试。');
      setCenterData(EMPTY_CENTER_DATA);
    } finally {
      setLoading(false);
    }
  }, [currentUserId, isSelf, setUnreadFollowerCount, setUnreadNotificationCount, targetUserId]);

  useFocusEffect(
    React.useCallback(() => {
      void fetchCenterData();
    }, [fetchCenterData])
  );

  const handleOpenDiaryFeed = React.useCallback(
    (row: FollowUserRow) => {
      navigation.navigate('OverallDiaryFeed', {
        viewedUserId: row.user_id,
        viewedUserName: row.display_name,
        viewedAvatarUrl: row.avatar_url,
      });
    },
    [navigation]
  );

  const handleToggleFollow = React.useCallback(
    async (row: FollowUserRow) => {
      if (!currentUserId || row.user_id === currentUserId) {
        return;
      }

      try {
        setSubmittingUserId(row.user_id);
        await socialService.toggleFollow(currentUserId, row.user_id);
        await fetchCenterData();
      } catch (error) {
        Alert.alert('操作失败', '关注状态更新失败，请稍后再试。');
      } finally {
        setSubmittingUserId('');
      }
    },
    [currentUserId, fetchCenterData]
  );

  const rows = activeTab === 'followers' ? centerData.followers : centerData.following;

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]} edges={['top']}>
      <View style={styles.container}>
        <View style={[styles.summaryCard, { backgroundColor: colors.surface }]}>
          <View style={styles.summaryRow}>
            <View style={styles.summaryItem}>
              <Text style={[styles.summaryValue, { color: colors.text }]}>{centerData.summary.follower_count}</Text>
              <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>粉丝</Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryItem}>
              <Text style={[styles.summaryValue, { color: colors.text }]}>{centerData.summary.following_count}</Text>
              <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>关注</Text>
            </View>
          </View>
          {isSelf && centerData.summary.unread_follower_count > 0 ? (
            <Text style={[styles.summaryHint, { color: colors.primary }]}>
              你有 {centerData.summary.unread_follower_count} 条新的粉丝关注，已进入后自动清空未读。
            </Text>
          ) : null}
        </View>

        <View style={styles.tabRow}>
          {([
            { key: 'followers', label: '粉丝' },
            { key: 'following', label: '关注' },
          ] as Array<{ key: FollowTabKey; label: string }>).map((tab) => {
            const selected = activeTab === tab.key;
            return (
              <Pressable
                key={tab.key}
                onPress={() => setActiveTab(tab.key)}
                style={[
                  styles.tabButton,
                  {
                    backgroundColor: selected
                      ? isDark
                        ? 'rgba(255,155,122,0.16)'
                        : '#FFF1E8'
                      : colors.surface,
                  },
                ]}
              >
                <Text style={[styles.tabButtonText, { color: selected ? colors.primary : colors.textSecondary }]}>
                  {tab.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {loading ? (
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>加载中...</Text>
          ) : rows.length === 0 ? (
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              {activeTab === 'followers' ? '还没有粉丝记录' : '还没有关注任何人'}
            </Text>
          ) : (
            rows.map((row) => {
              const canToggle = Boolean(currentUserId) && row.user_id !== currentUserId;
              const followed = Boolean(row.viewer_is_following);
              return (
                <Pressable
                  key={row.relation_id || `${activeTab}-${row.user_id}`}
                  onPress={() => handleOpenDiaryFeed(row)}
                  style={[styles.userRow, { backgroundColor: colors.surface }]}
                >
                  <View style={styles.userLeft}>
                    <View
                      style={[
                        styles.avatarWrap,
                        {
                          backgroundColor: isDark ? 'rgba(255,155,122,0.14)' : 'rgba(255,122,89,0.08)',
                        },
                      ]}
                    >
                      {row.avatar_url ? (
                        <Image source={{ uri: row.avatar_url }} style={styles.avatar} />
                      ) : (
                        <Text style={[styles.avatarFallback, { color: colors.primary }]}>
                          {getAvatarFallback(row.display_name)}
                        </Text>
                      )}
                    </View>
                    <View style={styles.userTextWrap}>
                      <View style={styles.nameLine}>
                        <Text style={[styles.userName, { color: colors.text }]}>{row.display_name}</Text>
                        {row.is_unread && activeTab === 'followers' ? <View style={styles.unreadDot} /> : null}
                      </View>
                      <Text numberOfLines={2} style={[styles.userBio, { color: colors.textSecondary }]}>
                        {row.bio || '这个人还没有留下自我介绍。'}
                      </Text>
                    </View>
                  </View>

                  {canToggle ? (
                    <Pressable
                      onPress={() => void handleToggleFollow(row)}
                      disabled={submittingUserId === row.user_id}
                      style={[
                        styles.followButton,
                        {
                          backgroundColor: followed
                            ? isDark
                              ? 'rgba(255,255,255,0.06)'
                              : '#F3F4F6'
                            : isDark
                              ? 'rgba(255,155,122,0.18)'
                              : '#FFF1E8',
                        },
                      ]}
                    >
                      <Ionicons
                        name={followed ? 'checkmark' : 'add'}
                        size={14}
                        color={followed ? colors.textSecondary : colors.primary}
                      />
                      <Text
                        style={[
                          styles.followButtonText,
                          { color: followed ? colors.textSecondary : colors.primary },
                        ]}
                      >
                        {followed ? '已关注' : '关注'}
                      </Text>
                    </Pressable>
                  ) : null}
                </Pressable>
              );
            })
          )}
        </ScrollView>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  summaryCard: {
    borderRadius: 22,
    padding: 18,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  summaryItem: {
    flex: 1,
    alignItems: 'center',
  },
  summaryDivider: {
    width: 1,
    height: 28,
    backgroundColor: '#E5E7EB',
  },
  summaryValue: {
    fontSize: 24,
    fontWeight: '800',
  },
  summaryLabel: {
    marginTop: 4,
    fontSize: 13,
    fontWeight: '600',
  },
  summaryHint: {
    marginTop: 12,
    fontSize: 13,
    lineHeight: 18,
    textAlign: 'center',
  },
  tabRow: {
    marginTop: 14,
    flexDirection: 'row',
    gap: 10,
  },
  tabButton: {
    flex: 1,
    borderRadius: 16,
    paddingVertical: 12,
    alignItems: 'center',
  },
  tabButtonText: {
    fontSize: 14,
    fontWeight: '800',
  },
  content: {
    paddingTop: 14,
    paddingBottom: 120,
    gap: 12,
  },
  emptyText: {
    marginTop: 48,
    fontSize: 14,
    textAlign: 'center',
  },
  userRow: {
    borderRadius: 20,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  userLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatarWrap: {
    width: 52,
    height: 52,
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
  userTextWrap: {
    flex: 1,
  },
  nameLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 999,
    backgroundColor: '#EF4444',
  },
  userName: {
    fontSize: 15,
    fontWeight: '800',
  },
  userBio: {
    marginTop: 4,
    fontSize: 12,
    lineHeight: 18,
  },
  followButton: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  followButtonText: {
    fontSize: 12,
    fontWeight: '800',
  },
});

export default FollowCenterScreen;
