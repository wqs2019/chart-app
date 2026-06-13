import CloudService from './tcb';
import { TCB_CONFIG } from '../config/constant';

if (typeof global !== 'undefined') {
  if (!(global as any).navigator) {
    (global as any).navigator = {};
  }
  if (!(global as any).navigator.userAgent) {
    (global as any).navigator.userAgent = 'ReactNative';
  }
}

const COS = require('cos-js-sdk-v5');

type UploadCredentials = {
  tmpSecretId: string;
  tmpSecretKey: string;
  sessionToken: string;
  expiredTime: number;
  startTime: number;
  bucket: string;
  region: string;
  publicDomain?: string;
};

type UploadResult = {
  success: boolean;
  data?: {
    url: string;
    fileId: string;
    cloudPath: string;
  };
  message?: string;
};

class ImageService {
  private cos: any = null;

  private async getTempCredentials(): Promise<UploadCredentials> {
    const response = await CloudService.callFunction<{
      success?: boolean;
      data?: UploadCredentials;
      message?: string;
    }>('chart_rank', {
      action: 'getUploadCredentials',
      data: {},
    });

    const result = response.data;
    if (!result?.success || !result.data) {
      throw new Error(result?.message || response.message || '获取上传凭证失败');
    }

    return result.data;
  }

  private async initCOS() {
    if (this.cos) {
      return this.cos;
    }

    this.cos = new COS({
      getAuthorization: async (_options: unknown, callback: (payload: Record<string, unknown>) => void) => {
        const credentials = await this.getTempCredentials();
        callback({
          TmpSecretId: credentials.tmpSecretId,
          TmpSecretKey: credentials.tmpSecretKey,
          SecurityToken: credentials.sessionToken,
          StartTime: credentials.startTime,
          ExpiredTime: credentials.expiredTime,
        });
      },
    });

    return this.cos;
  }

  async generateCloudPath(extension: string, folder = 'checkins') {
    const timestamp = Date.now();
    const randomStr = Math.random().toString(36).slice(2, 8);
    return {
      data: {
        cloudPath: `${folder}/${timestamp}-${randomStr}.${extension}`,
      },
    };
  }

  async uploadAsset(uri: string, cloudPath: string, mimeType = 'image/jpeg'): Promise<UploadResult> {
    try {
      const [cos, credentials] = await Promise.all([this.initCOS(), this.getTempCredentials()]);
      const response = await fetch(uri);
      const blob = await response.blob();

      return await new Promise((resolve) => {
        cos.putObject(
          {
            Bucket: credentials.bucket,
            Region: credentials.region,
            Key: cloudPath,
            Body: blob,
            ContentType: mimeType,
          },
          (error: { message?: string } | null, data: { Location?: string } | undefined) => {
            if (error) {
              resolve({
                success: false,
                message: error.message || '上传失败',
              });
              return;
            }

            const publicBase =
              credentials.publicDomain ||
              (data?.Location ? `https://${data.Location.split('/')[0]}` : '');

            const normalizedBase = publicBase.endsWith('/') ? publicBase.slice(0, -1) : publicBase;
            const publicUrl = normalizedBase ? `${normalizedBase}/${cloudPath}` : '';
            const fileId = `cloud://${TCB_CONFIG.env}.${credentials.bucket}/${cloudPath}`;

            resolve({
              success: true,
              data: {
                url: publicUrl,
                fileId,
                cloudPath,
              },
            });
          }
        );
      });
    } catch (error: any) {
      return {
        success: false,
        message: error?.message || '上传准备失败',
      };
    }
  }
}

export const imageService = new ImageService();
export default imageService;
