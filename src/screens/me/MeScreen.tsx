import React from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
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

const MeScreen: React.FC = () => {
  const { colors } = useAppTheme();
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
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.title, { color: colors.text }]}>我的</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            管理当前登录状态与账号信息。
          </Text>
        </View>

        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>当前账号</Text>
          <Text style={[styles.label, { color: colors.textSecondary }]}>昵称</Text>
          <Text style={[styles.value, { color: colors.text }]}>
            {currentUser?.profile?.nickname || currentUser?.fullName || '未设置'}
          </Text>
          <Text style={[styles.label, { color: colors.textSecondary }]}>Apple 用户标识</Text>
          <Text style={[styles.value, { color: colors.text }]}>
            {currentUser?.appleUserId || '暂无'}
          </Text>
          <Text style={[styles.label, { color: colors.textSecondary }]}>Token 过期时间（Dev）</Text>
          <Text style={[styles.value, { color: colors.text }]}>
            {formatDebugTime(tokenExpireAt)}
          </Text>
        </View>

        <View style={styles.footer}>
          <Button
            title="退出登录"
            variant="danger"
            loading={isSubmitting}
            onPress={handleSignOut}
          />
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
    paddingBottom: 120,
    gap: 16,
  },
  card: {
    borderWidth: 1,
    borderRadius: 18,
    padding: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
  },
  subtitle: {
    marginTop: 10,
    fontSize: 15,
    lineHeight: 22,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 12,
  },
  label: {
    fontSize: 13,
    marginTop: 10,
  },
  value: {
    fontSize: 15,
    lineHeight: 22,
    marginTop: 4,
  },
  footer: {
    marginTop: 'auto',
  },
});

export default MeScreen;
