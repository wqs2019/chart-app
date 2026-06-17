import Ionicons from '@expo/vector-icons/Ionicons';
import { useFocusEffect } from '@react-navigation/native';
import React from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useToast } from '../../components/common/Toast';
import { useAppTheme } from '../../hooks/useAppTheme';
import feedbackService from '../../services/feedbackService';
import { useAppStore } from '../../store/appStore';
import { FeedbackRecord, FeedbackStatus } from '../../types/feedback';

type TypeFilter = 'all' | 'feedback' | 'report_entry';
type StatusFilter = 'all' | FeedbackStatus;

const typeOptions: Array<{ key: TypeFilter; label: string }> = [
  { key: 'all', label: '全部' },
  { key: 'feedback', label: '普通反馈' },
  { key: 'report_entry', label: '举报记录' },
];

const statusOptions: Array<{ key: StatusFilter; label: string }> = [
  { key: 'all', label: '全部状态' },
  { key: 'pending', label: '待处理' },
  { key: 'processing', label: '处理中' },
  { key: 'resolved', label: '已解决' },
  { key: 'rejected', label: '已驳回' },
];

const quickStatusActions: Array<{ key: FeedbackStatus; label: string }> = [
  { key: 'processing', label: '处理中' },
  { key: 'resolved', label: '已解决' },
  { key: 'rejected', label: '已驳回' },
];

const statusLabelMap: Record<FeedbackStatus, string> = {
  pending: '待处理',
  processing: '处理中',
  resolved: '已解决',
  rejected: '已驳回',
};

