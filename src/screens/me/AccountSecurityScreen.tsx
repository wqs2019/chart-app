import Ionicons from '@expo/vector-icons/Ionicons';
import React from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import Button from '../../components/common/Button';
import { useAppTheme } from '../../hooks/useAppTheme';
import { useAppStore } from '../../store/appStore';

const SESSION_TTL_MS = 365 * 24 * 60 * 60 * 1000;

const formatDebugTime = (value: number | null) => {
  if (!value || Number.isNaN(value)) {
    return '暂无';
  }

  return new Date(value).toLocaleString('zh-CN', { hour12: false });
};

const AccountSecurityScreen: React.FC = () => {
  const { colors, isDark } = useAppTheme();
  const currentUser = useAppStore((state) => state.currentUser);
  const currentSession = useAppStore((state) => state.currentSession);
  const signOut = useAppStore((state) => state.signOut);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const tokenExpireAt = React.useMemo(() => {
    const token = currentSession?.token;
    if (!token) {
      return null;
    }

    const tokenParts = token.split('.');
    if (tokenParts.length !== 3) {
      return null;
    }

    const issuedAt = Number(tokenParts[1]);
    if (Number.isNaN(issuedAt)) {
      return null;
    }

    return issuedAt + SESSION_TTL_MS;
  }, [currentSession?.token]);

  const infoRows = [
    { label: '登录方式', value: 'Apple 登录' },
    { label: '邮箱', value: currentUser?.email || '未公开' },
    { label: 'Apple 用户标识', value: currentUser?.appleUserId || '暂无' },
    { label: '当前会话状态', value: currentSession?.token ? '已登录' : '未登录' },
    { label: 'Token 过期时间（Dev）', value: formatDebugTime(tokenExpireAt) },
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
            管理当前登录身份、会话信息与基础安全状态，后续更换登录方式或扩展多端设备时也会统一放在这里。
          </Text>

          <View style={styles.statusRow}>
            <View style={[styles.statusChip, { backgroundColor: isDark ? 'rgba(255,155,122,0.14)' : 'rgba(255,122,89,0.10)' }]}>
              <Ionicons name="shield-checkmark-outline" size={14} color={colors.primary} />
              <Text style={[styles.statusText, { color: colors.primary }]}>Apple 身份已绑定</Text>
            </View>
            <View style={[styles.statusChip, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#F8EDE4' }]}>
              <Text style={[styles.statusText, { color: colors.textSecondary }]}>当前单账号会话</Text>
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
              <Text
                numberOfLines={row.label.includes('标识') ? 1 : undefined}
                style={[styles.infoValue, { color: colors.text }]}
              >
                {row.value}
              </Text>
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
