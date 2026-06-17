import Ionicons from '@expo/vector-icons/Ionicons';
import { useNavigation } from '@react-navigation/native';
import React from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import Button from '../../components/common/Button';
import MediaSelector from '../../components/common/MediaSelector';
import { useAppTheme } from '../../hooks/useAppTheme';
import feedbackService from '../../services/feedbackService';
import { useAppStore } from '../../store/appStore';
import { FeedbackType } from '../../types/feedback';
import { CheckinAttachment } from '../../types/rank';

const faqItems = [
  {
    question: '为什么我从榜单点进来只能看列表，不能直接编辑？',
    answer:
      '榜单页进入详情时默认采用只读查看模式，目的是统一“查看自己记录”和“查看他人记录”的浏览结构，保证榜单场景下的信息展示更稳定、更一致。如需编辑自己的内容，建议从个人记录或录入相关页面进入。',
  },
  {
    question: '提交反馈后多久会收到处理结果？',
    answer:
      '我们会按问题类型、影响范围和复现信息完整度综合评估处理优先级。对于信息明确的问题反馈，通常会优先进入排查；如需进一步补充说明，我们也会在后续版本或相关渠道中持续优化处理。',
  },
  {
    question: '清除缓存会删除我的记录吗？',
    answer:
      '不会。清除缓存仅会移除设备本地的临时文件、图片缓存等加速数据，不会影响你已经提交到云端的榜单记录、日记内容、互动数据和账号信息。缓存清理完成后，相关内容会在后续访问时重新加载。',
  },
];

const feedbackTypeOptions: Array<{
  type: FeedbackType;
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
}> = [
  { type: 'bug', title: '问题反馈', icon: 'bug-outline' },
  { type: 'feature', title: '功能建议', icon: 'bulb-outline' },
  { type: 'other', title: '其他想法', icon: 'chatbubble-ellipses-outline' },
];

