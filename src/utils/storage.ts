import AsyncStorage from '@react-native-async-storage/async-storage';

class StorageUtil {
  static async set<T>(key: string, value: T) {
    await AsyncStorage.setItem(key, JSON.stringify(value));
  }

  static async get<T>(key: string): Promise<T | null> {
    const rawValue = await AsyncStorage.getItem(key);
    return rawValue ? (JSON.parse(rawValue) as T) : null;
  }
}

export default StorageUtil;
