import { CheckinAttachment } from './rank';

// 普通反馈 + 针对某篇日记的举报
export type FeedbackType = 'bug' | 'feature' | 'other' | 'report_entry';
export type FeedbackStatus = 'pending' | 'processing' | 'resolved' | 'rejected';

// 举报原因枚举，前后端与云函数校验保持一致
export type ReportReason = 'spam' | 'abuse' | 'harassment' | 'pornography' | 'violence' | 'fraud' | 'other';

// 举报目标用户的精简快照，用于后台列表直接展示，避免额外联表
export type FeedbackTargetUserSnapshot = {
  full_name?: string | null;
  avatar_url?: string;
};

// 被举报日记的精简快照，用于审核列表快速展示上下文
export type FeedbackTargetEntrySnapshot = {
  title?: string;
  description?: string;
  media_count?: number;
  item_name_zh?: string;
};

// 反馈提交人的快照，保留 email 方便运营回查与联系
export type FeedbackUserSnapshot = {
  full_name?: string | null;
  email?: string | null;
  avatar_url?: string;
};

export type FeedbackRecord = {
  _id?: string;
  user_id: string;
  type: FeedbackType;
  content: string;
  contact?: string;
  media?: CheckinAttachment[];
  status?: FeedbackStatus;
  source?: string;
  created_at?: string | number | Date;
  updated_at?: string | number | Date;

  // 仅当 type === 'report_entry' 时存在
  report_reason?: ReportReason;
  target_user_id?: string;
  target_entry_id?: string;
  // 标记这篇记录归属的标准项，方便后续按景点/国家/项目定位上下文
  target_item_id?: string;
  target_user_snapshot?: FeedbackTargetUserSnapshot;
  target_entry_snapshot?: FeedbackTargetEntrySnapshot;
  user_snapshot?: FeedbackUserSnapshot;
};

export type SubmitFeedbackPayload = {
  user_id: string;
  type: FeedbackType;
  content: string;
  contact?: string;
  media?: CheckinAttachment[];
  source?: string;
  report_reason?: ReportReason;
  target_user_id?: string;
  target_entry_id?: string;
  target_item_id?: string;
  target_user_snapshot?: FeedbackTargetUserSnapshot;
  target_entry_snapshot?: FeedbackTargetEntrySnapshot;
  user_snapshot?: FeedbackUserSnapshot;
};
