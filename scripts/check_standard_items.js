#!/usr/bin/env node

const tcb = require('@cloudbase/node-sdk');

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

async function countByLeaderboardCode(collection, leaderboardCode) {
  const res = await collection.where({ leaderboard_code: leaderboardCode }).count();
  return res.total || 0;
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

  const app = tcb.init({
    env: envId,
    secretId,
    secretKey,
  });

  const db = app.database();
  const collection = db.collection('chart_standard_items');

  const totalWorld = await countByLeaderboardCode(collection, 'world_travel');
  const totalChina = await countByLeaderboardCode(collection, 'china_travel');
  const totalActivity = await countByLeaderboardCode(collection, 'activity_rank');
  const resTotal = await collection.where({}).count();
  const totalAll = resTotal.total || 0;

  console.log(JSON.stringify({
    world_travel: totalWorld,
    china_travel: totalChina,
    activity_rank: totalActivity,
    all: totalAll
  }, null, 2));
}

main().catch((error) => {
  console.error('检查失败。');
  console.error(error && error.message ? error.message : error);
  process.exit(1);
});
