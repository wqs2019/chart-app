import {
  CheckinAttachment,
  LeaderboardCode,
  StandardItem,
  UserCheckin,
  UserScoreSnapshot,
} from '../types/rank';
import CloudService from './tcb';

type RankCloudResult<T> = {
  success: boolean;
  data?: T;
  message?: string;
};

// #region debug-point A:leaderboard-api
const DEBUG_SERVER_URL = 'http://192.168.88.176:7777/event';
const DEBUG_SESSION_ID = 'leaderboard-empty';
const reportDebugEvent = (
  hypothesisId: string,
  msg: string,
  data: Record<string, unknown>,
  traceId?: string
) => {
  fetch(DEBUG_SERVER_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      sessionId: DEBUG_SESSION_ID,
      runId: 'pre-fix',
      hypothesisId,
      location: 'src/services/rankService.ts',
      msg: `[DEBUG] ${msg}`,
      data,
      traceId,
      ts: Date.now(),
    }),
  }).catch(() => {});
};
// #endregion

const callRankFunction = async <T>(action: string, data: Record<string, unknown>): Promise<T> => {
  // #region debug-point A:call-rank-function-request
  const traceId = `${action}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  reportDebugEvent('A', 'rankService.callRankFunction.request', { action, data }, traceId);
  // #endregion
  const response = await CloudService.callFunction<RankCloudResult<T>>('chart_rank', {
    action,
    data,
  });

  // #region debug-point B:call-rank-function-response
  reportDebugEvent(
    'B',
    'rankService.callRankFunction.response',
    {
      action,
      requestData: data,
      responseCode: response.code,
      responseMessage: response.message,
      responseData: response.data,
    },
    traceId
  );
  // #endregion
  if (response.code !== 0 || !response.data?.success || response.data.data === undefined) {
    // #region debug-point C:call-rank-function-error
    reportDebugEvent(
      'C',
      'rankService.callRankFunction.error',
      {
        action,
        requestData: data,
        responseCode: response.code,
        responseMessage: response.message,
        responseData: response.data,
      },
      traceId
    );
    // #endregion
    throw new Error(response.data?.message || response.message || '榜单请求失败');
  }

  return response.data.data;
};

const resolveCheckinAttachmentUrls = async (checkins: UserCheckin[]): Promise<UserCheckin[]> => {
  const fileIDs = Array.from(
    new Set(
      checkins.flatMap((checkin) =>
        (checkin.content?.attachments || [])
          .flatMap((attachment) => [attachment.file_id, attachment.thumbnail_file_id])
          .filter((fileId): fileId is string => Boolean(fileId))
      )
    )
  );

  if (!fileIDs.length) {
    return checkins;
  }

  const tempUrlMap = await CloudService.getTempFileURLs(fileIDs);

  return checkins.map((checkin) => ({
    ...checkin,
    content: checkin.content
      ? {
          ...checkin.content,
          attachments: (checkin.content.attachments || []).map((attachment) => ({
            ...attachment,
            temp_url: tempUrlMap[attachment.file_id] || attachment.temp_url,
            thumbnail_temp_url:
              (attachment.thumbnail_file_id && tempUrlMap[attachment.thumbnail_file_id]) ||
              attachment.thumbnail_temp_url,
          })),
        }
      : checkin.content,
  }));
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

  async getItemCheckinEntries(userId: string, code: LeaderboardCode, itemId: string): Promise<UserCheckin[]> {
    const checkins = await callRankFunction<UserCheckin[]>('getItemCheckinEntries', { userId, code, itemId });
    return resolveCheckinAttachmentUrls(checkins);
  },

  async saveCheckinEntry(
    userId: string,
    item: StandardItem,
    payload: {
      entryId?: string;
      title: string;
      description: string;
      attachments: CheckinAttachment[];
      visit_time: string;
      location_name: string;
      weather: string;
      mood: string;
    }
  ): Promise<UserCheckin> {
    const checkin = await callRankFunction<UserCheckin>('saveCheckinEntry', {
      userId,
      item,
      entryId: payload.entryId,
      content: {
        title: payload.title,
        description: payload.description,
        attachments: payload.attachments.map((attachment) => ({
          file_id: attachment.file_id,
          media_type: attachment.media_type,
          name: attachment.name,
          thumbnail_file_id: attachment.thumbnail_file_id,
          duration_ms: attachment.duration_ms,
        })),
        images: payload.attachments
          .filter((attachment) => attachment.media_type === 'image')
          .map((attachment) => attachment.file_id),
        visit_time: payload.visit_time,
        city_name: payload.location_name,
        location_name: payload.location_name,
        weather: payload.weather,
        mood: payload.mood,
        is_complete: Boolean(payload.title || payload.description || payload.attachments.length),
      },
    });

    const [resolved] = await resolveCheckinAttachmentUrls([checkin]);
    return resolved;
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
