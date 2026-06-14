import { AppNotification, AppNotificationType, NotificationListResponse } from '../types/notification';
import CloudService from './tcb';

type CloudResult<T> = {
  success: boolean;
  data?: T;
  message?: string;
};

const unwrap = <T>(response: { code: number; message: string; data: CloudResult<T> }): T => {
  if (response.code !== 0 || !response.data?.success || response.data.data === undefined) {
    throw new Error(response.data?.message || response.message || '请求失败');
  }

  return response.data.data;
};

const callNotificationFunction = async <T>(action: string, data: Record<string, unknown>): Promise<T> => {
  const response = await CloudService.callFunction<CloudResult<T>>('chart_notification', {
    action,
    data,
  });

  return unwrap(response);
};

export const notificationService = {
  async getNotifications(
    userId: string,
    page = 1,
    pageSize = 20,
    types?: AppNotificationType[]
  ): Promise<NotificationListResponse> {
    return callNotificationFunction<NotificationListResponse>('getNotifications', {
      userId,
      page,
      pageSize,
      types,
    });
  },

  async markRead(userId: string, notificationIds?: string[], markAll = false): Promise<boolean> {
    return callNotificationFunction<boolean>('markRead', {
      userId,
      notificationIds,
      markAll,
    });
  },

  async getUnreadCount(userId: string, types?: AppNotificationType[]): Promise<number> {
    return callNotificationFunction<number>('getUnreadCount', {
      userId,
      types,
    });
  },

  async getUnreadFollowCount(userId: string): Promise<number> {
    return callNotificationFunction<number>('getUnreadCount', {
      userId,
      types: ['follow'],
    });
  },

  async getUnreadLikeFavoriteCount(userId: string): Promise<number> {
    return callNotificationFunction<number>('getUnreadCount', {
      userId,
      types: ['like', 'favorite'],
    });
  },

  async getUnreadCommentCount(userId: string): Promise<number> {
    return callNotificationFunction<number>('getUnreadCount', {
      userId,
      types: ['comment', 'reply'],
    });
  },

  async markFollowNotificationsRead(userId: string): Promise<boolean> {
    return callNotificationFunction<boolean>('markRead', {
      userId,
      markAll: true,
      types: ['follow'],
    });
  },
};

export type { AppNotification };
