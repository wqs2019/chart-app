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
- 玩乐项目导入到 `chart_standard_items` 时，`leaderboard_code = activity_rank`
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

## 校验导入结果
```bash
npm run db:check:standard-items
```

## 初始化榜单配置建议
建议同时初始化 `chart_leaderboards` 集合中的 4 个榜单定义：
- `world_travel`
- `china_travel`
- `activity_rank`
- `overall_rank`

建议字段：
- `weights.achievement = 0.7`
- `weights.influence = 0.3`
- `config.score_version = balanced_v1`
- `config.formula_note = 分数不封顶，世界国家按4分、省级行政区按2分、项目类型按2分，按覆盖/结构加成持续累加`
