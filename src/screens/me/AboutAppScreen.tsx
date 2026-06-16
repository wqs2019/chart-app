import Ionicons from '@expo/vector-icons/Ionicons';
import React from 'react';
import {
  Dimensions,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAppTheme } from '../../hooks/useAppTheme';

const appConfig = require('../../../app.json');
const packageJson = require('../../../package.json');
const { width: SCREEN_WIDTH } = Dimensions.get('window');
const PAGE_HORIZONTAL_PADDING = 16;
const CARD_HORIZONTAL_PADDING = 18;
const SHOWCASE_CARD_WIDTH = SCREEN_WIDTH - PAGE_HORIZONTAL_PADDING * 2 - CARD_HORIZONTAL_PADDING * 2;

const appVersion = appConfig?.expo?.version || packageJson?.version || '1.0.0';
const appName = appConfig?.expo?.name || '地球玩家';
const appTagline = '用榜单、足迹和内容，把你的真实经历沉淀成可展示的个人成就。';

const coreHighlights = [
  {
    icon: 'trophy-outline' as const,
    title: '排行榜成就',
    description: '综合总榜 + 三大子榜，把旅行和玩乐经历转成可展示的个人成绩。',
  },
  {
    icon: 'create-outline' as const,
    title: '记录补录',
    description: '支持快速录入与历史补录，也能继续补时间、地点、描述和媒体内容。',
  },
  {
    icon: 'sparkles-outline' as const,
    title: '互动反馈',
    description: '点赞、评论、收藏与关注共同组成轻量互动体验，并反馈到内容影响力。',
  },
  {
    icon: 'share-social-outline' as const,
    title: '分享回顾',
    description: '年度回顾与成就海报负责沉淀阶段性成果，也承担后续分享传播。',
  },
];

const showcaseSlides = [
  {
    eyebrow: '排行榜',
    title: '不只是记录，更是成就进度条',
    description: '综合总榜、世界旅游榜、中国旅游榜、玩乐项目榜会持续展示你的覆盖广度、成长阶段和标签变化。',
    stat: '4 大榜单',
    chips: ['综合总榜', '世界旅游', '中国旅游', '玩乐项目'],
    accent: 'rgba(255,122,89,0.18)',
    previewTitle: '成长视图',
    previewStats: ['TOP 12%', '+3 里程碑'],
    previewRows: [
      { label: '综合总榜', value: '143.6', widthPercent: 88 },
      { label: '世界旅游', value: '181.6', widthPercent: 78 },
      { label: '中国旅游', value: '59.1', widthPercent: 52 },
    ],
  },
  {
    eyebrow: '内容记录',
    title: '每条经历都可以继续长成内容',
    description: '录入之后，你还能补时间、城市、地点、描述、图片、视频和实况，让足迹不只是一条勾选结果。',
    stat: '图文 / 视频 / 实况',
    chips: ['时间地点', '一段描述', '九宫格预览', '长按播放'],
    accent: 'rgba(99,102,241,0.18)',
    previewTitle: '记录预览',
    previewStats: ['9 宫格', 'Live / Video'],
    previewRows: [
      { label: '时间地点', value: '已完善', widthPercent: 86 },
      { label: '图文内容', value: '3 图 + 1 视频', widthPercent: 72 },
      { label: '实况媒体', value: '长按播放', widthPercent: 58 },
    ],
  },
  {
    eyebrow: '分享传播',
    title: '把成绩、回顾和高光时刻晒出去',
    description: '年度回顾、成就海报、个人主页会把你的分数、标签和代表性记录组织成更适合传播的展示内容。',
    stat: '年度回顾 + 海报',
    chips: ['年度新增', '高光记录', '海报分享', '主页沉淀'],
    accent: 'rgba(16,185,129,0.18)',
    previewTitle: '分享面板',
    previewStats: ['年度回顾', '海报生成'],
    previewRows: [
      { label: '年度新增', value: '12 条记录', widthPercent: 82 },
      { label: '高光标签', value: '世界玩家', widthPercent: 66 },
      { label: '海报分享', value: '一键生成', widthPercent: 54 },
    ],
  },
];

