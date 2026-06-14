import Ionicons from '@expo/vector-icons/Ionicons';
import React from 'react';
import { Alert, Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAppTheme } from '../../hooks/useAppTheme';

const FEEDBACK_EMAIL = 'hello@earthplayer.app';

const faqItems = [
  {
    question: '为什么我从榜单点进来只能看列表，不能直接编辑？',
    answer: '从榜单进入默认是只读查看链路，目的是保持你查看自己和查看别人时的结构一致。',
  },
  {
    question: '为什么图片预览比卡片更清晰？',
    answer: '列表与卡片优先加载缩略图，点击预览时会读取数据库中的原图字段，保证浏览速度与清晰度平衡。',
  },
  {
    question: '清除缓存会删除我的记录吗？',
    answer: '不会。清除缓存只会删除本地临时文件和图片缓存，不会影响你的榜单记录和日记内容。',
  },
];

const openFeedbackMail = async (subject: string, body: string) => {
  const url = `mailto:${FEEDBACK_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  const supported = await Linking.canOpenURL(url);

  if (!supported) {
    Alert.alert('暂时无法打开邮件应用', '请稍后再试，或手动发送邮件到 hello@earthplayer.app。');
    return;
  }

  await Linking.openURL(url);
};

const HelpFeedbackScreen: React.FC = () => {
  const { colors, isDark } = useAppTheme();

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={[styles.heroCard, { backgroundColor: colors.surface }]}>
          <Text style={[styles.eyebrow, { color: colors.textSecondary }]}>HELP & FEEDBACK</Text>
          <Text style={[styles.title, { color: colors.text }]}>帮助与反馈</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            这里集中放常见问题、功能建议和问题反馈入口。你遇到体验问题时，可以直接从这里发邮件说明。
          </Text>
        </View>

        <View style={[styles.card, { backgroundColor: colors.surface }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>反馈入口</Text>
          <Pressable
            onPress={() => openFeedbackMail('地球玩家 · 问题反馈', '请描述你遇到的问题、触发步骤，以及期望结果。')}
            style={[styles.actionRow, { backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : '#FFF7F1' }]}
          >
            <View style={styles.actionMain}>
              <Ionicons name="bug-outline" size={18} color={colors.primary} />
              <View style={styles.actionTextWrap}>
                <Text style={[styles.actionTitle, { color: colors.text }]}>问题反馈</Text>
                <Text style={[styles.actionDesc, { color: colors.textSecondary }]}>遇到异常、报错或体验问题时使用</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
          </Pressable>

          <Pressable
            onPress={() => openFeedbackMail('地球玩家 · 功能建议', '请描述你希望新增或优化的功能。')}
            style={[styles.actionRow, { backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : '#FFF7F1' }]}
          >
            <View style={styles.actionMain}>
              <Ionicons name="bulb-outline" size={18} color={colors.primary} />
              <View style={styles.actionTextWrap}>
                <Text style={[styles.actionTitle, { color: colors.text }]}>功能建议</Text>
                <Text style={[styles.actionDesc, { color: colors.textSecondary }]}>想提需求或想法时可以直接发给我们</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
          </Pressable>
        </View>

        <View style={[styles.card, { backgroundColor: colors.surface }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>常见问题</Text>
          {faqItems.map((item) => (
            <View key={item.question} style={[styles.faqItem, { borderBottomColor: colors.border }]}>
              <Text style={[styles.faqQuestion, { color: colors.text }]}>{item.question}</Text>
              <Text style={[styles.faqAnswer, { color: colors.textSecondary }]}>{item.answer}</Text>
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
  actionRow: {
    borderRadius: 18,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  actionMain: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  actionTextWrap: {
    flex: 1,
  },
  actionTitle: {
    fontSize: 15,
    fontWeight: '800',
  },
  actionDesc: {
    marginTop: 4,
    fontSize: 13,
    lineHeight: 19,
  },
  faqItem: {
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  faqQuestion: {
    fontSize: 15,
    lineHeight: 21,
    fontWeight: '800',
  },
  faqAnswer: {
    marginTop: 6,
    fontSize: 13,
    lineHeight: 19,
  },
});

export default HelpFeedbackScreen;
