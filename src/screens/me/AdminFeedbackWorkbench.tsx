import Ionicons from '@expo/vector-icons/Ionicons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useToast } from '../../components/common/Toast';
import { useAppTheme } from '../../hooks/useAppTheme';
import { RootStackParamList } from '../../navigation/RootNavigator';
import feedbackService from '../../services/feedbackService';
import { useAppStore } from '../../store/appStore';
import { FeedbackRecord, FeedbackStatus } from '../../types/feedback';

type AdminWorkbenchMode = 'feedback' | 'report';
type StatusFilter = 'all' | FeedbackStatus;
type ActiveFeedbackStatus = FeedbackStatus;
type ScreenNavigationProp = NativeStackNavigationProp<RootStackParamList>;

type AdminFeedbackWorkbenchProps = {
  mode: AdminWorkbenchMode;
};

const defaultQuickStatusActions: Array<{ key: FeedbackStatus; label: string }> = [
  { key: 'processing', label: '处理中' },
  { key: 'resolved', label: '已解决' },
  { key: 'rejected', label: '已驳回' },
];

const reportQuickStatusActions: Array<{ key: FeedbackStatus; label: string }> = [
  { key: 'violation', label: '下架笔记' },
  { key: 'rejected', label: '驳回举报' },
];

const reviewQuickStatusActions: Array<{ key: FeedbackStatus; label: string }> = [
  { key: 'resolved', label: '恢复展示' },
  { key: 'violation', label: '下架笔记' },
];

const statusLabelMap: Record<ActiveFeedbackStatus, string> = {
  pending: '待处理',
  processing: '处理中',
  violation: '已下架',
  resolved: '已解决',
  rejected: '已驳回',
};

const reportReasonLabelMap: Record<string, string> = {
  spam: '垃圾广告',
  abuse: '辱骂攻击',
  harassment: '骚扰不适',
  pornography: '色情低俗',
  violence: '暴力血腥',
  fraud: '诈骗欺骗',
  other: '其他',
};

const screenCopyMap: Record<
  AdminWorkbenchMode,
  {
    eyebrow: string;
    title: string;
    subtitle: string;
    emptyTitle: string;
    emptySubtitle: string;
  }
> = {
  feedback: {
    eyebrow: 'FEEDBACK',
    title: '意见反馈',
    subtitle: '集中查看用户意见、功能建议和问题反馈，并快速更新处理状态。',
    emptyTitle: '当前没有待查看反馈',
    emptySubtitle: '可以切换状态，查看其他阶段的用户反馈。',
  },
  report: {
    eyebrow: 'REPORT MODERATION',
    title: '举报处理',
    subtitle: '集中处理内容举报和违规复审记录，并快速更新审核状态。',
    emptyTitle: '当前没有待处理举报',
    emptySubtitle: '可以切换状态，查看其他阶段的举报和复审记录。',
  },
};

const normalizeFeedbackStatus = (status?: FeedbackStatus): ActiveFeedbackStatus => status || 'processing';

const isLockedFeedbackStatus = (item: FeedbackRecord, status: ActiveFeedbackStatus) => {
  if (item.type === 'report_entry') {
    return status === 'violation' || status === 'rejected';
  }

  if (item.type === 'review_entry') {
    return status === 'resolved' || status === 'violation';
  }

  return status === 'resolved' || status === 'rejected';
};

const isReportRecord = (item: FeedbackRecord) => item.type === 'report_entry' || item.type === 'review_entry';

const shouldIncludeRecord = (mode: AdminWorkbenchMode, item: FeedbackRecord) =>
  mode === 'report' ? isReportRecord(item) : !isReportRecord(item);

const getStatusOptions = (mode: AdminWorkbenchMode): Array<{ key: StatusFilter; label: string }> => {
  if (mode === 'report') {
    return [
      { key: 'all', label: '全部状态' },
      { key: 'pending', label: '待处理' },
      { key: 'processing', label: '复审中' },
      { key: 'violation', label: '已下架' },
      { key: 'resolved', label: '已恢复' },
      { key: 'rejected', label: '已驳回' },
    ];
  }

  return [
    { key: 'all', label: '全部状态' },
    { key: 'processing', label: '待跟进' },
    { key: 'resolved', label: '已解决' },
    { key: 'rejected', label: '已驳回' },
  ];
};

