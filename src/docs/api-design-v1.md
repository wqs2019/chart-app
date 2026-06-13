# 排行榜成就 App API 设计 v1

## 1. 文档信息
- 文档名称：排行榜成就 App API 设计 v1
- 文档目标：定义 MVP 阶段核心接口，为前后端开发提供统一契约
- 关联文档：[prd-ranking-app-v1.md](file:///Users/wuqingshi/Documents/chart-app/src/docs/prd-ranking-app-v1.md), [data-model-v1.md](file:///Users/wuqingshi/Documents/chart-app/src/docs/data-model-v1.md)
- 当前阶段：接口定义

## 2. 通用约定
### 2.1 基础信息
- Base URL: `https://api.ranking-app.com/v1`
- Content-Type: `application/json`
- 认证方式: `Authorization: Bearer <token>`

### 2.2 响应格式
所有接口统一返回以下格式：
```json
{
  "code": 200,      // 200 为成功，其他为错误码
  "message": "success",
  "data": { ... }   // 具体业务数据
}
```

## 3. 核心接口清单

### 3.1 首页与发现 (Home)
| 接口名 | 路径 | 方法 | 描述 |
| :--- | :--- | :--- | :--- |
| 获取首页概览 | `/home/overview` | GET | 获取我的当前成绩摘要、热门榜单入口、推荐补录等 |

### 3.2 榜单 (Leaderboards)
| 接口名 | 路径 | 方法 | 描述 |
| :--- | :--- | :--- | :--- |
| 获取榜单列表 | `/leaderboards` | GET | 获取所有可用榜单定义（代码、权重等） |
| 获取榜单排名 | `/leaderboards/{code}/rankings` | GET | 分页获取指定榜单的用户排名列表 |
| 获取我的榜单位置 | `/leaderboards/{code}/my-rank` | GET | 获取当前用户在指定榜单的分数、排名、超过比例 |

### 3.3 录入中心 (Check-in Center)
| 接口名 | 路径 | 方法 | 描述 |
| :--- | :--- | :--- | :--- |
| 获取标准项列表 | `/standard-items` | GET | 根据榜单类型获取国家/省份/项目列表 |
| 批量打卡录入 | `/checkins/batch` | POST | 初始建档或大批量补录时使用 |
| 单项打卡/撤销 | `/checkins` | POST/DELETE | 针对单个项目的打卡或取消 |
| 完善打卡内容 | `/checkins/{id}/content` | PUT | 补充图片、描述、时间等详细信息 |
| 提交自定义项目 | `/checkins/candidates` | POST | 玩乐项目“没有我的类别？”提交 |

### 3.4 个人主页与成就 (User Profile)
| 接口名 | 路径 | 方法 | 描述 |
| :--- | :--- | :--- | :--- |
| 获取我的成就总览 | `/users/me/achievements` | GET | 获取综合总分、子榜总分、互动汇总及标签 |
| 获取他人成就页 | `/users/{id}/profile` | GET | 查看他人的榜单成绩和打卡展示内容 |
| 获取用户打卡流 | `/users/{id}/checkins` | GET | 分页获取用户的具体打卡经历列表 |

### 3.5 互动 (Social)
| 接口名 | 路径 | 方法 | 描述 |
| :--- | :--- | :--- | :--- |
| 点赞/取消赞 | `/interactions/like` | POST/DELETE | 对打卡内容点赞 |
| 收藏/取消收藏 | `/interactions/favorite` | POST/DELETE | 对打卡内容收藏 |
| 获取评论列表 | `/comments` | GET | 获取指定打卡内容的评论 |
| 发布评论 | `/comments` | POST | 对他人的打卡记录发表评价 |

### 3.6 分享与年度回顾 (Share & Review)
| 接口名 | 路径 | 方法 | 描述 |
| :--- | :--- | :--- | :--- |
| 获取年度回顾数据 | `/reviews/year/{year}` | GET | 获取指定年份的回顾卡片序列数据 |
| 生成分享海报 | `/posters/generate` | POST | 根据榜单或回顾结果生成海报配置及预览地址 |
| 记录分享行为 | `/posters/{id}/share-log` | POST | 统计用户真实触发了分享动作 |

---

## 4. 详细接口定义 (部分核心)

### 4.1 获取我的榜单位置
**GET** `/leaderboards/{code}/my-rank`

**Response Data:**
```json
{
  "leaderboard_code": "world_travel",
  "score_version": "balanced_v1",
  "rank_position": 182,
  "total_users": 12458,
  "percentile": 98.5,
  "raw_count": 50,
  "achievement_score": 242.2,
  "influence_score": 40.1,
  "final_score": 181.6,
  "score_breakdown": {
    "base_count_score": 200,
    "continent_bonus_score": 25,
    "structure_bonus_score": 17.2,
    "interaction_raw_score": 54,
    "achievement_weight": 0.7,
    "influence_weight": 0.3
  },
  "next_milestone": {
    "target_count": 55,
    "gap": 5,
    "reward_text": "再解锁5个国家，继续拉开与下一位的差距"
  }
}
```

说明：
- `raw_count` 表示该榜单下的唯一有效录入数量。
- `achievement_score`、`influence_score`、`final_score` 都不设固定上限。
- `score_breakdown` 的字段会因榜单不同而不同：
  - 世界旅游榜：返回 `base_count_score`、`continent_bonus_score`、`structure_bonus_score`
  - 中国旅游榜：返回 `base_count_score`、`region_bonus_score`
  - 玩乐项目榜：返回 `base_count_score`、`category_bonus_score`

中国旅游榜示例拆解：
```json
{
  "leaderboard_code": "china_travel",
  "score_version": "balanced_v1",
  "raw_count": 18,
  "achievement_score": 66.0,
  "influence_score": 42.9,
  "final_score": 59.1,
  "score_breakdown": {
    "base_count_score": 36,
    "region_bonus_score": 30,
    "region_cover_count": 6,
    "interaction_raw_score": 72,
    "achievement_weight": 0.7,
    "influence_weight": 0.3
  }
}
```

玩乐项目榜示例拆解：
```json
{
  "leaderboard_code": "activity",
  "score_version": "balanced_v1",
  "raw_count": 17,
  "achievement_score": 54.0,
  "influence_score": 30.0,
  "final_score": 46.8,
  "score_breakdown": {
    "base_count_score": 34,
    "category_bonus_score": 20,
    "activity_group_cover_count": 5,
    "interaction_raw_score": 19,
    "achievement_weight": 0.7,
    "influence_weight": 0.3
  }
}
```

### 4.2 批量打卡录入
**POST** `/checkins/batch`

**Request Body:**
```json
{
  "leaderboard_code": "china_travel",
  "item_ids": [10, 15, 22],
  "source_type": "history_backfill"
}
```

### 4.3 完善打卡内容
**PUT** `/checkins/{id}/content`

**Request Body:**
```json
{
  "title": "第一次去大理",
  "description": "苍山洱海，真的太美了，值得再去。",
  "visit_time": "2024-05-20",
  "image_urls": ["https://cdn.com/img1.jpg", "https://cdn.com/img2.jpg"],
  "city_name": "大理白族自治州"
}
```

### 4.4 获取年度回顾数据
**GET** `/reviews/year/2026`

**Response Data:**
```json
{
  "review_year": 2026,
  "cards": [
    {
      "type": "cover",
      "title": "你的 2026 成就回顾",
      "user_info": { "nickname": "张三", "avatar": "..." }
    },
    {
      "type": "new_stats",
      "data": {
        "world_new": 4,
        "china_new": 6,
        "activity_new": 3,
        "total_new": 13
      }
    },
    {
      "type": "rank_up",
      "data": {
        "old_rank": 500,
        "new_rank": 182,
        "improvement": 318
      }
    }
    // ... 更多卡片类型
  ]
}
```

## 5. 错误码定义建议
- `400`: 参数错误
- `401`: 未登录或 Token 失效
- `403`: 无权操作该记录
- `404`: 资源不存在（如不存在的榜单代码）
- `429`: 操作过于频繁（如连续点赞）
- `500`: 服务器内部错误

## 6. 开发者说明
- **幂等性**: 打卡接口应保证幂等，重复打卡同一标准项不应报错且不应新增记录。
- **性能**: 榜单排名接口建议利用 Redis 缓存 `user_score_snapshot` 结果。
- **安全性**: 补充内容的 PUT 接口必须校验 `checkin.user_id == current_user_id`。
- **分数拆解**: 不同榜单返回不同的 `score_breakdown` 字段，但统一保留 `base_count_score`、`interaction_raw_score`、`achievement_weight`、`influence_weight`。
- **计分版本**: 建议所有榜单相关接口返回 `score_version` 字段，第一版可使用 `balanced_v1`，后续若切换到游戏化公式可升级为 `gamified_v2`。
