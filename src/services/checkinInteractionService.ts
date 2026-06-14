import { CheckinComment, UserCheckin } from '../types/rank';
import CloudService from './tcb';

type CloudResult<T> = {
  success: boolean;
  data?: T;
  message?: string;
};

const callInteractionFunction = async <T>(action: string, data: Record<string, unknown>): Promise<T> => {
  const response = await CloudService.callFunction<CloudResult<T>>('chart_checkin_interaction', {
    action,
    data,
  });

  if (response.code !== 0 || !response.data?.success || response.data.data === undefined) {
    throw new Error(response.data?.message || response.message || '互动请求失败');
  }

  return response.data.data;
};

const resolveEntryAttachmentUrls = async (entry: UserCheckin): Promise<UserCheckin> => {
  const attachments = entry.content?.attachments || [];
  const fileIDs = Array.from(
    new Set(
      attachments
        .flatMap((attachment) => [attachment.file_id, attachment.thumbnail_file_id])
        .filter((fileId): fileId is string => Boolean(fileId))
    )
  );

  if (!fileIDs.length) {
    return entry;
  }

  const tempUrlMap = await CloudService.getTempFileURLs(fileIDs);

  return {
    ...entry,
    content: entry.content
      ? {
          ...entry.content,
          attachments: attachments.map((attachment) => ({
            ...attachment,
            temp_url: tempUrlMap[attachment.file_id] || attachment.temp_url,
            thumbnail_temp_url:
              (attachment.thumbnail_file_id && tempUrlMap[attachment.thumbnail_file_id]) ||
              attachment.thumbnail_temp_url,
          })),
        }
      : entry.content,
  };
};

export const checkinInteractionService = {
  async getEntryDetail(payload: {
    viewerUserId: string;
    ownerUserId: string;
    code: string;
    itemId: string;
    entryId: string;
  }): Promise<UserCheckin> {
    const entry = await callInteractionFunction<UserCheckin>('getEntryDetail', payload);
    return resolveEntryAttachmentUrls(entry);
  },

  async toggleLike(payload: {
    userId: string;
    ownerUserId: string;
    code: string;
    itemId: string;
    entryId: string;
  }): Promise<UserCheckin> {
    const entry = await callInteractionFunction<UserCheckin>('toggleLike', payload);
    return resolveEntryAttachmentUrls(entry);
  },

  async toggleFavorite(payload: {
    userId: string;
    ownerUserId: string;
    code: string;
    itemId: string;
    entryId: string;
  }): Promise<UserCheckin> {
    const entry = await callInteractionFunction<UserCheckin>('toggleFavorite', payload);
    return resolveEntryAttachmentUrls(entry);
  },

  async addComment(payload: {
    userId: string;
    ownerUserId: string;
    code: string;
    itemId: string;
    entryId: string;
    content: string;
  }): Promise<UserCheckin> {
    const entry = await callInteractionFunction<UserCheckin>('addComment', payload);
    return resolveEntryAttachmentUrls(entry);
  },

  async replyComment(payload: {
    userId: string;
    ownerUserId: string;
    code: string;
    itemId: string;
    entryId: string;
    commentId: string;
    content: string;
  }): Promise<UserCheckin> {
    const entry = await callInteractionFunction<UserCheckin>('replyComment', payload);
    return resolveEntryAttachmentUrls(entry);
  },
};

export const flattenComments = (comments: CheckinComment[]): CheckinComment[] =>
  comments.flatMap((comment) => [comment, ...(comment.replies || [])]);

export default checkinInteractionService;
