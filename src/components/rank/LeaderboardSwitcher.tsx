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
                backgroundColor: isActive ? colors.primary : colors.surface,
                borderColor: isActive ? colors.primary : colors.border,
                shadowOpacity: isActive && !isDark ? 0.12 : 0,
              },
            ]}
          >
            <View
              style={[
                styles.iconWrap,
                {
                  backgroundColor: isActive
                    ? 'rgba(255,255,255,0.18)'
                    : isDark
                      ? 'rgba(255,255,255,0.08)'
                      : 'rgba(17,24,39,0.06)',
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
              <Text style={[styles.title, { color: isActive ? '#FFFFFF' : colors.text }]}>
                {config.title}
              </Text>
              <Text
                style={[
                  styles.desc,
                  { color: isActive ? 'rgba(255,255,255,0.78)' : colors.textSecondary },
                ]}
              >
                {config.description}
              </Text>
            </View>
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
  },
  tab: {
    width: 170,
    minHeight: 74,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 18,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 14,
    elevation: 2,
  },
  iconWrap: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  textWrap: {
    flex: 1,
  },
  title: {
    fontSize: 14,
    fontWeight: '700',
  },
  desc: {
    marginTop: 4,
    fontSize: 12,
    lineHeight: 17,
  },
});

export default LeaderboardSwitcher;
