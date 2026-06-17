import Ionicons from '@expo/vector-icons/Ionicons';
import * as AppleAuthentication from 'expo-apple-authentication';
import React from 'react';
import {
  ActivityIndicator,
  Animated,
  Alert,
  Easing,
  Linking,
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

const TERMS_URL = 'https://maoqiu.site/terms.html';
const PRIVACY_URL = 'https://maoqiu.site/privacy.html';

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
  const glowPrimaryAnim = React.useRef(new Animated.Value(0)).current;
  const glowSecondaryAnim = React.useRef(new Animated.Value(0)).current;
  const glowTertiaryAnim = React.useRef(new Animated.Value(0)).current;

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

  React.useEffect(() => {
    const createGlowLoop = (
      animatedValue: Animated.Value,
      duration: number,
      delay: number
    ) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(animatedValue, {
            toValue: 1,
            duration,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
          Animated.timing(animatedValue, {
            toValue: 0,
            duration,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
        ])
      );

    const animations = [
      createGlowLoop(glowPrimaryAnim, 5200, 0),
      createGlowLoop(glowSecondaryAnim, 6200, 420),
      createGlowLoop(glowTertiaryAnim, 5800, 860),
    ];

    animations.forEach((animation) => animation.start());

    return () => {
      animations.forEach((animation) => animation.stop());
    };
  }, [glowPrimaryAnim, glowSecondaryAnim, glowTertiaryAnim]);

  const primaryGlowStyle = {
    transform: [
      {
        translateX: glowPrimaryAnim.interpolate({
          inputRange: [0, 1],
          outputRange: [0, -14],
        }),
      },
      {
        translateY: glowPrimaryAnim.interpolate({
          inputRange: [0, 1],
          outputRange: [0, 18],
        }),
      },
      {
        scale: glowPrimaryAnim.interpolate({
          inputRange: [0, 1],
          outputRange: [1, 1.08],
        }),
      },
    ],
    opacity: glowPrimaryAnim.interpolate({
      inputRange: [0, 1],
      outputRange: [0.82, 1],
    }),
  };

  const secondaryGlowStyle = {
    transform: [
      {
        translateX: glowSecondaryAnim.interpolate({
          inputRange: [0, 1],
          outputRange: [0, 12],
        }),
      },
      {
        translateY: glowSecondaryAnim.interpolate({
          inputRange: [0, 1],
          outputRange: [0, -16],
        }),
      },
      {
        scale: glowSecondaryAnim.interpolate({
          inputRange: [0, 1],
          outputRange: [1, 1.1],
        }),
      },
    ],
    opacity: glowSecondaryAnim.interpolate({
      inputRange: [0, 1],
      outputRange: [0.78, 0.96],
    }),
  };

  const tertiaryGlowStyle = {
    transform: [
      {
        translateX: glowTertiaryAnim.interpolate({
          inputRange: [0, 1],
          outputRange: [0, -10],
        }),
      },
      {
        translateY: glowTertiaryAnim.interpolate({
          inputRange: [0, 1],
          outputRange: [0, -14],
        }),
      },
      {
        scale: glowTertiaryAnim.interpolate({
          inputRange: [0, 1],
          outputRange: [1, 1.06],
        }),
      },
    ],
    opacity: glowTertiaryAnim.interpolate({
      inputRange: [0, 1],
      outputRange: [0.74, 0.94],
    }),
  };

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

  const openLegalDocument = async (url: string) => {
    try {
      await Linking.openURL(url);
    } catch {
      Alert.alert('打开失败', '当前无法打开该页面，请稍后重试。');
    }
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <View style={styles.container}>
        <Animated.View
          style={[
            styles.heroGlow,
            styles.heroGlowPrimary,
            primaryGlowStyle,
            { backgroundColor: isDark ? 'rgba(255,155,122,0.2)' : 'rgba(255,122,89,0.16)' },
          ]}
        />
        <Animated.View
          style={[
            styles.heroGlow,
            styles.heroGlowSecondary,
            secondaryGlowStyle,
            { backgroundColor: isDark ? 'rgba(115,128,255,0.16)' : 'rgba(99,102,241,0.12)' },
          ]}
        />
        <Animated.View
          style={[
            styles.heroGlow,
            styles.heroGlowTertiary,
            tertiaryGlowStyle,
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
                <View style={[styles.floatingPillIcon, { backgroundColor: hexToRgba(colors.primary, isDark ? 0.2 : 0.14) }]}>
                  <Ionicons name="planet-outline" size={12} color={colors.primary} />
                </View>
                <Text style={[styles.floatingPillText, { color: colors.text }]}>世界榜</Text>
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
                <View style={[styles.floatingPillIcon, { backgroundColor: hexToRgba(colors.primary, isDark ? 0.2 : 0.14) }]}>
                  <Ionicons name="business-outline" size={12} color={colors.primary} />
                </View>
                <Text style={[styles.floatingPillText, { color: colors.text }]}>中国榜</Text>
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
                <View style={[styles.floatingPillIcon, { backgroundColor: hexToRgba(colors.primary, isDark ? 0.2 : 0.14) }]}>
                  <Ionicons name="sparkles-outline" size={12} color={colors.primary} />
                </View>
                <Text style={[styles.floatingPillText, { color: colors.text }]}>玩乐榜</Text>
              </View>
            </View>

          </View>
        </ScrollView>

        <View
          style={[
            styles.fixedFooter,
            {
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

            <Text style={[styles.legalText, { color: colors.textSecondary }]}>
              登录即表示你已阅读并同意
              <Text
                style={[styles.legalLink, { color: colors.primary }]}
                onPress={() => {
                  void openLegalDocument(TERMS_URL);
                }}
              >
                《用户协议》
              </Text>
              与
              <Text
                style={[styles.legalLink, { color: colors.primary }]}
                onPress={() => {
                  void openLegalDocument(PRIVACY_URL);
                }}
              >
                《隐私政策》
              </Text>
            </Text>

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
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    minWidth: 86,
    shadowColor: '#000000',
    shadowOpacity: 0.08,
    shadowRadius: 14,
    shadowOffset: {
      width: 0,
      height: 8,
    },
    elevation: 6,
  },
  floatingPillTop: {
    top: 8,
    left: '50%',
    transform: [{ translateX: -43 }],
  },
  floatingPillLeft: {
    left: 12,
    top: 162,
  },
  floatingPillRight: {
    right: 12,
    top: 162,
  },
  floatingPillIcon: {
    width: 24,
    height: 24,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  floatingPillText: {
    fontSize: 13,
    fontWeight: '700',
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
  legalText: {
    marginTop: 12,
    fontSize: 12,
    lineHeight: 18,
    textAlign: 'center',
  },
  legalLink: {
    fontWeight: '700',
  },
});

export default AppleLoginScreen;
