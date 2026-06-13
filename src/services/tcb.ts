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

const resolveAuthUid = async (app: any): Promise<string | null> => {
  const auth = await ensureAuth(app);
  const loginState = await auth.getLoginState?.();
  const loginUid = loginState?.user?.uid;
  if (loginUid) {
    return loginUid;
  }

  const currentUid = auth.currentUser?.uid;
  if (currentUid) {
    return currentUid;
  }

  return null;
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

  async uploadFile(cloudPath: string, filePath: string): Promise<string> {
    if (!this.isConfigured()) {
      throw new Error('TCB env is not configured');
    }

    const app = initTCB();
    if (!app) {
      throw new Error('TCB init failed');
    }

    await ensureAuth(app);
    const result = await app.uploadFile({
      cloudPath,
      filePath,
    });

    const normalized = JSON.parse(JSON.stringify(result || {}));
    return normalized.fileID || normalized.fileId || '';
  },

  async getAuthUid(): Promise<string | null> {
    if (!this.isConfigured()) {
      throw new Error('TCB env is not configured');
    }

    const app = initTCB();
    if (!app) {
      throw new Error('TCB init failed');
    }

    return resolveAuthUid(app);
  },

  async getTempFileURLs(fileIDs: string[]): Promise<Record<string, string>> {
    if (!fileIDs.length) {
      return {};
    }

    if (!this.isConfigured()) {
      throw new Error('TCB env is not configured');
    }

    const app = initTCB();
    if (!app) {
      throw new Error('TCB init failed');
    }

    await ensureAuth(app);
    const result = await app.getTempFileURL({
      fileList: fileIDs,
    });
    const normalized = JSON.parse(JSON.stringify(result || {}));
    const fileList = Array.isArray(normalized.fileList) ? normalized.fileList : [];

    return fileList.reduce((acc: Record<string, string>, item: { fileID?: string; tempFileURL?: string }) => {
      if (item?.fileID && item?.tempFileURL) {
        acc[item.fileID] = item.tempFileURL;
      }
      return acc;
    }, {});
  },
};

export default CloudService;
