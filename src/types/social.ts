export type FollowTabKey = 'followers' | 'following';

export type SocialSummary = {
  follower_count: number;
  following_count: number;
  unread_follower_count: number;
  viewer_is_following: boolean;
};

export type FollowUserRow = {
  relation_id: string;
  user_id: string;
  display_name: string;
  avatar_url: string;
  bio: string;
  followed_at: string;
  is_unread?: boolean;
  viewer_is_following?: boolean;
};

export type FollowCenterData = {
  summary: SocialSummary;
  followers: FollowUserRow[];
  following: FollowUserRow[];
};