const formatTime = (value?: string | number | Date) => {
  if (!value) {
    return '刚刚';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '刚刚';
  }

  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
};

const getStatusTone = (status: FeedbackStatus, isDark: boolean) => {
  if (status === 'resolved') {
    return {
      backgroundColor: isDark ? 'rgba(16,185,129,0.18)' : 'rgba(16,185,129,0.10)',
      textColor: '#10B981',
    };
  }

  if (status === 'rejected') {
    return {
      backgroundColor: isDark ? 'rgba(239,68,68,0.18)' : 'rgba(239,68,68,0.10)',
      textColor: '#EF4444',
    };
  }

  if (status === 'violation') {
    return {
      backgroundColor: isDark ? 'rgba(249,115,22,0.18)' : 'rgba(249,115,22,0.10)',
      textColor: '#F97316',
    };
  }

  if (status === 'processing') {
    return {
      backgroundColor: isDark ? 'rgba(59,130,246,0.18)' : 'rgba(59,130,246,0.10)',
      textColor: '#3B82F6',
    };
  }

  return {
    backgroundColor: isDark ? 'rgba(245,158,11,0.18)' : 'rgba(245,158,11,0.12)',
    textColor: '#F59E0B',
  };
};

const getRecordStatusLabel = (item: FeedbackRecord, status: ActiveFeedbackStatus) => {
  if (status === 'pending') {
    return item.type === 'report_entry' ? '待处理' : '待跟进';
  }

  if (status === 'violation') {
    return '已下架';
  }

  if (status === 'resolved' && item.type === 'review_entry') {
    return '已恢复';
  }

  if (status !== 'processing') {
    return statusLabelMap[status];
  }

  if (item.type === 'review_entry') {
    return '复审中';
  }

  if (item.type === 'report_entry') {
    return '已处理';
  }

  return '待跟进';
};

const getRecordTitle = (item: FeedbackRecord) => {
  if (item.type === 'review_entry') {
    return '违规复审';
  }

  if (item.type === 'report_entry') {
    return '内容举报';
  }

  if (item.type === 'feature') {
    return '功能建议';
  }

  if (item.type === 'bug') {
    return '问题反馈';
  }

  return '其他反馈';
};

const getQuickStatusActions = (item: FeedbackRecord): Array<{ key: FeedbackStatus; label: string }> => {
  if (item.type === 'report_entry') {
    return reportQuickStatusActions;
  }

  if (item.type === 'review_entry') {
    return reviewQuickStatusActions;
  }

  return defaultQuickStatusActions;
};

