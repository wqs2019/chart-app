import Ionicons from '@expo/vector-icons/Ionicons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React from 'react';
import { Alert, Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import Button from '../../components/common/Button';
import { useAppTheme } from '../../hooks/useAppTheme';
import { RootStackParamList } from '../../navigation/RootNavigator';
import { useAppStore } from '../../store/appStore';

const SESSION_TTL_MS = 365 * 24 * 60 * 60 * 1000;

const formatDebugTime = (value: number | null) => {
  if (!value || Number.isNaN(value)) {
    return '暂无';
  }

  return new Date(value).toLocaleString('zh-CN', { hour12: false });
};

const MeScreen: React.FC = () => {
  const navigation = useNavigation();
  const { colors, isDark } = useAppTheme();
  const currentUser = useAppStore((state) => state.currentUser);
  const currentSession = useAppStore((state) => state.currentSession);
  const signOut = useAppStore((state) => state.signOut);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const rootNavigation = navigation.getParent<NativeStackNavigationProp<RootStackParamList>>();

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

  const displayName =
    currentUser?.fullName || currentUser?.profile?.nickname || currentUser?.username || '旅行玩家';
  const avatarUrl = currentUser?.profile?.avatar_url || '';
  const bio = currentUser?.profile?.bio || '还没有填写个人简介，去补充一句你的旅行宣言吧。';
  const avatarFallback = displayName.trim().charAt(0).toUpperCase() || '我';

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

  const handleOpenEditProfile = () => {
    rootNavigation?.navigate('EditProfile');
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={[styles.heroCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.eyebrow, { color: colors.textSecondary }]}>PROFILE CENTER</Text>
          <View style={styles.heroMain}>
            <View
              style={[
                styles.avatarWrap,
                {
                  backgroundColor: isDark ? 'rgba(255,155,122,0.14)' : 'rgba(255,122,89,0.08)',
                  borderColor: colors.border,
                },
              ]}
            >
              {avatarUrl ? (
                <Image source={{ uri: avatarUrl }} style={styles.avatar} />
              ) : (
                <Text style={[styles.avatarFallback, { color: colors.primary }]}>{avatarFallback}</Text>
              )}
            </View>

            <View style={styles.heroTextWrap}>
              <Text style={[styles.title, { color: colors.text }]}>{displayName}</Text>
              <Text style={[styles.subtitle, { color: colors.textSecondary }]}>{bio}</Text>
            </View>
          </View>

          <View style={styles.heroActions}>
            <Pressable
              onPress={handleOpenEditProfile}
              style={[
                styles.primaryAction,
                { backgroundColor: colors.primary },
              ]}
            >
              <Ionicons name="create-outline" size={16} color="#FFFFFF" />
              <Text style={styles.primaryActionText}>编辑资料</Text>
            </Pressable>
            <View
              style={[
                styles.secondaryChip,
                {
                  backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : '#F8FBFF',
                  borderColor: colors.border,
                },
              ]}
            >
              <Ionicons name="sparkles-outline" size={14} color={colors.primary} />
              <Text style={[styles.secondaryChipText, { color: colors.textSecondary }]}>展示页已就绪</Text>
            </View>
          </View>
        </View>

        <View style={[styles.infoCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>账号信息</Text>

          <View style={styles.infoRow}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>邮箱</Text>
            <Text style={[styles.value, { color: colors.text }]}>{currentUser?.email || '未公开'}</Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>Apple 用户标识</Text>
            <Text numberOfLines={1} style={[styles.value, { color: colors.text }]}>
              {currentUser?.appleUserId || '暂无'}
            </Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>Token 过期时间（Dev）</Text>
            <Text style={[styles.value, { color: colors.text }]}>{formatDebugTime(tokenExpireAt)}</Text>
          </View>
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
  heroCard: {
    borderWidth: 0,
    borderRadius: 28,
    padding: 20,
  },
  eyebrow: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1,
  },
  heroMain: {
    marginTop: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  avatarWrap: {
    width: 84,
    height: 84,
    borderRadius: 28,
    borderWidth: 1,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatar: {
    width: '100%',
    height: '100%',
  },
  avatarFallback: {
    fontSize: 30,
    fontWeight: '900',
  },
  heroTextWrap: {
    flex: 1,
  },
  title: {
    fontSize: 28,
    fontWeight: '900',
  },
  subtitle: {
    marginTop: 10,
    fontSize: 14,
    lineHeight: 21,
  },
  heroActions: {
    marginTop: 18,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  primaryAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  primaryActionText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
  secondaryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 0,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  secondaryChipText: {
    fontSize: 12,
    fontWeight: '700',
  },
  infoCard: {
    borderWidth: 0,
    borderRadius: 22,
    padding: 18,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 12,
  },
  infoRow: {
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(148,163,184,0.3)',
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
  },
  value: {
    fontSize: 15,
    lineHeight: 22,
    marginTop: 6,
    fontWeight: '700',
  },
  footer: {
    marginTop: 'auto',
  },
});

export default MeScreen;
