import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
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

import MediaSelector from '../../components/common/MediaSelector';
import DateFieldPicker from '../../components/common/DateFieldPicker';
import { useToast } from '../../components/common/Toast';
import { useAppTheme } from '../../hooks/useAppTheme';
import { RootStackParamList } from '../../navigation/RootNavigator';
import { checkinService } from '../../services/checkinService';
import { useAppStore } from '../../store/appStore';
import { CheckinAttachment } from '../../types/rank';

type ScreenRouteProp = RouteProp<RootStackParamList, 'CheckinEntryEditor'>;
type ScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'CheckinEntryEditor'>;

const WEATHER_OPTIONS = ['晴天', '多云', '阴天', '小雨', '大风', '下雪'];
const MOOD_OPTIONS = ['兴奋', '放松', '治愈', '热闹', '刺激', '满足'];

const CheckinEntryEditorScreen: React.FC = () => {
  const route = useRoute<ScreenRouteProp>();
  const navigation = useNavigation<ScreenNavigationProp>();
  const { colors, isDark } = useAppTheme();
  const toast = useToast();
  const currentUser = useAppStore((state) => state.currentUser);
  const { item, entry } = route.params;
  const userId = currentUser?._id;

  const [title, setTitle] = React.useState(entry?.content?.title || '');
  const [description, setDescription] = React.useState(entry?.content?.description || '');
  const [visitTime, setVisitTime] = React.useState(entry?.content?.visit_time || '');
  const [weather, setWeather] = React.useState(entry?.content?.weather || '');
  const [mood, setMood] = React.useState(entry?.content?.mood || '');
  const [attachments, setAttachments] = React.useState<CheckinAttachment[]>(entry?.content?.attachments || []);
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    navigation.setOptions({ title: entry ? '编辑记录' : '录入数据' });
  }, [entry, navigation]);

  const handleSave = async () => {
    if (!userId) {
      Alert.alert('保存失败', '当前未获取到登录用户，请重新登录后再试。');
      return;
    }

    if (!title.trim()) {
      Alert.alert('请填写标题', '录入记录至少需要一个标题。');
      return;
    }

    try {
      setSaving(true);
      await checkinService.saveCheckinEntry(userId, item, {
        entryId: entry?._id,
        title: title.trim(),
        description: description.trim(),
        attachments,
        visit_time: visitTime.trim(),
        location_name: item.name_zh,
        weather,
        mood,
      });

      toast.success('录入记录已保存');
      navigation.goBack();
    } catch (error) {
      Alert.alert('保存失败', '当前记录保存失败，请稍后再试。');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]} edges={['bottom']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.safeArea}
      >
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View style={[styles.headerCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.eyebrow, { color: colors.textSecondary }]}>ENTRY EDITOR</Text>
            <Text style={[styles.title, { color: colors.text }]}>{item.name_zh}</Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
              {entry ? '编辑这篇记录的内容与附件。' : '为这个条目新增一篇完整的游玩记录。'}
            </Text>
          </View>

          <View style={[styles.sectionCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.label, { color: colors.text }]}>标题</Text>
            <TextInput
              value={title}
              onChangeText={setTitle}
              placeholder="输入这篇记录的标题"
              placeholderTextColor={colors.textSecondary}
              style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : '#F8FBFF' }]}
            />

            <Text style={[styles.label, { color: colors.text }]}>内容</Text>
            <TextInput
              value={description}
              onChangeText={setDescription}
              placeholder="写下这次旅行、游玩或体验的内容"
              placeholderTextColor={colors.textSecondary}
              multiline
              textAlignVertical="top"
              style={[
                styles.textarea,
                { color: colors.text, borderColor: colors.border, backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : '#F8FBFF' },
              ]}
            />

            {userId ? (
              <MediaSelector
                value={attachments}
                onChange={setAttachments}
                itemId={item._id}
                disabled={saving}
              />
            ) : null}
          </View>

          <View style={[styles.sectionCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <DateFieldPicker label="时间" value={visitTime} onChange={setVisitTime} />

            <Text style={[styles.label, { color: colors.text }]}>地点</Text>
            <View style={[styles.readonlyBox, { borderColor: colors.border, backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : '#F8FBFF' }]}>
              <Text style={[styles.readonlyText, { color: colors.text }]}>{item.name_zh}</Text>
              <Text style={[styles.readonlyHint, { color: colors.textSecondary }]}>从上一页入口带入，不可修改</Text>
            </View>

            <Text style={[styles.label, { color: colors.text }]}>天气</Text>
            <View style={styles.optionRow}>
              {WEATHER_OPTIONS.map((option) => {
                const active = option === weather;
                return (
                  <Pressable
                    key={option}
                    onPress={() => setWeather(active ? '' : option)}
                    style={[
                      styles.optionChip,
                      {
                        backgroundColor: active ? colors.primary : isDark ? 'rgba(255,255,255,0.03)' : '#F8FBFF',
                        borderColor: active ? colors.primary : colors.border,
                      },
                    ]}
                  >
                    <Text style={{ color: active ? '#FFFFFF' : colors.text }}>{option}</Text>
                  </Pressable>
                );
              })}
            </View>

            <Text style={[styles.label, { color: colors.text }]}>心情</Text>
            <View style={styles.optionRow}>
              {MOOD_OPTIONS.map((option) => {
                const active = option === mood;
                return (
                  <Pressable
                    key={option}
                    onPress={() => setMood(active ? '' : option)}
                    style={[
                      styles.optionChip,
                      {
                        backgroundColor: active ? colors.primary : isDark ? 'rgba(255,255,255,0.03)' : '#F8FBFF',
                        borderColor: active ? colors.primary : colors.border,
                      },
                    ]}
                  >
                    <Text style={{ color: active ? '#FFFFFF' : colors.text }}>{option}</Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        </ScrollView>

        <View style={[styles.bottomBar, { backgroundColor: colors.background, borderColor: colors.border }]}>
          <Pressable
            disabled={saving}
            onPress={handleSave}
            style={[styles.saveButton, { backgroundColor: colors.primary, opacity: saving ? 0.7 : 1 }]}
          >
            <Text style={styles.saveButtonText}>{saving ? '保存中...' : '保存'}</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  content: {
    padding: 16,
    paddingBottom: 120,
    gap: 16,
  },
  headerCard: {
    borderWidth: 1,
    borderRadius: 24,
    padding: 18,
  },
  eyebrow: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1,
  },
  title: {
    marginTop: 8,
    fontSize: 28,
    fontWeight: '800',
  },
  subtitle: {
    marginTop: 8,
    fontSize: 14,
    lineHeight: 21,
  },
  sectionCard: {
    borderWidth: 1,
    borderRadius: 22,
    padding: 16,
  },
  label: {
    fontSize: 15,
    fontWeight: '800',
    marginBottom: 10,
  },
  input: {
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 16,
  },
  textarea: {
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    minHeight: 140,
    marginBottom: 16,
  },
  readonlyBox: {
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 16,
  },
  readonlyText: {
    fontSize: 15,
    fontWeight: '700',
  },
  readonlyHint: {
    marginTop: 4,
    fontSize: 12,
  },
  optionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  optionChip: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  bottomBar: {
    borderTopWidth: 1,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 16,
  },
  saveButton: {
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 52,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },
});

export default CheckinEntryEditorScreen;
