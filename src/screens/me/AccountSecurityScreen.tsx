import Ionicons from '@expo/vector-icons/Ionicons';
import React from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import Button from '../../components/common/Button';
import { useAppTheme } from '../../hooks/useAppTheme';
import { useAppStore } from '../../store/appStore';

const AccountSecurityScreen: React.FC = () => {
  const { colors, isDark } = useAppTheme();
  const currentUser = useAppStore((state) => state.currentUser);
  const signOut = useAppStore((state) => state.signOut);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const accountName =
    currentUser?.fullName || currentUser?.profile?.nickname || currentUser?.username || '未提供';

  const infoRows = [
    { label: '登录方式', value: 'Apple 登录' },
    { label: '账户名称', value: accountName },
  ];

  const handleSignOut = () => {
    Alert.alert('退出登录', '确认退出当前账号吗？', [
      { text: '取消', style: 'cancel' },
      {
        text: '退出登录',
        style: 'destructive',
        onPress: async () => {
          try {
            setIsSubmitting(true);
            await signOut();
          } finally {
            setIsSubmitting(false);
          }
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={[styles.heroCard, { backgroundColor: colors.surface }]}>
          <Text style={[styles.eyebrow, { color: colors.textSecondary }]}>ACCOUNT & SECURITY</Text>
          <Text style={[styles.title, { color: colors.text }]}>账号安全中心</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            查看当前 Apple 登录身份和会话状态，后续如支持更多登录方式，也会统一在这里管理。
          </Text>

          <View style={styles.statusRow}>
            <View style={[styles.statusChip, { backgroundColor: isDark ? 'rgba(255,155,122,0.14)' : 'rgba(255,122,89,0.10)' }]}>
              <Ionicons name="shield-checkmark-outline" size={14} color={colors.primary} />
              <Text style={[styles.statusText, { color: colors.primary }]}>Apple 登录已启用</Text>
            </View>
          </View>
        </View>

        <View style={[styles.card, { backgroundColor: colors.surface }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>账号信息</Text>
          {infoRows.map((row, index) => (
            <View
              key={row.label}
              style={[
                styles.infoRow,
                index === infoRows.length - 1 ? styles.infoRowLast : null,
                { borderBottomColor: colors.border },
              ]}
            >
              <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>{row.label}</Text>
              <Text style={[styles.infoValue, { color: colors.text }]}>{row.value}</Text>
            </View>
          ))}
        </View>

        <View style={[styles.card, { backgroundColor: colors.surface }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>安全建议</Text>
          <Pressable style={[styles.tipItem, { backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : '#FFF7F1' }]}>
            <Ionicons name="lock-closed-outline" size={18} color={colors.primary} />
            <View style={styles.tipContent}>
              <Text style={[styles.tipTitle, { color: colors.text }]}>保持 Apple 账号处于安全状态</Text>
              <Text style={[styles.tipText, { color: colors.textSecondary }]}>
                若你更换设备或重装应用，优先使用同一 Apple 账号重新登录，避免身份不一致造成数据隔离。
              </Text>
            </View>
          </Pressable>
          <Pressable style={[styles.tipItem, { backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : '#FFF7F1' }]}>
            <Ionicons name="time-outline" size={18} color={colors.primary} />
            <View style={styles.tipContent}>
              <Text style={[styles.tipTitle, { color: colors.text }]}>会话异常可直接退出后重新登录</Text>
              <Text style={[styles.tipText, { color: colors.textSecondary }]}>
                如果资料显示异常或登录态过旧，重新登录通常是最快的修复方式。
              </Text>
            </View>
          </Pressable>
        </View>

        <Button title="退出登录" variant="danger" loading={isSubmitting} onPress={handleSignOut} />
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
  statusRow: {
    marginTop: 16,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  statusChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '700',
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
  infoRow: {
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  infoRowLast: {
    borderBottomWidth: 0,
    paddingBottom: 0,
  },
  infoLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
  infoValue: {
    marginTop: 6,
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '700',
  },
  tipItem: {
    flexDirection: 'row',
    gap: 12,
    borderRadius: 18,
    padding: 14,
    marginTop: 10,
  },
  tipContent: {
    flex: 1,
  },
  tipTitle: {
    fontSize: 15,
    fontWeight: '800',
  },
  tipText: {
    marginTop: 6,
    fontSize: 13,
    lineHeight: 19,
  },
});

export default AccountSecurityScreen;
