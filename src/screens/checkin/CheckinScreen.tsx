import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

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
  const viewedUserId = route.params.viewedUserId;
  const viewedUserName = route.params.viewedUserName;
  const readOnly = Boolean(route.params.readOnly);
  const { colors } = useAppTheme();
  const insets = useSafeAreaInsets();
  const config = LEADERBOARD_CONFIGS[code];
  const viewerContentLabel =
    code === 'world_travel' ? '国家足迹' : code === 'china_travel' ? '省份足迹' : '项目足迹';
  const ownerLabel = readOnly ? viewedUserName || '该用户' : '我';

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]} edges={[]}>
      <CheckinBoard
        code={code}
        viewedUserId={viewedUserId}
        viewedUserName={viewedUserName}
        readOnly={readOnly}
        header={
          <View style={[styles.headerWrap, { paddingTop: insets.top + 8 }]}>
            <View style={styles.topHeader}>
              <View style={styles.headerRow}>
                <Pressable
                  onPress={() => navigation.goBack()}
                  style={[styles.backButton, { backgroundColor: colors.surface }]}
                >
                  <Ionicons name="chevron-back" size={20} color={colors.text} />
                </Pressable>
                <View style={styles.headerTextWrap}>
                  <Text style={[styles.eyebrow, { color: colors.textSecondary }]}>
                    FOOTPRINT LIST
                  </Text>
                  <Text style={[styles.title, { color: colors.text }]}>
                    {readOnly && viewedUserName ? `${viewedUserName}的${config.title}` : `我的${config.title}`}
                  </Text>
                </View>
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
                  <Text style={[styles.tipTitle, { color: colors.text }]}>
                    {`榜单内容：${viewerContentLabel}`}
                  </Text>
                  <Text style={[styles.tipText, { color: colors.textSecondary }]}>
                    点击条目后可继续查看 {ownerLabel} 在该条目下的所有日记记录。
                  </Text>
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
    gap: 12,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerTextWrap: {
    flex: 1,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
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
  tipCard: {
    borderWidth: 0,
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
});

export default CheckinScreen;
