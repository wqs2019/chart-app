import {
  CheckinAttachment,
  LeaderboardCode,
  StandardItem,
  UserCheckin,
} from '../types/rank';
import CloudService from './tcb';

type CheckinCloudResult<T> = {
  success: boolean;
  data?: T;
  message?: string;
};

const callCheckinFunction = async <T>(action: string, data: Record<string, unknown>): Promise<T> => {
  const response = await CloudService.callFunction<CheckinCloudResult<T>>('chart_checkin', {
    action,
    data,
  });

  if (response.code !== 0 || !response.data?.success || response.data.data === undefined) {
    throw new Error(response.data?.message || response.message || '录入请求失败');
  }

  return response.data.data;
};

const resolveCheckinAttachmentUrls = async (checkins: UserCheckin[]): Promise<UserCheckin[]> => {
  const getEntryAttachments = (checkin: UserCheckin) => [
    ...(checkin.content?.attachments || []),
    ...((checkin.contents || []).flatMap((entry) => entry.attachments || [])),
  ];

  const fileIDs = Array.from(
    new Set(
      checkins.flatMap((checkin) =>
        getEntryAttachments(checkin)
          .flatMap((attachment) => [
            attachment.file_id,
            attachment.thumbnail_file_id,
            attachment.live_photo_video_file_id,
          ])
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
            live_photo_video_temp_url:
              (attachment.live_photo_video_file_id && tempUrlMap[attachment.live_photo_video_file_id]) ||
              attachment.live_photo_video_temp_url,
          })),
        }
      : checkin.content,
    contents: (checkin.contents || []).map((entry) => ({
      ...entry,
      attachments: (entry.attachments || []).map((attachment) => ({
        ...attachment,
        temp_url: tempUrlMap[attachment.file_id] || attachment.temp_url,
        thumbnail_temp_url:
          (attachment.thumbnail_file_id && tempUrlMap[attachment.thumbnail_file_id]) ||
          attachment.thumbnail_temp_url,
        live_photo_video_temp_url:
          (attachment.live_photo_video_file_id && tempUrlMap[attachment.live_photo_video_file_id]) ||
          attachment.live_photo_video_temp_url,
      })),
    })),
  }));
};

export const checkinService = {
  async getStandardItems(code: LeaderboardCode): Promise<StandardItem[]> {
    return callCheckinFunction<StandardItem[]>('getStandardItems', { code });
  },

  async getUserCheckins(userId: string, code: LeaderboardCode): Promise<UserCheckin[]> {
    const checkins = await callCheckinFunction<UserCheckin[]>('getUserCheckins', { userId, code });
    return resolveCheckinAttachmentUrls(checkins);
  },

  async getItemCheckinEntries(userId: string, code: LeaderboardCode, itemId: string): Promise<UserCheckin[]> {
    const checkins = await callCheckinFunction<UserCheckin[]>('getItemCheckinEntries', {
      userId,
      code,
      itemId,
    });
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
    const checkin = await callCheckinFunction<UserCheckin>('saveCheckinEntry', {
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
          live_photo_video_file_id: attachment.live_photo_video_file_id,
        })),
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

  async deleteCheckinEntry(userId: string, code: LeaderboardCode, itemId: string, entryId: string): Promise<void> {
    await callCheckinFunction<boolean>('deleteCheckinEntry', {
      userId,
      code,
      itemId,
      entryId,
    });
  },

  async toggleCheckin(userId: string, item: StandardItem, isChecked: boolean): Promise<void> {
    await callCheckinFunction<boolean>('toggleCheckin', { userId, item, isChecked });
  },

  async batchCheckin(userId: string, code: LeaderboardCode, itemIds: string[]): Promise<void> {
    await callCheckinFunction<boolean>('batchCheckin', { userId, code, itemIds });
  },
};

export default checkinService;
