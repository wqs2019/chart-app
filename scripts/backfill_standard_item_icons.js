#!/usr/bin/env node

const tcb = require('@cloudbase/node-sdk');
const { STANDARD_ITEM_ICON_MAP, STANDARD_ITEM_ORIGINAL_ICON_MAP } = require('./data/standard_item_icons.seed');

const WIKIMEDIA_THUMB_WIDTH = 330;

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

function toWikipediaThumbnailSource(url) {
  if (!url || !url.includes('upload.wikimedia.org')) {
    return url;
  }

  try {
    const parsed = new URL(url);
    const segments = parsed.pathname.split('/').filter(Boolean);

    if (segments.length < 5 || segments[0] !== 'wikipedia') {
      return url;
    }

    const filename = segments[segments.length - 1].replace(/^\d+px-/, '');

    if (segments[2] === 'thumb') {
      return `${parsed.origin}/${segments.slice(0, -1).join('/')}/${WIKIMEDIA_THUMB_WIDTH}px-${filename}`;
    }

    const [wikiRoot, wikiProject, hashA, hashB, ...rest] = segments;
    const originalPath = rest.join('/');
    const originalFilename = rest[rest.length - 1];

    return `${parsed.origin}/${wikiRoot}/${wikiProject}/thumb/${hashA}/${hashB}/${originalPath}/${WIKIMEDIA_THUMB_WIDTH}px-${originalFilename}`;
  } catch (error) {
    return url;
  }
}

function toWikipediaOriginalSource(url) {
  if (!url || !url.includes('upload.wikimedia.org')) {
    return url;
  }

  try {
    const parsed = new URL(url);
    const segments = parsed.pathname.split('/').filter(Boolean);

    if (segments.length < 5 || segments[0] !== 'wikipedia') {
      return url;
    }

    if (segments[2] !== 'thumb') {
      return url;
    }

    return `${parsed.origin}/${segments.slice(0, 2).join('/')}/${segments.slice(3, -1).join('/')}`;
  } catch (error) {
    return url;
  }
}

function ensureThumbnailUrl(url, itemId) {
  const normalized = toWikipediaThumbnailSource(url);

  if (
    normalized &&
    normalized.includes('upload.wikimedia.org') &&
    (!normalized.includes('/thumb/') || !normalized.includes(`/${WIKIMEDIA_THUMB_WIDTH}px-`))
  ) {
    throw new Error(`标准项 ${itemId} 生成的不是缩略图地址: ${normalized}`);
  }

  return normalized;
}

function ensureOriginalUrl(url) {
  return toWikipediaOriginalSource(url);
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

  const normalizedIconMap = Object.fromEntries(
    Object.entries(STANDARD_ITEM_ICON_MAP)
      .filter(([, url]) => Boolean(url))
      .map(([itemId, url]) => [itemId, ensureThumbnailUrl(url, itemId)])
  );
  const normalizedOriginalIconMap = Object.fromEntries(
    Object.entries(STANDARD_ITEM_ORIGINAL_ICON_MAP)
      .filter(([, url]) => Boolean(url))
      .map(([itemId, url]) => [itemId, ensureOriginalUrl(url)])
  );
  const itemIds = Object.keys(normalizedIconMap);
  if (!itemIds.length) {
    console.log('标准项图片映射为空，跳过回填。请先填写 scripts/data/standard_item_icons.seed.js');
    return;
  }

  const app = tcb.init({
    env: envId,
    secretId,
    secretKey,
  });

  const db = app.database();
  const collection = db.collection('chart_standard_items');

  console.log(`开始回填标准项图片，环境: ${envId}，数量: ${itemIds.length}`);
  console.log(`缩略图样例: ${itemIds[0]} -> ${normalizedIconMap[itemIds[0]]}`);
  console.log(`原图样例: ${itemIds[0]} -> ${normalizedOriginalIconMap[itemIds[0]]}`);

  for (let index = 0; index < itemIds.length; index += 1) {
    const itemId = itemIds[index];
    await collection.doc(itemId).update({
      icon: normalizedIconMap[itemId],
      icon_original: normalizedOriginalIconMap[itemId] || normalizedIconMap[itemId],
      updated_at: new Date(),
    });

    if ((index + 1) % 20 === 0 || index === itemIds.length - 1) {
      console.log(`已回填 ${index + 1}/${itemIds.length}`);
    }
  }

  console.log('标准项图片回填完成。');
}

main().catch((error) => {
  console.error('标准项图片回填失败。');
  console.error(error && error.message ? error.message : error);

  if (error && error.stack) {
    console.error(error.stack);
  }

  process.exit(1);
});
