import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export const registerForPushNotificationsAsync = async (): Promise<string | null> => {
  let token: string | null = null;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF6B57',
    });
  }

  if (!Device.isDevice) {
    console.log('Push notifications require a physical device.');
    return null;
  }

  const existingPermission = (await Notifications.getPermissionsAsync()) as { granted?: boolean; status?: string };
  let isGranted = Boolean(existingPermission.granted || existingPermission.status === 'granted');

  if (!isGranted) {
    const requestedPermission = (await Notifications.requestPermissionsAsync()) as {
      granted?: boolean;
      status?: string;
    };
    isGranted = Boolean(requestedPermission.granted || requestedPermission.status === 'granted');
  }

  if (!isGranted) {
    console.log('Push notification permission not granted.');
    return null;
  }

  try {
    const projectId = Constants?.expoConfig?.extra?.eas?.projectId ?? Constants?.easConfig?.projectId;
    token = projectId
      ? (await Notifications.getExpoPushTokenAsync({ projectId })).data
      : (await Notifications.getExpoPushTokenAsync()).data;
  } catch (error) {
    console.log('Failed to get Expo push token:', error);
  }

  return token;
};

export const setAppBadgeCount = async (count: number) => {
  try {
    await Notifications.setBadgeCountAsync(Math.max(0, Number(count) || 0));
  } catch (error) {
    console.log('Failed to set app badge count:', error);
  }
};
