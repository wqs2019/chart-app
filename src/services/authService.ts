import { AppleLoginPayload, AuthSession, User } from '../types/user';
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

class AuthService {
  async appleLogin(payload: AppleLoginPayload): Promise<AuthSession> {
    const response = await CloudService.callFunction<CloudResult<AuthSession>>('chart_user', {
      action: 'appleLogin',
      data: payload,
    });

    return unwrap(response);
  }

  async validateSession(token: string): Promise<AuthSession> {
    const response = await CloudService.callFunction<CloudResult<AuthSession>>('chart_user', {
      action: 'validateSession',
      data: { token },
    });

    return unwrap(response);
  }

  async getUser(userId: string): Promise<User> {
    const response = await CloudService.callFunction<CloudResult<User>>('chart_user', {
      action: 'get',
      data: { _id: userId },
    });

    return unwrap(response);
  }
}

export default new AuthService();
