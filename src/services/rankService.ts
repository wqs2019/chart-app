import { LeaderboardCode, StandardItem, UserCheckin } from '../types/rank';
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
  /**
   * 获取指定榜单的标准项列表
   */
  async getStandardItems(code: LeaderboardCode): Promise<StandardItem[]> {
    return callRankFunction<StandardItem[]>('getStandardItems', { code });
  },

  /**
   * 获取用户在指定榜单下的所有打卡记录
   */
  async getUserCheckins(userId: string, code: LeaderboardCode): Promise<UserCheckin[]> {
    return callRankFunction<UserCheckin[]>('getUserCheckins', { userId, code });
  },

  /**
   * 提交/更新打卡记录 (幂等)
   */
  async toggleCheckin(userId: string, item: StandardItem, isChecked: boolean): Promise<void> {
    await callRankFunction<boolean>('toggleCheckin', { userId, item, isChecked });
  },

  /**
   * 批量打卡 (初始建档使用)
   */
  async batchCheckin(userId: string, code: LeaderboardCode, itemIds: string[]): Promise<void> {
    await callRankFunction<boolean>('batchCheckin', { userId, code, itemIds });
  },
};

export default rankService;
