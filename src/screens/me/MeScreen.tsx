import Ionicons from '@expo/vector-icons/Ionicons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAppTheme } from '../../hooks/useAppTheme';
import { RootStackParamList } from '../../navigation/RootNavigator';
import { notificationService } from '../../services/notificationService';
import { socialService } from '../../services/socialService';
import { useAppStore } from '../../store/appStore';

const MeScreen: React.FC = () => {
  const navigation = useNavigation();
  const { colors, isDark } = useAppTheme();
  const currentUser = useAppStore((state) => state.currentUser);
  const unreadFollowerCount = useAppStore((state) => state.unreadFollowerCount);
  const unreadLikeFavoriteCount = useAppStore((state) => state.unreadLikeFavoriteCount);
  const unreadCommentCount = useAppStore((state) => state.unreadCommentCount);
  const setUnreadFollowerCount = useAppStore((state) => state.setUnreadFollowerCount);
  const setUnreadNotificationCount = useAppStore((state) => state.setUnreadNotificationCount);
  const setUnreadLikeFavoriteCount = useAppStore((state) => state.setUnreadLikeFavoriteCount);
  const setUnreadCommentCount = useAppStore((state) => state.setUnreadCommentCount);
  const rootNavigation = navigation.getParent<NativeStackNavigationProp<RootStackParamList>>();

  const displayName =
    currentUser?.fullName || currentUser?.profile?.nickname || currentUser?.username || '旅行玩家';
  const avatarUrl = currentUser?.profile?.avatar_url || '';
  const bio = currentUser?.profile?.bio || '还没有填写个人简介，去补充一句你的旅行宣言吧。';
  const avatarFallback = displayName.trim().charAt(0).toUpperCase() || '我';
  const socialOverviewItems: Array<{
    title: string;
    icon: keyof typeof Ionicons.glyphMap;
  }> = [
    {
      title: '点赞与收藏',
      icon: 'heart-outline',
    },
    {
      title: '粉丝关注',
      icon: 'people-outline',
    },
    {
      title: '评论区',
      icon: 'chatbubble-ellipses-outline',
    },
  ];
  const gender = currentUser?.profile?.gender || 'unspecified';
  const genderMeta =
    gender === 'male'
      ? { icon: 'male' as const, backgroundColor: '#60A5FA' }
      : gender === 'female'
        ? { icon: 'female' as const, backgroundColor: '#F472B6' }
        : gender === 'other'
          ? { icon: 'transgender-outline' as const, backgroundColor: '#A78BFA' }
          : null;

  const primaryMenuItems: Array<{
    title: string;
    subtitle: string;
    icon: keyof typeof Ionicons.glyphMap;
    route: 'AccountSecurity' | 'AppSettings';
  }> = [
    {
      title: '账户与安全',
      subtitle: '查看 Apple 登录身份、邮箱、会话状态和安全信息',
      icon: 'shield-checkmark-outline',
      route: 'AccountSecurity',
    },
    {
      title: '应用设置',
      subtitle: '切换主题模式、清除缓存，统一管理体验偏好',
      icon: 'options-outline',
      route: 'AppSettings',
    },
  ];

  const supportMenuItems: Array<{
    title: string;
    subtitle: string;
    icon: keyof typeof Ionicons.glyphMap;
    route: 'AboutApp' | 'HelpFeedback';
  }> = [
    {
      title: '关于 App',
      subtitle: '查看产品定位、版本信息和当前版本亮点',
      icon: 'information-circle-outline',
      route: 'AboutApp',
    },
    {
      title: '帮助与反馈',
      subtitle: '查看常见问题，并发送问题反馈或功能建议',
      icon: 'help-circle-outline',
      route: 'HelpFeedback',
    },
  ];

  const handleOpenEditProfile = () => {
    rootNavigation?.navigate('EditProfile');
  };

  const fetchSocialSummary = React.useCallback(async () => {
    if (!currentUser?._id) {
      setUnreadFollowerCount(0);
      return;
    }

    try {
      const summary = await socialService.getSocialSummary(currentUser._id, currentUser._id);
      setUnreadFollowerCount(summary.unread_follower_count || 0);
    } catch (error) {
      console.warn('[Me] load social summary failed:', error);
    }
  }, [currentUser?._id, setUnreadFollowerCount]);

  const fetchUnreadNotificationCount = React.useCallback(async () => {
    if (!currentUser?._id) {
      setUnreadNotificationCount(0);
      return;
    }

    try {
      const count = await notificationService.getUnreadCount(currentUser._id);
      setUnreadNotificationCount(count);
    } catch (error) {
      console.warn('[Me] load unread notifications failed:', error);
    }
  }, [currentUser?._id, setUnreadNotificationCount]);

  const fetchUnreadInteractionCounts = React.useCallback(async () => {
    if (!currentUser?._id) {
      setUnreadLikeFavoriteCount(0);
      setUnreadCommentCount(0);
      return;
    }

    try {
      const [likeFavoriteCount, commentCount] = await Promise.all([
        notificationService.getUnreadLikeFavoriteCount(currentUser._id),
        notificationService.getUnreadCommentCount(currentUser._id),
      ]);
      setUnreadLikeFavoriteCount(likeFavoriteCount);
      setUnreadCommentCount(commentCount);
    } catch (error) {
      console.warn('[Me] load unread interactions failed:', error);
    }
  }, [currentUser?._id, setUnreadCommentCount, setUnreadLikeFavoriteCount]);

  useFocusEffect(
    React.useCallback(() => {
      void fetchSocialSummary();
      void fetchUnreadNotificationCount();
      void fetchUnreadInteractionCounts();
    }, [fetchSocialSummary, fetchUnreadInteractionCounts, fetchUnreadNotificationCount])
  );

  const handleOpenRoute = (
    route:
      | 'AccountSecurity'
      | 'AppSettings'
      | 'AboutApp'
      | 'HelpFeedback'
  ) => {
    rootNavigation?.navigate(route);
  };

  const handleOpenSocialModule = (title: string) => {
    if (title === '粉丝关注') {
      rootNavigation?.navigate('FollowCenter', {
        initialTab: 'followers',
      });
      return;
    }

    if (title === '点赞与收藏') {
      rootNavigation?.navigate('NotificationCenter', {
        title: '点赞与收藏',
        types: ['like', 'favorite'],
      });
      return;
    }

    if (title === '评论区') {
      rootNavigation?.navigate('NotificationCenter', {
        title: '评论区',
        types: ['comment', 'reply'],
      });
    }
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={[styles.heroCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.eyebrow, { color: colors.textSecondary }]}>PROFILE CENTER</Text>
          <View style={styles.heroMain}>
            <View
              style={[
                styles.avatarWrap,
                {
                  backgroundColor: isDark ? 'rgba(255,155,122,0.14)' : 'rgba(255,122,89,0.08)',
                  borderColor: colors.border,
                },
              ]}
            >
              {avatarUrl ? (
                <Image source={{ uri: avatarUrl }} style={styles.avatar} />
              ) : (
                <Text style={[styles.avatarFallback, { color: colors.primary }]}>{avatarFallback}</Text>
              )}
              {genderMeta ? (
                <View
                  style={[
                    styles.genderBadge,
                    {
                      backgroundColor: genderMeta.backgroundColor,
                      borderColor: colors.surface,
                    },
                  ]}
                >
                  <Ionicons name={genderMeta.icon} size={12} color="#FFFFFF" />
                </View>
              ) : null}
            </View>

            <View style={styles.heroTextWrap}>
              <View style={styles.nameRow}>
                <Text style={[styles.title, { color: colors.text }]}>{displayName}</Text>
                <Pressable
                  onPress={handleOpenEditProfile}
                  hitSlop={10}
                  style={[
                    styles.nameEditButton,
                    { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : '#FFF7F1' },
                  ]}
                >
                  <Ionicons name="create-outline" size={15} color={colors.primary} />
                </Pressable>
              </View>
              <Text style={[styles.subtitle, { color: colors.textSecondary }]}>{bio}</Text>
            </View>
          </View>
        </View>

        <View style={[styles.socialCard, { backgroundColor: colors.surface }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>互动中心</Text>
          <View style={styles.socialGrid}>
            {socialOverviewItems.map((item) => (
              <Pressable
                key={item.title}
                onPress={() => handleOpenSocialModule(item.title)}
                style={[
                  styles.socialGridItem,
                  {
                    backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : '#FFF7F1',
                  },
                ]}
              >
                {item.title === '点赞与收藏' && unreadLikeFavoriteCount > 0 ? (
                  <View style={styles.socialBadge}>
                    <Text style={styles.socialBadgeText}>{Math.min(unreadLikeFavoriteCount, 99)}</Text>
                  </View>
                ) : null}
                {item.title === '粉丝关注' && unreadFollowerCount > 0 ? (
                  <View style={styles.socialBadge}>
                    <Text style={styles.socialBadgeText}>{Math.min(unreadFollowerCount, 99)}</Text>
                  </View>
                ) : null}
                {item.title === '评论区' && unreadCommentCount > 0 ? (
                  <View style={styles.socialBadge}>
                    <Text style={styles.socialBadgeText}>{Math.min(unreadCommentCount, 99)}</Text>
                  </View>
                ) : null}
                <View
                  style={[
                    styles.socialIconWrap,
                    { backgroundColor: isDark ? 'rgba(255,155,122,0.16)' : 'rgba(255,122,89,0.10)' },
                  ]}
                >
                  <Ionicons name={item.icon} size={18} color={colors.primary} />
                </View>
                <Text style={[styles.socialItemTitle, { color: colors.text }]}>{item.title}</Text>
              </Pressable>
            ))}
          </View>
        </View>

        <View style={[styles.menuCard, { backgroundColor: colors.surface }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>常用设置</Text>
          {primaryMenuItems.map((item, index) => (
            <Pressable
              key={item.title}
              onPress={() => handleOpenRoute(item.route)}
              style={[
                styles.menuRow,
                index === primaryMenuItems.length - 1 ? styles.menuRowLast : null,
                { borderBottomColor: colors.border },
              ]}
            >
              <View
                style={[
                  styles.menuIconWrap,
                  { backgroundColor: isDark ? 'rgba(255,155,122,0.16)' : 'rgba(255,122,89,0.10)' },
                ]}
              >
                <Ionicons name={item.icon} size={18} color={colors.primary} />
              </View>
              <View style={styles.menuTextWrap}>
                <Text style={[styles.menuTitle, { color: colors.text }]}>{item.title}</Text>
                <Text style={[styles.menuSubtitle, { color: colors.textSecondary }]}>{item.subtitle}</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
            </Pressable>
          ))}
        </View>

        <View style={[styles.menuCard, { backgroundColor: colors.surface }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>帮助与说明</Text>
          {supportMenuItems.map((item, index) => (
            <Pressable
              key={item.title}
              onPress={() => handleOpenRoute(item.route)}
              style={[
                styles.menuRow,
                index === supportMenuItems.length - 1 ? styles.menuRowLast : null,
                { borderBottomColor: colors.border },
              ]}
            >
              <View
                style={[
                  styles.menuIconWrap,
                  { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#FFF7F1' },
                ]}
              >
                <Ionicons name={item.icon} size={18} color={colors.primary} />
              </View>
              <View style={styles.menuTextWrap}>
                <Text style={[styles.menuTitle, { color: colors.text }]}>{item.title}</Text>
                <Text style={[styles.menuSubtitle, { color: colors.textSecondary }]}>{item.subtitle}</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
            </Pressable>
          ))}
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
    paddingBottom: 120,
    gap: 16,
  },
  heroCard: {
    borderWidth: 0,
    borderRadius: 28,
    padding: 20,
  },
  eyebrow: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1,
  },
  heroMain: {
    marginTop: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  avatarWrap: {
    width: 84,
    height: 84,
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  avatar: {
    width: '100%',
    height: '100%',
  },
  avatarFallback: {
    fontSize: 30,
    fontWeight: '900',
  },
  genderBadge: {
    position: 'absolute',
    right: 2,
    bottom: 2,
    width: 20,
    height: 20,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroTextWrap: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontSize: 28,
    fontWeight: '900',
    flexShrink: 1,
  },
  nameEditButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  subtitle: {
    marginTop: 10,
    fontSize: 14,
    lineHeight: 21,
  },
  menuCard: {
    borderRadius: 22,
    padding: 18,
  },
  socialCard: {
    borderRadius: 22,
    padding: 18,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
  },
  socialGrid: {
    marginTop: 14,
    flexDirection: 'row',
    gap: 10,
  },
  socialGridItem: {
    flex: 1,
    borderRadius: 18,
    paddingHorizontal: 12,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  socialBadge: {
    position: 'absolute',
    top: 10,
    right: 10,
    minWidth: 20,
    height: 20,
    paddingHorizontal: 5,
    borderRadius: 999,
    backgroundColor: '#EF4444',
    alignItems: 'center',
    justifyContent: 'center',
  },
  socialBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
  },
  socialIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  socialItemTitle: {
    marginTop: 12,
    fontSize: 14,
    fontWeight: '800',
    textAlign: 'center',
  },
  sectionSubtitle: {
    marginTop: 4,
    fontSize: 12,
    lineHeight: 17,
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    marginTop: 12,
  },
  menuRowLast: {
    borderBottomWidth: 0,
    paddingBottom: 0,
  },
  menuIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuTextWrap: {
    flex: 1,
  },
  menuBadge: {
    minWidth: 20,
    height: 20,
    paddingHorizontal: 5,
    borderRadius: 999,
    backgroundColor: '#EF4444',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  menuBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
  },
  menuTitle: {
    fontSize: 15,
    fontWeight: '800',
  },
  menuSubtitle: {
    marginTop: 4,
    fontSize: 13,
    lineHeight: 19,
  },
});

export default MeScreen;
