import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';

import CheckinBoard from '../../components/rank/CheckinBoard';
import { useAppTheme } from '../../hooks/useAppTheme';
import { RootStackParamList } from '../../navigation/RootNavigator';
import { LEADERBOARD_CONFIGS } from '../../types/rank';

type CheckinScreenRouteProp = RouteProp<RootStackParamList, 'Checkin'>;
type CheckinScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Checkin'>;

const CheckinScreen = () => {
  const route = useRoute<CheckinScreenRouteProp>();
  const navigation = useNavigation<CheckinScreenNavigationProp>();
  const { code } = route.params;
  const { colors } = useAppTheme();
  const config = LEADERBOARD_CONFIGS[code];

  React.useEffect(() => {
    navigation.setOptions({ title: config?.title || '录入' });
  }, [code]);

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]} edges={['bottom']}>
      <CheckinBoard
        code={code}
        header={
          <View style={styles.headerWrap}>
            <View style={[styles.heroCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.eyebrow, { color: colors.primary }]}>DIRECT CHECK IN</Text>
              <Text style={[styles.title, { color: colors.text }]}>{config.title}</Text>
              <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                这里是当前榜单的专属录入页，只展示 {config.title} 的可录入内容。
              </Text>
            </View>

            <View style={[styles.tipCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.tipTitle, { color: colors.text }]}>当前单位：{config.unit}</Text>
              <Text style={[styles.tipText, { color: colors.textSecondary }]}>
                勾选会加入当前榜单，取消勾选会从当前榜单中移除，不会影响其他榜单内容。
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
    fontSize: 28,
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

export default CheckinScreen;
