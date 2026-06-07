import { CreateUserPayload, User } from '../types/user';
import CloudService from './tcb';

type CloudResult<T> = {
  success: boolean;
  data?: T;
  message?: string;
};

type PaginatedListResult<T> = {
  list?: T[];
  total?: number;
  page?: number;
  pageSize?: number;
};

const unwrap = <T>(response: { code: number; message: string; data: CloudResult<T> }): T => {
  if (response.code !== 0 || !response.data?.success || response.data.data === undefined) {
    throw new Error(response.data?.message || response.message || '请求失败');
  }

  return response.data.data;
};

class UserService {
  async createUser(payload: CreateUserPayload): Promise<User> {
    const response = await CloudService.callFunction<CloudResult<User>>('user', {
      action: 'add',
      data: payload,
    });
    return unwrap(response);
  }

  async getUser(userId: string): Promise<User> {
    const response = await CloudService.callFunction<CloudResult<User>>('user', {
      action: 'get',
      data: { _id: userId },
    });
    return unwrap(response);
  }

  async listUsers(): Promise<User[]> {
    const response = await CloudService.callFunction<CloudResult<User[] | PaginatedListResult<User>>>('user', {
      action: 'list',
      data: {},
    });
    if (response.code !== 0 || !response.data?.success || response.data.data === undefined) {
      throw new Error(response.data?.message || response.message || '请求失败');
    }

    const payload = response.data.data;
    const users = Array.isArray(payload) ? payload : payload?.list ?? [];

    return users;
  }

  async updateUser(userId: string, payload: Partial<CreateUserPayload>): Promise<boolean> {
    const response = await CloudService.callFunction<CloudResult<boolean>>('user', {
      action: 'update',
      data: {
        _id: userId,
        ...payload,
      },
    });
    return unwrap(response);
  }

  async deleteUser(userId: string): Promise<boolean> {
    const response = await CloudService.callFunction<CloudResult<boolean>>('user', {
      action: 'delete',
      data: { _id: userId },
    });
    return unwrap(response);
  }
}

export default new UserService();
