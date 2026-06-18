import Ionicons from '@expo/vector-icons/Ionicons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import React from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { useAppTheme } from '../../hooks/useAppTheme';
import { RootStackParamList } from '../../navigation/RootNavigator';
import { checkinService } from '../../services/checkinService';
import { useAppStore } from '../../store/appStore';
import { LeaderboardCode, LEADERBOARD_CONFIGS, StandardItem, UserCheckin } from '../../types/rank';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

type CheckinBoardProps = {
  code: LeaderboardCode;
  header?: React.ReactElement | null;
  viewedUserId?: string;
  viewedUserName?: string;
  readOnly?: boolean;
};

type CheckinBoardData = {
  items: StandardItem[];
  userCheckins: UserCheckin[];
};

const ALL_CATEGORY = '全部';

const CheckinBoard: React.FC<CheckinBoardProps> = ({
  code,
  header = null,
  viewedUserId,
  viewedUserName,
  readOnly = false,
}) => {
  const { colors, isDark } = useAppTheme();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const currentUser = useAppStore((state) => state.currentUser);
  const userId = currentUser?._id;
  const config = LEADERBOARD_CONFIGS[code];
  const targetUserId = viewedUserId || userId;
  const isViewerMode = Boolean(readOnly && targetUserId);
  const ownerLabel = viewedUserName || (isViewerMode ? '该用户' : '我');

  const [dataByCode, setDataByCode] = React.useState<Partial<Record<LeaderboardCode, CheckinBoardData>>>({});
  const [switchingCode, setSwitchingCode] = React.useState<LeaderboardCode | null>(null);
  const [selectedCategory, setSelectedCategory] = React.useState(ALL_CATEGORY);
  const [searchKeyword, setSearchKeyword] = React.useState('');
  const requestIdRef = React.useRef(0);

  const currentData = dataByCode[code];
  const items = currentData?.items ?? [];
  const userCheckins = currentData?.userCheckins ?? [];
  const checkedIds = React.useMemo(() => new Set(userCheckins.map((item) => item.item_id)), [userCheckins]);
  const isCurrentLoading = switchingCode === code;
  const shouldShowInlineLoading = !currentData && isCurrentLoading;

  const fetchData = React.useCallback(async (nextCode: LeaderboardCode) => {
    if (!targetUserId) {
      setDataByCode({});
      setSwitchingCode(null);
      return;
    }

    const currentRequestId = requestIdRef.current + 1;
    requestIdRef.current = currentRequestId;
    setSwitchingCode(nextCode);

    try {
      const [allOptions, myCheckins] = await Promise.all([
        checkinService.getStandardItems(nextCode),
        checkinService.getUserCheckins(targetUserId, nextCode),
      ]);

      if (requestIdRef.current !== currentRequestId) {
        return;
      }

      setDataByCode((prev) => ({
        ...prev,
        [nextCode]: {
          items: allOptions,
          userCheckins: myCheckins,
        },
      }));
    } catch (error) {
      Alert.alert('加载失败', '当前榜单数据暂时不可用，请稍后重试。');
    } finally {
      if (requestIdRef.current === currentRequestId) {
        setSwitchingCode((current) => (current === nextCode ? null : current));
      }
    }
  }, [targetUserId]);

  React.useEffect(() => {
    setSelectedCategory(ALL_CATEGORY);
    setSearchKeyword('');
  }, [code]);

  useFocusEffect(
    React.useCallback(() => {
      fetchData(code);
    }, [fetchData, code])
  );

  const visibleItems = React.useMemo(
    () => (isViewerMode ? items.filter((item) => checkedIds.has(item._id)) : items),
    [checkedIds, isViewerMode, items]
  );

  const categories = React.useMemo(() => {
    const nextCategories = Array.from(new Set(visibleItems.map((item) => item.category).filter(Boolean)));
    return [ALL_CATEGORY, ...nextCategories];
  }, [visibleItems]);

  const categoryLabels = React.useMemo(() => {
    const nextMap: Record<string, string> = {};
    visibleItems.forEach((item) => {
      const categoryKey = item.category || 'uncategorized';
      if (!nextMap[categoryKey]) {
        nextMap[categoryKey] = item.category_label_zh;
      }
    });
    return nextMap;
  }, [visibleItems]);

  const filteredByCategoryItems = React.useMemo(() => {
    if (selectedCategory === ALL_CATEGORY) {
      return visibleItems;
    }

    return visibleItems.filter((item) => item.category === selectedCategory);
  }, [selectedCategory, visibleItems]);
  const normalizedSearchKeyword = searchKeyword.trim().toLowerCase();
  const filteredItems = React.useMemo(() => {
    if (!normalizedSearchKeyword) {
      return filteredByCategoryItems;
    }

    return filteredByCategoryItems.filter((item) => {
      const searchPool = [
        item.name_zh,
        item.name_en,
        item.category,
        item.category_label_zh,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      return searchPool.includes(normalizedSearchKeyword);
    });
  }, [filteredByCategoryItems, normalizedSearchKeyword]);
  const completionRate = items.length ? checkedIds.size / items.length : 0;
  const progressPercent = Math.round(completionRate * 100);
  const activeCategoryLabel =
    selectedCategory === ALL_CATEGORY
      ? '全部分类'
      : categoryLabels[selectedCategory];
  const entryCountMap = React.useMemo(() => {
    const nextMap: Record<string, number> = {};
    userCheckins.forEach((checkin) => {
      nextMap[checkin.item_id] = Array.isArray(checkin.contents) ? checkin.contents.length : 0;
    });
    return nextMap;
  }, [userCheckins]);

  if (!targetUserId) {
    return (
      <View style={[styles.emptyWrap, { backgroundColor: colors.background }]}>
        <Text style={[styles.emptyTitle, { color: colors.text }]}>
          {isViewerMode ? '未找到目标用户' : '未获取到登录用户'}
        </Text>
        <Text style={[styles.emptyDesc, { color: colors.textSecondary }]}>
          {isViewerMode ? '请返回排行榜后重试。' : '请重新登录后再录入当前榜单内容。'}
        </Text>
      </View>
    );
  }

  return (
    <FlatList
      data={filteredItems}
      keyExtractor={(item) => item._id}
      contentContainerStyle={styles.listContent}
      showsVerticalScrollIndicator={false}
      ListHeaderComponent={
        <>
          {header}
          {shouldShowInlineLoading ? (
            <View
              style={[
                styles.inlineLoadingCard,
                { backgroundColor: colors.surface, borderColor: colors.border },
              ]}
            >
              <ActivityIndicator size="small" color={colors.primary} />
              <Text style={[styles.inlineLoadingText, { color: colors.textSecondary }]}>
                正在切换 {config.title}{isViewerMode ? '足迹' : '录入项'}...
              </Text>
            </View>
          ) : (
            <>
              <View
                style={[
                  styles.summaryCard,
                  { backgroundColor: colors.surface, borderColor: colors.border },
                ]}
              >
                <View style={styles.summaryHeader}>
                  <View>
                    <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>
                      条目进度
                    </Text>
                    <Text style={[styles.summaryValue, { color: colors.text }]}>
                      {checkedIds.size}
                      <Text style={[styles.summaryValueMuted, { color: colors.textSecondary }]}>
                        {' '}
                        / {items.length} {config.unit}
                      </Text>
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.progressBadge,
                      {
                        backgroundColor: isDark ? 'rgba(255,155,122,0.14)' : 'rgba(255,122,89,0.08)',
                      },
                    ]}
                  >
                    <Text style={[styles.progressBadgeText, { color: colors.primary }]}>
                      {isCurrentLoading ? '同步中...' : `${progressPercent}%`}
                    </Text>
                  </View>
                </View>

                <View
                  style={[
                    styles.progressTrack,
                    { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : '#F7E7DB' },
                  ]}
                >
                  <View
                    style={[
                      styles.progressBar,
                      {
                        backgroundColor: colors.primary,
                        width: `${progressPercent}%`,
                      },
                    ]}
                  />
                </View>

                <View style={styles.summaryMetaRow}>
                  <View style={styles.summaryMetaItem}>
                    <Text style={[styles.summaryMetaLabel, { color: colors.textSecondary }]}>查看对象</Text>
                    <Text style={[styles.summaryMetaValue, { color: colors.text }]}>
                      {ownerLabel}
                    </Text>
                  </View>
                  <View style={styles.summaryMetaItem}>
                    <Text style={[styles.summaryMetaLabel, { color: colors.textSecondary }]}>当前榜单</Text>
                    <Text style={[styles.summaryMetaValue, { color: colors.text }]}>{config.title}</Text>
                  </View>
                  <View style={styles.summaryMetaItem}>
                    <Text style={[styles.summaryMetaLabel, { color: colors.textSecondary }]}>当前筛选</Text>
                    <Text style={[styles.summaryMetaValue, { color: colors.text }]}>{activeCategoryLabel}</Text>
                  </View>
                </View>
              </View>

              <View style={styles.categoryHeader}>
                <Text style={[styles.categoryTitle, { color: colors.text }]}>分类筛选</Text>
              </View>

              <View
                style={[
                  styles.searchWrap,
                  {
                    backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : '#fbece2ff',
                  },
                ]}
              >
                <Ionicons name="search-outline" size={16} color={colors.textSecondary} />
                <TextInput
                  value={searchKeyword}
                  onChangeText={setSearchKeyword}
                  placeholder="搜索国家、省份、项目"
                  placeholderTextColor={colors.textSecondary}
                  style={[styles.searchInput, { color: colors.text }]}
                />
                {searchKeyword ? (
                  <Pressable onPress={() => setSearchKeyword('')} hitSlop={8}>
                    <Ionicons name="close-circle" size={16} color={colors.textSecondary} />
                  </Pressable>
                ) : null}
              </View>

              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.categoryContent}
              >
                {categories.map((item) => {
                  const active = item === selectedCategory;

                  return (
                    <Pressable
                      key={item}
                      onPress={() => setSelectedCategory(item)}
                      style={[
                        styles.categoryChip,
                        {
                          backgroundColor: active ? colors.primary : colors.surface,
                          borderColor: active ? colors.primary : colors.border,
                        },
                      ]}
                    >
                      <Text style={[styles.categoryChipText, { color: active ? '#FFFFFF' : colors.text }]}>
                        {item === ALL_CATEGORY ? ALL_CATEGORY : categoryLabels[item]}
                      </Text>
                    </Pressable>
                  );
                })}
              </ScrollView>
            </>
          )}
        </>
      }
      renderItem={({ item }) => {
        const isChecked = checkedIds.has(item._id);
        const entryCount = entryCountMap[item._id] || 0;
        const itemCoverUri = item.icon?.trim();
        const cardHighlightColor = isDark ? 'rgba(255,155,122,0.18)' : 'rgba(255,122,89,0.08)';
        const cardBaseColor = isDark ? 'rgba(255,255,255,0.02)' : '#FFF8F3';
        const markerColor = isDark ? 'rgba(255,155,122,0.9)' : colors.primary;

        return (
          <Pressable
            onPress={() =>
              navigation.navigate('CheckinItemRecords', {
                code,
                item,
                viewedUserId,
                viewedUserName,
                readOnly,
              })
            }
            style={[
              styles.itemCard,
              {
                backgroundColor: isChecked ? cardHighlightColor : cardBaseColor,
                borderColor: isChecked ? colors.primary : colors.border,
              },
            ]}
          >
            {isChecked ? (
              <View
                style={[
                  styles.itemActiveMarker,
                  {
                    backgroundColor: markerColor,
                  },
                ]}
              />
            ) : null}
            <View
              style={[
                styles.itemIndexBadge,
                {
                  backgroundColor: isChecked
                    ? colors.primary
                    : isDark
                      ? 'rgba(148,163,184,0.10)'
                      : '#F7E7DB',
                },
              ]}
            >
              {itemCoverUri ? (
                <Image source={{ uri: itemCoverUri }} style={styles.itemCoverImage} resizeMode="cover" />
              ) : (
                <Text style={[styles.itemIndexText, { color: isChecked ? '#FFFFFF' : colors.textSecondary }]}>
                  {String(filteredItems.findIndex((entry) => entry._id === item._id) + 1).padStart(2, '0')}
                </Text>
              )}
            </View>
            <View style={styles.itemMain}>
              <View style={styles.itemTitleRow}>
                <Text style={[styles.itemTitle, { color: colors.text }]}>{item.name_zh}</Text>
                {isChecked ? (
                  <View
                    style={[
                      styles.recordedBadge,
                      {
                        backgroundColor: isDark ? 'rgba(255,155,122,0.18)' : 'rgba(255,122,89,0.10)',
                        borderColor: isDark ? 'rgba(255,155,122,0.34)' : 'rgba(255,122,89,0.20)',
                      },
                    ]}
                  >
                    <Ionicons name="checkmark-circle" size={12} color={colors.primary} />
                    <Text style={[styles.recordedBadgeText, { color: colors.primary }]}>已记录</Text>
                  </View>
                ) : null}
                <View
                  style={[
                    styles.itemCategoryTag,
                    {
                      backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#FFF1E8',
                      borderColor: colors.border,
                    },
                  ]}
                >
                  <Text style={[styles.itemCategoryTagText, { color: colors.textSecondary }]}>
                    {item.category_label_zh}
                  </Text>
                </View>
              </View>
              <Text style={[styles.itemSubtitle, { color: colors.textSecondary }]}>
                {item.name_en || '暂无英文名'}
              </Text>
              {isChecked ? (
                <Text style={[styles.itemRecordedHint, { color: colors.primary }]}>
                  已有 {entryCount} 篇记录，点击查看列表
                </Text>
              ) : null}
            </View>
            <View
              style={[
                styles.statusWrap,
                {
                  backgroundColor: isChecked
                    ? colors.primary
                    : isDark
                      ? 'rgba(255,255,255,0.02)'
                      : '#FFFDFB',
                  borderColor: isChecked ? colors.primary : colors.border,
                },
              ]}
            >
              <Ionicons
                name={isChecked ? 'documents' : 'add'}
                size={16}
                color={isChecked ? '#FFFFFF' : colors.textSecondary}
              />
              <Text style={[styles.statusText, { color: isChecked ? '#FFFFFF' : colors.textSecondary }]}>
                {isChecked ? `${entryCount}篇记录` : '查看列表'}
              </Text>
            </View>
          </Pressable>
        );
      }}
      ListEmptyComponent={
        <View style={[styles.emptyCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.emptyTitle, { color: colors.text }]}>
            {normalizedSearchKeyword ? '没有找到相关条目' : '当前分类暂无条目'}
          </Text>
          <Text style={[styles.emptyDesc, { color: colors.textSecondary }]}>
            {normalizedSearchKeyword
              ? `试试更换关键词，或切换分类后继续查看 ${ownerLabel} 在这个榜单下的条目列表。`
              : `可以切换顶部分类后，继续查看 ${ownerLabel} 在这个榜单下的条目列表。`}
          </Text>
        </View>
      }
    />
  );
};

