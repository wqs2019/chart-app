import CloudService from './tcb';
import { FeedbackRecord, SubmitFeedbackPayload } from '../types/feedback';

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
}

export default new FeedbackService();
