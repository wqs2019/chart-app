import { LeaderboardCode, UserScoreSnapshot } from '../types/rank';
import CloudService from './tcb';

type RankCloudResult<T> = {
  success: boolean;
  data?: T;
  message?: string;
};

const callRankFunction = async <T>(action: string, data: Record<string, unknown>): Promise<T> => {
  const response = await CloudService.callFunction<RankCloudResult<T>>('chart_rank', {
    action,
    data,
  });
  if (response.code !== 0 || !response.data?.success || response.data.data === undefined) {
    throw new Error(response.data?.message || response.message || '榜单请求失败');
  }

  return response.data.data;
};

export const rankService = {
  async getMyRank(userId: string, code: LeaderboardCode): Promise<UserScoreSnapshot | null> {
    return callRankFunction<UserScoreSnapshot | null>('getMyRank', { userId, code });
  },

  async getLeaderboardRankings(
    code: LeaderboardCode,
    page = 1,
    pageSize = 20
  ): Promise<UserScoreSnapshot[]> {
    return callRankFunction<UserScoreSnapshot[]>('getLeaderboardRankings', { code, page, pageSize });
  },
};

export default rankService;
