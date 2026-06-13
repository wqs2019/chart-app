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

function parseScope(argv) {
  const supportedScopes = new Set(['all', 'world', 'china', 'activity']);
  const rawArg = argv.find((arg) => arg.startsWith('--scope='));
  const scope = rawArg ? rawArg.split('=')[1] : 'all';

  if (!supportedScopes.has(scope)) {
    throw new Error(`不支持的 scope: ${scope}，可选值: all | world | china | activity`);
  }

  return scope;
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
  const scope = parseScope(process.argv.slice(2));
  const items = STANDARD_ITEMS_BY_SCOPE[scope];

  const app = tcb.init({
    env: envId,
    secretId,
    secretKey,
  });

  const db = app.database();
  const collection = db.collection('chart_standard_items');

  console.log(`开始回填标准项中文标签，环境: ${envId}，scope: ${scope}，数量: ${items.length}`);

  for (let index = 0; index < items.length; index += 1) {
    const item = items[index];
    const updatePayload = {
      category_label_zh: item.category_label_zh || '',
      updated_at: new Date(),
    };

    await collection.doc(item._id).update(updatePayload);

    if ((index + 1) % 20 === 0 || index === items.length - 1) {
      console.log(`已回填 ${index + 1}/${items.length}`);
    }
  }

  console.log('标准项中文标签回填完成。');
}

main().catch((error) => {
  console.error('标准项中文标签回填失败。');
  console.error(error && error.message ? error.message : error);

  if (error && error.stack) {
    console.error(error.stack);
  }

  process.exit(1);
});
