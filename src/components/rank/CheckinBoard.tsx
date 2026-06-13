import Ionicons from '@expo/vector-icons/Ionicons';
import { useNavigation } from '@react-navigation/native';
import React from 'react';
import {
  Alert,
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import Loading from '../common/Loading';
import { useAppTheme } from '../../hooks/useAppTheme';
import { RootStackParamList } from '../../navigation/RootNavigator';
import { rankService } from '../../services/rankService';
import { useAppStore } from '../../store/appStore';
import { LeaderboardCode, LEADERBOARD_CONFIGS, StandardItem, UserCheckin } from '../../types/rank';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

type CheckinBoardProps = {
  code: LeaderboardCode;
  header?: React.ReactElement | null;
};

const ALL_CATEGORY = '全部';

const CATEGORY_LABEL_MAP: Record<string, string> = {
  asia: '亚洲',
  europe: '欧洲',
  north_america: '北美洲',
  south_america: '南美洲',
  oceania: '大洋洲',
  africa: '非洲',
  north_china: '华北',
  northeast: '东北',
  east_china: '华东',
  central_china: '华中',
  south_china: '华南',
  southwest: '西南',
  northwest: '西北',
  special_region: '港澳台',
  air: '高空类',
  water: '水上类',
  snow_ice: '冰雪类',
  mountain: '山野类',
  motorsport: '速度类',
  theme: '主题乐园',
  wildlife: '野生动物',
  outdoor: '户外类',
};

const getCategoryLabel = (category: string) => CATEGORY_LABEL_MAP[category] || category;

const getItemCategoryLabel = (item: StandardItem) =>
  item.category_label_zh || getCategoryLabel(item.category);

const CheckinBoard: React.FC<CheckinBoardProps> = ({ code, header = null }) => {
  const { colors, isDark } = useAppTheme();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const currentUser = useAppStore((state) => state.currentUser);
  const userId = currentUser?._id;
  const config = LEADERBOARD_CONFIGS[code];

  const [loading, setLoading] = React.useState(true);
  const [items, setItems] = React.useState<StandardItem[]>([]);
  const [userCheckins, setUserCheckins] = React.useState<UserCheckin[]>([]);
  const [checkedIds, setCheckedIds] = React.useState<Set<string>>(new Set());
  const [selectedCategory, setSelectedCategory] = React.useState(ALL_CATEGORY);

  const fetchData = React.useCallback(async () => {
    if (!userId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const [allOptions, myCheckins] = await Promise.all([
        rankService.getStandardItems(code),
        rankService.getUserCheckins(userId, code),
      ]);

      setItems(allOptions);
      setUserCheckins(myCheckins);
      setCheckedIds(new Set(myCheckins.map((item) => item.item_id)));
    } catch (error) {
      Alert.alert('加载失败', '当前榜单数据暂时不可用，请稍后重试。');
    } finally {
      setLoading(false);
    }
  }, [code, userId]);

  React.useEffect(() => {
    setSelectedCategory(ALL_CATEGORY);
  }, [code]);

  React.useEffect(() => {
    fetchData();
  }, [fetchData]);

  const categories = React.useMemo(() => {
    const nextCategories = Array.from(new Set(items.map((item) => item.category).filter(Boolean)));
    return [ALL_CATEGORY, ...nextCategories];
  }, [items]);

  const categoryLabels = React.useMemo(() => {
    const nextMap: Record<string, string> = {};
    items.forEach((item) => {
      if (!nextMap[item.category]) {
        nextMap[item.category] = getItemCategoryLabel(item);
      }
    });
    return nextMap;
  }, [items]);

  const filteredItems = React.useMemo(() => {
    if (selectedCategory === ALL_CATEGORY) {
      return items;
    }

    return items.filter((item) => item.category === selectedCategory);
  }, [items, selectedCategory]);
  const completionRate = items.length ? checkedIds.size / items.length : 0;
  const progressPercent = Math.round(completionRate * 100);
  const activeCategoryLabel =
    selectedCategory === ALL_CATEGORY
      ? '全部分类'
      : categoryLabels[selectedCategory] || getCategoryLabel(selectedCategory);
  const filteredCheckedCount = React.useMemo(
    () => filteredItems.filter((item) => checkedIds.has(item._id)).length,
    [filteredItems, checkedIds]
  );
  const entryCountMap = React.useMemo(() => {
    const nextMap: Record<string, number> = {};
    userCheckins.forEach((checkin) => {
      nextMap[checkin.item_id] = Array.isArray(checkin.contents) ? checkin.contents.length : 0;
    });
    return nextMap;
  }, [userCheckins]);

  if (loading) {
    return <Loading message="正在加载当前榜单可录入项..." />;
  }

  if (!userId) {
    return (
      <View style={[styles.emptyWrap, { backgroundColor: colors.background }]}>
        <Text style={[styles.emptyTitle, { color: colors.text }]}>未获取到登录用户</Text>
        <Text style={[styles.emptyDesc, { color: colors.textSecondary }]}>
          请重新登录后再录入当前榜单内容。
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
          <View
            style={[
              styles.summaryCard,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ]}
          >
            <View style={styles.summaryHeader}>
              <View>
                <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>录入进度</Text>
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
                    backgroundColor: isDark ? 'rgba(124,140,255,0.14)' : 'rgba(79,70,229,0.08)',
                  },
                ]}
              >
                <Text style={[styles.progressBadgeText, { color: colors.primary }]}>{progressPercent}%</Text>
              </View>
            </View>

            <View
              style={[
                styles.progressTrack,
                { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : '#E8EEF6' },
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
                <Text style={[styles.summaryMetaLabel, { color: colors.textSecondary }]}>当前榜单</Text>
                <Text style={[styles.summaryMetaValue, { color: colors.text }]}>{config.title}</Text>
              </View>
              <View style={styles.summaryMetaItem}>
                <Text style={[styles.summaryMetaLabel, { color: colors.textSecondary }]}>当前筛选</Text>
                <Text style={[styles.summaryMetaValue, { color: colors.text }]}>{activeCategoryLabel}</Text>
              </View>
              <View style={styles.summaryMetaItem}>
                <Text style={[styles.summaryMetaLabel, { color: colors.textSecondary }]}>当前进度</Text>
                <Text style={[styles.summaryMetaValue, { color: colors.text }]}>
                  {filteredCheckedCount}/{filteredItems.length}
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.categoryHeader}>
            <Text style={[styles.categoryTitle, { color: colors.text }]}>分类筛选</Text>
            {/* <Text style={[styles.categoryHint, { color: colors.textSecondary }]}>{activeCategoryLabel}</Text> */}
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
                    {categoryLabels[item] || getCategoryLabel(item)}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </>
      }
      renderItem={({ item }) => {
        const isChecked = checkedIds.has(item._id);
        const entryCount = entryCountMap[item._id] || 0;
        const cardHighlightColor = isDark ? 'rgba(124,140,255,0.18)' : 'rgba(79,70,229,0.08)';
        const cardBaseColor = isDark ? 'rgba(255,255,255,0.02)' : '#F8FBFF';
        const markerColor = isDark ? 'rgba(129,140,248,0.9)' : colors.primary;

        return (
          <Pressable
            onPress={() => navigation.navigate('CheckinItemRecords', { code, item })}
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
                      : '#E8EEF6',
                },
              ]}
            >
              <Text style={[styles.itemIndexText, { color: isChecked ? '#FFFFFF' : colors.textSecondary }]}>
                {String(filteredItems.findIndex((entry) => entry._id === item._id) + 1).padStart(2, '0')}
              </Text>
            </View>
            <View style={styles.itemMain}>
              <View style={styles.itemTitleRow}>
                <Text style={[styles.itemTitle, { color: colors.text }]}>{item.name_zh}</Text>
                {isChecked ? (
                  <View
                    style={[
                      styles.recordedBadge,
                      {
                        backgroundColor: isDark ? 'rgba(129,140,248,0.18)' : 'rgba(79,70,229,0.10)',
                        borderColor: isDark ? 'rgba(129,140,248,0.34)' : 'rgba(79,70,229,0.20)',
                      },
                    ]}
                  >
                    <Ionicons name="checkmark-circle" size={12} color={colors.primary} />
                    <Text style={[styles.recordedBadgeText, { color: colors.primary }]}>已录入</Text>
                  </View>
                ) : null}
                <View
                  style={[
                    styles.itemCategoryTag,
                    {
                      backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#EEF3F9',
                      borderColor: colors.border,
                    },
                  ]}
                >
                  <Text style={[styles.itemCategoryTagText, { color: colors.textSecondary }]}>
                    {getItemCategoryLabel(item)}
                  </Text>
                </View>
              </View>
              <Text style={[styles.itemSubtitle, { color: colors.textSecondary }]}>
                {item.name_en || '暂无英文名'}
              </Text>
              {isChecked ? (
                <Text style={[styles.itemRecordedHint, { color: colors.primary }]}>
                  已有 {entryCount} 篇记录，点击可继续补充或编辑
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
                      : colors.surface,
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
                {isChecked ? `${entryCount}篇记录` : '录入数据'}
              </Text>
            </View>
          </Pressable>
        );
      }}
      ListEmptyComponent={
        <View style={[styles.emptyCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.emptyTitle, { color: colors.text }]}>当前分类暂无标准项</Text>
          <Text style={[styles.emptyDesc, { color: colors.textSecondary }]}>
            可以切换顶部分类，或者稍后补充当前榜单的标准项数据。
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
  summaryCard: {
    borderWidth: 1,
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
    borderWidth: 1,
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
    borderWidth: 1,
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
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
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
    borderWidth: 1,
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
    borderWidth: 1,
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
    borderWidth: 1,
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
    borderWidth: 1,
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
