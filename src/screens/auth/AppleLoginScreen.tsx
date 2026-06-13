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
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAppTheme } from '../../hooks/useAppTheme';
import authService from '../../services/authService';
import { useAppStore } from '../../store/appStore';

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
      <ScrollView
        bounces={false}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View
          style={[
            styles.heroCard,
            {
              backgroundColor: hexToRgba(colors.surface, isDark ? 0.78 : 0.9),
              borderColor: colors.border,
            },
          ]}
        >
          <Text style={[styles.eyebrow, { color: colors.primary }]}>SIGN IN</Text>
          <Text style={[styles.title, { color: colors.text }]}>使用 Apple 登录</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            当前版本仅支持 Apple 登录，登录后即可进入首页、榜单、录入和我的页面。
          </Text>
        </View>

        <View
          style={[
            styles.featureCard,
            {
              backgroundColor: hexToRgba(colors.surface, isDark ? 0.76 : 0.88),
              borderColor: colors.border,
            },
          ]}
        >
          <Text style={[styles.featureTitle, { color: colors.text }]}>登录后可用</Text>
          <Text style={[styles.featureText, { color: colors.textSecondary }]}>
            查看综合总榜、录入旅行足迹、生成年度回顾，并在个人主页展示你的旅行成就。
          </Text>
        </View>

        <View style={styles.footer}>
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
            {isSubmitting ? '正在验证 Apple 账号...' : '我们仅请求 Apple 返回基础身份信息，不提供其他登录方式。'}
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 32,
    paddingBottom: 28,
  },
  heroCard: {
    borderRadius: 28,
    borderWidth: 1,
    paddingHorizontal: 22,
    paddingVertical: 26,
  },
  eyebrow: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1.2,
    marginBottom: 12,
  },
  title: {
    fontSize: 34,
    fontWeight: '800',
    lineHeight: 42,
  },
  subtitle: {
    marginTop: 12,
    fontSize: 16,
    lineHeight: 24,
  },
  featureCard: {
    marginTop: 18,
    borderRadius: 24,
    borderWidth: 1,
    paddingHorizontal: 20,
    paddingVertical: 22,
  },
  featureTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  featureText: {
    marginTop: 10,
    fontSize: 15,
    lineHeight: 23,
  },
  footer: {
    marginTop: 32,
  },
  appleButton: {
    width: '100%',
    height: 56,
  },
  loadingButton: {
    height: 56,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  unavailableButton: {
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
    marginTop: 14,
    fontSize: 13,
    lineHeight: 20,
    textAlign: 'center',
  },
});

export default AppleLoginScreen;
