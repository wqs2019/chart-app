export type LeaderboardCode = 'world_travel' | 'china_travel' | 'activity' | 'overall';

export interface StandardItem {
  _id: string;
  type: 'world_travel' | 'china_travel' | 'activity';
  leaderboard_code: LeaderboardCode;
  name_zh: string;
  name_en: string;
  category: string; // 洲、区域、或玩乐分类
  tier?: string;     // A, B, C (仅限世界榜)
  icon?: string;
  is_active: boolean;
  sort_order: number;
}

export interface UserCheckin {
  _id?: string;
  user_id: string;
  leaderboard_code: LeaderboardCode;
  item_id: string;      // 关联 StandardItem._id
  source_type: 'history_backfill' | 'realtime';
  content?: {
    title?: string;
    description?: string;
    images?: string[];
    visit_time?: string;
    city_name?: string;
    is_complete?: boolean;
  };
  interaction?: {
    likes_count: number;
    comments_count: number;
    favorites_count: number;
  };
  created_at: Date | string;
}

export interface UserScoreSnapshot {
  _id: string;
  user_id: string;
  leaderboard_code: LeaderboardCode;
  raw_count: number;
  achievement_score: number;
  influence_score: number;
  final_score: number;
  rank: number;
  percentile: number;
  tags: string[];
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

