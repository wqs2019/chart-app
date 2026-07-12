import Ionicons from '@expo/vector-icons/Ionicons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';

import { useToast } from '../../components/common/Toast';
import { useAppTheme } from '../../hooks/useAppTheme';
import { RootStackParamList } from '../../navigation/RootNavigator';
import {
  CHINA_FOOTPRINT_COORDINATES,
  FootprintCoordinate,
  WORLD_FOOTPRINT_COORDINATES,
} from '../../data/footprintCoordinates';
import { CHINA_PROVINCE_ADCODE, WORLD_BOUNDARY_ALIASES } from '../../data/footprintBoundaries';
import { checkinService } from '../../services/checkinService';
import { rankService } from '../../services/rankService';
import { useAppStore } from '../../store/appStore';
import { StandardItem, UserCheckin, UserScoreSnapshot } from '../../types/rank';
import {
  BaseMapStyle,
  buildFootprintMapHtml,
  FootprintMapArea,
  FootprintMapMarker,
  formatDate,
  formatPercent,
  getLatestCheckinAt,
  getRecordCount,
  MapViewCode,
  wgs84ToGcj02,
} from '../../utils/footprintMap';

type FootprintItemSummary = {
  item: StandardItem;
  regionLabel: string;
  isVisited: boolean;
  recordCount: number;
  latestCheckinAt?: Date | string;
  coordinate?: FootprintCoordinate;
  mapCoordinate?: FootprintCoordinate;
};

type MapDataState = Record<
  MapViewCode,
  {
    items: StandardItem[];
    checkins: UserCheckin[];
    snapshot: UserScoreSnapshot | null;
  }
>;

const VIEW_OPTIONS: Array<{ code: MapViewCode; label: string; icon: keyof typeof Ionicons.glyphMap }> = [
  {
    code: 'world_travel',
    label: '世界地图',
    icon: 'earth-outline',
  },
  {
    code: 'china_travel',
    label: '中国地图',
    icon: 'map-outline',
  },
];

const MAP_STYLE_OPTIONS: Array<{ code: BaseMapStyle; label: string; icon: keyof typeof Ionicons.glyphMap }> = [
  {
    code: 'vector',
    label: '标准',
    icon: 'map-outline',
  },
  {
    code: 'satellite',
    label: '卫星',
    icon: 'planet-outline',
  },
];

