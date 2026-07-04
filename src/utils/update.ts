import * as Application from 'expo-application';
import { Platform } from 'react-native';

export const APP_STORE_URL = 'itms-apps://itunes.apple.com/app/id6781326899';

interface UpdateInfo {
  hasUpdate: boolean;
  currentVersion: string;
  latestVersion: string;
}

export const checkAppUpdate = async (): Promise<UpdateInfo | null> => {
  if (Platform.OS !== 'ios') {
    return null;
  }

  try {
    // const currentVersion = '0.0.1';
    const currentVersion = Application.nativeApplicationVersion || '1.0.0';
    const response = await fetch('https://itunes.apple.com/lookup?bundleId=com.traval.chartapp');
    const data = await response.json();
    console.log('Check update data:', data);

    if (data.resultCount > 0) {
      const latestVersion = data.results[0].version;
      
      // 简单的版本号比较 (例如: 1.0.1 > 1.0.0)
      const currentParts = currentVersion.split('.').map(Number);
      const latestParts = latestVersion.split('.').map(Number);
      
      let hasUpdate = false;
      for (let i = 0; i < Math.max(currentParts.length, latestParts.length); i++) {
        const current = currentParts[i] || 0;
        const latest = latestParts[i] || 0;
        if (latest > current) {
          hasUpdate = true;
          break;
        } else if (latest < current) {
          break;
        }
      }

      return {
        hasUpdate,
        currentVersion,
        latestVersion,
      };
    }
  } catch (error) {
    console.warn('Check update failed:', error);
  }

  return null;
};
