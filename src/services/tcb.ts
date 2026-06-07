import adapter from '@cloudbase/adapter-rn';
import cloudbase from '@cloudbase/js-sdk';

import { TCB_CONFIG } from '../config/constant';

cloudbase.useAdapters(adapter);

let appInstance: any = null;

const initTCB = () => {
  if (appInstance) {
    return appInstance;
  }

  if (!TCB_CONFIG.env || TCB_CONFIG.env === 'YOUR_ENV_ID') {
    console.warn('[TCB] Please configure TCB_CONFIG.env first');
    return null;
  }

  appInstance = cloudbase.init({
    env: TCB_CONFIG.env,
    region: TCB_CONFIG.region,
  });

  return appInstance;
};

const ensureAuth = async (app: any) => {
  const auth = app.auth({ persistence: 'local' });

  if (auth.hasLoginState?.()) {
    return auth;
  }

  if (auth.anonymousAuthProvider) {
    await auth.anonymousAuthProvider().signIn();
    return auth;
  }

  if (auth.signInAnonymously) {
    await auth.signInAnonymously();
    return auth;
  }

  throw new Error('Anonymous auth is not available');
};

export const CloudService = {
  isConfigured() {
    return !!TCB_CONFIG.env && TCB_CONFIG.env !== 'YOUR_ENV_ID';
  },

  async callFunction<T = any>(name: string, data: any): Promise<{ code: number; message: string; data: T }> {
    if (!this.isConfigured()) {
      throw new Error('TCB env is not configured');
    }

    const app = initTCB();
    if (!app) {
      throw new Error('TCB init failed');
    }

    await ensureAuth(app);
    const response = await app.callFunction({ name, data });
    const result = JSON.parse(JSON.stringify(response.result || {}));

    if (result.code !== undefined) {
      return result;
    }

    if (result.success === false) {
      return {
        code: -1,
        message: result.message || 'Cloud function failed',
        data: result,
      };
    }

    return {
      code: 0,
      message: '',
      data: result,
    };
  },
};

export default CloudService;
