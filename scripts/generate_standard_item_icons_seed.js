#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const https = require('https');
const { STANDARD_ITEM_LANDMARK_PAGE_MAP } = require('./data/standard_item_landmarks.seed');

const OUTPUT_FILE = path.join(__dirname, 'data', 'standard_item_icons.seed.js');
const WIKIPEDIA_SUMMARY_API = 'https://en.wikipedia.org/api/rest_v1/page/summary/';
const REQUEST_TIMEOUT_MS = 12000;

function formatDuration(ms) {
  if (ms < 1000) {
    return `${ms}ms`;
  }

  return `${(ms / 1000).toFixed(1)}s`;
}

function requestJson(url) {
  return new Promise((resolve, reject) => {
    const requestStartedAt = Date.now();
    const req = https.get(
      url,
      {
        family: 4,
        headers: {
          'User-Agent': 'chart-app-standard-item-icons-generator/1.0',
          Accept: 'application/json',
        },
      },
      (res) => {
        console.log(`[network] response ${res.statusCode} ${url} (${formatDuration(Date.now() - requestStartedAt)})`);
        let raw = '';
        res.setEncoding('utf8');
        res.on('data', (chunk) => {
          raw += chunk;
        });
        res.on('end', () => {
          if (res.statusCode && res.statusCode >= 400) {
            reject(new Error(`HTTP ${res.statusCode}: ${url}`));
            return;
          }

          try {
            resolve(JSON.parse(raw));
          } catch (error) {
            reject(error);
          }
        });
      }
    );

    req.on('socket', (socket) => {
      socket.on('lookup', (error, address, family) => {
        if (error) {
          console.log(`[network] lookup error ${url} -> ${error.message}`);
          return;
        }

        console.log(
          `[network] lookup ${url} -> ${address} (IPv${family}) (${formatDuration(Date.now() - requestStartedAt)})`
        );
      });

      socket.on('connect', () => {
        console.log(`[network] tcp connected ${url} (${formatDuration(Date.now() - requestStartedAt)})`);
      });

      socket.on('secureConnect', () => {
        console.log(`[network] tls connected ${url} (${formatDuration(Date.now() - requestStartedAt)})`);
      });
    });

    req.setTimeout(REQUEST_TIMEOUT_MS, () => {
      req.destroy(new Error(`请求超时（>${REQUEST_TIMEOUT_MS}ms）: ${url}`));
    });

    req.on('error', (error) => {
      console.log(`[network] request error ${url} -> ${error.message} (${formatDuration(Date.now() - requestStartedAt)})`);
      reject(error);
    });
  });
}

async function fetchImageUrl(pageTitle) {
  const url = `${WIKIPEDIA_SUMMARY_API}${encodeURIComponent(pageTitle)}`;
  const data = await requestJson(url);
  return data?.originalimage?.source || data?.thumbnail?.source || '';
}

function buildOutputContent(iconMap) {
  const lines = [
    '// 自动生成于 scripts/generate_standard_item_icons_seed.js',
    '// 如需更新，请修改 scripts/data/standard_item_landmarks.seed.js 后重新生成。',
    '',
    'const STANDARD_ITEM_ICON_MAP = {',
  ];

  Object.entries(iconMap).forEach(([itemId, imageUrl]) => {
    lines.push(`  ${itemId}: '${imageUrl.replace(/'/g, "\\'")}',`);
  });

  lines.push('};', '', 'module.exports = {', '  STANDARD_ITEM_ICON_MAP,', '};', '');
  return lines.join('\n');
}

async function main() {
  const entries = Object.entries(STANDARD_ITEM_LANDMARK_PAGE_MAP);
  const iconMap = {};
  const failed = [];
  const startedAt = Date.now();

  console.log(`开始生成标准项图片 URL，数量: ${entries.length}`);
  console.log(`单次请求超时: ${REQUEST_TIMEOUT_MS}ms`);

  for (let index = 0; index < entries.length; index += 1) {
    const [itemId, pageTitle] = entries[index];
    const itemStartedAt = Date.now();

    console.log(`[${index + 1}/${entries.length}] 开始获取 ${itemId} -> ${pageTitle}`);

    try {
      const imageUrl = await fetchImageUrl(pageTitle);
      if (!imageUrl) {
        failed.push({ itemId, pageTitle, reason: '未返回图片 URL' });
        console.log(
          `[${index + 1}/${entries.length}] 未返回图片 URL: ${itemId} (${formatDuration(Date.now() - itemStartedAt)})`
        );
      } else {
        iconMap[itemId] = imageUrl;
        console.log(
          `[${index + 1}/${entries.length}] 成功: ${itemId} (${formatDuration(Date.now() - itemStartedAt)})`
        );
      }
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      failed.push({
        itemId,
        pageTitle,
        reason,
      });
      console.log(
        `[${index + 1}/${entries.length}] 失败: ${itemId} (${formatDuration(Date.now() - itemStartedAt)}) -> ${reason}`
      );
    }

    if ((index + 1) % 20 === 0 || index === entries.length - 1) {
      console.log(`已处理 ${index + 1}/${entries.length}，总耗时 ${formatDuration(Date.now() - startedAt)}`);
    }
  }

  fs.writeFileSync(OUTPUT_FILE, buildOutputContent(iconMap), 'utf8');
  console.log(`已写入图片映射文件: ${OUTPUT_FILE}`);

  if (failed.length) {
    console.log(`以下 ${failed.length} 条需要人工检查：`);
    failed.forEach((item) => {
      console.log(`- ${item.itemId} -> ${item.pageTitle} (${item.reason})`);
    });
    process.exitCode = 2;
    return;
  }

  console.log(`全部图片 URL 生成完成，总耗时 ${formatDuration(Date.now() - startedAt)}。`);
}

main().catch((error) => {
  console.error('生成标准项图片 URL 失败。');
  console.error(error && error.message ? error.message : error);
  process.exit(1);
});
