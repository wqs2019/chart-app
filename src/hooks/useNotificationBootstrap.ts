import React from 'react';
import * as Notifications from 'expo-notifications';
import { AppState } from 'react-native';

import authService from '../services/authService';
import { notificationService } from '../services/notificationService';
import { socialService } from '../services/socialService';
import { useAppStore } from '../store/appStore';
import { registerForPushNotificationsAsync, setAppBadgeCount } from '../utils/notifications';

export const useNotificationBootstrap = () => {
  const currentUser = useAppStore((state) => state.currentUser);
  const updateCurrentUser = useAppStore((state) => state.updateCurrentUser);
  const unreadNotificationCount = useAppStore((state) => state.unreadNotificationCount);
  const setUnreadFollowerCount = useAppStore((state) => state.setUnreadFollowerCount);
  const setUnreadLikeFavoriteCount = useAppStore((state) => state.setUnreadLikeFavoriteCount);
  const setUnreadCommentCount = useAppStore((state) => state.setUnreadCommentCount);
  const setUnreadNotificationCount = useAppStore((state) => state.setUnreadNotificationCount);

  const refreshUnreadNotificationCount = React.useCallback(async () => {
    if (!currentUser?._id) {
      setUnreadNotificationCount(0);
      return;
    }

    try {
      const count = await notificationService.getUnreadCount(currentUser._id);
      setUnreadNotificationCount(count);
    } catch (error) {
      console.warn('[Notification] load unread count failed:', error);
    }
  }, [currentUser?._id, setUnreadNotificationCount]);

  const refreshSocialUnreadCounts = React.useCallback(async () => {
    if (!currentUser?._id) {
      setUnreadFollowerCount(0);
      setUnreadLikeFavoriteCount(0);
      setUnreadCommentCount(0);
      return;
    }

    try {
      const [summary, likeFavoriteCount, commentCount] = await Promise.all([
        socialService.getSocialSummary(currentUser._id, currentUser._id),
        notificationService.getUnreadLikeFavoriteCount(currentUser._id),
        notificationService.getUnreadCommentCount(currentUser._id),
      ]);
      setUnreadFollowerCount(summary.unread_follower_count || 0);
      setUnreadLikeFavoriteCount(likeFavoriteCount);
      setUnreadCommentCount(commentCount);
    } catch (error) {
      console.warn('[Notification] load social unread counts failed:', error);
    }
  }, [
    currentUser?._id,
    setUnreadCommentCount,
    setUnreadFollowerCount,
    setUnreadLikeFavoriteCount,
  ]);

  React.useEffect(() => {
    if (!currentUser?._id) {
      return;
    }

    const syncPushToken = async () => {
      const token = await registerForPushNotificationsAsync();
      if (!token || token === currentUser.pushToken) {
        return;
      }

      try {
        await authService.updateUser({
          _id: currentUser._id,
          push_token: token,
        });
        await updateCurrentUser({
          ...currentUser,
          pushToken: token,
        });
      } catch (error) {
        console.warn('[Notification] sync push token failed:', error);
      }
    };

    void syncPushToken();
  }, [currentUser, updateCurrentUser]);

  React.useEffect(() => {
    void refreshUnreadNotificationCount();
    void refreshSocialUnreadCounts();
  }, [refreshSocialUnreadCounts, refreshUnreadNotificationCount]);

  React.useEffect(() => {
    const receivedSubscription = Notifications.addNotificationReceivedListener(() => {
      void refreshUnreadNotificationCount();
      void refreshSocialUnreadCounts();
    });
    const responseSubscription = Notifications.addNotificationResponseReceivedListener(() => {
      void refreshUnreadNotificationCount();
      void refreshSocialUnreadCounts();
    });
    const appStateSubscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        void refreshUnreadNotificationCount();
        void refreshSocialUnreadCounts();
      }
    });

    return () => {
      receivedSubscription.remove();
      responseSubscription.remove();
      appStateSubscription.remove();
    };
  }, [refreshSocialUnreadCounts, refreshUnreadNotificationCount]);

  React.useEffect(() => {
    void setAppBadgeCount(unreadNotificationCount);
  }, [unreadNotificationCount]);

};
