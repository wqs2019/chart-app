import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React from 'react';
import { Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';

import { useAppTheme } from '../../hooks/useAppTheme';
import { RootStackParamList } from '../../navigation/RootNavigator';
import { useAppStore } from '../../store/appStore';

import Button from '../../components/common/Button';

const themeOptions: Array<{ label: string; value: 'light' | 'dark' | 'system' }> = [
  { label: '浅色', value: 'light' },
  { label: '深色', value: 'dark' },
  { label: '跟随系统', value: 'system' },
];

type Props = NativeStackScreenProps<RootStackParamList, 'Home'>;

const HomeScreen: React.FC<Props> = ({ navigation }) => {
  const { colors, themeName } = useAppTheme();
  const theme = useAppStore((state) => state.theme);
  const setTheme = useAppStore((state) => state.setTheme);

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.title, { color: colors.text }]}>React Native Scaffold</Text>
          <Text style={[styles.desc, { color: colors.textSecondary }]}>
            这里保留了导航、主题、Zustand、TCB 云函数调用和一个 user demo，后续你可以直接在这个骨架上继续加业务。
          </Text>
          <Text style={[styles.meta, { color: colors.textSecondary }]}>当前主题：{themeName}</Text>
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
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Demo 页面</Text>
          <Text style={[styles.desc, { color: colors.textSecondary }]}> 
            进入 user demo，可以直接验证前端 service 与云函数 `user` 的调用链。
          </Text>
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
  meta: {
    marginTop: 12,
    fontSize: 13,
  },
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  themeButton: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  primaryButton: {
    marginTop: 16,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
});

export default HomeScreen;
