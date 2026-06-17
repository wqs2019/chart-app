import Ionicons from '@expo/vector-icons/Ionicons';
import React from 'react';
import { ActivityIndicator, Animated, Easing, StyleSheet, Text, View } from 'react-native';

import { useAppTheme } from '../../hooks/useAppTheme';

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

const StartupScreen: React.FC = () => {
  const { colors, isDark } = useAppTheme();
  const pulse = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 1600,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0,
          duration: 1600,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    );

    animation.start();

    return () => {
      animation.stop();
    };
  }, [pulse]);

  const ringStyle = {
    transform: [
      {
        scale: pulse.interpolate({
          inputRange: [0, 1],
          outputRange: [1, 1.08],
        }),
      },
    ],
    opacity: pulse.interpolate({
      inputRange: [0, 1],
      outputRange: [0.42, 0.8],
    }),
  };

  return (
    <View style={[styles.container, { backgroundColor: isDark ? '#08101C' : '#F7FAFF' }]}>
      <View
        style={[
          styles.glow,
          styles.glowTop,
          { backgroundColor: isDark ? 'rgba(255,128,102,0.16)' : 'rgba(255,122,89,0.14)' },
        ]}
      />
      <View
        style={[
          styles.glow,
          styles.glowBottom,
          { backgroundColor: isDark ? 'rgba(94,129,255,0.14)' : 'rgba(99,102,241,0.1)' },
        ]}
      />

      <View style={styles.content}>
        <View style={styles.visualArea}>
          <Animated.View
            style={[
              styles.ring,
              ringStyle,
              { borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(15,23,42,0.08)' },
            ]}
          />
          <View
            style={[
              styles.core,
              {
                backgroundColor: hexToRgba(colors.surface, isDark ? 0.76 : 0.92),
                borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(15,23,42,0.06)',
              },
            ]}
          >
            <View
              style={[
                styles.iconBadge,
                {
                  backgroundColor: hexToRgba(colors.primary, isDark ? 0.2 : 0.12),
                },
              ]}
            >
              <Ionicons name="planet" size={30} color={colors.primary} />
            </View>
          </View>
        </View>

        <Text style={[styles.brand, { color: colors.text }]}>地球玩家</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>正在准备你的旅行成就</Text>

        <View style={styles.loadingRow}>
          <ActivityIndicator size="small" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>启动中...</Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    overflow: 'hidden',
  },
  glow: {
    position: 'absolute',
    borderRadius: 999,
  },
  glowTop: {
    width: 220,
    height: 220,
    top: 90,
    right: -60,
  },
  glowBottom: {
    width: 180,
    height: 180,
    bottom: 160,
    left: -50,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
  },
  visualArea: {
    width: 160,
    height: 160,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 26,
  },
  ring: {
    position: 'absolute',
    width: 132,
    height: 132,
    borderRadius: 999,
    borderWidth: 1,
  },
  core: {
    width: 92,
    height: 92,
    borderRadius: 999,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconBadge: {
    width: 54,
    height: 54,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brand: {
    fontSize: 26,
    fontWeight: '800',
    letterSpacing: -0.6,
  },
  subtitle: {
    marginTop: 10,
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 22,
  },
  loadingText: {
    fontSize: 14,
    fontWeight: '500',
  },
});

export default StartupScreen;
