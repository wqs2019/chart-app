# 数据库标准数据导入指南

## 环境变量
- TCB_SECRET_ID
- TCB_SECRET_KEY
- TCB_ENV_ID
- 可选：TCB_REGION

## 初始化集合与索引
```bash
npm run db:init:tcb
```

## 导入标准项数据
支持四种范围：
- all
- world
- china
- activity

字段约定：
- 世界国家导入到 `chart_standard_items` 时，`leaderboard_code = world_travel`
- 中国省级行政区导入到 `chart_standard_items` 时，`leaderboard_code = china_travel`
- 玩乐项目导入到 `chart_standard_items` 时，`leaderboard_code = activity`
- `category_label_zh` 为分类 code 的中文名，作为唯一的中文分类展示字段写入 `chart_standard_items`
- 世界国家额外写入 `continent`
- 中国省级行政区额外写入 `region_group`
- 玩乐项目额外写入 `activity_group`
- 世界国家建议补充 `tier` 字段，取值 `A / B / C`
- 中国省级行政区建议补充 `region_group`，用于中国旅游榜大区覆盖加成
- 玩乐项目建议补充 `activity_group`，用于玩乐项目榜项目大类覆盖加成
- 中国大区建议取值：`华北 / 东北 / 华东 / 华中 / 华南 / 西南 / 西北`

示例：
```bash
# 导入全部
npm run db:seed:standard-items -- --scope=all

# 仅导入玩乐项目
npm run db:seed:standard-items -- --scope=activity

# 仅导入中国省级行政区
npm run db:seed:standard-items -- --scope=china

# 仅导入世界国家
npm run db:seed:standard-items -- --scope=world
```

## 回填已存在数据的中文标签
如果库里已经有旧版 `chart_standard_items`，可以执行：

```bash
# 全量回填
npm run db:backfill:standard-item-labels -- --scope=all

# 只回填中国榜
npm run db:backfill:standard-item-labels -- --scope=china
```

## 清理历史冗余中文字段
如果库里还保留旧的 `continent_label_zh`、`region_group_label_zh`、`activity_group_label_zh`，可以执行：

```bash
# 全量清理
npm run db:cleanup:standard-item-legacy-labels -- --scope=all

# 只清理玩乐榜
npm run db:cleanup:standard-item-legacy-labels -- --scope=activity
```

## 校验导入结果
```bash
npm run db:check:standard-items
```

## 初始化榜单配置建议
建议同时初始化 `chart_leaderboards` 集合中的 4 个榜单定义：
- `world_travel`
- `china_travel`
- `activity`
- `overall`

建议字段：
- `weights.achievement = 0.7`
- `weights.influence = 0.3`
- `config.score_version = balanced_v1`
- `config.formula_note = 分数不封顶，世界国家按4分、省级行政区按2分、项目类型按2分，按覆盖/结构加成持续累加`