const TravelFootprintMapScreen: React.FC = () => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const toast = useToast();
  const { colors, isDark } = useAppTheme();
  const currentUser = useAppStore((state) => state.currentUser);
  const [loading, setLoading] = React.useState(false);
  const [webViewLoading, setWebViewLoading] = React.useState(true);
  const [activeView, setActiveView] = React.useState<MapViewCode>('world_travel');
  const [baseMapStyle, setBaseMapStyle] = React.useState<BaseMapStyle>('vector');
  const [selectedWorldItemId, setSelectedWorldItemId] = React.useState('');
  const [selectedChinaItemId, setSelectedChinaItemId] = React.useState('');
  const [isMapFullscreen, setIsMapFullscreen] = React.useState(false);
  const [dataState, setDataState] = React.useState<MapDataState>({
    world_travel: {
      items: [],
      checkins: [],
      snapshot: null,
    },
    china_travel: {
      items: [],
      checkins: [],
      snapshot: null,
    },
  });

  const fetchData = React.useCallback(async () => {
    if (!currentUser?._id) {
      setDataState({
        world_travel: { items: [], checkins: [], snapshot: null },
        china_travel: { items: [], checkins: [], snapshot: null },
      });
      return;
    }

    try {
      setLoading(true);
      const [worldItems, chinaItems, worldCheckins, chinaCheckins, worldSnapshot, chinaSnapshot] = await Promise.all([
        checkinService.getStandardItems('world_travel'),
        checkinService.getStandardItems('china_travel'),
        checkinService.getUserCheckins(currentUser._id, 'world_travel'),
        checkinService.getUserCheckins(currentUser._id, 'china_travel'),
        rankService.getMyRank(currentUser._id, 'world_travel'),
        rankService.getMyRank(currentUser._id, 'china_travel'),
      ]);

      setDataState({
        world_travel: {
          items: worldItems,
          checkins: worldCheckins,
          snapshot: worldSnapshot,
        },
        china_travel: {
          items: chinaItems,
          checkins: chinaCheckins,
          snapshot: chinaSnapshot,
        },
      });
    } catch (error) {
      console.warn('[TravelFootprintMap] load failed:', error);
      toast.error('地图足迹加载失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  }, [currentUser?._id, toast]);

  useFocusEffect(
    React.useCallback(() => {
      void fetchData();
    }, [fetchData])
  );

  const buildFootprintItems = React.useCallback(
    (code: MapViewCode) => {
      const state = dataState[code];
      const coordinates = code === 'world_travel' ? WORLD_FOOTPRINT_COORDINATES : CHINA_FOOTPRINT_COORDINATES;

      return state.items
        .map<FootprintItemSummary>((item) => {
          const matchedCheckins = state.checkins.filter((checkin) => checkin.item_id === item._id);
          const coordinate = coordinates[item._id];

          return {
            item,
            regionLabel: item.category_label_zh || item.category,
            isVisited: matchedCheckins.length > 0,
            recordCount: getRecordCount(matchedCheckins),
            latestCheckinAt: getLatestCheckinAt(matchedCheckins),
            coordinate,
            mapCoordinate: coordinate ? wgs84ToGcj02(coordinate) : undefined,
          };
        })
        .sort((a, b) => {
          if (a.isVisited !== b.isVisited) {
            return Number(b.isVisited) - Number(a.isVisited);
          }

          return new Date(b.latestCheckinAt || 0).getTime() - new Date(a.latestCheckinAt || 0).getTime();
        });
    },
    [dataState]
  );

  const worldItems = React.useMemo(() => buildFootprintItems('world_travel'), [buildFootprintItems]);
  const chinaItems = React.useMemo(() => buildFootprintItems('china_travel'), [buildFootprintItems]);
  const currentItems = activeView === 'world_travel' ? worldItems : chinaItems;
  const currentVisitedItems = currentItems.filter((item) => item.isVisited && item.mapCoordinate);
  const currentSnapshot = dataState[activeView].snapshot;
  const selectedItemId = activeView === 'world_travel' ? selectedWorldItemId : selectedChinaItemId;
  const selectedItem =
    currentVisitedItems.find((item) => item.item._id === selectedItemId) || currentVisitedItems[0] || null;
  const visitedCount = currentItems.filter((item) => item.isVisited).length;
  const totalRecordCount = currentItems.reduce((sum, item) => sum + item.recordCount, 0);

  React.useEffect(() => {
    if (worldItems.length && (!selectedWorldItemId || !worldItems.some((item) => item.item._id === selectedWorldItemId && item.isVisited))) {
      setSelectedWorldItemId(worldItems.find((item) => item.isVisited)?.item._id || '');
    }
  }, [selectedWorldItemId, worldItems]);

  React.useEffect(() => {
    if (chinaItems.length && (!selectedChinaItemId || !chinaItems.some((item) => item.item._id === selectedChinaItemId && item.isVisited))) {
      setSelectedChinaItemId(chinaItems.find((item) => item.isVisited)?.item._id || '');
    }
  }, [chinaItems, selectedChinaItemId]);

  const markers = React.useMemo<FootprintMapMarker[]>(
    () =>
      currentVisitedItems.map((item) => ({
        id: item.item._id,
        name: item.item.name_zh,
        regionLabel: item.regionLabel,
        latitude: item.mapCoordinate?.latitude || 0,
        longitude: item.mapCoordinate?.longitude || 0,
        recordCount: item.recordCount,
      })),
    [currentVisitedItems]
  );

  const areas = React.useMemo<FootprintMapArea[]>(
    () =>
      currentVisitedItems.map((item) => ({
        id: item.item._id,
        name: item.item.name_zh,
        regionLabel: item.regionLabel,
        matchNames: WORLD_BOUNDARY_ALIASES[item.item._id] || [item.item.name_en],
        provinceCode: CHINA_PROVINCE_ADCODE[item.item._id],
      })),
    [currentVisitedItems]
  );

  const mapHtml = React.useMemo(
    () =>
      buildFootprintMapHtml({
        markers,
        areas,
        activeView,
        mapStyle: baseMapStyle,
        selectedItemId,
        isDark,
        colors,
      }),
    [activeView, areas, baseMapStyle, colors, isDark, markers, selectedItemId]
  );

  // 只在视图切换或底图切换时重置加载状态，而不是选中项变化时
  React.useEffect(() => {
    setWebViewLoading(true);
    
    // 添加超时保护，3秒后自动取消加载状态，防止卡死
    const timeout = setTimeout(() => {
      setWebViewLoading(false);
    }, 3000);
    
    return () => clearTimeout(timeout);
  }, [activeView, baseMapStyle]);

  const handleSelectItem = React.useCallback(
    (itemId: string) => {
      if (activeView === 'world_travel') {
        setSelectedWorldItemId(itemId);
        return;
      }

      setSelectedChinaItemId(itemId);
    },
    [activeView]
  );

  const handleOpenSelectedItem = React.useCallback(() => {
    if (!selectedItem) {
      navigation.navigate('Checkin', { code: activeView });
      return;
    }

    navigation.navigate('CheckinItemRecords', {
      code: activeView,
      item: selectedItem.item,
    });
  }, [activeView, navigation, selectedItem]);

  if (isMapFullscreen) {
    return (
      <SafeAreaView style={[styles.fullscreenSafeArea, { backgroundColor: colors.background }]} edges={['bottom']}>
        <View style={[styles.fullscreenHeader, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
          <View style={styles.fullscreenControls}>
            {VIEW_OPTIONS.map((option) => {
              const isActive = option.code === activeView;
              return (
                <Pressable
                  key={option.code}
                  onPress={() => setActiveView(option.code)}
                  style={[
                    styles.fullscreenToggleButton,
                    {
                      backgroundColor: isActive
                        ? colors.primary
                        : isDark
                          ? 'rgba(255,255,255,0.04)'
                          : '#FFF7F1',
                    },
                  ]}
                >
                  <Ionicons name={option.icon} size={14} color={isActive ? '#FFFFFF' : colors.textSecondary} />
                  <Text style={[styles.fullscreenToggleButtonText, { color: isActive ? '#FFFFFF' : colors.text }]}>{option.label}</Text>
                </Pressable>
              );
            })}
          </View>
          <Pressable
            onPress={() => setIsMapFullscreen(false)}
            style={styles.fullscreenCloseButton}
          >
            <Ionicons name="close-outline" size={24} color={colors.text} />
          </Pressable>
        </View>
        <View style={styles.fullscreenMapFrame}>
          <WebView
            originWhitelist={['*']}
            source={{ html: mapHtml }}
            onLoadEnd={() => setWebViewLoading(false)}
            onError={() => setWebViewLoading(false)}
            onMessage={(event) => {
              try {
                const payload = JSON.parse(event.nativeEvent.data);
                if (payload.type === 'markerPress' && payload.id) {
                  handleSelectItem(payload.id);
                }
              } catch (error) {
                console.warn('[TravelFootprintMap] webview message parse failed:', error);
              }
            }}
            style={styles.webView}
            javaScriptEnabled
            domStorageEnabled
            setSupportMultipleWindows={false}
            showsHorizontalScrollIndicator={false}
            showsVerticalScrollIndicator={false}
          />
          {webViewLoading ? (
            <View
              style={[
                styles.webViewLoadingMask,
                { backgroundColor: isDark ? 'rgba(16,23,33,0.24)' : 'rgba(255,255,255,0.38)' },
              ]}
            >
              <ActivityIndicator size="small" color={colors.primary} />
              <Text style={[styles.webViewLoadingText, { color: colors.textSecondary }]}>正在加载真实地图...</Text>
            </View>
          ) : null}
        </View>
        <View style={[styles.fullscreenFooter, { backgroundColor: colors.surface, borderTopColor: colors.border }]}>
          <View style={styles.mapHeaderActions}>
            {MAP_STYLE_OPTIONS.map((option) => {
              const isActive = option.code === baseMapStyle;
              return (
                <Pressable
                  key={option.code}
                  onPress={() => setBaseMapStyle(option.code)}
                  style={[
                    styles.mapStyleIconButton,
                    {
                      backgroundColor: isActive
                        ? isDark
                          ? 'rgba(255,155,122,0.18)'
                          : '#FFE9DF'
                        : isDark
                          ? 'rgba(255,255,255,0.04)'
                          : '#F8FBFF',
                      borderColor: isActive ? colors.primary : colors.border,
                    },
                  ]}
                >
                  <Ionicons name={option.icon} size={16} color={isActive ? colors.primary : colors.textSecondary} />
                </Pressable>
              );
            })}
          </View>
          <Text style={[styles.fullscreenStatsText, { color: colors.textSecondary }]}>
            已点亮 {visitedCount}/{currentItems.length || 0} · {totalRecordCount} 条记录
          </Text>
          <View style={{ width: 60 }} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={[styles.controlCard, { backgroundColor: colors.surface }]}>
          <View style={styles.toggleRow}>
            {VIEW_OPTIONS.map((option) => {
              const isActive = option.code === activeView;
              return (
                <Pressable
                  key={option.code}
                  onPress={() => setActiveView(option.code)}
                  style={[
                    styles.toggleButton,
                    {
                      backgroundColor: isActive
                        ? colors.primary
                        : isDark
                          ? 'rgba(255,255,255,0.04)'
                          : '#FFF7F1',
                    },
                  ]}
                >
                  <Ionicons name={option.icon} size={16} color={isActive ? '#FFFFFF' : colors.textSecondary} />
                  <Text style={[styles.toggleButtonText, { color: isActive ? '#FFFFFF' : colors.text }]}>{option.label}</Text>
                </Pressable>
              );
            })}
          </View>

          <View style={styles.statsGrid}>
            <View style={[styles.statCard, { backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : '#FFF7F1' }]}>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>已点亮</Text>
              <Text style={[styles.statValue, { color: colors.text }]}>{visitedCount}</Text>
              <Text style={[styles.statMeta, { color: colors.textSecondary }]}>/ {currentItems.length || 0} 个区域</Text>
            </View>
            <View style={[styles.statCard, { backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : '#F8FBFF' }]}>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>覆盖率</Text>
              <Text style={[styles.statValue, { color: colors.text }]}>{formatPercent(visitedCount, currentItems.length)}</Text>
              <Text style={[styles.statMeta, { color: colors.textSecondary }]}>当前足迹面积</Text>
            </View>
            <View style={[styles.statCard, { backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : '#F8FBFF' }]}>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>足迹记录</Text>
              <Text style={[styles.statValue, { color: colors.text }]}>{totalRecordCount}</Text>
              <Text style={[styles.statMeta, { color: colors.textSecondary }]}>图文与补录累计</Text>
            </View>
            <View style={[styles.statCard, { backgroundColor: isDark ? 'rgba(255,155,122,0.12)' : 'rgba(255,122,89,0.08)' }]}>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>当前排名</Text>
              <Text style={[styles.statValue, { color: colors.text }]}>{currentSnapshot?.rank ? `#${currentSnapshot.rank}` : '--'}</Text>
              <Text style={[styles.statMeta, { color: colors.primary }]}>{currentSnapshot?.final_score ? `${currentSnapshot.final_score.toFixed(2)} 分` : '尚未上榜'}</Text>
            </View>
          </View>
        </View>

        <View style={[styles.mapCard, { backgroundColor: colors.surface }]}>
          <View style={styles.cardHeader}>
            <View style={styles.mapHeaderTextWrap}>
              <View style={styles.mapTitleRow}>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>地图视图</Text>
                <View style={styles.mapHeaderActions}>
                  {MAP_STYLE_OPTIONS.map((option) => {
                    const isActive = option.code === baseMapStyle;
                    return (
                      <Pressable
                        key={option.code}
                        onPress={() => setBaseMapStyle(option.code)}
                        style={[
                          styles.mapStyleIconButton,
                          {
                            backgroundColor: isActive
                              ? isDark
                                ? 'rgba(255,155,122,0.18)'
                                : '#FFE9DF'
                              : isDark
                                ? 'rgba(255,255,255,0.04)'
                                : '#F8FBFF',
                            borderColor: isActive ? colors.primary : colors.border,
                          },
                        ]}
                      >
                        <Ionicons name={option.icon} size={16} color={isActive ? colors.primary : colors.textSecondary} />
                      </Pressable>
                    );
                  })}
                  <Pressable
                    onPress={() => setIsMapFullscreen(true)}
                    style={[
                      styles.mapStyleIconButton,
                      {
                        backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : '#F8FBFF',
                        borderColor: colors.border,
                      },
                    ]}
                  >
                    <Ionicons name="expand-outline" size={16} color={colors.textSecondary} />
                  </Pressable>
                  {loading ? <ActivityIndicator size="small" color={colors.primary} /> : null}
                </View>
              </View>
              <Text style={[styles.sectionSubtitle, { color: colors.textSecondary }]}>
                拖拽查看范围，双指缩放细节，点击高亮区域可切换到对应国家或省份详情。
              </Text>
            </View>
          </View>

          <View style={[styles.webViewFrame, { borderColor: colors.border }]}> 
            <WebView
              originWhitelist={['*']}
              source={{ html: mapHtml }}
              onLoadEnd={() => setWebViewLoading(false)}
              onError={() => setWebViewLoading(false)}
              onMessage={(event) => {
                try {
                  const payload = JSON.parse(event.nativeEvent.data);
                  if (payload.type === 'markerPress' && payload.id) {
                    handleSelectItem(payload.id);
                  }
                } catch (error) {
                  console.warn('[TravelFootprintMap] webview message parse failed:', error);
                }
              }}
              style={styles.webView}
              javaScriptEnabled
              domStorageEnabled
              setSupportMultipleWindows={false}
              showsHorizontalScrollIndicator={false}
              showsVerticalScrollIndicator={false}
            />
            {webViewLoading ? (
              <View
                style={[
                  styles.webViewLoadingMask,
                  { backgroundColor: isDark ? 'rgba(16,23,33,0.24)' : 'rgba(255,255,255,0.38)' },
                ]}
              >
                <ActivityIndicator size="small" color={colors.primary} />
                <Text style={[styles.webViewLoadingText, { color: colors.textSecondary }]}>正在加载真实地图...</Text>
              </View>
            ) : null}
          </View>
        </View>

        <View style={[styles.detailCard, { backgroundColor: colors.surface }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>{activeView === 'world_travel' ? '当前国家' : '当前省份'}</Text>
          {selectedItem ? (
            <>
              <View style={styles.detailHeader}>
                <View>
                  <Text style={[styles.detailTitle, { color: colors.text }]}>{selectedItem.item.name_zh}</Text>
                  <Text style={[styles.detailSubtitle, { color: colors.textSecondary }]}>
                    {selectedItem.regionLabel} · 最近打卡 {formatDate(selectedItem.latestCheckinAt)}
                  </Text>
                </View>
                <View style={[styles.detailBadge, { backgroundColor: isDark ? 'rgba(255,155,122,0.18)' : '#FFE5DA' }]}>
                  <Ionicons name="sparkles-outline" size={14} color={colors.primary} />
                  <Text style={[styles.detailBadgeText, { color: colors.primary }]}>已点亮</Text>
                </View>
              </View>

              <View style={styles.detailMetricsRow}>
                <View style={[styles.detailMetricCard, { backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : '#F8FBFF' }]}>
                  <Text style={[styles.detailMetricLabel, { color: colors.textSecondary }]}>记录条数</Text>
                  <Text style={[styles.detailMetricValue, { color: colors.text }]}>{selectedItem.recordCount}</Text>
                </View>
                <View style={[styles.detailMetricCard, { backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : '#FFF7F1' }]}>
                  <Text style={[styles.detailMetricLabel, { color: colors.textSecondary }]}>地图状态</Text>
                  <Text style={[styles.detailMetricDate, { color: colors.text }]}>真实底图定位</Text>
                </View>
              </View>

              <Text style={[styles.detailBody, { color: colors.textSecondary }]}> 
                现在这片足迹会直接落在真实地图底图上，你可以继续放大看位置关系，也可以进入明细记录回看图片、地点和描述。
              </Text>

              <Pressable onPress={handleOpenSelectedItem} style={[styles.primaryButton, { backgroundColor: colors.primary }]}>
                <Ionicons name="book-outline" size={18} color="#FFFFFF" />
                <Text style={styles.primaryButtonText}>查看详细记录</Text>
              </Pressable>
            </>
          ) : (
            <>
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}> 
                还没有已点亮的足迹。先去录入中心打卡一个{activeView === 'world_travel' ? '国家' : '省份'}，地图上就会出现真实足迹点位。
              </Text>
              <Pressable onPress={handleOpenSelectedItem} style={[styles.primaryButton, { backgroundColor: colors.primary }]}>
                <Ionicons name="add-circle-outline" size={18} color="#FFFFFF" />
                <Text style={styles.primaryButtonText}>去录入足迹</Text>
              </Pressable>
            </>
          )}
        </View>

        <View style={[styles.listCard, { backgroundColor: colors.surface }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>{activeView === 'world_travel' ? '已点亮国家' : '已点亮省份'}</Text>
          <Text style={[styles.sectionSubtitle, { color: colors.textSecondary }]}>点一下标签，地图会切到对应足迹点。</Text>

          <View style={styles.chipWrap}>
            {currentVisitedItems.length ? (
              currentVisitedItems.map((item) => {
                const isSelected = item.item._id === selectedItem?.item._id;
                return (
                  <Pressable
                    key={item.item._id}
                    onPress={() => handleSelectItem(item.item._id)}
                    style={[
                      styles.countryChip,
                      {
                        backgroundColor: isSelected
                          ? colors.primary
                          : isDark
                            ? 'rgba(255,255,255,0.04)'
                            : '#F8FBFF',
                        borderColor: isSelected ? colors.primary : colors.border,
                      },
                    ]}
                  >
                    <Text style={[styles.countryChipText, { color: isSelected ? '#FFFFFF' : colors.text }]}>
                      {item.item.name_zh}
                    </Text>
                    <Text
                      style={[
                        styles.countryChipMeta,
                        { color: isSelected ? 'rgba(255,255,255,0.82)' : colors.textSecondary },
                      ]}
                    >
                      {item.recordCount} 条 · {item.regionLabel}
                    </Text>
                  </Pressable>
                );
              })
            ) : (
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>暂无已点亮足迹。</Text>
            )}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  fullscreenSafeArea: {
    flex: 1,
  },
  fullscreenHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 12 + (Platform.OS === 'ios' ? 20 : 0), // 添加顶部空间，避免遮挡状态栏
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  fullscreenCloseButton: {
    padding: 8,
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fullscreenTitle: {
    fontSize: 18,
    fontWeight: '800',
  },
  fullscreenControls: {
    flexDirection: 'row',
    gap: 8,
  },
  fullscreenToggleButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  fullscreenToggleButtonText: {
    fontSize: 13,
    fontWeight: '700',
  },
  fullscreenMapFrame: {
    flex: 1,
    position: 'relative',
  },
  fullscreenFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
  },
  fullscreenStatsText: {
    fontSize: 13,
    fontWeight: '600',
  },
  content: {
    padding: 16,
    paddingBottom: 40,
    gap: 16,
  },
  controlCard: {
    borderRadius: 24,
    padding: 18,
    gap: 12,
  },
  toggleRow: {
    flexDirection: 'row',
    gap: 10,
  },
  toggleButton: {
    flex: 1,
    borderRadius: 16,
    paddingVertical: 13,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  secondaryToggleButton: {
    borderWidth: 1,
  },
  toggleButtonText: {
    fontSize: 14,
    fontWeight: '800',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 2,
  },
  statCard: {
    width: '48.5%',
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 16,
  },
  statLabel: {
    fontSize: 12,
    fontWeight: '700',
  },
  statValue: {
    marginTop: 8,
    fontSize: 24,
    fontWeight: '900',
  },
  statMeta: {
    marginTop: 6,
    fontSize: 12,
    lineHeight: 18,
  },
  mapCard: {
    borderRadius: 24,
    padding: 18,
  },
  cardHeader: {
    gap: 10,
  },
  mapHeaderTextWrap: {
    flex: 1,
    minWidth: 0,
  },
  mapTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  mapHeaderActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexShrink: 0,
  },
  mapStyleIconButton: {
    width: 36,
    height: 36,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
  },
  sectionSubtitle: {
    marginTop: 4,
    fontSize: 13,
    lineHeight: 19,
  },
  webViewFrame: {
    marginTop: 16,
    borderRadius: 22,
    borderWidth: 1,
    overflow: 'hidden',
    height: 360,
    position: 'relative',
  },
  webView: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  webViewLoadingMask: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  webViewLoadingText: {
    fontSize: 13,
    fontWeight: '700',
  },
  detailCard: {
    borderRadius: 24,
    padding: 18,
  },
  detailHeader: {
    marginTop: 16,
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  detailTitle: {
    fontSize: 22,
    fontWeight: '900',
  },
  detailSubtitle: {
    marginTop: 6,
    fontSize: 13,
    lineHeight: 18,
  },
  detailBadge: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  detailBadgeText: {
    fontSize: 12,
    fontWeight: '800',
  },
  detailMetricsRow: {
    marginTop: 16,
    flexDirection: 'row',
    gap: 10,
  },
  detailMetricCard: {
    flex: 1,
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  detailMetricLabel: {
    fontSize: 12,
    fontWeight: '700',
  },
  detailMetricValue: {
    marginTop: 8,
    fontSize: 24,
    fontWeight: '900',
  },
  detailMetricDate: {
    marginTop: 8,
    fontSize: 15,
    fontWeight: '800',
  },
  detailBody: {
    marginTop: 16,
    fontSize: 14,
    lineHeight: 22,
  },
  primaryButton: {
    marginTop: 18,
    borderRadius: 18,
    paddingVertical: 15,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
  listCard: {
    borderRadius: 24,
    padding: 18,
  },
  chipWrap: {
    marginTop: 16,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  countryChip: {
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
  },
  countryChipText: {
    fontSize: 14,
    fontWeight: '800',
  },
  countryChipMeta: {
    marginTop: 4,
    fontSize: 11,
    fontWeight: '600',
  },
  emptyText: {
    marginTop: 16,
    fontSize: 14,
    lineHeight: 22,
  },
});

export default TravelFootprintMapScreen;
