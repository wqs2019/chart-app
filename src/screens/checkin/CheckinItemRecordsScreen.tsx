import Ionicons from '@expo/vector-icons/Ionicons';
import { useFocusEffect, useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import Loading from '../../components/common/Loading';
import { useAppTheme } from '../../hooks/useAppTheme';
import { RootStackParamList } from '../../navigation/RootNavigator';
import { rankService } from '../../services/rankService';
import { useAppStore } from '../../store/appStore';
import { UserCheckin } from '../../types/rank';

type ScreenRouteProp = RouteProp<RootStackParamList, 'CheckinItemRecords'>;
type ScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'CheckinItemRecords'>;

const formatTime = (value?: string) => value || '未填写时间';

const getAttachmentSummary = (entry: UserCheckin) => {
  const attachments = entry.content?.attachments || [];
  if (!attachments.length) {
    return '无附件';
  }

  const imageCount = attachments.filter((attachment) => attachment.media_type === 'image').length;
  const videoCount = attachments.filter((attachment) => attachment.media_type === 'video').length;
  const parts = [];

  if (imageCount) {
    parts.push(`${imageCount} 张图片`);
  }

  if (videoCount) {
    parts.push(`${videoCount} 个视频`);
  }

  return parts.join(' · ');
};

const CheckinItemRecordsScreen: React.FC = () => {
  const route = useRoute<ScreenRouteProp>();
  const navigation = useNavigation<ScreenNavigationProp>();
  const { colors, isDark } = useAppTheme();
  const currentUser = useAppStore((state) => state.currentUser);
  const { code, item } = route.params;
  const userId = currentUser?._id;

  const [loading, setLoading] = React.useState(true);
  const [entries, setEntries] = React.useState<UserCheckin[]>([]);

  const fetchEntries = React.useCallback(async () => {
    if (!userId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const rows = await rankService.getItemCheckinEntries(userId, code, item._id);
      setEntries(rows);
    } catch (error) {
      Alert.alert('加载失败', '该条目的录入记录暂时无法获取，请稍后重试。');
      setEntries([]);
    } finally {
      setLoading(false);
    }
  }, [code, item._id, userId]);

  React.useEffect(() => {
    navigation.setOptions({ title: item.name_zh });
  }, [item.name_zh, navigation]);

  useFocusEffect(
    React.useCallback(() => {
      fetchEntries();
    }, [fetchEntries])
  );

  if (loading) {
    return <Loading message="正在加载录入记录..." />;
  }

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={[styles.heroCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.eyebrow, { color: colors.textSecondary }]}>ITEM RECORDS</Text>
          <Text style={[styles.title, { color: colors.text }]}>{item.name_zh}</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            {item.name_en || '暂无英文名'} · {item.category_label_zh || item.category}
          </Text>
          <View style={styles.heroMetaRow}>
            <View style={[styles.heroMetaChip, { backgroundColor: isDark ? 'rgba(124,140,255,0.14)' : 'rgba(79,70,229,0.08)' }]}>
              <Text style={[styles.heroMetaText, { color: colors.primary }]}>{entries.length} 篇记录</Text>
            </View>
            <View style={[styles.heroMetaChip, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#EEF3F9' }]}>
              <Text style={[styles.heroMetaText, { color: colors.textSecondary }]}>{item.name_zh}</Text>
            </View>
          </View>
        </View>

        <View style={styles.headerRow}>
          <View>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>录入列表</Text>
            <Text style={[styles.sectionHint, { color: colors.textSecondary }]}>
              同一国家、省份或项目可以录入多篇游玩记录。
            </Text>
          </View>
          <Pressable
            onPress={() => navigation.navigate('CheckinEntryEditor', { code, item })}
            style={[styles.addButton, { backgroundColor: colors.primary }]}
          >
            <Ionicons name="add" size={16} color="#FFFFFF" />
            <Text style={styles.addButtonText}>录入数据</Text>
          </Pressable>
        </View>

        {entries.length ? (
          entries.map((entry, index) => (
            <Pressable
              key={entry._id || `${item._id}-${index}`}
              onPress={() => navigation.navigate('CheckinEntryDetail', { code, item, entry })}
              style={[
                styles.entryCard,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.border,
                },
              ]}
            >
              <View style={styles.entryCardHeader}>
                <View style={styles.entryTitleWrap}>
                  <Text style={[styles.entryTitle, { color: colors.text }]}>
                    {entry.content?.title || `${item.name_zh} 游玩记录`}
                  </Text>
                  <Text style={[styles.entryMeta, { color: colors.textSecondary }]}>
                    {formatTime(entry.content?.visit_time)} · {entry.content?.location_name || entry.content?.city_name || item.name_zh}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color={colors.textSecondary} />
              </View>

              {!!entry.content?.description && (
                <Text numberOfLines={3} style={[styles.entryDescription, { color: colors.textSecondary }]}>
                  {entry.content.description}
                </Text>
              )}

              <View style={styles.entryFooter}>
                <View style={[styles.entryTag, { backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : '#F7FAFC', borderColor: colors.border }]}>
                  <Text style={[styles.entryTagText, { color: colors.textSecondary }]}>
                    {getAttachmentSummary(entry)}
                  </Text>
                </View>
                {entry.content?.weather ? (
                  <View style={[styles.entryTag, { backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : '#F7FAFC', borderColor: colors.border }]}>
                    <Text style={[styles.entryTagText, { color: colors.textSecondary }]}>{entry.content.weather}</Text>
                  </View>
                ) : null}
                {entry.content?.mood ? (
                  <View style={[styles.entryTag, { backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : '#F7FAFC', borderColor: colors.border }]}>
                    <Text style={[styles.entryTagText, { color: colors.textSecondary }]}>{entry.content.mood}</Text>
                  </View>
                ) : null}
              </View>
            </Pressable>
          ))
        ) : (
          <View style={[styles.emptyCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Ionicons name="document-text-outline" size={28} color={colors.textSecondary} />
            <Text style={[styles.emptyTitle, { color: colors.text }]}>还没有录入记录</Text>
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              先为 {item.name_zh} 写下第一篇游玩记录。
            </Text>
            <Pressable
              onPress={() => navigation.navigate('CheckinEntryEditor', { code, item })}
              style={[styles.emptyButton, { backgroundColor: colors.primary }]}
            >
              <Text style={styles.emptyButtonText}>录入数据</Text>
            </Pressable>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  content: {
    padding: 16,
    paddingBottom: 40,
    gap: 16,
  },
  heroCard: {
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
  heroMetaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 14,
  },
  heroMetaChip: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  heroMetaText: {
    fontSize: 12,
    fontWeight: '700',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
  },
  sectionHint: {
    marginTop: 6,
    fontSize: 13,
    lineHeight: 19,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  addButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  entryCard: {
    borderWidth: 1,
    borderRadius: 20,
    padding: 16,
  },
  entryCardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  entryTitleWrap: {
    flex: 1,
  },
  entryTitle: {
    fontSize: 16,
    fontWeight: '800',
  },
  entryMeta: {
    marginTop: 6,
    fontSize: 13,
    lineHeight: 19,
  },
  entryDescription: {
    marginTop: 12,
    fontSize: 14,
    lineHeight: 21,
  },
  entryFooter: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 14,
  },
  entryTag: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  entryTagText: {
    fontSize: 12,
    fontWeight: '600',
  },
  emptyCard: {
    borderWidth: 1,
    borderRadius: 22,
    padding: 22,
    alignItems: 'center',
  },
  emptyTitle: {
    marginTop: 12,
    fontSize: 17,
    fontWeight: '800',
  },
  emptyText: {
    marginTop: 8,
    fontSize: 14,
    lineHeight: 21,
    textAlign: 'center',
  },
  emptyButton: {
    marginTop: 16,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  emptyButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
});

export default CheckinItemRecordsScreen;
