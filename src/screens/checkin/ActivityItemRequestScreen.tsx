import React from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  TextInput,
} from 'react-native';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';

import Button from '../../components/common/Button';
import MediaSelector from '../../components/common/MediaSelector';
import { useAppTheme } from '../../hooks/useAppTheme';
import { RootStackParamList } from '../../navigation/RootNavigator';
import feedbackService from '../../services/feedbackService';
import { useAppStore } from '../../store/appStore';
import { CheckinAttachment, LEADERBOARD_CONFIGS } from '../../types/rank';

type ScreenRouteProp = RouteProp<RootStackParamList, 'ActivityItemRequest'>;

const namingExamples = ['密室逃脱', '室内攀岩', '越野卡丁车'];
const avoidExamples = ['杭州某某密室店', '周末和朋友玩的项目', '超好玩的地方'];

const ActivityItemRequestScreen: React.FC = () => {
  const route = useRoute<ScreenRouteProp>();
  const navigation = useNavigation();
  const { colors, isDark } = useAppTheme();
  const currentUser = useAppStore((state) => state.currentUser);
  const config = LEADERBOARD_CONFIGS[route.params.code];
  const initialSearchKeyword = route.params.searchKeyword?.trim() || '';
  const initialCategory = route.params.selectedCategoryLabel?.trim() || route.params.selectedCategory?.trim() || '';
  const categoryOptions = route.params.categoryOptions || [];

  const [itemName, setItemName] = React.useState(initialSearchKeyword);
  const [category, setCategory] = React.useState(initialCategory);
  const [detail, setDetail] = React.useState('');
  const [contact, setContact] = React.useState(currentUser?.email || '');
  const [media, setMedia] = React.useState<CheckinAttachment[]>([]);
  const [submitting, setSubmitting] = React.useState(false);
  const uploadItemIdRef = React.useRef(`activity-item-request-${currentUser?._id || 'anonymous'}-${Date.now()}`);

  const contextChips = React.useMemo(
    () =>
      [
        { key: 'code', label: `当前榜单：${config.title}` },
        initialCategory ? { key: 'category', label: `当前筛选：${initialCategory}` } : null,
        initialSearchKeyword ? { key: 'keyword', label: `搜索词：${initialSearchKeyword}` } : null,
      ].filter(Boolean) as Array<{ key: string; label: string }>,
    [config.title, initialCategory, initialSearchKeyword]
  );

  const handleSubmit = React.useCallback(async () => {
    if (!currentUser?._id) {
      Alert.alert('暂时无法提交', '请先登录后再提交收录申请。');
      return;
    }

    const trimmedItemName = itemName.trim();
    const trimmedCategory = category.trim();
    const trimmedDetail = detail.trim();
    const trimmedContact = contact.trim();

    if (!trimmedItemName) {
      Alert.alert('请填写项目名称', '建议填写一个清晰、通用的项目名称，例如“密室逃脱”。');
      return;
    }

    if (trimmedItemName.length < 2) {
      Alert.alert('项目名称过短', '请至少填写 2 个字，避免使用过于模糊的简称。');
      return;
    }

    if (!trimmedCategory) {
      Alert.alert('请选择项目分类', '请从当前可用分类中选择一个最接近的分类。');
      return;
    }

    try {
      setSubmitting(true);
      await feedbackService.submitItemRequest({
        user_id: currentUser._id,
        leaderboard_code: route.params.code,
        requested_item_name: trimmedItemName,
        requested_category: trimmedCategory,
        requested_category_label: trimmedCategory,
        search_keyword: initialSearchKeyword || trimmedItemName,
        content: trimmedDetail,
        contact: trimmedContact,
        media,
        source: 'app_activity_item_request',
        user_snapshot: {
          full_name: currentUser.fullName,
          email: currentUser.email,
          avatar_url: currentUser.profile?.avatar_url || '',
        },
      });

      Alert.alert('提交成功', '项目收录申请已收到，我们会审核后尽快补充到标准库。', [
        {
          text: '好的',
          onPress: () => {
            setItemName('');
            setCategory(initialCategory);
            setDetail('');
            setMedia([]);
            navigation.goBack();
          },
        },
      ]);
    } catch (error) {
      Alert.alert('提交失败', error instanceof Error ? error.message : '申请提交失败，请稍后再试。');
    } finally {
      setSubmitting(false);
    }
  }, [category, contact, currentUser, detail, initialCategory, initialSearchKeyword, itemName, media, navigation, route.params.code]);

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]} edges={['bottom']}>
      <KeyboardAvoidingView
        style={styles.safeArea}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View style={[styles.heroCard, { backgroundColor: colors.surface }]}>
            <Text style={[styles.eyebrow, { color: colors.textSecondary }]}>ITEM REQUEST</Text>
            <Text style={[styles.title, { color: colors.text }]}>申请收录项目</Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
              没搜到想录入的项目时，可以在这里补充申请。我们会结合名称、分类和说明做人工审核，审核通过后再进入正式标准库。
            </Text>

            <View style={styles.heroChipRow}>
              {contextChips.map((chip) => (
                <View
                  key={chip.key}
                  style={[
                    styles.heroChip,
                    { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#FFF7F1' },
                  ]}
                >
                  <Text style={[styles.heroChipText, { color: colors.text }]}>{chip.label}</Text>
                </View>
              ))}
            </View>
          </View>

          <View style={[styles.card, { backgroundColor: colors.surface }]}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>申请信息</Text>

            <View style={styles.fieldGroup}>
              <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>项目名称</Text>
              <TextInput
                value={itemName}
                onChangeText={setItemName}
                maxLength={30}
                placeholder="例如：密室逃脱、室内攀岩、热气球"
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

            <View style={styles.fieldGroup}>
              <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>项目分类</Text>
              <View style={styles.categoryOptionsRow}>
                {categoryOptions.map((option) => {
                  const active = category === option.label || category === option.value;
                  return (
                    <Pressable
                      key={option.value}
                      onPress={() => setCategory(option.label)}
                      style={[
                        styles.categoryChip,
                        {
                          backgroundColor: active ? colors.primary : isDark ? 'rgba(255,255,255,0.04)' : '#FFF7F1',
                          borderColor: active ? colors.primary : colors.border,
                        },
                      ]}
                    >
                      <Text style={[styles.categoryChipText, { color: active ? '#FFFFFF' : colors.text }]}>
                        {option.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
              {!categoryOptions.length ? (
                <Text style={[styles.helperText, { color: colors.textSecondary }]}>
                  当前没有可用分类，请返回上一页切换筛选后再试。
                </Text>
              ) : null}
            </View>

            <View style={styles.fieldGroup}>
              <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>补充说明（选填）</Text>
              <TextInput
                value={detail}
                onChangeText={setDetail}
                multiline
                maxLength={300}
                textAlignVertical="top"
                placeholder="可以补充玩法说明、适合场景，或说明为什么应该单独作为一个项目收录。"
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
              <Text style={[styles.counter, { color: colors.textSecondary }]}>{detail.length}/300</Text>
            </View>

            <View style={styles.fieldGroup}>
              <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>截图/图片/视频（选填）</Text>
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
                placeholder="留下邮箱或微信，方便我们补充确认"
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

            <Button title="提交收录申请" loading={submitting} onPress={handleSubmit} style={styles.submitButton} />
          </View>

          <View style={[styles.card, { backgroundColor: colors.surface }]}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>命名建议</Text>
            <Text style={[styles.tipText, { color: colors.textSecondary }]}>
              尽量填写通用活动类型，不要写具体店名、城市名或一句体验描述，这样更方便我们做去重和分类。
            </Text>

            <View style={styles.exampleGroup}>
              <Text style={[styles.exampleLabel, { color: colors.text }]}>推荐示例</Text>
              <View style={styles.exampleRow}>
                {namingExamples.map((item) => (
                  <View
                    key={item}
                    style={[
                      styles.exampleChip,
                      { backgroundColor: isDark ? 'rgba(16,185,129,0.14)' : 'rgba(16,185,129,0.10)' },
                    ]}
                  >
                    <Text style={[styles.exampleChipText, { color: '#10B981' }]}>{item}</Text>
                  </View>
                ))}
              </View>
            </View>

            <View style={styles.exampleGroup}>
              <Text style={[styles.exampleLabel, { color: colors.text }]}>不推荐这样写</Text>
              <View style={styles.exampleRow}>
                {avoidExamples.map((item) => (
                  <View
                    key={item}
                    style={[
                      styles.exampleChip,
                      { backgroundColor: isDark ? 'rgba(239,68,68,0.14)' : 'rgba(239,68,68,0.10)' },
                    ]}
                  >
                    <Text style={[styles.exampleChipText, { color: '#EF4444' }]}>{item}</Text>
                  </View>
                ))}
              </View>
            </View>
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
    fontSize: 28,
    fontWeight: '900',
  },
  subtitle: {
    marginTop: 10,
    fontSize: 14,
    lineHeight: 22,
  },
  heroChipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 16,
  },
  heroChip: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  heroChipText: {
    fontSize: 12,
    fontWeight: '600',
  },
  card: {
    borderRadius: 24,
    padding: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
  },
  fieldGroup: {
    marginTop: 18,
  },
  fieldLabel: {
    marginBottom: 8,
    fontSize: 13,
    fontWeight: '700',
  },
  input: {
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 14,
    fontSize: 15,
  },
  categoryOptionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  categoryChip: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  categoryChipText: {
    fontSize: 13,
    fontWeight: '700',
  },
  helperText: {
    marginTop: 10,
    fontSize: 12,
    lineHeight: 18,
  },
  textarea: {
    minHeight: 120,
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 14,
    fontSize: 15,
  },
  counter: {
    marginTop: 8,
    textAlign: 'right',
    fontSize: 12,
  },
  submitButton: {
    marginTop: 20,
  },
  tipText: {
    marginTop: 10,
    fontSize: 14,
    lineHeight: 22,
  },
  exampleGroup: {
    marginTop: 18,
  },
  exampleLabel: {
    fontSize: 14,
    fontWeight: '800',
  },
  exampleRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 12,
  },
  exampleChip: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  exampleChipText: {
    fontSize: 12,
    fontWeight: '700',
  },
});

export default ActivityItemRequestScreen;
