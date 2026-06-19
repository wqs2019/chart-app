export type AppNotificationType = 'follow' | 'like' | 'favorite' | 'comment' | 'reply';

export type NotificationRoutePayload = {
  entryId?: string;
  commentId?: string;
  viewedUserId?: string;
  viewedUserName?: string;
  viewedAvatarUrl?: string;
};

export type AppNotification = {
  _id: string;
  receiver_user_id: string;
  sender_user_id?: string;
  type: AppNotificationType;
  title: string;
  content: string;
  related_id?: string;
  is_read: boolean;
  created_at?: string | number;
  updated_at?: string | number;
  sender_snapshot?: {
    display_name?: string;
    avatar_url?: string;
  };
  extra_data?: {
    screen?: string;
    params?: NotificationRoutePayload;
    entryId?: string;
    viewed_user_id?: string;
    viewed_user_name?: string;
    viewed_avatar_url?: string;
  };
};

export type NotificationListResponse = {
  list: AppNotification[];
  total: number;
  page: number;
  pageSize: number;
};
