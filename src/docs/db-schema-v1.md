# 排行榜成就 App 数据库架构 (NoSQL) v1

## 1. 文档信息
- 集合命名规范：统一使用 `chart_` 前缀
- 数据库类型：文档型数据库 (如 MongoDB)
- 核心设计原则：高内聚、适度冗余、嵌套优先

## 2. 集合 (Collections) 定义

### 2.1 chart_users (用户与统计汇总)
存储用户基础信息及各榜单的实时汇总数据，方便首页快速渲染。

```json
{
  "_id": "ObjectId",
  "username": "string",
  "phone": "string",
  "profile": {
    "nickname": "string",
    "avatar_url": "string",
    "bio": "string",
    "primary_tag": "string" // 如：全球探索者
  },
  "stats": {
    "score_version": "string", // 如 "balanced_v1"
    "overall_score": "number", // 综合总榜总分，不设固定上限
    "received_like_count": "number",
    "received_comment_count": "number",
    "received_favorite_count": "number",
    "world": {
      "count": "number",       // 国家数
      "score": "number",       // 世界榜总分
      "rank": "number"         // 缓存排名
    },
    "china": {
      "count": "number",       // 省份数
      "score": "number",
      "rank": "number"
    },
    "activity": {
      "count": "number",       // 项目数
      "score": "number",
      "rank": "number"
    }
  },
  "created_at": "date",
  "updated_at": "date"
}
```

### 2.2 chart_leaderboards (榜单配置)
```json
{
  "_id": "string", // 如 "world_travel"
  "name": "string",
  "description": "string",
  "weights": {
    "achievement": 0.7,
    "influence": 0.3
  },
  "config": {
    "score_version": "balanced_v1",
    "overall_weight": 0.7,
    "formula_note": "分数不封顶，世界国家按4分、省级行政区按2分、项目类型按2分，按覆盖/结构加成与影响力分加权",
    "influence_formula": "ln(1 + 点赞×1 + 评论×2 + 收藏×3) × 10"
  }
}
```

### 2.3 chart_standard_items (标准字典项)
```json
{
  "_id": "string", // 如 "country_jp", "province_gd", "activity_bungee"
  "item_type": "string", // "country" | "province" | "activity"
  "leaderboard_code": "string", // "world_travel" | "china_travel" | "activity_rank"
  "name_zh": "string",
  "name_en": "string",
  "category": "string", // 洲、区域、或玩乐分类
  "tier": "string",     // A, B, C (仅限世界榜国家结构分使用)
  "icon": "string",
  "is_active": "boolean"
}
```

### 2.4 chart_checkins (打卡与内容嵌套)
核心业务表。将打卡行为与详细内容嵌套，减少查询。

```json
{
  "_id": "ObjectId",
  "user_id": "string",
  "leaderboard_code": "string",
  "item_id": "string",      // 关联 chart_standard_items._id
  "item_type": "string",
  "is_active": "boolean",
  "source_type": "string",  // "history_backfill" | "realtime_add"
  "checked_in_at": "date",
  "content": {              // 详细内容 (可选)
    "title": "string",
    "description": "string",
    "images": ["string"],
    "visit_time": "string",
    "city_name": "string",
    "is_complete": "boolean" // 是否达到“完整记录”标准
  },
  "interaction": {          // 汇总数据
    "likes_count": "number",
    "comments_count": "number",
    "favorites_count": "number"
  },
  "created_at": "date",
  "updated_at": "date"
}
```

### 2.5 chart_interactions (点赞/收藏明细)
```json
{
  "_id": "ObjectId",
  "user_id": "string",
  "target_type": "string", // "checkin_content"
  "target_id": "string",   // chart_checkins._id
  "target_user_id": "string",
  "interaction_type": "string", // "like" | "favorite"
  "status": "string", // "active" | "cancelled"
  "created_at": "date"
}
```

### 2.6 chart_comments (评论明细)
```json
{
  "_id": "ObjectId",
  "actor_user_id": "string",
  "target_user_id": "string",
  "target_type": "string", // "checkin_content"
  "target_id": "string",
  "content": "string",
  "reply_to_comment_id": "string", // 支持简单二级评论
  "status": "string",
  "created_at": "date"
}
```

### 2.7 chart_score_snapshots (分数与排名快照)
用于渲染排行榜列表，定期更新。

```json
{
  "_id": "ObjectId",
  "user_id": "string",
  "leaderboard_code": "string", // "overall_rank" | "world_travel" | "china_travel" | "activity_rank"
  "score_version": "string",    // "balanced_v1" | "gamified_v2"
  "raw_count": "number",
  "achievement_score": "number",
  "influence_score": "number",
  "final_score": "number",      // 最终排名分，不设固定上限
  "score_breakdown": {
    "coverage_score": "number",
    "bonus_score": "number",
    "interaction_raw_score": "number"
  },
  "rank": "number",
  "percentile": "number",
  "tags": ["string"],           // 如 ["亚洲探索者"]
  "updated_at": "date"
}
```

### 2.8 chart_activity_candidates (候选项目)
```json
{
  "_id": "ObjectId",
  "submitter_id": "string",
  "name": "string",
  "category": "string",
  "description": "string",
  "status": "string", // "pending" | "merged" | "rejected"
  "merged_to_item_id": "string",
  "created_at": "date"
}
```

### 2.9 chart_year_reviews (年度回顾)
```json
{
  "_id": "ObjectId",
  "user_id": "string",
  "year": "number",
  "data": {
    "new_countries": ["string"],
    "new_provinces": ["string"],
    "milestones": ["string"],
    "top_interaction_checkin": "string" // 最受欢迎的一条打卡记录ID
  },
  "created_at": "date"
}
```

### 2.10 chart_share_posters (成就海报)
```json
{
  "_id": "ObjectId",
  "user_id": "string",
  "poster_type": "string", // "overall_rank_poster" | "world_travel_poster" | "china_travel_poster" | "activity_rank_poster" | "year_review_poster"
  "related_leaderboard_code": "string",
  "related_review_year": "number",
  "score_snapshot_id": "string",
  "title": "string",
  "image_url": "string",
  "share_status": "string", // "generated" | "saved" | "shared"
  "shared_at": "date",
  "created_at": "date"
}
```

## 3. 索引建议 (Indexes)

| 集合 | 索引字段 | 类型 | 原因 |
| :--- | :--- | :--- | :--- |
| `chart_users` | `phone` | 唯一 | 登录查询 |
| `chart_checkins` | `user_id`, `leaderboard_code`, `item_id` | 唯一联合 | 防止重复打卡 |
| `chart_checkins` | `user_id`, `created_at` | 复合 | 个人主页时间线查询 |
| `chart_score_snapshots` | `leaderboard_code`, `final_score` | 复合 | 排行榜列表排序 |
| `chart_interactions` | `target_id`, `interaction_type` | 复合 | 统计单条记录的点赞/收藏 |
| `chart_share_posters` | `user_id`, `created_at` | 复合 | 个人主页或海报历史查询 |

## 4. 冗余设计说明
- **Stats 冗余**：在 `chart_users` 中冗余存储各榜单分数、互动汇总和计数，避免首页加载时去 `chart_checkins` 聚合。
- **Interaction 冗余**：在 `chart_checkins` 中冗余存储点赞/收藏数，避免列表页查询明细表。
