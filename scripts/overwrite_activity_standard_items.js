#!/usr/bin/env node

const tcb = require('@cloudbase/node-sdk');
const { STANDARD_ITEMS_BY_SCOPE } = require('./data/chart_standard_items.seed');

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

async function fetchActivityDocIds(collection) {
  const ids = [];
  let offset = 0;
  const pageSize = 100;

  while (true) {
    const res = await collection
      .where({ leaderboard_code: 'activity' })
      .field({ _id: true })
      .skip(offset)
      .limit(pageSize)
      .get();

    const list = Array.isArray(res.data) ? res.data : [];
    ids.push(...list.map((item) => item._id).filter(Boolean));

    if (list.length < pageSize) {
      break;
    }

    offset += pageSize;
  }

  return ids;
}

async function removeDocs(collection, ids) {
  for (let index = 0; index < ids.length; index += 1) {
    await collection.doc(ids[index]).remove();

    if ((index + 1) % 20 === 0 || index === ids.length - 1) {
      console.log(`已删除 ${index + 1}/${ids.length}`);
    }
  }
}

async function seedActivityItems(collection) {
  const items = STANDARD_ITEMS_BY_SCOPE.activity;

  for (let index = 0; index < items.length; index += 1) {
    const item = items[index];
    const { _id, ...data } = item;
    const timestamp = new Date();

    await collection.doc(_id).set({
      ...data,
      created_at: timestamp,
      updated_at: timestamp,
    });

    if ((index + 1) % 20 === 0 || index === items.length - 1) {
      console.log(`已写入 ${index + 1}/${items.length}`);
    }
  }

  return items.length;
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

  console.log(`开始覆盖 activity 标准项，环境: ${envId}`);
  const existingIds = await fetchActivityDocIds(collection);
  console.log(`远端现有 activity 标准项数量: ${existingIds.length}`);

  if (existingIds.length) {
    await removeDocs(collection, existingIds);
  }

  const seededCount = await seedActivityItems(collection);
  console.log(`activity 标准项覆盖完成，最终写入数量: ${seededCount}`);
}

main().catch((error) => {
  console.error('覆盖 activity 标准项失败。');
  console.error(error && error.message ? error.message : error);

  if (error && error.stack) {
    console.error(error.stack);
  }

  process.exit(1);
});
