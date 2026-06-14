import Ionicons from '@expo/vector-icons/Ionicons';
import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAppTheme } from '../../hooks/useAppTheme';

const appConfig = require('../../../app.json');
const packageJson = require('../../../package.json');

const appVersion = appConfig?.expo?.version || packageJson?.version || '1.0.0';

const features = [
  '排行榜驱动的旅行与玩乐记录',
  '国家 / 省份 / 玩乐项目的内容化足迹',
  '图文与视频日记记录、详情预览与榜单联动',
];

const AboutAppScreen: React.FC = () => {
  const { colors, isDark } = useAppTheme();

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={[styles.heroCard, { backgroundColor: colors.surface }]}>
          <Text style={[styles.eyebrow, { color: colors.textSecondary }]}>ABOUT EARTH PLAYER</Text>
          <Text style={[styles.title, { color: colors.text }]}>{appConfig?.expo?.name || '地球玩家'}</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            用榜单把旅行、玩乐和日记串起来，让每一次体验都能沉淀成可回看的足迹与内容。
          </Text>
        </View>

        <View style={[styles.card, { backgroundColor: colors.surface }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>产品亮点</Text>
          {features.map((feature) => (
            <View key={feature} style={styles.featureRow}>
              <View style={[styles.featureDot, { backgroundColor: colors.primary }]} />
              <Text style={[styles.featureText, { color: colors.text }]}>{feature}</Text>
            </View>
          ))}
        </View>

        <View style={[styles.card, { backgroundColor: colors.surface }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>版本信息</Text>
          <View style={styles.infoRow}>
            <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>App 名称</Text>
            <Text style={[styles.infoValue, { color: colors.text }]}>{appConfig?.expo?.name || '地球玩家'}</Text>
          </View>
          <View style={[styles.infoRow, { borderBottomColor: colors.border }]}>
            <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>当前版本</Text>
            <Text style={[styles.infoValue, { color: colors.text }]}>{appVersion}</Text>
          </View>
        </View>

        <View style={[styles.card, { backgroundColor: colors.surface }]}>
          <View style={[styles.noticeCard, { backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : '#FFF7F1' }]}>
            <Ionicons name="planet-outline" size={18} color={colors.primary} />
            <Text style={[styles.noticeText, { color: colors.textSecondary }]}>
              当前版本已支持个人主页、资料编辑、榜单只读查看、图片预览与标准项代表图能力。
            </Text>
          </View>
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
    paddingBottom: 40,
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
    marginTop: 8,
    fontSize: 26,
    fontWeight: '900',
  },
  subtitle: {
    marginTop: 10,
    fontSize: 14,
    lineHeight: 21,
  },
  card: {
    borderRadius: 22,
    padding: 18,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 12,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginTop: 10,
  },
  featureDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginTop: 7,
  },
  featureText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 21,
    fontWeight: '600',
  },
  infoRow: {
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  infoRowLast: {
    borderBottomWidth: 0,
    paddingBottom: 0,
  },
  infoLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
  infoValue: {
    marginTop: 6,
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '700',
  },
  noticeCard: {
    borderRadius: 18,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  noticeText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 19,
    fontWeight: '600',
  },
});

export default AboutAppScreen;