const reportReasonLabelMap: Record<string, string> = {
  spam: '垃圾内容',
  abuse: '辱骂攻击',
  harassment: '骚扰不适',
  pornography: '色情低俗',
  violence: '暴力血腥',
  fraud: '诈骗欺骗',
  other: '其他',
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

const AdminFeedbackReportsScreen: React.FC = () => {
  const { colors, isDark } = useAppTheme();
  const toast = useToast();
  const currentUser = useAppStore((state) => state.currentUser);
  const [records, setRecords] = React.useState<FeedbackRecord[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [typeFilter, setTypeFilter] = React.useState<TypeFilter>('all');
  const [statusFilter, setStatusFilter] = React.useState<StatusFilter>('all');
  const [updatingId, setUpdatingId] = React.useState('');

  const appleUserId = currentUser?.appleUserId || '';

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
        type: typeFilter === 'report_entry' ? 'report_entry' : 'all',
        status: statusFilter,
      });

      const filteredRecords =
        typeFilter === 'feedback'
          ? nextRecords.filter((item) => item.type !== 'report_entry')
          : nextRecords;
      const nextByStatus =
        statusFilter === 'all' ? filteredRecords : filteredRecords.filter((item) => (item.status || 'pending') === statusFilter);

      setRecords(nextByStatus);
    } catch (error) {
      Alert.alert('加载失败', error instanceof Error ? error.message : '反馈列表暂时无法获取，请稍后再试。');
      setRecords([]);
    } finally {
      setLoading(false);
    }
  }, [appleUserId, statusFilter, typeFilter]);

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

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={[styles.heroCard, { backgroundColor: colors.surface }]}>
          <Text style={[styles.eyebrow, { color: colors.textSecondary }]}>FEEDBACK & REPORTS</Text>
          <Text style={[styles.title, { color: colors.text }]}>反馈与举报</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            集中查看用户反馈、功能建议和内容举报，并快速更新处理状态。
          </Text>
        </View>

        <View style={[styles.filterCard, { backgroundColor: colors.surface }]}>
          <Text style={[styles.filterTitle, { color: colors.text }]}>类型筛选</Text>
          <View style={styles.filterRow}>
            {typeOptions.map((option) => {
              const active = typeFilter === option.key;
              return (
                <Pressable
                  key={option.key}
                  onPress={() => setTypeFilter(option.key)}
                  style={[
                    styles.filterChip,
                    {
                      backgroundColor: active
                        ? colors.primary
                        : isDark
                          ? 'rgba(255,255,255,0.05)'
                          : '#FFF7F1',
                    },
                  ]}
                >
                  <Text style={[styles.filterChipText, { color: active ? '#FFFFFF' : colors.text }]}>{option.label}</Text>
                </Pressable>
              );
            })}
          </View>

          <Text style={[styles.filterTitle, styles.filterTitleSpacing, { color: colors.text }]}>状态筛选</Text>
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
                      backgroundColor: active
                        ? colors.primary
                        : isDark
                          ? 'rgba(255,255,255,0.05)'
                          : '#FFF7F1',
                    },
                  ]}
                >
                  <Text style={[styles.filterChipText, { color: active ? '#FFFFFF' : colors.text }]}>{option.label}</Text>
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
            <Text style={[styles.emptyTitle, { color: colors.text }]}>当前没有待查看记录</Text>
            <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>可以切换筛选条件，查看其他状态的反馈与举报。</Text>
          </View>
        ) : (
          records.map((item) => {
            const status = item.status || 'pending';
            const statusTone = getStatusTone(status, isDark);
            const isReport = item.type === 'report_entry';
            const displayName =
              item.user_snapshot?.full_name || (isReport ? item.target_user_snapshot?.full_name : '') || '匿名用户';

            return (
              <View key={item._id || `${item.user_id}-${item.created_at}`} style={[styles.recordCard, { backgroundColor: colors.surface }]}>
                <View style={styles.recordHeader}>
                  <View style={styles.recordMeta}>
                    <Text style={[styles.recordTitle, { color: colors.text }]}>
                      {isReport ? '内容举报' : item.type === 'feature' ? '功能建议' : item.type === 'bug' ? '问题反馈' : '其他反馈'}
                    </Text>
                    <Text style={[styles.recordSubline, { color: colors.textSecondary }]}>
                      {displayName} · {formatTime(item.created_at)}
                    </Text>
                  </View>
                  <View style={[styles.statusChip, { backgroundColor: statusTone.backgroundColor }]}>
                    <Text style={[styles.statusChipText, { color: statusTone.textColor }]}>{statusLabelMap[status]}</Text>
                  </View>
                </View>

                {isReport ? (
                  <View style={[styles.contextBox, { backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : '#FFF7F1' }]}>
                    <Text style={[styles.contextTitle, { color: colors.text }]}>
                      举报原因：{reportReasonLabelMap[item.report_reason || 'other'] || '其他'}
                    </Text>
                    <Text style={[styles.contextText, { color: colors.textSecondary }]}>
                      {item.target_entry_snapshot?.item_name_zh || '未命名记录'}
                    </Text>
                    {item.target_entry_snapshot?.description ? (
                      <Text style={[styles.contextText, { color: colors.textSecondary }]} numberOfLines={2}>
                        {item.target_entry_snapshot.description}
                      </Text>
                    ) : null}
                  </View>
                ) : null}

                <Text style={[styles.recordContent, { color: colors.text }]}>{item.content || '未填写说明'}</Text>

                <View style={styles.actionRow}>
                  {quickStatusActions.map((action) => {
                    const active = status === action.key;
                    const disabled = updatingId === item._id;
                    return (
                      <Pressable
                        key={action.key}
                        disabled={disabled}
                        onPress={() => handleUpdateStatus(item, action.key)}
                        style={[
                          styles.actionChip,
                          {
                            backgroundColor: active
                              ? colors.primary
                              : isDark
                                ? 'rgba(255,255,255,0.05)'
                                : '#FFF7F1',
                            opacity: disabled && !active ? 0.6 : 1,
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
  filterTitleSpacing: {
    marginTop: 18,
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
  contextTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  contextText: {
    marginTop: 6,
    fontSize: 13,
    lineHeight: 19,
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
});

export default AdminFeedbackReportsScreen;
