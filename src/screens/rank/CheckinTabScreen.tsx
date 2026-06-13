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
            <View style={[styles.heroCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.eyebrow, { color: colors.primary }]}>CHECK IN</Text>
              <Text style={[styles.title, { color: colors.text }]}>录入</Text>
              <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                当前页面只录入一个榜单的内容，顶部切换后，下面的录入项会同步切到对应榜单。
              </Text>
            </View>

            <LeaderboardSwitcher
              codes={CONTENT_LEADERBOARD_CODES}
              selectedCode={selectedCode}
              onChange={setSelectedCode}
            />

            <View style={[styles.tipCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.tipTitle, { color: colors.text }]}>
                当前录入榜单：{currentConfig.title}
              </Text>
              <Text style={[styles.tipText, { color: colors.textSecondary }]}>
                这里只能录入 {currentConfig.title} 的标准项，不会混入其他榜单内容。
              </Text>
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
  heroCard: {
    borderWidth: 1,
    borderRadius: 24,
    padding: 20,
  },
  eyebrow: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1,
  },
  title: {
    marginTop: 10,
    fontSize: 30,
    fontWeight: '800',
  },
  subtitle: {
    marginTop: 10,
    fontSize: 15,
    lineHeight: 22,
  },
  tipCard: {
    borderWidth: 1,
    borderRadius: 20,
    padding: 16,
  },
  tipTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  tipText: {
    marginTop: 8,
    fontSize: 14,
    lineHeight: 21,
  },
});

export default CheckinTabScreen;
