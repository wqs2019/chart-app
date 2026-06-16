export type LeaderboardCode = 'world_travel' | 'china_travel' | 'activity' | 'overall';

export const CONTENT_LEADERBOARD_CODES: LeaderboardCode[] = [
  'world_travel',
  'china_travel',
  'activity',
];

export const RANK_LEADERBOARD_CODES: LeaderboardCode[] = [
  'overall',
  ...CONTENT_LEADERBOARD_CODES,
];

export interface StandardItem {
  _id: string;
  type: 'world_travel' | 'china_travel' | 'activity';
  leaderboard_code: LeaderboardCode;
  name_zh: string;
  name_en: string;
  category: string; // 洲、区域、或玩乐分类
  category_label_zh: string;
  continent?: string;
  region_group?: string;
  activity_group?: string;
  tier?: string;     // A, B, C (仅限世界榜)
  icon?: string;
  icon_original?: string;
  is_active: boolean;
  sort_order: number;
}

export interface CheckinAttachment {
  file_id: string;
  media_type: 'image' | 'video' | 'livePhoto';
  name?: string;
  temp_url?: string;
  thumbnail_file_id?: string;
  thumbnail_temp_url?: string;
  duration_ms?: number;
  live_photo_video_file_id?: string;
  live_photo_video_temp_url?: string;
}

export interface CheckinInteraction {
  likes_count: number;
  comments_count: number;
  favorites_count: number;
  viewer_has_liked?: boolean;
  viewer_has_favorited?: boolean;
}

export interface CheckinCommentAuthor {
  user_id: string;
  full_name?: string;
  username?: string;
  avatar_url?: string;
}

export interface CheckinComment {
  comment_id: string;
  parent_comment_id?: string;
  content: string;
  created_at?: Date | string;
  updated_at?: Date | string;
  author: CheckinCommentAuthor;
  replies?: CheckinComment[];
}

export interface CheckinContentEntry {
  entry_id?: string;
  title?: string;
  description?: string;
  attachments?: CheckinAttachment[];
  visit_time?: string;
  city_name?: string;
  location_name?: string;
  weather?: string;
  mood?: string;
  is_complete?: boolean;
  interaction?: CheckinInteraction;
  comments?: CheckinComment[];
  created_at?: Date | string;
  updated_at?: Date | string;
}

export interface UserCheckin {
  _id?: string;
  parent_checkin_id?: string;
  user_id: string;
  leaderboard_code: LeaderboardCode;
  item_id: string;      // 关联 StandardItem._id
  item_type?: string;
  is_active?: boolean;
  source_type: 'history_backfill' | 'realtime' | 'realtime_add';
  content?: CheckinContentEntry;
  contents?: CheckinContentEntry[];
  interaction?: CheckinInteraction;
  comments?: CheckinComment[];
  checked_in_at?: Date | string;
  created_at: Date | string;
  updated_at?: Date | string;
}

export interface UserScoreSnapshot {
  _id: string;
  user_id: string;
  full_name?: string;
  username?: string;
  avatar_url?: string;
  leaderboard_code: LeaderboardCode;
  raw_count: number;
  achievement_score: number;
  influence_score: number;
  final_score: number;
  rank: number;
  percentile: number;
  tags: string[];
  score_updated_at?: Date | string;
  world_raw_count?: number;
  updated_at: Date | string;
}

export interface LeaderboardConfig {
  code: LeaderboardCode;
  title: string;
  description: string;
  unit: string;
  icon: string;
}

export const LEADERBOARD_CONFIGS: Record<LeaderboardCode, LeaderboardConfig> = {
  world_travel: {
    code: 'world_travel',
    title: '世界旅游榜',
    description: '你去过多少个不同国家',
    unit: '个国家',
    icon: 'earth',
  },
  china_travel: {
    code: 'china_travel',
    title: '中国旅游榜',
    description: '你去过多少个不同省级行政区',
    unit: '个省份',
    icon: 'map',
  },
  activity: {
    code: 'activity',
    title: '玩乐项目榜',
    description: '你玩过多少种不同项目',
    unit: '项体验',
    icon: 'flash',
  },
  overall: {
    code: 'overall',
    title: '综合成就榜',
    description: '你的全站综合成就排名',
    unit: '分',
    icon: 'trophy',
  },
};