const AdminFeedbackWorkbench: React.FC<AdminFeedbackWorkbenchProps> = ({ mode }) => {
  const navigation = useNavigation<ScreenNavigationProp>();
  const { colors, isDark } = useAppTheme();
  const toast = useToast();
  const currentUser = useAppStore((state) => state.currentUser);
  const [records, setRecords] = React.useState<FeedbackRecord[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [statusFilter, setStatusFilter] = React.useState<StatusFilter>('all');
  const [updatingId, setUpdatingId] = React.useState('');
  const [openingEntryId, setOpeningEntryId] = React.useState('');

  const appleUserId = currentUser?.appleUserId || '';
  const screenCopy = screenCopyMap[mode];
  const statusOptions = React.useMemo(() => getStatusOptions(mode), [mode]);

  const fetchRecords = React.useCallback(async () => {
    if (!appleUserId) {
      setRecords([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const nextRecords = await feedbackService.getAdminFeedbacks({
        appleUserId,
        type: mode === 'report' ? 'report_entry' : 'all',
        status: statusFilter,
      });

      const nextByMode = nextRecords.filter((item) => shouldIncludeRecord(mode, item));
      const nextByStatus =
        statusFilter === 'all'
          ? nextByMode
          : nextByMode.filter((item) => normalizeFeedbackStatus(item.status) === statusFilter);

      setRecords(nextByStatus);
    } catch (error) {
      Alert.alert('加载失败', error instanceof Error ? error.message : '记录列表暂时无法获取，请稍后再试。');
      setRecords([]);
    } finally {
      setLoading(false);
    }
  }, [appleUserId, mode, statusFilter]);

  useFocusEffect(
    React.useCallback(() => {
      void fetchRecords();
    }, [fetchRecords])
  );

  const handleUpdateStatus = React.useCallback(
    async (item: FeedbackRecord, nextStatus: FeedbackStatus) => {
      if (!appleUserId || !item._id || updatingId) {
        return;
      }

      try {
        setUpdatingId(item._id);
        const updatedRecord = await feedbackService.updateAdminFeedbackStatus({
          appleUserId,
          feedbackId: item._id,
          status: nextStatus,
        });
        setRecords((prev) =>
          prev.map((record) => (record._id === updatedRecord._id ? { ...record, ...updatedRecord } : record))
        );
        toast.success('处理状态已更新');
      } catch (error) {
        toast.error(error instanceof Error ? error.message : '状态更新失败');
      } finally {
        setUpdatingId('');
      }
    },
    [appleUserId, toast, updatingId]
  );

  const handleOpenReportedEntry = React.useCallback(
    async (item: FeedbackRecord) => {
      if (!item.target_entry_id || !item.target_item_id || !item.target_user_id) {
        toast.error('缺少举报目标信息，暂时无法查看');
        return;
      }

      try {
        setOpeningEntryId(item._id || item.target_entry_id);
        navigation.navigate('CheckinEntryDetail', { entryId: item.target_entry_id });
      } catch (error) {
        Alert.alert('打开失败', error instanceof Error ? error.message : '暂时无法打开这篇日记，请稍后重试。');
      } finally {
        setOpeningEntryId('');
      }
    },
    [navigation, toast]
  );

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={[styles.heroCard, { backgroundColor: colors.surface }]}>
          <Text style={[styles.eyebrow, { color: colors.textSecondary }]}>{screenCopy.eyebrow}</Text>
          <Text style={[styles.title, { color: colors.text }]}>{screenCopy.title}</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>{screenCopy.subtitle}</Text>
        </View>

        <View style={[styles.filterCard, { backgroundColor: colors.surface }]}>
          <Text style={[styles.filterTitle, { color: colors.text }]}>状态筛选</Text>
          <View style={styles.filterRow}>
            {statusOptions.map((option) => {
              const active = statusFilter === option.key;
              return (
                <Pressable
                  key={option.key}
                  onPress={() => setStatusFilter(option.key)}
                  style={[
                    styles.filterChip,
                    {
                      backgroundColor: active ? colors.primary : isDark ? 'rgba(255,255,255,0.05)' : '#FFF7F1',
                    },
                  ]}
                >
                  <Text style={[styles.filterChipText, { color: active ? '#FFFFFF' : colors.text }]}>
                    {option.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {loading ? (
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>加载中...</Text>
        ) : records.length === 0 ? (
          <View style={[styles.emptyCard, { backgroundColor: colors.surface }]}>
            <Ionicons name="checkmark-done-outline" size={24} color={colors.primary} />
            <Text style={[styles.emptyTitle, { color: colors.text }]}>{screenCopy.emptyTitle}</Text>
            <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>{screenCopy.emptySubtitle}</Text>
          </View>
        ) : (
          records.map((item) => {
            const status = normalizeFeedbackStatus(item.status);
            const statusTone = getStatusTone(status, isDark);
            const reportRecord = isReportRecord(item);
            const isStatusLocked = isLockedFeedbackStatus(item, status);
            const displayName =
              item.user_snapshot?.full_name || (reportRecord ? item.target_user_snapshot?.full_name : '') || '匿名用户';

            return (
              <View key={item._id || `${item.user_id}-${item.created_at}`} style={[styles.recordCard, { backgroundColor: colors.surface }]}>
                <View style={styles.recordHeader}>
                  <View style={styles.recordMeta}>
                    <Text style={[styles.recordTitle, { color: colors.text }]}>{getRecordTitle(item)}</Text>
                    <Text style={[styles.recordSubline, { color: colors.textSecondary }]}>
                      {displayName} · {formatTime(item.created_at)}
                    </Text>
                  </View>
                  <View style={[styles.statusChip, { backgroundColor: statusTone.backgroundColor }]}>
                    <Text style={[styles.statusChipText, { color: statusTone.textColor }]}>
                      {getRecordStatusLabel(item, status)}
                    </Text>
                  </View>
                </View>

                {reportRecord ? (
                  <Pressable
                    disabled={openingEntryId === (item._id || item.target_entry_id || '')}
                    onPress={() => void handleOpenReportedEntry(item)}
                    style={[
                      styles.contextBox,
                      styles.contextPressable,
                      {
                        backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : '#FFF7F1',
                        opacity: openingEntryId === (item._id || item.target_entry_id || '') ? 0.7 : 1,
                      },
                    ]}
                  >
                    <Text style={[styles.contextTitle, { color: colors.text }]}>
                      {item.type === 'review_entry'
                        ? '复审申请：用户已修改笔记，等待复核'
                        : `举报原因：${reportReasonLabelMap[item.report_reason || 'other'] || '其他'}`}
                    </Text>
                    <Text style={[styles.contextText, { color: colors.textSecondary }]}>
                      {item.target_entry_snapshot?.item_name_zh || '未命名记录'}
                    </Text>
                    {item.target_entry_snapshot?.description ? (
                      <Text style={[styles.contextText, { color: colors.textSecondary }]} numberOfLines={2}>
                        {item.target_entry_snapshot.description}
                      </Text>
                    ) : null}
                    <View style={styles.contextFooter}>
                      <Text style={[styles.contextLinkText, { color: colors.primary }]}>
                        {openingEntryId === (item._id || item.target_entry_id || '') ? '打开中...' : '查看具体日记'}
                      </Text>
                      <Ionicons name="chevron-forward" size={16} color={colors.primary} />
                    </View>
                  </Pressable>
                ) : null}

                <Text style={[styles.recordContent, { color: colors.text }]}>{item.content || '未填写说明'}</Text>

                <View style={styles.actionRow}>
                  {getQuickStatusActions(item).map((action) => {
                    const active = status === action.key;
                    const disabled = updatingId === item._id || isStatusLocked;
                    return (
                      <Pressable
                        key={action.key}
                        disabled={disabled}
                        onPress={() => handleUpdateStatus(item, action.key)}
                        style={[
                          styles.actionChip,
                          {
                            backgroundColor: active ? colors.primary : isDark ? 'rgba(255,255,255,0.05)' : '#FFF7F1',
                            opacity: disabled && !active ? 0.45 : 1,
                          },
                        ]}
                      >
                        <Text style={[styles.actionChipText, { color: active ? '#FFFFFF' : colors.text }]}>
                          {updatingId === item._id && active ? '更新中...' : action.label}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
                {isStatusLocked ? (
                  <Text style={[styles.lockedHint, { color: colors.textSecondary }]}>当前记录已结案，状态不可再次修改。</Text>
                ) : null}
              </View>
            );
          })
        )}
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
  filterCard: {
    borderRadius: 22,
    padding: 18,
  },
  filterTitle: {
    fontSize: 14,
    fontWeight: '800',
  },
  filterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 12,
  },
  filterChip: {
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  filterChipText: {
    fontSize: 13,
    fontWeight: '700',
  },
  emptyText: {
    paddingTop: 40,
    textAlign: 'center',
    fontSize: 14,
  },
  emptyCard: {
    borderRadius: 22,
    padding: 28,
    alignItems: 'center',
  },
  emptyTitle: {
    marginTop: 12,
    fontSize: 16,
    fontWeight: '800',
  },
  emptySubtitle: {
    marginTop: 8,
    fontSize: 13,
    lineHeight: 20,
    textAlign: 'center',
  },
  recordCard: {
    borderRadius: 22,
    padding: 18,
  },
  recordHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  recordMeta: {
    flex: 1,
  },
  recordTitle: {
    fontSize: 16,
    fontWeight: '800',
  },
  recordSubline: {
    marginTop: 6,
    fontSize: 13,
    lineHeight: 19,
  },
  statusChip: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  statusChipText: {
    fontSize: 12,
    fontWeight: '800',
  },
  contextBox: {
    marginTop: 14,
    borderRadius: 16,
    padding: 14,
  },
  contextPressable: {
    overflow: 'hidden',
  },
  contextTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  contextText: {
    marginTop: 6,
    fontSize: 13,
    lineHeight: 19,
  },
  contextFooter: {
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  contextLinkText: {
    fontSize: 13,
    fontWeight: '700',
  },
  recordContent: {
    marginTop: 14,
    fontSize: 14,
    lineHeight: 22,
  },
  actionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 16,
  },
  actionChip: {
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  actionChipText: {
    fontSize: 13,
    fontWeight: '700',
  },
  lockedHint: {
    marginTop: 12,
    fontSize: 12,
    lineHeight: 18,
  },
});

export default AdminFeedbackWorkbench;
