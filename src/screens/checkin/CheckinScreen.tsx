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
            <View style={styles.topHeader}>
              <View>
                <Text style={[styles.eyebrow, { color: colors.textSecondary }]}>DIRECT CHECK-IN</Text>
                <Text style={[styles.title, { color: colors.text }]}>{config.title}</Text>
                <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                  当前为专属录入页，只展示这个榜单的标准项。
                </Text>
              </View>
            </View>

            <View
              style={[
                styles.tipCard,
                { backgroundColor: colors.surface, borderColor: colors.border },
              ]}
            >
              <View style={styles.tipHeader}>
                <View>
                  <Text style={[styles.tipTitle, { color: colors.text }]}>当前单位：{config.unit}</Text>
                  <Text style={[styles.tipText, { color: colors.textSecondary }]}>
                    勾选加入当前榜单，取消则从当前榜单中移除。
                  </Text>
                </View>
                <View style={[styles.unitBadge, { backgroundColor: 'rgba(79,70,229,0.08)' }]}>
                  <Text style={[styles.unitBadgeText, { color: colors.primary }]}>专属录入</Text>
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
    fontSize: 28,
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

export default CheckinScreen;