const capabilitySections = [
  {
    title: '你可以在这里做什么',
    items: [
      '查看自己在综合总榜和三大子榜中的分数、排名与阶段标签。',
      '录入去过的国家、省级行政区和玩乐项目，把零散经历整理成个人成就档案。',
      '为每条记录补充时间、城市、地点、一句话描述、图片、视频和实况内容。',
    ],
  },
  {
    title: '当前已上线能力',
    items: [
      '首页、榜单、录入、我的四个一级视角已经打通，支持从结果回到补录、再回到内容展示。',
      '支持综合日记流、记录详情、媒体九宫格预览、图片缩放、视频与实况长按播放。',
      '支持点赞、评论、回复、收藏、关注，以及消息通知、粉丝关注、点赞收藏、评论区分流查看。',
    ],
  },
  {
    title: '产品规则与定位',
    items: [
      '排的是用户，不是目的地或项目本身，核心是展示你去过哪里、玩过什么、积累了多少真实经历。',
      '第一版以用户录入为准，不过度追求复杂审核，让记录、补录和持续成长更轻。',
      '成就分是主干，互动分是辅助，既保留排行榜的成就感，也让内容互动有反馈。',
    ],
  },
  {
    title: '分享与回顾',
    items: [
      '年度回顾更偏成就叙事，帮助你回看这一年的新增足迹、榜单变化和高光记录。',
      '成就海报会把分数、标签和代表性成绩转成更适合分享的视觉内容。',
      '个人主页会持续沉淀你的综合成绩、互动数据、年度回顾和海报入口。',
    ],
  },
];

const quickFacts = [
  { label: '一级视角', value: '4 个', hint: '首页 / 榜单 / 录入 / 我的' },
  { label: '核心榜单', value: '4 个', hint: '综合 + 三大子榜' },
  { label: '互动能力', value: '4 类', hint: '关注、点赞、评论、收藏' },
];

const featureGrid = [
  {
    icon: 'podium-outline' as const,
    title: '榜单体系',
    description: '支持综合总榜与三大子榜切换，围绕成就分和互动分构建成长反馈。',
  },
  {
    icon: 'albums-outline' as const,
    title: '媒体记录',
    description: '支持图片、视频、实况、九宫格预览和详情页放大查看。',
  },
  {
    icon: 'chatbubble-ellipses-outline' as const,
    title: '社交互动',
    description: '支持点赞、评论、回复、收藏、关注与消息分流查看。',
  },
  {
    icon: 'color-wand-outline' as const,
    title: '年度展示',
    description: '支持年度回顾、成就海报和个人主页沉淀成就内容资产。',
  },
];

const versionRows = [
  { label: 'App 名称', value: appName },
  { label: '当前版本', value: appVersion },
  { label: '产品定位', value: '排行榜成就型旅行与玩乐记录 App' },
  { label: '当前阶段', value: 'MVP 持续完善中' },
];

