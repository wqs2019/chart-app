import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
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

type Props = NativeStackScreenProps<RootStackParamList, 'MainTabs'>;

const HomeScreen: React.FC<Props> = ({ navigation }) => {
  const { colors } = useAppTheme();
  const theme = useAppStore((state) => state.theme);
  const setTheme = useAppStore((state) => state.setTheme);

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
});

export default HomeScreen;
