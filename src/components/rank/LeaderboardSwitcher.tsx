import Ionicons from '@expo/vector-icons/Ionicons';
import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { useAppTheme } from '../../hooks/useAppTheme';
import { LeaderboardCode, LEADERBOARD_CONFIGS } from '../../types/rank';

const getLeaderboardIcon = (code: LeaderboardCode, active: boolean) => {
  switch (code) {
    case 'world_travel':
      return active ? 'earth' : 'earth-outline';
    case 'china_travel':
      return active ? 'map' : 'map-outline';
    case 'activity':
      return active ? 'flash' : 'flash-outline';
    case 'overall':
      return active ? 'trophy' : 'trophy-outline';
    default:
      return active ? 'ellipse' : 'ellipse-outline';
  }
};

type LeaderboardSwitcherProps = {
  codes: LeaderboardCode[];
  selectedCode: LeaderboardCode;
  onChange: (code: LeaderboardCode) => void;
};

const LeaderboardSwitcher: React.FC<LeaderboardSwitcherProps> = ({
  codes,
  selectedCode,
  onChange,
}) => {
  const { colors, isDark } = useAppTheme();
  const inactiveBg = isDark ? 'rgba(148,163,184,0.08)' : '#EEF3F9';

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.content}
    >
      {codes.map((code) => {
        const config = LEADERBOARD_CONFIGS[code];
        const isActive = code === selectedCode;

        return (
          <Pressable
            key={code}
            onPress={() => onChange(code)}
            style={[
              styles.tab,
              {
                backgroundColor: isActive ? colors.surface : inactiveBg,
                borderColor: isActive ? colors.primary : colors.border,
                shadowOpacity: isActive && !isDark ? 0.14 : 0,
                shadowRadius: isActive ? 16 : 10,
                elevation: isActive ? 4 : 0,
              },
            ]}
          >
            <View
              style={[
                styles.iconWrap,
                {
                  backgroundColor: isActive
                    ? colors.primary
                    : isDark
                      ? 'rgba(255,255,255,0.07)'
                      : 'rgba(79,70,229,0.08)',
                },
              ]}
            >
              <Ionicons
                name={getLeaderboardIcon(code, isActive)}
                size={16}
                color={isActive ? '#FFFFFF' : colors.textSecondary}
              />
            </View>
            <View style={styles.textWrap}>
              <Text style={[styles.title, { color: colors.text }]}>
                {config.title}
              </Text>
              <Text
                style={[
                  styles.desc,
                  { color: isActive ? colors.primary : colors.textSecondary },
                ]}
                numberOfLines={1}
              >
                {isActive ? '当前榜单' : config.description}
              </Text>
            </View>
            {isActive ? (
              <View style={[styles.activeBadge, { backgroundColor: 'rgba(79,70,229,0.10)' }]}>
                <Ionicons name="chevron-forward" size={14} color={colors.primary} />
              </View>
            ) : null}
          </Pressable>
        );
      })}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  content: {
    gap: 10,
    paddingVertical: 2,
    paddingRight: 8,
  },
  tab: {
    width: 164,
    minHeight: 68,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 11,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  textWrap: {
    flex: 1,
  },
  title: {
    fontSize: 14,
    fontWeight: '800',
  },
  desc: {
    marginTop: 4,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '600',
  },
  activeBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
});

export default LeaderboardSwitcher;
