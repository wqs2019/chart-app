import { AppleLoginPayload, AuthSession, UpdateUserPayload, User } from '../types/user';
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

const resolveUserAvatarUrl = async <T extends { profile?: User['profile'] }>(user: T): Promise<T> => {
  const avatarFileId = user.profile?.avatar_file_id;
  if (!avatarFileId) {
    return user;
  }

  try {
    const tempUrlMap = await CloudService.getTempFileURLs([avatarFileId]);
    const resolvedAvatarUrl = tempUrlMap[avatarFileId] || user.profile?.avatar_url || '';

    return {
      ...user,
      profile: {
        ...(user.profile || {}),
        avatar_url: resolvedAvatarUrl,
      },
    };
  } catch (error) {
    console.warn('[Auth] resolve avatar url failed:', error);
    return user;
  }
};

class AuthService {
  async appleLogin(payload: AppleLoginPayload): Promise<AuthSession> {
    const response = await CloudService.callFunction<CloudResult<AuthSession>>('chart_user', {
      action: 'appleLogin',
      data: payload,
    });

    const session = unwrap(response);
    return {
      ...session,
      user: await resolveUserAvatarUrl(session.user),
    };
  }

  async validateSession(token: string): Promise<AuthSession> {
    const response = await CloudService.callFunction<CloudResult<AuthSession>>('chart_user', {
      action: 'validateSession',
      data: { token },
    });

    const session = unwrap(response);
    return {
      ...session,
      user: await resolveUserAvatarUrl(session.user),
    };
  }

  async getUser(userId: string): Promise<User> {
    const response = await CloudService.callFunction<CloudResult<User>>('chart_user', {
      action: 'get',
      data: { _id: userId },
    });

    const user = unwrap(response);
    return resolveUserAvatarUrl(user);
  }

  async updateUser(payload: UpdateUserPayload): Promise<boolean> {
    const response = await CloudService.callFunction<CloudResult<boolean>>('chart_user', {
      action: 'update',
      data: payload,
    });

    return unwrap(response);
  }

  async deleteAccount(userId: string): Promise<boolean> {
    const response = await CloudService.callFunction<CloudResult<boolean>>('chart_user', {
      action: 'delete',
      data: { _id: userId },
    });

    return unwrap(response);
  }

  async getAdminStatus(appleUserId: string): Promise<boolean> {
    const response = await CloudService.callFunction<CloudResult<{ isAdmin: boolean }>>('chart_user', {
      action: 'getAdminStatus',
      data: { appleUserId },
    });

    return unwrap(response).isAdmin;
  }

  async getAdminUserList(
    page = 1,
    pageSize = 20,
    keyword = '',
    filter = 'all'
  ): Promise<{
    list: User[];
    total: number;
    page: number;
    summary: { totalUsers: number; adminUsers: number; deletedUsers: number; frozenUsers: number };
  }> {
    const response = await CloudService.callFunction<
      CloudResult<{
        list: User[];
        total: number;
        page: number;
        summary: { totalUsers: number; adminUsers: number; deletedUsers: number; frozenUsers: number };
      }>
    >('chart_user', {
      action: 'getAdminUserList',
      data: { page, pageSize, keyword, filter },
    });

    const result = unwrap(response);
    const resolvedList = await Promise.all(result.list.map((user) => resolveUserAvatarUrl(user)));
    return {
      list: resolvedList,
      total: result.total,
      page: result.page || page,
      summary: result.summary || { totalUsers: 0, adminUsers: 0, deletedUsers: 0, frozenUsers: 0 },
    };
  }

  async setAdminUserFrozenStatus(payload: {
    adminUserId: string;
    targetUserId: string;
    frozen: boolean;
  }): Promise<boolean> {
    const response = await CloudService.callFunction<CloudResult<boolean>>('chart_user', {
      action: 'setAdminUserFrozenStatus',
      data: payload,
    });

    return unwrap(response);
  }

  async updateLastActiveAt(userId: string): Promise<boolean> {
    const response = await CloudService.callFunction<CloudResult<boolean>>('chart_user', {
      action: 'updateLastActiveAt',
      data: { _id: userId },
    });

    return unwrap(response);
  }
}

export default new AuthService();
