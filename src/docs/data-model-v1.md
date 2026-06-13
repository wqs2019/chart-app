# 排行榜成就 App 数据模型 v1

## 1. 文档信息
- 文档名称：排行榜成就 App 数据模型 v1
- 文档目标：定义 MVP 阶段核心实体、字段、关系和计算字段，为后续前后端开发提供统一数据层依据
- 关联文档：[prd-ranking-app-v1.md](file:///Users/wuqingshi/Documents/chart-app/src/docs/prd-ranking-app-v1.md)
- 当前阶段：逻辑模型定义

## 2. 建模目标
- 支撑三大子榜和综合总榜
- 支撑用户快速补录和后续补充内容
- 支撑点赞、评论、收藏等互动行为
- 支撑年度回顾和成就分享海报
- 支撑后续榜单快照、排名计算和页面展示

## 3. 建模原则
- 以用户为中心，而不是以地点为中心
- 主项标准库和用户记录分离
- 原始记录和计算结果分离
- 展示快照和实时数据分离
- 第一版优先支持清晰和稳定，不追求过度抽象

## 4. 核心实体总览
第一版建议至少包含以下实体：

- `user`
- `user_profile`
- `leaderboard_definition`
- `standard_item`
- `activity_candidate`
- `user_checkin`
- `user_checkin_content`
- `user_interaction`
- `user_comment`
- `user_score_snapshot`
- `leaderboard_snapshot`
- `year_review_snapshot`
- `share_poster`

## 5. 关系总览
- 一个 `user` 对应一个 `user_profile`
- 一个 `leaderboard_definition` 对应多个 `standard_item`
- 一个 `user` 可拥有多条 `user_checkin`
- 一条 `user_checkin` 可对应一条 `user_checkin_content`
- 一条 `user_checkin_content` 可被点赞、评论、收藏
- 一个 `user` 可拥有多个 `user_score_snapshot`
- 一个 `leaderboard_definition` 可拥有多个 `leaderboard_snapshot`
- 一个 `user` 可拥有多个 `year_review_snapshot`
- 一个 `user` 可生成多个 `share_poster`

## 6. 枚举与公共字段建议
### 6.1 榜单类型
- `world_travel`
- `china_travel`
- `activity`
- `overall`

### 6.2 标准项类型
- `country`
- `province`
- `activity`

### 6.3 记录来源
- `history_backfill`
- `realtime_add`

### 6.4 互动类型
- `like`
- `favorite`

### 6.5 海报类型
- `overall_poster`
- `world_travel_poster`
- `china_travel_poster`
- `activity_poster`
- `year_review_poster`

### 6.6 通用字段
建议所有主要实体统一包含：
- `id`
- `created_at`
- `updated_at`
- `deleted_at`

说明：
- 若采用软删除，可使用 `deleted_at`
- 若不采用软删除，可移除该字段

## 7. 实体定义
### 7.1 `user`
用户主实体。

建议字段：
- `id`
- `phone`
- `email`
- `register_source`
- `status`
- `last_login_at`

说明：
- 第一版登录方式可灵活实现，但 `user` 作为账号主体应独立存在

### 7.2 `user_profile`
用户资料和展示字段。

建议字段：
- `user_id`
- `nickname`
- `avatar_url`
- `bio`
- `gender`
- `city`
- `country`
- `primary_tag`
- `secondary_tags`

说明：
- `primary_tag` 可用于个人主页主标签
- `secondary_tags` 可来自榜单语义标签

### 7.3 `leaderboard_definition`
榜单定义表，用于描述榜单本身。

建议字段：
- `id`
- `code`
- `name`
- `description`
- `rank_type`
- `weight_in_overall`
- `is_active`
- `sort_mode`

示例：
- `world_travel`
- `china_travel`
- `activity`
- `overall`

说明：
- `weight_in_overall` 仅对子榜生效
- 第一版可配置：
  - 世界旅游榜 `0.7`
  - 中国旅游榜 `0.2`
  - 玩乐项目榜 `0.1`

### 7.4 `standard_item`
官方标准库主表。

建议字段：
- `id`
- `item_type`
- `leaderboard_code`
- `name_zh`
- `name_en`
- `alias_names`
- `category`
- `category_label_zh`
- `continent`
- `region_group`
- `activity_group`
- `subcategory`
- `is_active`
- `sort_order`

扩展字段建议：
- 国家使用：
  - `continent`
  - `country_tier`
- 省份使用：
  - `region_group`
- 玩乐项目使用：
  - `activity_group`

说明：
- `country_tier` 用于世界旅游榜的 A/B/C 分层
- `region_group` 可用于中国旅游榜的大区覆盖加成和区域标签
- `activity_group` 可用于玩乐项目榜的大类覆盖加成和项目类型标签

### 7.5 `activity_candidate`
玩乐项目候选池，用于承接“没有我的类别？”提交。

建议字段：
- `id`
- `user_id`
- `name`
- `category`
- `description`
- `source_checkin_id`
- `status`
- `mapped_standard_item_id`

状态建议：
- `pending`
- `approved`
- `rejected`
- `merged`

说明：
- 第一版候选项不直接计入主榜
- 当 `mapped_standard_item_id` 存在后，可回补映射

### 7.6 `user_checkin`
用户主打卡记录表，是第一版最核心的业务表。

建议字段：
- `id`
- `user_id`
- `leaderboard_code`
- `standard_item_id`
- `item_type`
- `source_type`
- `is_active`
- `checked_in_at`

扩展字段：
- `first_checked_in_year`
- `visibility`

说明：
- 一条 `user_checkin` 对应一个标准项
- 世界旅游榜按国家去重
- 中国旅游榜按省级行政区去重
- 玩乐项目榜按项目类型去重

唯一性建议：
- `user_id + leaderboard_code + standard_item_id` 应唯一

### 7.7 `user_checkin_content`
用户为打卡补充的内容信息。

建议字段：
- `id`
- `checkin_id`
- `user_id`
- `title`
- `description`
- `visit_time`
- `city_name`
- `location_text`
- `image_urls`
- `cover_image_url`
- `is_public`

说明：
- `user_checkin` 负责“是否计分”
- `user_checkin_content` 负责“怎么展示”
- 一条记录可先打卡，后补内容

### 7.8 `user_interaction`
互动行为表，用于点赞和收藏。

建议字段：
- `id`
- `target_type`
- `target_id`
- `target_user_id`
- `actor_user_id`
- `interaction_type`
- `status`

说明：
- 第一版推荐 `target_type` 先只支持：
  - `checkin_content`
- `target_user_id` 便于聚合某个用户获得的互动量

### 7.9 `user_comment`
评论表。

建议字段：
- `id`
- `target_type`
- `target_id`
- `target_user_id`
- `actor_user_id`
- `content`
- `status`

说明：
- 评论单独建表比统一塞进 `user_interaction` 更清晰
- `target_type` 第一版也建议只支持 `checkin_content`

### 7.10 `user_score_snapshot`
用户分数快照表，用于存储各榜单阶段性结果。

建议字段：
- `id`
- `user_id`
- `leaderboard_code`
- `score_version`
- `raw_count`
- `achievement_score`
- `influence_score`
- `final_score`
- `score_breakdown`
- `rank_position`
- `percentile`
- `snapshot_date`

说明：
- 用于个人主页、榜单页、海报和年度回顾展示
- 不建议实时从基础表全量现算
- `score_version` 第一版建议使用 `balanced_v1`
- `score_breakdown` 用于存储当前榜单的覆盖分、结构加成分、互动原始分等拆解结果
- 所有分数字段都不再采用固定 `100` 分上限

### 7.11 `leaderboard_snapshot`
榜单快照表，用于存储某个时间点的榜单排名结果。

建议字段：
- `id`
- `leaderboard_code`
- `snapshot_date`
- `snapshot_version`
- `status`

说明：
- 可配合子表或 JSON 结构存榜单条目
- 也可通过 `user_score_snapshot` 直接生成

### 7.12 `year_review_snapshot`
年度回顾快照表，用于沉淀可直接展示的年度结果。

建议字段：
- `id`
- `user_id`
- `review_year`
- `world_new_count`
- `china_new_count`
- `activity_new_count`
- `new_total_count`
- `world_score_start`
- `world_score_end`
- `china_score_start`
- `china_score_end`
- `activity_score_start`
- `activity_score_end`
- `overall_rank_start`
- `overall_rank_end`
- `like_count`
- `comment_count`
- `favorite_count`
- `top_tags`
- `highlight_records`
- `summary_text`

说明：
- `highlight_records` 可存记录 ID 列表
- `summary_text` 可用于年度总结卡或海报文案

### 7.13 `share_poster`
海报生成记录表。

建议字段：
- `id`
- `user_id`
- `poster_type`
- `related_leaderboard_code`
- `related_review_year`
- `title`
- `score_snapshot_id`
- `image_url`
- `share_status`
- `shared_at`

说明：
- 用于追踪海报生成、保存、分享
- 用于后续分析分享转化

## 8. 世界旅游榜附加建模建议
### 8.1 国家分层
世界旅游榜标准库中的国家建议维护：
- `country_tier = A | B | C`

含义：
- `A`：热门国家
- `B`：中频国家
- `C`：小众国家

### 8.2 世界旅游榜成就分拆解字段
若需要落库中间计算结果，建议在 `user_score_snapshot` 或单独计算表中增加：
- `world_country_base_score`
- `world_continent_bonus_score`
- `world_country_structure_bonus_score`
- `world_interaction_raw_score`

说明：
- 便于海报和年度回顾解释“你为什么是这个分数”

## 9. 中国旅游榜附加建模建议
中国旅游榜标准库中的省份建议维护：
- `region_group`

示例值：
- `华东`
- `华南`
- `华北`
- `西南`
- `西北`
- `东北`
- `华中`

可选中间字段：
- `china_region_cover_count`
- `china_region_cover_score`

说明：
- 第一版中国旅游榜分数按 `省级行政区数 × 2 + 大区覆盖加成` 计算
- 区域覆盖字段建议直接用于第一版计分、区域标签或后续勋章体系

## 10. 玩乐项目榜附加建模建议
玩乐项目标准库建议维护：
- `activity_group`
- `difficulty_level`
- `risk_level`

说明：
- `difficulty_level`、`risk_level` 第一版不参与计分
- 但适合用于后续标签、推荐和海报文案
- 第一版玩乐项目榜分数按 `项目类型数 × 2 + 项目大类覆盖加成` 计算

## 11. 计分相关字段建议
### 11.1 子榜分数字段
每个子榜建议统一输出以下字段：
- `score_version`
- `raw_count`
- `achievement_score`
- `influence_score`
- `final_score`
- `score_breakdown`

### 11.2 综合总榜分数字段
综合总榜建议输出：
- `world_final_score`
- `china_final_score`
- `activity_final_score`
- `overall_final_score`

说明：
- `overall_final_score` = `world_final_score × 0.7 + china_final_score × 0.2 + activity_final_score × 0.1`
- `overall_final_score` 不设置固定上限
- 建议为综合总榜同样维护 `score_version`

### 11.3 影响力分相关聚合字段
每个用户建议维护：
- `received_like_count`
- `received_comment_count`
- `received_favorite_count`

说明：
- 这些字段可用于加速分数计算

## 12. 页面映射建议
### 12.1 首页
需要的数据：
- 当前用户各榜单快照
- 首页推荐榜单
- 年度回顾入口状态
- 海报入口状态

### 12.2 榜单页
需要的数据：
- 榜单排名列表
- 当前用户该榜单快照
- 榜单描述和规则

### 12.3 录入页
需要的数据：
- 标准项列表
- 当前用户已勾选状态
- 候选项目提交入口

### 12.4 个人主页
需要的数据：
- 用户资料
- 用户各榜单快照
- 用户互动汇总
- 标签信息
- 最新记录

### 12.5 年度回顾页
需要的数据：
- 年度回顾快照
- 高光记录
- 年度标签

### 12.6 海报页
需要的数据：
- 海报类型
- 对应分数快照
- 对应标签
- 对应标题文案

## 13. 查询与快照建议
### 13.1 为什么需要快照
- 榜单页不适合每次都实时全量重算
- 年度回顾和海报更适合读取稳定结果
- 快照可降低展示层复杂度

### 13.2 快照策略
建议采用：
- 实时写入基础记录
- 定时任务更新 `user_score_snapshot`
- 定时任务生成 `leaderboard_snapshot`
- 年度节点生成 `year_review_snapshot`

## 14. MVP 落地建议
第一版建议优先实现以下表：
- `user`
- `user_profile`
- `leaderboard_definition`
- `standard_item`
- `activity_candidate`
- `user_checkin`
- `user_checkin_content`
- `user_interaction`
- `user_comment`
- `user_score_snapshot`
- `year_review_snapshot`
- `share_poster`

第一版可后置：
- 更复杂的榜单快照表
- 勋章体系表
- 好友关系表
- 分享落地页跟踪表

## 15. 后续扩展建议
- 增加 `follow_relation` 支撑好友榜
- 增加 `badge` 与 `user_badge` 支撑勋章系统
- 增加 `city_visit` 支撑城市级扩展
- 增加 `share_conversion` 支撑分享转化分析

## 16. 结论
第一版的数据模型重点不是追求完美抽象，而是：
- 能清晰支撑三大榜单
- 能稳定计算分数和排名
- 能展示用户内容资产
- 能支持年度回顾与海报传播

只要围绕这四个目标建模，后续扩展会比较顺畅。