const HelpFeedbackScreen: React.FC = () => {
  const navigation = useNavigation();
  const { colors, isDark } = useAppTheme();
  const currentUser = useAppStore((state) => state.currentUser);
  const [feedbackType, setFeedbackType] = React.useState<FeedbackType>('bug');
  const [content, setContent] = React.useState('');
  const [contact, setContact] = React.useState(currentUser?.email || '');
  const [media, setMedia] = React.useState<CheckinAttachment[]>([]);
  const [submitting, setSubmitting] = React.useState(false);
  const uploadItemIdRef = React.useRef(`feedback-${currentUser?._id || 'anonymous'}-${Date.now()}`);

  const handleSubmit = React.useCallback(async () => {
    if (!currentUser?._id) {
      Alert.alert('暂时无法提交', '请先登录后再提交反馈。');
      return;
    }

    const trimmedContent = content.trim();
    const trimmedContact = contact.trim();

    if (!trimmedContent) {
      Alert.alert('请先填写反馈内容', '至少写一点你遇到的问题、建议或想法。');
      return;
    }

    try {
      setSubmitting(true);
      await feedbackService.submitFeedback({
        user_id: currentUser._id,
        type: feedbackType,
        content: trimmedContent,
        contact: trimmedContact,
        media,
        source: 'app_help_feedback',
        user_snapshot: {
          full_name: currentUser.fullName,
          email: currentUser.email,
          avatar_url: currentUser.profile?.avatar_url || '',
        },
      });

      Alert.alert('提交成功', '你的反馈已经收到，我们会尽快查看。', [
        {
          text: '好的',
          onPress: () => {
            setContent('');
            setMedia([]);
            navigation.goBack();
          },
        },
      ]);
    } catch (error) {
      Alert.alert('提交失败', error instanceof Error ? error.message : '反馈提交失败，请稍后再试。');
    } finally {
      setSubmitting(false);
    }
  }, [contact, content, currentUser, feedbackType, media, navigation]);

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]} edges={['bottom']}>
      <KeyboardAvoidingView
        style={styles.safeArea}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View style={[styles.heroCard, { backgroundColor: colors.surface }]}>
            <Text style={[styles.eyebrow, { color: colors.textSecondary }]}>HELP & FEEDBACK</Text>
            <Text style={[styles.title, { color: colors.text }]}>帮助与反馈</Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
              这里可以直接提交问题反馈、功能建议和其他想法。支持附上截图或视频，方便我们更快定位问题。
            </Text>
          </View>

          <View style={[styles.card, { backgroundColor: colors.surface }]}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>反馈表单</Text>

            <View style={styles.typeRow}>
              {feedbackTypeOptions.map((item) => {
                const active = feedbackType === item.type;

                return (
                  <Pressable
                    key={item.type}
                    onPress={() => setFeedbackType(item.type)}
                    style={[
                      styles.typeChip,
                      {
                        backgroundColor: active
                          ? colors.primary
                          : isDark
                            ? 'rgba(255,255,255,0.04)'
                            : '#FFF7F1',
                      },
                    ]}
                  >
                    <Ionicons
                      name={item.icon}
                      size={16}
                      color={active ? '#FFFFFF' : colors.primary}
                    />
                    <Text style={[styles.typeChipText, { color: active ? '#FFFFFF' : colors.text }]}>
                      {item.title}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <View style={styles.fieldGroup}>
              <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>反馈内容</Text>
              <TextInput
                value={content}
                onChangeText={setContent}
                multiline
                maxLength={500}
                textAlignVertical="top"
                placeholder="请描述你遇到的问题、触发步骤，或你希望新增/优化的功能。"
                placeholderTextColor={colors.textSecondary}
                style={[
                  styles.textarea,
                  {
                    color: colors.text,
                    backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : '#F8FBFF',
                    borderColor: colors.border,
                  },
                ]}
              />
              <Text style={[styles.counter, { color: colors.textSecondary }]}>{content.length}/500</Text>
            </View>

            <View style={styles.fieldGroup}>
              <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>图片/视频（选填）</Text>
              <MediaSelector
                value={media}
                onChange={setMedia}
                itemId={uploadItemIdRef.current}
                maxCount={3}
              />
            </View>

            <View style={styles.fieldGroup}>
              <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>联系方式（选填）</Text>
              <TextInput
                value={contact}
                onChangeText={setContact}
                placeholder="留下邮箱或微信，方便我们联系你"
                placeholderTextColor={colors.textSecondary}
                style={[
                  styles.input,
                  {
                    color: colors.text,
                    backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : '#F8FBFF',
                    borderColor: colors.border,
                  },
                ]}
              />
            </View>

            <Button title="提交反馈" loading={submitting} onPress={handleSubmit} style={styles.submitButton} />
          </View>

          <View style={[styles.card, { backgroundColor: colors.surface }]}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>常见问题</Text>
            {faqItems.map((item, index) => (
              <View
                key={item.question}
                style={[
                  styles.faqItem,
                  index === faqItems.length - 1 ? styles.faqItemLast : null,
                  { borderBottomColor: colors.border },
                ]}
              >
                <Text style={[styles.faqQuestion, { color: colors.text }]}>{item.question}</Text>
                <Text style={[styles.faqAnswer, { color: colors.textSecondary }]}>{item.answer}</Text>
              </View>
            ))}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
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
  typeRow: {
    flexDirection: 'row',
    flexWrap: 'nowrap',
    gap: 8,
  },
  typeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderRadius: 16,
    paddingHorizontal: 10,
    paddingVertical: 10,
  },
  typeChipText: {
    fontSize: 13,
    fontWeight: '800',
  },
  fieldGroup: {
    marginTop: 16,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 14,
    fontSize: 15,
  },
  textarea: {
    minHeight: 150,
    borderWidth: 1,
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 14,
    fontSize: 15,
  },
  counter: {
    alignSelf: 'flex-end',
    fontSize: 12,
    marginTop: 8,
  },
  submitButton: {
    marginTop: 18,
  },
  faqItem: {
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  faqItemLast: {
    borderBottomWidth: 0,
    paddingBottom: 0,
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
