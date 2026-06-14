import Ionicons from '@expo/vector-icons/Ionicons';
import * as FileSystem from 'expo-file-system/legacy';
import React from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import Button from '../../components/common/Button';
import { useAppTheme } from '../../hooks/useAppTheme';
import { useAppStore } from '../../store/appStore';

const themeOptions: Array<{ label: string; value: 'light' | 'dark' | 'system' }> = [
  { label: '浅色', value: 'light' },
  { label: '深色', value: 'dark' },
  { label: '跟随系统', value: 'system' },
];

async function clearAppCacheFiles() {
  const cacheDirectory = FileSystem.cacheDirectory;

  if (!cacheDirectory) {
    return 0;
  }

  const fileNames = await FileSystem.readDirectoryAsync(cacheDirectory);

  for (const fileName of fileNames) {
    await FileSystem.deleteAsync(`${cacheDirectory}${fileName}`, { idempotent: true });
  }

  return fileNames.length;
}

const AppSettingsScreen: React.FC = () => {
  const { colors, isDark } = useAppTheme();
  const theme = useAppStore((state) => state.theme);
  const setTheme = useAppStore((state) => state.setTheme);
  const [isClearingCache, setIsClearingCache] = React.useState(false);
  const [lastClearedCount, setLastClearedCount] = React.useState<number | null>(null);

  const handleClearCache = () => {
    Alert.alert('清除缓存', '将清理应用内的图片预览、临时文件和缓存目录内容。是否继续？', [
      { text: '取消', style: 'cancel' },
      {
        text: '继续',
        style: 'destructive',
        onPress: async () => {
          try {
            setIsClearingCache(true);
            const clearedCount = await clearAppCacheFiles();
            setLastClearedCount(clearedCount);
            Alert.alert('清除完成', `已清理 ${clearedCount} 个缓存文件。`);
          } catch (error) {
            Alert.alert('清除失败', '缓存目录暂时无法清理，请稍后再试。');
          } finally {
            setIsClearingCache(false);
          }
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={[styles.heroCard, { backgroundColor: colors.surface }]}>
          <Text style={[styles.eyebrow, { color: colors.textSecondary }]}>APP SETTINGS</Text>
          <Text style={[styles.title, { color: colors.text }]}>应用设置</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            这里负责体验层面的偏好设置，包括主题风格、缓存清理，以及后续会逐步加入的通知与隐私偏好。
          </Text>
        </View>

        <View style={[styles.card, { backgroundColor: colors.surface }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>显示与外观</Text>
          <View style={styles.themeRow}>
            {themeOptions.map((item) => {
              const active = theme === item.value;

              return (
                <Pressable
                  key={item.value}
                  onPress={() => setTheme(item.value)}
                  style={[
                    styles.themeChip,
                    {
                      backgroundColor: active ? colors.primary : isDark ? 'rgba(255,255,255,0.04)' : '#FFF7F1',
                    },
                  ]}
                >
                  <Text style={[styles.themeChipText, { color: active ? '#FFFFFF' : colors.text }]}>
                    {item.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={[styles.card, { backgroundColor: colors.surface }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>缓存与存储</Text>
          <View style={[styles.cacheCard, { backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : '#FFF7F1' }]}>
            <View style={styles.cacheHeader}>
              <View style={[styles.cacheIconWrap, { backgroundColor: isDark ? 'rgba(255,155,122,0.16)' : 'rgba(255,122,89,0.12)' }]}>
                <Ionicons name="trash-outline" size={18} color={colors.primary} />
              </View>
              <View style={styles.cacheTextWrap}>
                <Text style={[styles.cacheTitle, { color: colors.text }]}>清除缓存</Text>
                <Text style={[styles.cacheText, { color: colors.textSecondary }]}>
                  释放图片预览和临时文件占用空间，不会影响登录状态与已发布内容。
                </Text>
              </View>
            </View>
            <Text style={[styles.cacheHint, { color: colors.textSecondary }]}>
              {lastClearedCount === null ? '尚未执行缓存清理' : `上次已清理 ${lastClearedCount} 个缓存文件`}
            </Text>
            <Button title="立即清理" loading={isClearingCache} onPress={handleClearCache} />
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingBottom: 40,
    gap: 16,
  },
  heroCard: {
    borderRadius: 24,
    padding: 20,
  },
  eyebrow: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1,
  },
  title: {
    marginTop: 8,
    fontSize: 26,
    fontWeight: '900',
  },
  subtitle: {
    marginTop: 10,
    fontSize: 14,
    lineHeight: 21,
  },
  card: {
    borderRadius: 22,
    padding: 18,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 12,
  },
  themeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  themeChip: {
    minWidth: 92,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    alignItems: 'center',
  },
  themeChipText: {
    fontSize: 14,
    fontWeight: '700',
  },
  cacheCard: {
    borderRadius: 20,
    padding: 14,
    gap: 14,
  },
  cacheHeader: {
    flexDirection: 'row',
    gap: 12,
  },
  cacheIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cacheTextWrap: {
    flex: 1,
  },
  cacheTitle: {
    fontSize: 15,
    fontWeight: '800',
  },
  cacheText: {
    marginTop: 6,
    fontSize: 13,
    lineHeight: 19,
  },
  cacheHint: {
    fontSize: 12,
    fontWeight: '600',
  },
});

export default AppSettingsScreen;
