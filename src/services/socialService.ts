import { FollowCenterData, SocialSummary } from '../types/social';
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

const callSocialFunction = async <T>(action: string, data: Record<string, unknown>): Promise<T> => {
  const response = await CloudService.callFunction<CloudResult<T>>('chart_social', {
    action,
    data,
  });

  return unwrap(response);
};

export const socialService = {
  async getSocialSummary(userId: string, viewerUserId?: string): Promise<SocialSummary> {
    return callSocialFunction<SocialSummary>('getSocialSummary', { userId, viewerUserId });
  },

  async toggleFollow(userId: string, targetUserId: string): Promise<SocialSummary> {
    return callSocialFunction<SocialSummary>('toggleFollow', { userId, targetUserId });
  },

  async getFollowCenter(userId: string, viewerUserId?: string, markFollowersRead = false): Promise<FollowCenterData> {
    return callSocialFunction<FollowCenterData>('getFollowCenter', {
      userId,
      viewerUserId,
      markFollowersRead,
    });
  },

  async getUnreadFollowerCount(userId: string): Promise<number> {
    return callSocialFunction<number>('getUnreadFollowerCount', { userId });
  },
};
