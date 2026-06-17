import Ionicons from '@expo/vector-icons/Ionicons';
import * as AppleAuthentication from 'expo-apple-authentication';
import React from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAppTheme } from '../../hooks/useAppTheme';
import authService from '../../services/authService';
import { useAppStore } from '../../store/appStore';

const loginHighlights = [
  { icon: 'podium-outline' as const, label: '综合总榜' },
  { icon: 'sparkles-outline' as const, label: '足迹记录' },
  { icon: 'planet-outline' as const, label: '年度回顾' },
];

const hexToRgba = (hex: string, alpha: number) => {
  const normalized = hex.replace('#', '');
  const fullHex =
    normalized.length === 3
      ? normalized
          .split('')
          .map((char) => char + char)
          .join('')
      : normalized;

  const value = parseInt(fullHex, 16);
  const r = (value >> 16) & 255;
  const g = (value >> 8) & 255;
  const b = value & 255;

  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

const AppleLoginScreen: React.FC = () => {
  const { colors, isDark } = useAppTheme();
  const insets = useSafeAreaInsets();
  const signInWithApple = useAppStore((state) => state.signInWithApple);
  const [isCheckingAvailability, setIsCheckingAvailability] = React.useState(Platform.OS === 'ios');
  const [isAppleAvailable, setIsAppleAvailable] = React.useState(Platform.OS === 'ios');
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  React.useEffect(() => {
    let mounted = true;

    const checkAvailability = async () => {
      if (Platform.OS !== 'ios') {
        setIsCheckingAvailability(false);
        setIsAppleAvailable(false);
        return;
      }

      const available = await AppleAuthentication.isAvailableAsync();
      if (!mounted) {
        return;
      }

      setIsAppleAvailable(available);
      setIsCheckingAvailability(false);
    };

    checkAvailability().catch(() => {
      if (!mounted) {
        return;
      }

      setIsAppleAvailable(false);
      setIsCheckingAvailability(false);
    });

    return () => {
      mounted = false;
    };
  }, []);

  const handleAppleLogin = async () => {
    if (Platform.OS !== 'ios') {
      Alert.alert('当前不可用', 'Apple 登录仅支持 iOS 设备。');
      return;
    }

    try {
      setIsSubmitting(true);
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });
      const fullName = [credential.fullName?.familyName, credential.fullName?.givenName]
        .filter(Boolean)
        .join('');
      const session = await authService.appleLogin({
        userId: credential.user,
        email: credential.email ?? null,
        fullName: fullName || null,
        identityToken: credential.identityToken ?? null,
        authorizationCode: credential.authorizationCode ?? null,
      });
      await signInWithApple(session);
    } catch (error: any) {
      if (error?.code === 'ERR_REQUEST_CANCELED') {
        return;
      }

      Alert.alert('登录失败', error?.message || 'Apple 登录暂时不可用，请稍后重试。');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <View style={styles.container}>
        <View
          style={[
            styles.heroGlow,
            styles.heroGlowPrimary,
            { backgroundColor: isDark ? 'rgba(255,155,122,0.2)' : 'rgba(255,122,89,0.16)' },
          ]}
        />
        <View
          style={[
            styles.heroGlow,
            styles.heroGlowSecondary,
            { backgroundColor: isDark ? 'rgba(115,128,255,0.16)' : 'rgba(99,102,241,0.12)' },
          ]}
        />
        <View
          style={[
            styles.heroGlow,
            styles.heroGlowTertiary,
            { backgroundColor: isDark ? 'rgba(80,214,173,0.14)' : 'rgba(16,185,129,0.10)' },
          ]}
        />

        <ScrollView
          bounces={false}
          contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 168 }]}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.heroSection}>
            <View style={styles.topMeta}>
              <View style={[styles.metaDot, { backgroundColor: colors.primary }]} />
              <Text style={[styles.metaText, { color: colors.textSecondary }]}>EARTH PLAYER</Text>
            </View>

            <Text style={[styles.eyebrow, { color: colors.textSecondary }]}>SIGN IN WITH APPLE</Text>
            <Text style={[styles.title, { color: colors.text }]}>
              把你的旅行、足迹和{'\n'}高光时刻，登录成档。
            </Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
              进入榜单、记录与回顾的个人成就系统。
            </Text>

            <View style={styles.visualArea}>
              <View
                style={[
                  styles.visualRingOuter,
                  { borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(24,33,47,0.08)' },
                ]}
              />
              <View
                style={[
                  styles.visualRingInner,
                  {
                    backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.44)',
                    borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(24,33,47,0.06)',
                  },
                ]}
              >
                <Ionicons name="planet" size={40} color={colors.primary} />
              </View>

              <View
                style={[
                  styles.floatingPill,
                  styles.floatingPillTop,
                  {
                    backgroundColor: hexToRgba(colors.surface, isDark ? 0.62 : 0.82),
                    borderColor: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(24,33,47,0.06)',
                  },
                ]}
              >
                <Text style={[styles.floatingPillText, { color: colors.text }]}>综合总榜</Text>
              </View>
              <View
                style={[
                  styles.floatingPill,
                  styles.floatingPillLeft,
                  {
                    backgroundColor: hexToRgba(colors.surface, isDark ? 0.62 : 0.82),
                    borderColor: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(24,33,47,0.06)',
                  },
                ]}
              >
                <Text style={[styles.floatingPillText, { color: colors.text }]}>足迹记录</Text>
              </View>
              <View
                style={[
                  styles.floatingPill,
                  styles.floatingPillRight,
                  {
                    backgroundColor: hexToRgba(colors.surface, isDark ? 0.62 : 0.82),
                    borderColor: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(24,33,47,0.06)',
                  },
                ]}
              >
                <Text style={[styles.floatingPillText, { color: colors.text }]}>年度回顾</Text>
              </View>
            </View>

            <View style={styles.highlightsRow}>
              {loginHighlights.map((item) => (
                <View key={item.label} style={styles.highlightItem}>
                  <Ionicons name={item.icon} size={16} color={colors.primary} />
                  <Text style={[styles.highlightLabel, { color: colors.textSecondary }]}>{item.label}</Text>
                </View>
              ))}
            </View>
          </View>
        </ScrollView>

        <View
          style={[
            styles.fixedFooter,
            {
              paddingBottom: Math.max(insets.bottom, 12),
              backgroundColor: hexToRgba(colors.background, isDark ? 0.96 : 0.98),
              borderTopColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(24,33,47,0.06)',
            },
          ]}
        >
          <View
            style={[
              styles.footerInner,
              {
                backgroundColor: hexToRgba(colors.surface, isDark ? 0.72 : 0.92),
                borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(24,33,47,0.05)',
              },
            ]}
          >
            <Text style={[styles.footerTitle, { color: colors.text }]}>使用 Apple 账号继续</Text>
            {isCheckingAvailability ? (
              <View
                style={[
                  styles.loadingButton,
                  {
                    backgroundColor: colors.text,
                  },
                ]}
              >
                <ActivityIndicator color={isDark ? colors.background : '#FFFFFF'} />
              </View>
            ) : isAppleAvailable ? (
              <AppleAuthentication.AppleAuthenticationButton
                buttonStyle={
                  isDark
                    ? AppleAuthentication.AppleAuthenticationButtonStyle.WHITE
                    : AppleAuthentication.AppleAuthenticationButtonStyle.BLACK
                }
                buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
                cornerRadius={18}
                onPress={handleAppleLogin}
                style={styles.appleButton}
              />
            ) : (
              <Pressable
                disabled
                style={[
                  styles.unavailableButton,
                  {
                    backgroundColor: hexToRgba(colors.textSecondary, 0.12),
                    borderColor: colors.border,
                  },
                ]}
              >
                <Text style={[styles.unavailableTitle, { color: colors.text }]}>Apple 登录当前不可用</Text>
                <Text style={[styles.unavailableText, { color: colors.textSecondary }]}>
                  请在支持 Apple 登录的 iPhone 或已正确配置签名能力的 iOS 包中测试。
                </Text>
              </Pressable>
            )}

            <Text style={[styles.tip, { color: colors.textSecondary }]}>
              {isSubmitting ? '正在验证 Apple 账号...' : '仅请求 Apple 返回基础身份信息。'}
            </Text>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
    position: 'relative',
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 18,
  },
  heroGlow: {
    position: 'absolute',
    borderRadius: 999,
  },
  heroGlowPrimary: {
    width: 220,
    height: 220,
    top: 40,
    right: -30,
  },
  heroGlowSecondary: {
    width: 170,
    height: 170,
    top: 260,
    left: -70,
  },
  heroGlowTertiary: {
    width: 150,
    height: 150,
    top: 420,
    right: 10,
  },
  heroSection: {
    minHeight: 560,
    justifyContent: 'space-between',
    paddingTop: 18,
  },
  topMeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metaDot: {
    width: 8,
    height: 8,
    borderRadius: 999,
    marginRight: 8,
  },
  metaText: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1.1,
  },
  eyebrow: {
    marginTop: 18,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1.2,
    marginBottom: 14,
  },
  title: {
    fontSize: 38,
    fontWeight: '800',
    lineHeight: 46,
    letterSpacing: -1,
  },
  subtitle: {
    marginTop: 12,
    maxWidth: 280,
    fontSize: 16,
    lineHeight: 25,
  },
  visualArea: {
    height: 250,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
  },
  visualRingOuter: {
    position: 'absolute',
    width: 214,
    height: 214,
    borderRadius: 999,
    borderWidth: 1,
  },
  visualRingInner: {
    width: 132,
    height: 132,
    borderRadius: 999,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  floatingPill: {
    position: 'absolute',
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  floatingPillTop: {
    top: 10,
    right: 40,
  },
  floatingPillLeft: {
    left: 10,
    bottom: 40,
  },
  floatingPillRight: {
    right: 0,
    bottom: 70,
  },
  floatingPillText: {
    fontSize: 14,
    fontWeight: '600',
  },
  highlightsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    marginTop: 18,
  },
  highlightItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  highlightLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
  fixedFooter: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    borderTopWidth: 1,
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  footerInner: {
    borderRadius: 24,
    borderWidth: 1,
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 12,
  },
  footerTitle: {
    fontSize: 16,
    fontWeight: '800',
  },
  appleButton: {
    marginTop: 12,
    width: '100%',
    height: 56,
  },
  loadingButton: {
    marginTop: 12,
    height: 56,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  unavailableButton: {
    marginTop: 12,
    minHeight: 74,
    borderRadius: 18,
    borderWidth: 1,
    paddingHorizontal: 18,
    paddingVertical: 16,
    justifyContent: 'center',
  },
  unavailableTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  unavailableText: {
    marginTop: 6,
    fontSize: 14,
    lineHeight: 21,
  },
  tip: {
    marginTop: 10,
    fontSize: 12,
    lineHeight: 18,
    textAlign: 'center',
  },
});

export default AppleLoginScreen;
