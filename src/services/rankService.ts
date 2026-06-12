import cloudbase from '@cloudbase/js-sdk';
import adapter from '@cloudbase/adapter-rn';
import { TCB_CONFIG } from '../config/constant';
import { LeaderboardCode, StandardItem, UserCheckin } from '../types/rank';

cloudbase.useAdapters(adapter);

let appInstance: any = null;

const getApp = () => {
  if (!appInstance) {
    appInstance = cloudbase.init({
      env: TCB_CONFIG.env,
    });
  }
  return appInstance;
};

export const rankService = {
  /**
   * 获取指定榜单的标准项列表
   */
  async getStandardItems(code: LeaderboardCode): Promise<StandardItem[]> {
    const { result } = await getApp().callFunction({
      name: 'chart_rank',
      data: {
        action: 'getStandardItems',
        data: { code },
      },
    });

    if (result.success) {
      return result.data as StandardItem[];
    }
    throw new Error(result.message || '获取标准项失败');
  },

  /**
   * 获取用户在指定榜单下的所有打卡记录
   */
  async getUserCheckins(userId: string, code: LeaderboardCode): Promise<UserCheckin[]> {
    const { result } = await getApp().callFunction({
      name: 'chart_rank',
      data: {
        action: 'getUserCheckins',
        data: { userId, code },
      },
    });

    if (result.success) {
      return result.data as UserCheckin[];
    }
    throw new Error(result.message || '获取打卡记录失败');
  },

  /**
   * 提交/更新打卡记录 (幂等)
   */
  async toggleCheckin(userId: string, item: StandardItem, isChecked: boolean): Promise<void> {
    const { result } = await getApp().callFunction({
      name: 'chart_rank',
      data: {
        action: 'toggleCheckin',
        data: { userId, item, isChecked },
      },
    });

    if (!result.success) {
      throw new Error(result.message || '切换打卡状态失败');
    }
  },

  /**
   * 批量打卡 (初始建档使用)
   */
  async batchCheckin(userId: string, code: LeaderboardCode, itemIds: string[]): Promise<void> {
    // 批量打卡建议也封装进云函数 action
    const { result } = await getApp().callFunction({
      name: 'chart_rank',
      data: {
        action: 'batchCheckin',
        data: { userId, code, itemIds },
      },
    });

    if (!result.success) {
      throw new Error(result.message || '批量打卡失败');
    }
  }
};

export default rankService;
