#!/usr/bin/env node

const CloudBase = require('@cloudbase/manager-node');

const COLLECTIONS = [
  'chart_users',
  'chart_standard_items',
  'chart_checkins',
  'chart_interactions',
  'chart_comments',
  'chart_follows',
  'chart_notifications',
  'chart_score_snapshots',
  'chart_year_reviews',
  'chart_share_posters',
];

const INDEX_DEFINITIONS = {
  chart_users: [
    {
      name: 'unique_phone',
      unique: true,
      keys: [{ name: 'phone', direction: 1 }],
    },
  ],
  chart_checkins: [
    {
      name: 'unique_user_checkin',
      unique: true,
      keys: [
        { name: 'user_id', direction: 1 },
        { name: 'leaderboard_code', direction: 1 },
        { name: 'item_id', direction: 1 },
      ],
    },
    {
      name: 'user_timeline',
      unique: false,
      keys: [
        { name: 'user_id', direction: 1 },
        { name: 'created_at', direction: -1 },
      ],
    },
  ],
  chart_score_snapshots: [
    {
      name: 'leaderboard_ranking',
      unique: false,
      keys: [
        { name: 'leaderboard_code', direction: 1 },
        { name: 'final_score', direction: -1 },
      ],
    },
  ],
  chart_interactions: [
    {
      name: 'target_action',
      unique: false,
      keys: [
        { name: 'target_id', direction: 1 },
        { name: 'interaction_type', direction: 1 },
      ],
    },
  ],
  chart_follows: [
    {
      name: 'unique_follow_pair',
      unique: true,
      keys: [
        { name: 'follower_user_id', direction: 1 },
        { name: 'followed_user_id', direction: 1 },
      ],
    },
    {
      name: 'followed_unread_timeline',
      unique: false,
      keys: [
        { name: 'followed_user_id', direction: 1 },
        { name: 'followed_user_unread', direction: 1 },
        { name: 'updated_at', direction: -1 },
      ],
    },
    {
      name: 'follower_timeline',
      unique: false,
      keys: [
        { name: 'follower_user_id', direction: 1 },
        { name: 'updated_at', direction: -1 },
      ],
    },
  ],
  chart_notifications: [
    {
      name: 'receiver_timeline',
      unique: false,
      keys: [
        { name: 'receiver_user_id', direction: 1 },
        { name: 'created_at', direction: -1 },
      ],
    },
    {
      name: 'receiver_unread_timeline',
      unique: false,
      keys: [
        { name: 'receiver_user_id', direction: 1 },
        { name: 'is_read', direction: 1 },
        { name: 'created_at', direction: -1 },
      ],
    },
  ],
  chart_share_posters: [
    {
      name: 'user_poster_history',
      unique: false,
      keys: [
        { name: 'user_id', direction: 1 },
        { name: 'created_at', direction: -1 },
      ],
    },
  ],
};

function getEnvValue(names) {
  for (const name of names) {
    const value = process.env[name];
    if (value) {
      return value;
    }
  }
  return '';
}

function requireEnv(names, label) {
  const value = getEnvValue(names);
  if (!value) {
    throw new Error(`缺少环境变量 ${label}，可接受键名: ${names.join(', ')}`);
  }
  return value;
}

function toManagerIndex(index) {
  return {
    IndexName: index.name,
    MgoKeySchema: {
      MgoIsUnique: index.unique,
      MgoIndexKeys: index.keys.map((key) => ({
        Name: key.name,
        Direction: String(key.direction),
      })),
    },
  };
}

async function ensureCollection(database, collectionName) {
  const result = await database.createCollectionIfNotExists(collectionName);
  if (result.IsCreated) {
    console.log(`已创建集合: ${collectionName}`);
    return;
  }

  console.log(`集合已存在，跳过创建: ${collectionName}`);
}

async function ensureIndex(database, collectionName, index) {
  const existsResult = await database.checkIndexExists(collectionName, index.name);

  if (existsResult.Exists) {
    console.log(`索引已存在，跳过创建: ${collectionName}.${index.name}`);
    return;
  }

  await database.updateCollection(collectionName, {
    CreateIndexes: [toManagerIndex(index)],
  });
  console.log(`已创建索引: ${collectionName}.${index.name}`);
}

async function main() {
  const secretId = requireEnv(
    ['TCB_SECRET_ID', 'CLOUDBASE_SECRET_ID', 'TENCENTCLOUD_SECRET_ID'],
    'TCB_SECRET_ID'
  );
  const secretKey = requireEnv(
    ['TCB_SECRET_KEY', 'CLOUDBASE_SECRET_KEY', 'TENCENTCLOUD_SECRET_KEY'],
    'TCB_SECRET_KEY'
  );
  const envId = requireEnv(
    ['TCB_ENV_ID', 'CLOUDBASE_ENV_ID', 'TENCENTCLOUD_ENV_ID'],
    'TCB_ENV_ID'
  );
  const region = getEnvValue(['TCB_REGION', 'CLOUDBASE_REGION', 'TENCENTCLOUD_REGION']);

  const app = CloudBase.init({
    secretId,
    secretKey,
    envId,
    ...(region ? { region } : {}),
  });

  const { database } = app;

  console.log(`开始初始化 CloudBase 数据库，环境: ${envId}`);

  for (const collectionName of COLLECTIONS) {
    await ensureCollection(database, collectionName);
  }

  console.log('开始创建索引...');

  for (const [collectionName, indexes] of Object.entries(INDEX_DEFINITIONS)) {
    for (const index of indexes) {
      await ensureIndex(database, collectionName, index);
    }
  }

  console.log('数据库初始化完成。');
}

main().catch((error) => {
  console.error('数据库初始化失败。');
  console.error(error && error.message ? error.message : error);

  if (error && error.stack) {
    console.error(error.stack);
  }

  process.exit(1);
});