const styles = StyleSheet.create({
  listContent: {
    padding: 16,
    paddingBottom: 140,
  },
  inlineLoadingCard: {
    marginTop: 16,
    marginBottom: 16,
    borderWidth: 0,
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  inlineLoadingText: {
    fontSize: 13,
    fontWeight: '500',
  },
  summaryCard: {
    borderWidth: 0,
    borderRadius: 24,
    padding: 18,
  },
  summaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  summaryLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
  summaryValue: {
    marginTop: 8,
    fontSize: 28,
    fontWeight: '900',
  },
  summaryValueMuted: {
    fontSize: 16,
    fontWeight: '700',
  },
  progressBadge: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  progressBadgeText: {
    fontSize: 13,
    fontWeight: '800',
  },
  progressTrack: {
    marginTop: 16,
    height: 8,
    borderRadius: 999,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    borderRadius: 999,
  },
  summaryMetaRow: {
    marginTop: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
  },
  summaryMetaItem: {
    flex: 1,
  },
  summaryMetaLabel: {
    fontSize: 12,
  },
  summaryMetaValue: {
    marginTop: 6,
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 18,
  },
  categoryHeader: {
    marginTop: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  categoryTitle: {
    fontSize: 16,
    fontWeight: '800',
  },
  searchWrap: {
    marginTop: 12,
    marginBottom: 2,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    paddingVertical: 0,
  },
  categoryHint: {
    fontSize: 12,
    fontWeight: '600',
  },
  categoryContent: {
    gap: 10,
    paddingTop: 12,
    paddingBottom: 12,
  },
  categoryChip: {
    borderWidth: 0,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  categoryChipText: {
    fontSize: 13,
    fontWeight: '700',
  },
  itemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 0,
    borderRadius: 20,
    padding: 14,
    marginBottom: 12,
    position: 'relative',
    overflow: 'hidden',
  },
  itemActiveMarker: {
    position: 'absolute',
    left: 0,
    top: 10,
    bottom: 10,
    width: 4,
    borderTopRightRadius: 999,
    borderBottomRightRadius: 999,
  },
  itemIndexBadge: {
    width: 42,
    height: 42,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    overflow: 'hidden',
  },
  itemCoverImage: {
    width: '100%',
    height: '100%',
  },
  itemIndexText: {
    fontSize: 12,
    fontWeight: '800',
  },
  itemMain: {
    flex: 1,
    paddingRight: 12,
  },
  itemTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  recordedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: 0,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  recordedBadgeText: {
    fontSize: 11,
    fontWeight: '800',
  },
  itemTitle: {
    fontSize: 16,
    fontWeight: '800',
  },
  itemCategoryTag: {
    borderWidth: 0,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  itemCategoryTagText: {
    fontSize: 11,
    fontWeight: '700',
  },
  itemSubtitle: {
    marginTop: 6,
    fontSize: 13,
    lineHeight: 19,
  },
  itemRecordedHint: {
    marginTop: 6,
    fontSize: 12,
    fontWeight: '700',
  },
  statusWrap: {
    minWidth: 82,
    borderWidth: 0,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
    paddingVertical: 10,
    gap: 4,
  },
  statusText: {
    fontWeight: '700',
    fontSize: 11,
  },
  emptyWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  emptyCard: {
    borderWidth: 0,
    borderRadius: 18,
    padding: 20,
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  emptyDesc: {
    marginTop: 8,
    fontSize: 14,
    lineHeight: 21,
    textAlign: 'center',
  },
});

export default CheckinBoard;