const AboutAppScreen: React.FC = () => {
  const { colors, isDark } = useAppTheme();
  const [activeSlide, setActiveSlide] = React.useState(0);
  const showcaseScrollRef = React.useRef<ScrollView>(null);

  const handleShowcaseScrollEnd = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const nextIndex = Math.round(event.nativeEvent.contentOffset.x / SHOWCASE_CARD_WIDTH);
    setActiveSlide(Math.max(0, Math.min(nextIndex, showcaseSlides.length - 1)));
  };

  React.useEffect(() => {
    const timer = setInterval(() => {
      setActiveSlide((prev) => {
        const next = (prev + 1) % showcaseSlides.length;
        showcaseScrollRef.current?.scrollTo({
          x: next * SHOWCASE_CARD_WIDTH,
          animated: true,
        });
        return next;
      });
    }, 4200);

    return () => clearInterval(timer);
  }, []);

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View
          style={[
            styles.heroCard,
            {
              backgroundColor: colors.surface,
              borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(15,23,42,0.05)',
            },
          ]}
        >
          <View style={[styles.heroOrb, styles.heroOrbPrimary, { backgroundColor: 'rgba(255,122,89,0.14)' }]} />
          <View style={[styles.heroOrb, styles.heroOrbSecondary, { backgroundColor: 'rgba(99,102,241,0.12)' }]} />
          <View style={[styles.heroOrb, styles.heroOrbTertiary, { backgroundColor: 'rgba(16,185,129,0.10)' }]} />
          <Text style={[styles.eyebrow, { color: colors.textSecondary }]}>ABOUT EARTH PLAYER</Text>
          <Text style={[styles.title, { color: colors.text }]}>{appName}</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>{appTagline}</Text>

          <View style={styles.heroChips}>
            <View style={[styles.heroChip, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#FFF7F1' }]}>
              <Text style={[styles.heroChipText, { color: colors.primary }]}>排行榜成就</Text>
            </View>
            <View style={[styles.heroChip, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#FFF7F1' }]}>
              <Text style={[styles.heroChipText, { color: colors.primary }]}>记录补录</Text>
            </View>
            <View style={[styles.heroChip, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#FFF7F1' }]}>
              <Text style={[styles.heroChipText, { color: colors.primary }]}>年度回顾</Text>
            </View>
          </View>

          <View
            style={[
              styles.heroMiniPanel,
              { backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.72)' },
            ]}
          >
            <View style={styles.heroMiniHeader}>
              <Text style={[styles.heroMiniTitle, { color: colors.text }]}>成就展示面板</Text>
              <View style={[styles.heroMiniBadge, { backgroundColor: isDark ? 'rgba(255,122,89,0.16)' : '#FFF1EA' }]}>
                <Text style={[styles.heroMiniBadgeText, { color: colors.primary }]}>MVP</Text>
              </View>
            </View>
            <View style={styles.heroMiniStatsRow}>
              <View style={[styles.heroMiniStatCard, { backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : '#FFFFFF' }]}>
                <Text style={[styles.heroMiniStatValue, { color: colors.text }]}>4</Text>
                <Text style={[styles.heroMiniStatLabel, { color: colors.textSecondary }]}>榜单主轴</Text>
              </View>
              <View style={[styles.heroMiniStatCard, { backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : '#FFFFFF' }]}>
                <Text style={[styles.heroMiniStatValue, { color: colors.text }]}>365</Text>
                <Text style={[styles.heroMiniStatLabel, { color: colors.textSecondary }]}>持续补录</Text>
              </View>
              <View style={[styles.heroMiniStatCard, { backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : '#FFFFFF' }]}>
                <Text style={[styles.heroMiniStatValue, { color: colors.text }]}>24h</Text>
                <Text style={[styles.heroMiniStatLabel, { color: colors.textSecondary }]}>随时记录</Text>
              </View>
            </View>
          </View>
        </View>

        <View style={[styles.quickFactsRow, { backgroundColor: colors.surface }]}>
          {quickFacts.map((fact) => (
            <View key={fact.label} style={styles.quickFactItem}>
              <Text style={[styles.quickFactValue, { color: colors.text }]}>{fact.value}</Text>
              <Text style={[styles.quickFactLabel, { color: colors.textSecondary }]}>{fact.label}</Text>
              <Text style={[styles.quickFactHint, { color: colors.textSecondary }]}>{fact.hint}</Text>
            </View>
          ))}
        </View>

        <View style={[styles.card, { backgroundColor: colors.surface }]}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>功能预览</Text>
            <Text style={[styles.sectionCaption, { color: colors.textSecondary }]}>
              左右滑动查看当前能力
            </Text>
          </View>
          <ScrollView
            ref={showcaseScrollRef}
            horizontal
            pagingEnabled
            decelerationRate="fast"
            snapToInterval={SHOWCASE_CARD_WIDTH}
            snapToAlignment="start"
            disableIntervalMomentum
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.showcaseScrollContent}
            onMomentumScrollEnd={handleShowcaseScrollEnd}
          >
            {showcaseSlides.map((slide) => (
              <View
                key={slide.title}
                style={[
                  styles.showcaseCard,
                  {
                    width: SHOWCASE_CARD_WIDTH,
                    backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : '#FFF7F1',
                  },
                ]}
              >
                <View
                  style={[
                    styles.showcasePreviewShell,
                    { backgroundColor: isDark ? 'rgba(15,23,42,0.24)' : 'rgba(255,255,255,0.88)' },
                  ]}
                >
                  <View style={styles.showcasePreviewTop}>
                    <View style={styles.showcasePreviewMeta}>
                      <Text style={[styles.showcasePreviewTitle, { color: colors.text }]}>{slide.previewTitle}</Text>
                      <Text style={[styles.showcasePreviewMetaText, { color: colors.textSecondary }]}>
                        {slide.previewStats.join(' · ')}
                      </Text>
                    </View>
                    <View style={[styles.showcasePreviewAccentPill, { backgroundColor: slide.accent }]}>
                      <Text style={[styles.showcasePreviewAccentText, { color: colors.text }]}>{slide.stat}</Text>
                    </View>
                  </View>
                  {slide.previewRows.map((row) => (
                    <View key={row.label} style={styles.showcasePreviewRow}>
                      <View style={styles.showcasePreviewRowTop}>
                        <Text style={[styles.showcasePreviewRowLabel, { color: colors.textSecondary }]}>
                          {row.label}
                        </Text>
                        <Text style={[styles.showcasePreviewRowValue, { color: colors.text }]}>{row.value}</Text>
                      </View>
                      <View
                        style={[
                          styles.showcasePreviewTrack,
                          { backgroundColor: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(15,23,42,0.06)' },
                        ]}
                      >
                        <View
                          style={[
                            styles.showcasePreviewFill,
                            { width: `${row.widthPercent}%` as `${number}%`, backgroundColor: colors.primary },
                          ]}
                        />
                      </View>
                    </View>
                  ))}
                </View>
                <Text style={[styles.showcaseEyebrow, { color: colors.primary }]}>{slide.eyebrow}</Text>
                <Text style={[styles.showcaseTitle, { color: colors.text }]}>{slide.title}</Text>
                <Text style={[styles.showcaseDescription, { color: colors.textSecondary }]}>
                  {slide.description}
                </Text>
                <View style={styles.showcaseChipWrap}>
                  {slide.chips.map((chip) => (
                    <View
                      key={chip}
                      style={[
                        styles.showcaseChip,
                        { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(255,122,89,0.08)' },
                      ]}
                    >
                      <Text style={[styles.showcaseChipText, { color: colors.text }]}>{chip}</Text>
                    </View>
                  ))}
                </View>
              </View>
            ))}
          </ScrollView>
          <View style={styles.paginationRow}>
            {showcaseSlides.map((slide, index) => (
              <View
                key={slide.title}
                style={[
                  styles.paginationDot,
                  {
                    backgroundColor:
                      activeSlide === index
                        ? colors.primary
                        : isDark
                          ? 'rgba(255,255,255,0.16)'
                          : 'rgba(15,23,42,0.12)',
                    width: activeSlide === index ? 18 : 7,
                  },
                ]}
              />
            ))}
          </View>
        </View>

        <View style={[styles.card, { backgroundColor: colors.surface }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>产品亮点</Text>
          {coreHighlights.map((feature) => (
            <View
              key={feature.title}
              style={[
                styles.highlightRow,
                { backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : '#FAFAFA' },
              ]}
            >
              <View
                style={[
                  styles.highlightIconWrap,
                  { backgroundColor: isDark ? 'rgba(255,155,122,0.16)' : 'rgba(255,122,89,0.10)' },
                ]}
              >
                <Ionicons name={feature.icon} size={18} color={colors.primary} />
              </View>
              <View style={styles.highlightTextWrap}>
                <Text style={[styles.highlightTitle, { color: colors.text }]}>{feature.title}</Text>
                <Text style={[styles.highlightDescription, { color: colors.textSecondary }]}>
                  {feature.description}
                </Text>
              </View>
            </View>
          ))}
        </View>

        <View style={[styles.card, { backgroundColor: colors.surface }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>能力矩阵</Text>
          <View style={styles.featureGrid}>
            {featureGrid.map((feature) => (
              <View
                key={feature.title}
                style={[
                  styles.featureGridCard,
                  { backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : '#FAFAFA' },
                ]}
              >
                <View
                  style={[
                    styles.featureGridIconWrap,
                    { backgroundColor: isDark ? 'rgba(255,155,122,0.16)' : 'rgba(255,122,89,0.10)' },
                  ]}
                >
                  <Ionicons name={feature.icon} size={18} color={colors.primary} />
                </View>
                <Text style={[styles.featureGridTitle, { color: colors.text }]}>{feature.title}</Text>
                <Text style={[styles.featureGridDescription, { color: colors.textSecondary }]}>
                  {feature.description}
                </Text>
              </View>
            ))}
          </View>
        </View>

        {capabilitySections.map((section) => (
          <View key={section.title} style={[styles.card, { backgroundColor: colors.surface }]}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>{section.title}</Text>
            {section.items.map((item) => (
              <View key={item} style={styles.featureRow}>
                <View style={[styles.featureDot, { backgroundColor: colors.primary }]} />
                <Text style={[styles.featureText, { color: colors.text }]}>{item}</Text>
              </View>
            ))}
          </View>
        ))}

        <View style={[styles.card, { backgroundColor: colors.surface }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>版本信息</Text>
          {versionRows.map((row, index) => (
            <View
              key={row.label}
              style={[
                styles.infoRow,
                index === versionRows.length - 1 ? styles.infoRowLast : null,
                { borderBottomColor: colors.border },
              ]}
            >
              <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>{row.label}</Text>
              <Text style={[styles.infoValue, { color: colors.text }]}>{row.value}</Text>
            </View>
          ))}
        </View>

        <View style={[styles.card, { backgroundColor: colors.surface }]}>
          <View style={[styles.noticeCard, { backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : '#FFF7F1' }]}>
            <Ionicons name="planet-outline" size={18} color={colors.primary} />
            <Text style={[styles.noticeText, { color: colors.textSecondary }]}>
              当前版本已经形成“榜单查看、录入补录、记录展示、互动反馈、年度回顾与海报分享”的完整基础闭环，后续会继续补强标准库、分享传播和更多成就表达能力。
            </Text>
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
  content: {
    padding: 16,
    paddingBottom: 40,
    gap: 16,
  },
  heroCard: {
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    overflow: 'hidden',
    position: 'relative',
  },
  heroOrb: {
    position: 'absolute',
    borderRadius: 999,
  },
  heroOrbPrimary: {
    width: 180,
    height: 180,
    top: -58,
    right: -48,
  },
  heroOrbSecondary: {
    width: 120,
    height: 120,
    top: 90,
    right: 24,
  },
  heroOrbTertiary: {
    width: 120,
    height: 120,
    bottom: -36,
    left: -30,
  },
  eyebrow: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1,
  },
  title: {
    marginTop: 8,
    fontSize: 26,
    fontWeight: '900',
  },
  subtitle: {
    marginTop: 10,
    fontSize: 14,
    lineHeight: 21,
  },
  heroChips: {
    marginTop: 16,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  heroChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
  },
  heroChipText: {
    fontSize: 12,
    fontWeight: '700',
  },
  heroMiniPanel: {
    marginTop: 18,
    borderRadius: 20,
    padding: 14,
  },
  heroMiniHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  heroMiniTitle: {
    fontSize: 14,
    fontWeight: '800',
  },
  heroMiniBadge: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  heroMiniBadgeText: {
    fontSize: 11,
    fontWeight: '800',
  },
  heroMiniStatsRow: {
    marginTop: 12,
    flexDirection: 'row',
    gap: 8,
  },
  heroMiniStatCard: {
    flex: 1,
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 10,
    alignItems: 'center',
  },
  heroMiniStatValue: {
    fontSize: 18,
    fontWeight: '900',
  },
  heroMiniStatLabel: {
    marginTop: 4,
    fontSize: 11,
    fontWeight: '600',
  },
  quickFactsRow: {
    borderRadius: 22,
    paddingVertical: 18,
    paddingHorizontal: 12,
    flexDirection: 'row',
  },
  quickFactItem: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  quickFactValue: {
    fontSize: 24,
    fontWeight: '900',
  },
  quickFactLabel: {
    marginTop: 6,
    fontSize: 12,
    fontWeight: '700',
  },
  quickFactHint: {
    marginTop: 4,
    fontSize: 11,
    lineHeight: 16,
    textAlign: 'center',
  },
  card: {
    borderRadius: 22,
    padding: 18,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 12,
  },
  sectionCaption: {
    fontSize: 12,
    fontWeight: '600',
  },
  showcaseScrollContent: {
    paddingRight: 0,
  },
  showcaseCard: {
    borderRadius: 20,
    padding: 16,
  },
  showcasePreviewShell: {
    borderRadius: 16,
    padding: 12,
  },
  showcasePreviewTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 10,
  },
  showcasePreviewMeta: {
    flex: 1,
  },
  showcasePreviewTitle: {
    fontSize: 13,
    fontWeight: '800',
  },
  showcasePreviewMetaText: {
    marginTop: 4,
    fontSize: 11,
    lineHeight: 16,
    fontWeight: '600',
  },
  showcasePreviewAccentPill: {
    maxWidth: 104,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  showcasePreviewAccentText: {
    fontSize: 11,
    fontWeight: '800',
  },
  showcasePreviewRow: {
    gap: 6,
    marginTop: 10,
  },
  showcasePreviewRowTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  showcasePreviewRowLabel: {
    fontSize: 11,
    fontWeight: '600',
  },
  showcasePreviewRowValue: {
    fontSize: 11,
    fontWeight: '800',
  },
  showcasePreviewTrack: {
    width: '100%',
    height: 8,
    borderRadius: 999,
    overflow: 'hidden',
  },
  showcasePreviewFill: {
    height: '100%',
    borderRadius: 999,
  },
  showcaseEyebrow: {
    marginTop: 14,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  showcaseTitle: {
    marginTop: 10,
    fontSize: 22,
    lineHeight: 30,
    fontWeight: '900',
  },
  showcaseDescription: {
    marginTop: 10,
    fontSize: 14,
    lineHeight: 21,
  },
  showcaseChipWrap: {
    marginTop: 14,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  showcaseChip: {
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 999,
  },
  showcaseChipText: {
    fontSize: 12,
    fontWeight: '600',
  },
  paginationRow: {
    marginTop: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  paginationDot: {
    height: 7,
    borderRadius: 999,
  },
  highlightRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginTop: 10,
    borderRadius: 18,
    padding: 14,
  },
  highlightIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  highlightTextWrap: {
    flex: 1,
  },
  highlightTitle: {
    fontSize: 15,
    fontWeight: '800',
  },
  highlightDescription: {
    marginTop: 6,
    fontSize: 13,
    lineHeight: 19,
    fontWeight: '600',
  },
  featureGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  featureGridCard: {
    width: '48%',
    borderRadius: 18,
    padding: 14,
  },
  featureGridIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureGridTitle: {
    marginTop: 12,
    fontSize: 15,
    fontWeight: '800',
  },
  featureGridDescription: {
    marginTop: 6,
    fontSize: 12,
    lineHeight: 18,
    fontWeight: '600',
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginTop: 10,
  },
  featureDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginTop: 7,
  },
  featureText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 21,
    fontWeight: '600',
  },
  infoRow: {
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  infoRowLast: {
    borderBottomWidth: 0,
    paddingBottom: 0,
  },
  infoLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
  infoValue: {
    marginTop: 6,
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '700',
  },
  noticeCard: {
    borderRadius: 18,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  noticeText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 19,
    fontWeight: '600',
  },
});

export default AboutAppScreen;
