import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { RouteProp, useRoute } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';

import CheckinBoard from '../../components/rank/CheckinBoard';
import LeaderboardSwitcher from '../../components/rank/LeaderboardSwitcher';
import { useAppTheme } from '../../hooks/useAppTheme';
import {
  CONTENT_LEADERBOARD_CODES,
  LeaderboardCode,
  LEADERBOARD_CONFIGS,
} from '../../types/rank';

type CheckinTabRouteProp = RouteProp<{ Checkin: { code?: LeaderboardCode } | undefined }, 'Checkin'>;

const CheckinTabScreen: React.FC = () => {
  const { colors } = useAppTheme();
  const route = useRoute<CheckinTabRouteProp>();
  const [selectedCode, setSelectedCode] = React.useState<LeaderboardCode>('world_travel');
  const currentConfig = LEADERBOARD_CONFIGS[selectedCode];

  React.useEffect(() => {
    const requestedCode = route.params?.code;
    if (requestedCode && CONTENT_LEADERBOARD_CODES.includes(requestedCode)) {
      setSelectedCode(requestedCode);
    }
  }, [route.params?.code]);

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]} edges={['top']}>
      <CheckinBoard
        code={selectedCode}
        header={
          <View style={styles.headerWrap}>
            <View style={styles.topHeader}>
              <View>
                <Text style={[styles.eyebrow, { color: colors.textSecondary }]}>CHECK-IN STUDIO</Text>
                <Text style={[styles.title, { color: colors.text }]}>录入</Text>
                <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                  当前只维护一个榜单，切换后下方录入列表实时同步。
                </Text>
              </View>
            </View>

            <LeaderboardSwitcher
              codes={CONTENT_LEADERBOARD_CODES}
              selectedCode={selectedCode}
              onChange={setSelectedCode}
            />

            <View
              style={[
                styles.tipCard,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.border,
                },
              ]}
            >
              <View style={styles.tipHeader}>
                <View>
                  <Text style={[styles.tipTitle, { color: colors.text }]}>{currentConfig.title}</Text>
                  <Text style={[styles.tipText, { color: colors.textSecondary }]}>
                    仅展示当前榜单标准项，录入后会直接影响排名。
                  </Text>
                </View>
                <View style={[styles.unitBadge, { backgroundColor: 'rgba(79,70,229,0.08)' }]}>
                  <Text style={[styles.unitBadgeText, { color: colors.primary }]}>{currentConfig.unit}</Text>
                </View>
              </View>
            </View>
          </View>
        }
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  headerWrap: {
    gap: 16,
    marginBottom: 4,
  },
  topHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  eyebrow: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1,
  },
  title: {
    marginTop: 6,
    fontSize: 32,
    fontWeight: '800',
  },
  subtitle: {
    marginTop: 8,
    fontSize: 14,
    lineHeight: 21,
  },
  tipCard: {
    borderWidth: 1,
    borderRadius: 22,
    padding: 16,
  },
  tipHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  tipTitle: {
    fontSize: 16,
    fontWeight: '800',
  },
  tipText: {
    marginTop: 6,
    fontSize: 13,
    lineHeight: 19,
  },
  unitBadge: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginLeft: 12,
  },
  unitBadgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
});

export default CheckinTabScreen;
