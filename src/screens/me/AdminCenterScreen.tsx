import Ionicons from '@expo/vector-icons/Ionicons';
import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAppTheme } from '../../hooks/useAppTheme';

const adminModules = [
  {
    title: '用户管理',
    description: '后续可在这里查看重点用户信息、登录状态与账户处理入口。',
    icon: 'people-outline' as const,
  },
  {
    title: '反馈与举报',
    description: '后续可在这里集中处理问题反馈、功能建议和内容举报记录。',
    icon: 'alert-circle-outline' as const,
  },
  {
    title: '运营工具',
    description: '后续可扩展榜单配置、公告管理、内容治理和数据辅助工具。',
    icon: 'construct-outline' as const,
  },
];

const AdminCenterScreen: React.FC = () => {
  const { colors, isDark } = useAppTheme();

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={[styles.heroCard, { backgroundColor: colors.surface }]}>
          <Text style={[styles.eyebrow, { color: colors.textSecondary }]}>ADMIN CENTER</Text>
          <Text style={[styles.title, { color: colors.text }]}>管理员中心</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            当前账号已识别为管理员身份。这里用于承接后续的用户管理、反馈处理和运营工具入口。
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
            <View
              key={item.title}
              style={[
                styles.moduleRow,
                index === adminModules.length - 1 ? styles.moduleRowLast : null,
                { borderBottomColor: colors.border },
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
            </View>
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
});

export default AdminCenterScreen;
