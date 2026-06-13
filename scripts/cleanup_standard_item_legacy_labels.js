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
  const _ = db.command;
  const collection = db.collection('chart_standard_items');

  console.log(`开始清理标准项冗余中文字段，环境: ${envId}，scope: ${scope}，数量: ${items.length}`);

  for (let index = 0; index < items.length; index += 1) {
    const item = items[index];

    await collection.doc(item._id).update({
      continent_label_zh: _.remove(),
      region_group_label_zh: _.remove(),
      activity_group_label_zh: _.remove(),
      updated_at: new Date(),
    });

    if ((index + 1) % 20 === 0 || index === items.length - 1) {
      console.log(`已清理 ${index + 1}/${items.length}`);
    }
  }

  console.log('标准项冗余中文字段清理完成。');
}

main().catch((error) => {
  console.error('标准项冗余中文字段清理失败。');
  console.error(error && error.message ? error.message : error);

  if (error && error.stack) {
    console.error(error.stack);
  }

  process.exit(1);
});
