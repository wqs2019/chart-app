import { CheckinAttachment } from './rank';

export type FeedbackType = 'bug' | 'feature' | 'other';
export type FeedbackStatus = 'pending' | 'processing' | 'resolved' | 'rejected';

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
  user_snapshot?: {
    full_name?: string | null;
    email?: string | null;
    avatar_url?: string;
  };
};

export type SubmitFeedbackPayload = {
  user_id: string;
  type: FeedbackType;
  content: string;
  contact?: string;
  media?: CheckinAttachment[];
  source?: string;
  user_snapshot?: FeedbackRecord['user_snapshot'];
};
