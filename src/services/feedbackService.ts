import CloudService from './tcb';
import { FeedbackRecord, FeedbackStatus, FeedbackType, ReportReason, SubmitFeedbackPayload } from '../types/feedback';

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

class FeedbackService {
  async submitFeedback(payload: SubmitFeedbackPayload): Promise<FeedbackRecord> {
    const response = await CloudService.callFunction<CloudResult<FeedbackRecord>>('chart_feedback', {
      action: 'add',
      data: payload,
    });

    return unwrap(response);
  }

  async submitEntryReport(payload: {
    user_id: string;
    target_user_id: string;
    target_entry_id: string;
    target_item_id: string;
    report_reason: ReportReason;
    content: string;
    source?: string;
    user_snapshot?: SubmitFeedbackPayload['user_snapshot'];
    target_user_snapshot?: SubmitFeedbackPayload['target_user_snapshot'];
    target_entry_snapshot?: SubmitFeedbackPayload['target_entry_snapshot'];
  }): Promise<FeedbackRecord> {
    return this.submitFeedback({
      ...payload,
      type: 'report_entry',
    });
  }

  async getAdminFeedbacks(params: {
    appleUserId: string;
    type?: FeedbackType | 'all';
    status?: FeedbackStatus | 'all';
    limit?: number;
  }): Promise<FeedbackRecord[]> {
    const response = await CloudService.callFunction<CloudResult<FeedbackRecord[]>>('chart_feedback', {
      action: 'list',
      data: params,
    });

    return unwrap(response);
  }

  async updateAdminFeedbackStatus(params: {
    appleUserId: string;
    feedbackId: string;
    status: FeedbackStatus;
  }): Promise<FeedbackRecord> {
    const response = await CloudService.callFunction<CloudResult<FeedbackRecord>>('chart_feedback', {
      action: 'updateStatus',
      data: params,
    });

    return unwrap(response);
  }
}

export default new FeedbackService();
