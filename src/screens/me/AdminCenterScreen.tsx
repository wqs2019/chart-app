import Ionicons from '@expo/vector-icons/Ionicons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAppTheme } from '../../hooks/useAppTheme';
import { RootStackParamList } from '../../navigation/RootNavigator';
import feedbackService from '../../services/feedbackService';
import { useAppStore } from '../../store/appStore';

type AdminModuleRoute = 'AdminFeedbackInbox' | 'AdminFeedbackReports';

type AdminModule = {
  title: string;
  description: string;
  icon: React.ComponentProps<typeof Ionicons>['name'];
  route?: AdminModuleRoute;
};

const adminModules: AdminModule[] = [
  {
    title: '用户管理',
    description: '后续可在这里查看重点用户信息、登录状态与账户处理入口。',
    icon: 'people-outline' as const,
    route: undefined,
  },
  {
    title: '意见反馈',
    description: '查看用户意见、功能建议和问题反馈，并跟进处理状态。',
    icon: 'chatbox-ellipses-outline' as const,
    route: 'AdminFeedbackInbox' as const,
  },
  {
    title: '举报处理',
    description: '查看内容举报与违规复审记录，并完成审核处理。',
    icon: 'flag-outline' as const,
    route: 'AdminFeedbackReports' as const,
  },
  {
    title: '运营工具',
    description: '后续可扩展榜单配置、公告管理、内容治理和数据辅助工具。',
    icon: 'construct-outline' as const,
    route: undefined,
  },
];

const AdminCenterScreen: React.FC = () => {
  const { colors, isDark } = useAppTheme();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const currentUser = useAppStore((state) => state.currentUser);
  const [pendingCounts, setPendingCounts] = React.useState({
    feedback: 0,
    report: 0,
  });

  const appleUserId = currentUser?.appleUserId || '';

  const fetchPendingCounts = React.useCallback(async () => {
    if (!appleUserId) {
      setPendingCounts({ feedback: 0, report: 0 });
      return;
    }

    try {
      const summary = await feedbackService.getAdminPendingSummary({ appleUserId });
      setPendingCounts({
        feedback: summary.feedbackPendingCount || 0,
        report: summary.reportPendingCount || 0,
      });
    } catch (error) {
      setPendingCounts({ feedback: 0, report: 0 });
      console.warn('[AdminCenter] load pending counts failed:', error);
    }
  }, [appleUserId]);

  useFocusEffect(
    React.useCallback(() => {
      void fetchPendingCounts();
    }, [fetchPendingCounts])
  );

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={[styles.heroCard, { backgroundColor: colors.surface }]}>
          <Text style={[styles.eyebrow, { color: colors.textSecondary }]}>ADMIN CENTER</Text>
          <Text style={[styles.title, { color: colors.text }]}>管理员中心</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            当前账号已识别为管理员身份。这里用于承接后续的用户管理、反馈处理、举报审核和运营工具入口。
          </Text>

          <View
            style={[
              styles.statusChip,
              {
                backgroundColor: isDark ? 'rgba(255,155,122,0.14)' : 'rgba(255,122,89,0.10)',
              },
            ]}
          >
            <Ionicons name="shield-checkmark-outline" size={14} color={colors.primary} />
            <Text style={[styles.statusText, { color: colors.primary }]}>管理员权限已启用</Text>
          </View>
        </View>

        <View style={[styles.card, { backgroundColor: colors.surface }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>功能预留</Text>
          {adminModules.map((item, index) => (
            (() => {
              const badgeCount =
                item.route === 'AdminFeedbackInbox'
                  ? pendingCounts.feedback
                  : item.route === 'AdminFeedbackReports'
                    ? pendingCounts.report
                    : 0;

              return (
                <Pressable
                  key={item.title}
                  disabled={!item.route}
                  onPress={() => {
                    if (item.route) {
                      navigation.navigate(item.route as AdminModuleRoute);
                    }
                  }}
                  style={[
                    styles.moduleRow,
                    index === adminModules.length - 1 ? styles.moduleRowLast : null,
                    {
                      borderBottomColor: colors.border,
                      opacity: item.route ? 1 : 0.72,
                    },
                  ]}
                >
                  <View
                    style={[
                      styles.iconWrap,
                      { backgroundColor: isDark ? 'rgba(255,155,122,0.16)' : 'rgba(255,122,89,0.10)' },
                    ]}
                  >
                    <Ionicons name={item.icon} size={18} color={colors.primary} />
                  </View>
                  <View style={styles.textWrap}>
                    <Text style={[styles.moduleTitle, { color: colors.text }]}>{item.title}</Text>
                    <Text style={[styles.moduleDescription, { color: colors.textSecondary }]}>{item.description}</Text>
                  </View>
                  {badgeCount > 0 ? (
                    <View style={styles.moduleBadge}>
                      <Text style={styles.moduleBadgeText}>{Math.min(badgeCount, 99)}</Text>
                    </View>
                  ) : null}
                  {item.route ? <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} /> : null}
                </Pressable>
              );
            })()
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingBottom: 120,
    gap: 16,
  },
  heroCard: {
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
    fontWeight: '900',
  },
  subtitle: {
    marginTop: 10,
    fontSize: 14,
    lineHeight: 22,
  },
  statusChip: {
    marginTop: 16,
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '700',
  },
  card: {
    borderRadius: 22,
    padding: 18,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
  },
  moduleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    paddingVertical: 14,
    marginTop: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  moduleRowLast: {
    borderBottomWidth: 0,
    paddingBottom: 0,
  },
  iconWrap: {
    width: 42,
    height: 42,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textWrap: {
    flex: 1,
  },
  moduleTitle: {
    fontSize: 15,
    fontWeight: '800',
  },
  moduleDescription: {
    marginTop: 4,
    fontSize: 13,
    lineHeight: 19,
  },
  moduleBadge: {
    minWidth: 20,
    height: 20,
    paddingHorizontal: 5,
    borderRadius: 999,
    backgroundColor: '#EF4444',
    alignItems: 'center',
    justifyContent: 'center',
  },
  moduleBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
  },
});

export default AdminCenterScreen;
