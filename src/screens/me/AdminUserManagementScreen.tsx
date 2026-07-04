import Ionicons from '@expo/vector-icons/Ionicons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAppTheme } from '../../hooks/useAppTheme';
import { RootStackParamList } from '../../navigation/RootNavigator';
import authService from '../../services/authService';
import { useAppStore } from '../../store/appStore';
import { User } from '../../types/user';

type ScreenNavigationProp = NativeStackNavigationProp<RootStackParamList>;
type UserFilterKey = 'all' | 'admin' | 'frozen' | 'deleted';

const PAGE_SIZE = 20;

const FILTER_OPTIONS: Array<{ key: UserFilterKey; label: string }> = [
  { key: 'all', label: '全部用户' },
  { key: 'admin', label: '管理员' },
  { key: 'frozen', label: '已冻结' },
  { key: 'deleted', label: '已注销' },
];

const formatDateTime = (value?: string | number | Date | null) => {
  if (!value) {
    return '未知时间';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '未知时间';
  }

  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
};

const AdminUserManagementScreen: React.FC = () => {
  const navigation = useNavigation<ScreenNavigationProp>();
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useAppTheme();
  const currentUser = useAppStore((state) => state.currentUser);

  const [keyword, setKeyword] = useState('');
  const [submittedKeyword, setSubmittedKeyword] = useState('');
  const [filter, setFilter] = useState<UserFilterKey>('all');
  const [users, setUsers] = useState<User[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [summary, setSummary] = useState({
    totalUsers: 0,
    adminUsers: 0,
    frozenUsers: 0,
    deletedUsers: 0,
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [updatingUserId, setUpdatingUserId] = useState('');

  const fetchUsers = useCallback(
    async ({ nextPage = 1, append = false, showRefreshing = false } = {}) => {
      if (!currentUser?._id) {
        setUsers([]);
        setLoading(false);
        setRefreshing(false);
        setLoadingMore(false);
        return;
      }

      if (append) {
        setLoadingMore(true);
      } else if (showRefreshing) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      try {
        const result = await authService.getAdminUserList(
          nextPage,
          PAGE_SIZE,
          submittedKeyword,
          filter
        );

        setUsers((prev) => (append ? [...prev, ...result.list] : result.list));
        setPage(result.page);
        setTotal(result.total);
        setSummary({
          totalUsers: result.summary?.totalUsers || 0,
          adminUsers: result.summary?.adminUsers || 0,
          frozenUsers: result.summary?.frozenUsers || 0,
          deletedUsers: result.summary?.deletedUsers || 0,
        });
      } catch (error: any) {
        if (!append) {
          setUsers([]);
        }
        console.warn('[AdminUserManagement] fetch users failed:', error);
        Alert.alert('加载失败', error?.message || '暂时无法获取用户列表，请稍后再试');
      } finally {
        setLoading(false);
        setRefreshing(false);
        setLoadingMore(false);
      }
    },
    [submittedKeyword, filter, currentUser?._id]
  );

  useFocusEffect(
    useCallback(() => {
      void fetchUsers({ nextPage: 1 });
    }, [fetchUsers])
  );

  const canLoadMore = users.length < total;

  const handleLoadMore = () => {
    if (loading || refreshing || loadingMore || !canLoadMore) {
      return;
    }

    void fetchUsers({ nextPage: page + 1, append: true });
  };

  const handleOpenUser = (item: User) => {
    if (item.isDelete) {
      Alert.alert('账号已注销', '该账号已注销，暂时无法进入公开主页。');
      return;
    }

    navigation.navigate('OverallDiaryFeed', {
      viewedUserId: item._id,
      viewedUserName: item.full_name || item.profile?.nickname || item.username,
      viewedAvatarUrl: item.profile?.avatar_url || item.avatar,
    });
  };

  const handleSubmitSearch = () => {
    setSubmittedKeyword(keyword.trim());
  };

  const handleToggleFreezeUser = (item: User) => {
    const nextFrozen = item.accountStatus !== 'frozen';
    const actionText = nextFrozen ? '冻结' : '解除冻结';
    const displayName = item.full_name || item.profile?.nickname || item.username || '该用户';

    Alert.alert(
      `${actionText}用户`,
      nextFrozen
        ? `确认冻结「${displayName}」吗？冻结后将无法登录，也不能继续使用服务端功能。`
        : `确认解除「${displayName}」的冻结状态吗？`,
      [
        { text: '取消', style: 'cancel' },
        {
          text: actionText,
          style: nextFrozen ? 'destructive' : 'default',
          onPress: async () => {
            if (!currentUser?._id) {
              return;
            }

            try {
              setUpdatingUserId(item._id);
              await authService.setAdminUserFrozenStatus({
                adminUserId: currentUser._id,
                targetUserId: item._id,
                frozen: nextFrozen,
              });
              await fetchUsers({ nextPage: 1 });
            } catch (error: any) {
              Alert.alert(`${actionText}失败`, error?.message || `暂时无法${actionText}该用户`);
            } finally {
              setUpdatingUserId('');
            }
          },
        },
      ]
    );
  };

  const summaryCards = useMemo(
    () => [
      { key: 'total', label: '总用户', value: summary.totalUsers, accent: colors.primary },
      { key: 'admin', label: '管理员', value: summary.adminUsers, accent: '#2563EB' },
      { key: 'frozen', label: '已冻结', value: summary.frozenUsers, accent: '#DC2626' },
      { key: 'deleted', label: '已注销', value: summary.deletedUsers, accent: '#F97316' },
    ],
    [summary, colors.primary]
  );

  const renderStatusTag = (label: string, backgroundColor: string, color: string) => (
    <View style={[styles.statusTag, { backgroundColor }]}>
      <Text style={[styles.statusTagText, { color }]}>{label}</Text>
    </View>
  );

  const renderUserCard = ({ item }: { item: User }) => {
    const displayName = item.full_name || item.profile?.nickname || item.username || '未设置昵称';
    const avatarUrl = item.profile?.avatar_url || item.avatar || '';
    const email = item.email || '未绑定邮箱';

    return (
      <TouchableOpacity
        activeOpacity={0.88}
        style={[styles.userCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
        onPress={() => handleOpenUser(item)}
      >
        <View style={styles.userHeader}>
          <View
            style={[
              styles.avatarWrap,
              { backgroundColor: isDark ? 'rgba(255,155,122,0.14)' : 'rgba(255,122,89,0.08)', borderColor: colors.border },
            ]}
          >
            {avatarUrl ? (
              <Image source={{ uri: avatarUrl }} style={styles.avatarImage} />
            ) : (
              <Ionicons name="person" size={18} color={item.isDelete ? colors.textSecondary : colors.primary} />
            )}
          </View>

          <View style={styles.userMain}>
            <View style={styles.userTitleRow}>
              <Text style={[styles.userName, { color: colors.text }]} numberOfLines={1}>
                {displayName}
              </Text>
              {item.isAdmin
                ? renderStatusTag('管理员', isDark ? '#1E3A8A' : '#DBEAFE', isDark ? '#BFDBFE' : '#1D4ED8')
                : null}
              {item.isDelete
                ? renderStatusTag('已注销', isDark ? '#451A03' : '#FFEDD5', isDark ? '#FDBA74' : '#C2410C')
                : null}
              {item.accountStatus === 'frozen'
                ? renderStatusTag('已冻结', isDark ? '#3F1D1D' : '#FEE2E2', isDark ? '#FCA5A5' : '#DC2626')
                : null}
            </View>

            <Text style={[styles.userSubInfo, { color: colors.textSecondary }]}>
              {email} · 注册于 {formatDateTime(item.created_at || item.createdAt)}
            </Text>
            <Text style={[styles.userIdText, { color: colors.textSecondary }]} numberOfLines={1}>
              ID: {item._id}
            </Text>
          </View>

          <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
        </View>

        <View style={styles.metricsRow}>
          <View style={[styles.metricChip, { backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : '#FFF7F1', borderColor: colors.border }]}>
            <Text style={[styles.metricChipLabel, { color: colors.textSecondary }]}>粉丝</Text>
            <Text style={[styles.metricChipValue, { color: colors.text }]}>{item.followersCount || 0}</Text>
          </View>
          <View style={[styles.metricChip, { backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : '#FFF7F1', borderColor: colors.border }]}>
            <Text style={[styles.metricChipLabel, { color: colors.textSecondary }]}>关注</Text>
            <Text style={[styles.metricChipValue, { color: colors.text }]}>{item.followingCount || 0}</Text>
          </View>
          <View style={[styles.metricChip, { backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : '#FFF7F1', borderColor: colors.border }]}>
            <Text style={[styles.metricChipLabel, { color: colors.textSecondary }]}>公开记录</Text>
            <Text style={[styles.metricChipValue, { color: colors.text }]}>{item.publicDiariesCount || 0}</Text>
          </View>
        </View>

        <View style={styles.actionRow}>
          <TouchableOpacity
            activeOpacity={item.isAdmin || item._id === currentUser?._id ? 1 : 0.85}
            disabled={item.isAdmin || item._id === currentUser?._id || updatingUserId === item._id}
            style={[
              styles.freezeButton,
              {
                backgroundColor:
                  item.isAdmin || item._id === currentUser?._id
                    ? isDark
                      ? 'rgba(255,255,255,0.08)'
                      : '#F3F4F6'
                    : item.accountStatus === 'frozen'
                      ? isDark
                        ? '#14532D'
                        : '#DCFCE7'
                      : isDark
                        ? '#3F1D1D'
                        : '#FEE2E2',
              },
            ]}
            onPress={() => handleToggleFreezeUser(item)}
          >
            {updatingUserId === item._id ? (
              <ActivityIndicator size="small" color={item.accountStatus === 'frozen' ? '#16A34A' : '#DC2626'} />
            ) : (
              <Text
                style={[
                  styles.freezeButtonText,
                  {
                    color:
                      item.isAdmin || item._id === currentUser?._id
                        ? colors.textSecondary
                        : item.accountStatus === 'frozen'
                          ? '#16A34A'
                          : '#DC2626',
                  },
                ]}
              >
                {item._id === currentUser?._id
                  ? '当前账号'
                  : item.isAdmin
                    ? '管理员账号'
                    : item.accountStatus === 'frozen'
                      ? '解除冻结'
                      : '冻结用户'}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  const listHeader = (
    <View>
      <View style={[styles.heroCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Text style={[styles.heroTitle, { color: colors.text }]}>用户管理</Text>
        <Text style={[styles.heroDesc, { color: colors.textSecondary }]}>
          先聚焦用户识别和状态巡检，后续再在这页继续扩展封禁、申诉和重点关注能力。
        </Text>
      </View>

      <View style={styles.summaryGrid}>
        {summaryCards.map((card) => (
          <View
            key={card.key}
            style={[styles.summaryCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
          >
            <View style={[styles.summaryDot, { backgroundColor: card.accent }]} />
            <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>{card.label}</Text>
            <Text style={[styles.summaryValue, { color: colors.text }]}>{card.value}</Text>
          </View>
        ))}
      </View>

      <View style={[styles.searchCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={[styles.searchInputWrap, { backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : '#FAFAFA', borderColor: colors.border }]}>
          <Ionicons name="search" size={16} color={colors.textSecondary} />
          <TextInput
            value={keyword}
            onChangeText={setKeyword}
            placeholder="搜索昵称或邮箱"
            placeholderTextColor={colors.textSecondary}
            style={[styles.searchInput, { color: colors.text }]}
            returnKeyType="search"
            onSubmitEditing={handleSubmitSearch}
          />
          {keyword ? (
            <TouchableOpacity
              onPress={() => {
                setKeyword('');
                setSubmittedKeyword('');
              }}
            >
              <Ionicons name="close-circle" size={16} color={colors.textSecondary} />
            </TouchableOpacity>
          ) : null}
        </View>

        <View style={styles.filterRow}>
          {FILTER_OPTIONS.map((option) => {
            const active = option.key === filter;
            return (
              <TouchableOpacity
                key={option.key}
                style={[
                  styles.filterChip,
                  {
                    backgroundColor: active ? colors.primary : isDark ? 'rgba(255,255,255,0.04)' : '#FFF7F1',
                    borderColor: active ? colors.primary : colors.border,
                  },
                ]}
                onPress={() => setFilter(option.key)}
              >
                <Text
                  style={[
                    styles.filterChipText,
                    { color: active ? '#FFFFFF' : colors.textSecondary },
                  ]}
                >
                  {option.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      <View style={styles.listMetaRow}>
        <Text style={[styles.listMetaText, { color: colors.textSecondary }]}>共 {total} 位用户</Text>
        {submittedKeyword ? (
          <Text style={[styles.listMetaText, { color: colors.textSecondary }]}>搜索词: {submittedKeyword}</Text>
        ) : null}
      </View>
    </View>
  );

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]} edges={[]}>
      <View style={[styles.pageHeader, { paddingTop: insets.top + 8 }]}>
        <View style={styles.pageHeaderRow}>
          <Pressable
            onPress={() => navigation.goBack()}
            style={[styles.backButton, { backgroundColor: colors.surface }]}
          >
            <Ionicons name="chevron-back" size={20} color={colors.text} />
          </Pressable>
          <View style={styles.pageHeaderTextWrap}>
            <Text style={[styles.pageHeaderTitle, { color: colors.text }]}>用户管理</Text>
          </View>
        </View>
      </View>

      {loading && users.length === 0 ? (
        <View style={styles.loadingState}>
          <ActivityIndicator size="small" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>正在加载用户列表...</Text>
        </View>
      ) : (
        <FlatList
          data={users}
          keyExtractor={(item) => item._id}
          renderItem={renderUserCard}
          ListHeaderComponent={listHeader}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons name="people" size={40} color={colors.textSecondary} />
              <Text style={[styles.emptyTitle, { color: colors.text }]}>暂无匹配用户</Text>
              <Text style={[styles.emptyDesc, { color: colors.textSecondary }]}>
                可以换个关键词试试，或者切回其他筛选条件。
              </Text>
            </View>
          }
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => void fetchUsers({ nextPage: 1, showRefreshing: true })}
              tintColor={colors.primary}
            />
          }
          onEndReachedThreshold={0.25}
          onEndReached={handleLoadMore}
          ListFooterComponent={
            loadingMore ? (
              <View style={styles.footerLoading}>
                <ActivityIndicator size="small" color={colors.primary} />
              </View>
            ) : null
          }
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  pageHeader: {
    marginBottom: 4,
    paddingHorizontal: 16,
  },
  pageHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  pageHeaderTextWrap: {
    flex: 1,
  },
  pageHeaderTitle: {
    fontSize: 18,
    fontWeight: '800',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listContent: {
    padding: 16,
    paddingBottom: 120,
  },
  heroCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 16,
    marginBottom: 14,
  },
  heroTitle: {
    fontSize: 20,
    fontWeight: '800',
  },
  heroDesc: {
    fontSize: 13,
    lineHeight: 20,
    marginTop: 8,
  },
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  summaryCard: {
    width: '48.5%',
    borderRadius: 18,
    borderWidth: 1,
    padding: 14,
    marginBottom: 10,
  },
  summaryDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginBottom: 10,
  },
  summaryLabel: {
    fontSize: 12,
    marginBottom: 4,
  },
  summaryValue: {
    fontSize: 22,
    fontWeight: '800',
  },
  searchCard: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 14,
    marginBottom: 12,
  },
  searchInputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 12,
    minHeight: 44,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    marginLeft: 8,
  },
  filterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 12,
  },
  filterChip: {
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 8,
    marginRight: 8,
    marginBottom: 8,
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: '700',
  },
  listMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  listMetaText: {
    fontSize: 12,
  },
  userCard: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 14,
    marginBottom: 12,
  },
  userHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarWrap: {
    width: 46,
    height: 46,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    marginRight: 12,
  },
  avatarImage: {
    width: '100%',
    height: '100%',
    borderRadius: 16,
  },
  userMain: {
    flex: 1,
    marginRight: 10,
  },
  userTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  userName: {
    fontSize: 16,
    fontWeight: '800',
    marginRight: 8,
  },
  statusTag: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    marginRight: 6,
    marginTop: 4,
  },
  statusTagText: {
    fontSize: 11,
    fontWeight: '700',
  },
  userSubInfo: {
    fontSize: 13,
    marginTop: 6,
  },
  userIdText: {
    fontSize: 12,
    marginTop: 4,
  },
  metricsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 12,
    justifyContent: 'space-between',
  },
  metricChip: {
    width: '31.5%',
    borderRadius: 14,
    borderWidth: 1,
    paddingVertical: 10,
    paddingHorizontal: 8,
    marginBottom: 8,
  },
  metricChipLabel: {
    fontSize: 11,
    marginBottom: 4,
  },
  metricChipValue: {
    fontSize: 15,
    fontWeight: '700',
  },
  loadingState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 13,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 64,
    paddingHorizontal: 28,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginTop: 12,
  },
  emptyDesc: {
    fontSize: 13,
    lineHeight: 20,
    textAlign: 'center',
    marginTop: 8,
  },
  footerLoading: {
    paddingVertical: 12,
  },
  actionRow: {
    marginTop: 12,
    alignItems: 'flex-end',
  },
  freezeButton: {
    minWidth: 96,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  freezeButtonText: {
    fontSize: 13,
    fontWeight: '700',
  },
});

export default AdminUserManagementScreen;
