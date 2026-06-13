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
import { rankService } from '../../services/rankService';
import { useAppStore } from '../../store/appStore';
import { LeaderboardCode, LEADERBOARD_CONFIGS, StandardItem } from '../../types/rank';

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
  const currentUser = useAppStore((state) => state.currentUser);
  const userId = currentUser?._id;
  const config = LEADERBOARD_CONFIGS[code];

  const [loading, setLoading] = React.useState(true);
  const [items, setItems] = React.useState<StandardItem[]>([]);
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

  const handleToggle = async (item: StandardItem) => {
    if (!userId) {
      return;
    }

    const isChecked = checkedIds.has(item._id);
    const nextCheckedIds = new Set(checkedIds);

    if (isChecked) {
      nextCheckedIds.delete(item._id);
    } else {
      nextCheckedIds.add(item._id);
    }

    setCheckedIds(nextCheckedIds);

    try {
      await rankService.toggleCheckin(userId, item, !isChecked);
    } catch (error) {
      Alert.alert('保存失败', '录入状态未成功同步，请稍后再试。');
      fetchData();
    }
  };

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
          <View style={[styles.summaryCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>当前录入进度</Text>
            <Text style={[styles.summaryValue, { color: colors.text }]}>
              已点亮 <Text style={{ color: colors.primary }}>{checkedIds.size}</Text> / {items.length} {config.unit}
            </Text>
            <Text style={[styles.summaryDesc, { color: colors.textSecondary }]}>
              这里只展示 {config.title} 的标准项，录入后会影响当前榜单的排名与分数。
            </Text>
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
                  <Text style={{ color: active ? '#FFFFFF' : colors.text }}>
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

        return (
          <Pressable
            onPress={() => handleToggle(item)}
            style={[
              styles.itemCard,
              {
                backgroundColor: isChecked
                  ? isDark
                    ? 'rgba(244,114,182,0.14)'
                    : 'rgba(236,72,153,0.08)'
                  : colors.surface,
                borderColor: isChecked ? colors.primary : colors.border,
              },
            ]}
          >
            <View style={styles.itemMain}>
              <Text style={[styles.itemTitle, { color: colors.text }]}>{item.name_zh}</Text>
              <Text style={[styles.itemSubtitle, { color: colors.textSecondary }]}>
                {item.name_en || '暂无英文名'} · {getItemCategoryLabel(item)}
              </Text>
            </View>
            <View
              style={[
                styles.statusBadge,
                {
                  backgroundColor: isChecked ? colors.primary : 'transparent',
                  borderColor: isChecked ? colors.primary : colors.border,
                },
              ]}
            >
              <Text style={{ color: isChecked ? '#FFFFFF' : colors.textSecondary, fontWeight: '700' }}>
                {isChecked ? '已录入' : '未录入'}
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
    borderRadius: 22,
    padding: 18,
  },
  summaryLabel: {
    fontSize: 13,
  },
  summaryValue: {
    marginTop: 8,
    fontSize: 24,
    fontWeight: '800',
  },
  summaryDesc: {
    marginTop: 8,
    fontSize: 14,
    lineHeight: 21,
  },
  categoryContent: {
    gap: 10,
    paddingTop: 14,
    paddingBottom: 12,
  },
  categoryChip: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  itemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 18,
    padding: 16,
    marginBottom: 12,
  },
  itemMain: {
    flex: 1,
    paddingRight: 12,
  },
  itemTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  itemSubtitle: {
    marginTop: 6,
    fontSize: 13,
    lineHeight: 19,
  },
  statusBadge: {
    minWidth: 72,
    borderWidth: 1,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
    paddingVertical: 8,
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
