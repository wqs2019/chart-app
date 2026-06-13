import { NavigationProp, useNavigation } from '@react-navigation/native';
import React from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAppTheme } from '../../hooks/useAppTheme';
import { RootStackParamList } from '../../navigation/RootNavigator';
import { useAppStore } from '../../store/appStore';

import { LEADERBOARD_CONFIGS, LeaderboardCode } from '../../types/rank';

import Button from '../../components/common/Button';

const themeOptions: Array<{ label: string; value: 'light' | 'dark' | 'system' }> = [
  { label: '浅色', value: 'light' },
  { label: '深色', value: 'dark' },
  { label: '跟随系统', value: 'system' },
];

const rankOptions: LeaderboardCode[] = ['world_travel', 'china_travel', 'activity'];

type Props = object;

const HomeScreen: React.FC<Props> = () => {
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const { colors } = useAppTheme();
  const theme = useAppStore((state) => state.theme);
  const setTheme = useAppStore((state) => state.setTheme);
  const signOut = useAppStore((state) => state.signOut);
  const [toolboxVisible, setToolboxVisible] = React.useState(false);

  const handleClearCache = () => {
    Alert.alert(
      '清除登录缓存',
      '确定要清除本地登录缓存吗？下次打开 App 将返回登录页。',
      [
        { text: '取消', style: 'cancel' },
        {
          text: '确定', style: 'destructive', onPress: async () => {
            try {
              await signOut();
            } catch (err) {
              console.error('[Clear Cache] error:', err);
            } finally {
              setToolboxVisible(false);
            }
          },
        },
      ],
    );
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.title, { color: colors.text }]}>成就排行榜</Text>
          <Text style={[styles.desc, { color: colors.textSecondary }]}>
            记录你的精彩经历，在不同榜单中获得排名和成就感。
          </Text>
        </View>

        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>成就录入</Text>
          <View style={styles.rankGrid}>
            {rankOptions.map((code) => {
              const config = LEADERBOARD_CONFIGS[code];
              return (
                <TouchableOpacity
                  key={code}
                  style={[styles.rankCard, { backgroundColor: colors.background, borderColor: colors.border }]}
                  onPress={() => navigation.navigate('Checkin', { code })}
                >
                  <Text style={styles.rankIcon}>{config.icon === 'earth' ? '🌍' : config.icon === 'map' ? '🗺️' : '⚡'}</Text>
                  <Text style={[styles.rankTitle, { color: colors.text }]}>{config.title}</Text>
                  <Text style={[styles.rankDesc, { color: colors.textSecondary }]}>{config.description}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>主题切换</Text>
          <View style={styles.row}>
            {themeOptions.map((item) => {
              const active = theme === item.value;
              return (
                <Pressable
                  key={item.value}
                  style={[
                    styles.themeButton,
                    {
                      backgroundColor: active ? colors.primary : colors.background,
                      borderColor: active ? colors.primary : colors.border,
                    },
                  ]}
                  onPress={() => setTheme(item.value)}
                >
                  <Text style={{ color: active ? '#FFFFFF' : colors.text }}>{item.label}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}> 
          <Text style={[styles.sectionTitle, { color: colors.text }]}>工具与 Demo</Text>
          <Button
            title="打开 User Demo"
            onPress={() => navigation.navigate('UserDemo')}
            style={{ marginTop: 16 }}
          />
        </View>
      </ScrollView>

      <TouchableOpacity
        style={[styles.floatingButton, { backgroundColor: colors.primary }]}
        onPress={() => setToolboxVisible(!toolboxVisible)}
      >
        <Text style={styles.floatingButtonIcon}>⚙️</Text>
      </TouchableOpacity>

      {toolboxVisible && (
        <>
          <Pressable
            style={styles.overlay}
            onPress={() => setToolboxVisible(false)}
          />
          <View style={[styles.toolboxMenu, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <TouchableOpacity
              style={styles.toolboxItem}
              onPress={handleClearCache}
            >
              <Text style={styles.toolboxIcon}>🧹</Text>
              <Text style={[styles.toolboxLabel, { color: colors.text }]}>清除登录缓存</Text>
            </TouchableOpacity>
          </View>
        </>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  content: { padding: 16, gap: 16 },
  card: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 12,
  },
  desc: {
    fontSize: 14,
    lineHeight: 22,
    marginTop: 8,
  },
  rankGrid: {
    gap: 12,
  },
  rankCard: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  rankIcon: {
    fontSize: 24,
    marginBottom: 8,
  },
  rankTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  rankDesc: {
    fontSize: 12,
    marginTop: 4,
  },
  row: {
    flexDirection: 'row',
    gap: 8,
  },
  themeButton: {
    flex: 1,
    height: 40,
    borderRadius: 8,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  floatingButton: {
    position: 'absolute',
    right: 16,
    top: 40,
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 5,
  },
  floatingButtonIcon: {
    fontSize: 24,
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  toolboxMenu: {
    position: 'absolute',
    right: 16,
    top: 96,
    minWidth: 180,
    borderRadius: 12,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 8,
  },
  toolboxItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 10,
  },
  toolboxIcon: {
    fontSize: 18,
  },
  toolboxLabel: {
    fontSize: 16,
    fontWeight: '500',
  },
});

export default HomeScreen;
