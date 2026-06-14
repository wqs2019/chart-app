const cloud = require('@cloudbase/node-sdk');
const STS = require('qcloud-cos-sts');

const app = cloud.init({
  env: cloud.SYMBOL_CURRENT_ENV,
});

const db = app.database();
const _ = db.command;
const standardItemsCollection = db.collection('chart_standard_items');
const checkinsCollection = db.collection('chart_checkins');
const snapshotsCollection = db.collection('chart_score_snapshots');
const usersCollection = db.collection('chart_users');
const DEFAULT_COS_BUCKET = '6d61-maoqiu-diary-app-2fpzvwp2e01dbaf-1417164439';
const DEFAULT_COS_REGION = 'ap-shanghai';
const DEFAULT_COS_PUBLIC_DOMAIN = `https://${DEFAULT_COS_BUCKET}.tcb.qcloud.la`;

function ok(data) {
  return {
    success: true,
    data,
  };
}

function fail(message, error) {
  return {
    success: false,
    message,
    ...(error ? { error: error.message || String(error) } : {}),
  };
}

function getEnvValue(keys, fallback = '') {
  for (const key of keys) {
    if (process.env[key]) {
      return process.env[key];
    }
  }

  return fallback;
}

function getDocData(result) {
  if (!result || !result.data) {
    return null;
  }

  return Array.isArray(result.data) ? result.data[0] || null : result.data;
}

function normalizeLeaderboardCode(code) {
  if (code === 'activity_rank') {
    return 'activity';
  }

  return code;
}

function getLeaderboardCodeCandidates(code) {
  const normalizedCode = normalizeLeaderboardCode(code);

  if (normalizedCode === 'activity') {
    return ['activity', 'activity_rank'];
  }

  if (normalizedCode === 'overall') {
    return ['overall', 'overall_rank'];
  }

  return normalizedCode ? [normalizedCode] : [];
}

async function getStandardItemById(itemId) {
  if (!itemId) {
    return null;
  }

  const result = await standardItemsCollection.doc(itemId).get();
  return getDocData(result);
}

async function findCheckin(userId, leaderboardCode, itemId) {
  if (!userId || !leaderboardCode || !itemId) {
    return null;
  }

  const codeCandidates = getLeaderboardCodeCandidates(leaderboardCode);
  const result = await checkinsCollection
    .where({
      user_id: userId,
      leaderboard_code: _.in(codeCandidates),
      item_id: itemId,
    })
    .limit(1)
    .get();

  return getDocData(result);
}

async function findCheckinEntryById(entryId) {
  if (!entryId) {
    return null;
  }

  const result = await checkinsCollection.doc(entryId).get();
  return getDocData(result);
}

function buildSnapshotTags(code, rawCount) {
  if (rawCount <= 0) {
    return [];
  }

  const level =
    rawCount >= 20 ? '资深玩家' : rawCount >= 10 ? '进阶达人' : rawCount >= 3 ? '持续探索' : '刚刚起步';

  const domain =
    code === 'world_travel'
      ? '环球足迹'
      : code === 'china_travel'
        ? '中国探索'
        : code === 'activity'
          ? '体验收集'
          : '综合成就';

  return [domain, level];
}

function getInteractionRawScore(interaction = {}) {
  return (
    (interaction.likes_count || 0) * 1 +
    (interaction.comments_count || 0) * 2 +
    (interaction.favorites_count || 0) * 3
  );
}

function roundScore(value) {
  return Number(Number(value || 0).toFixed(2));
}

function getDateValue(dateLike) {
  const timestamp = new Date(dateLike || 0).getTime();
  return Number.isFinite(timestamp) ? timestamp : 0;
}

function resolveScoreUpdatedAt(existingSnapshot, nextFinalScore) {
  if (
    existingSnapshot &&
    Number(existingSnapshot.final_score || 0) === Number(nextFinalScore || 0)
  ) {
    return (
      existingSnapshot.score_updated_at ||
      existingSnapshot.updated_at ||
      existingSnapshot.created_at ||
      new Date().toISOString()
    );
  }

  return new Date().toISOString();
}

function compareSnapshotScoreReachedAt(a, b) {
  return getDateValue(a.score_updated_at) - getDateValue(b.score_updated_at);
}

function compareLeaderboardRows(a, b) {
  if (b.final_score !== a.final_score) {
    return b.final_score - a.final_score;
  }

  return compareSnapshotScoreReachedAt(a, b);
}

function compareOverallRows(a, b) {
  if (b.final_score !== a.final_score) {
    return b.final_score - a.final_score;
  }

  if ((b.world_raw_count || 0) !== (a.world_raw_count || 0)) {
    return (b.world_raw_count || 0) - (a.world_raw_count || 0);
  }

  return compareSnapshotScoreReachedAt(a, b);
}

function createEntryId() {
  return `entry_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function normalizeEntryContent(content = {}, standardItem = {}) {
  return {
    title: content.title || '',
    description: content.description || '',
    attachments: Array.isArray(content.attachments) ? content.attachments : [],
    visit_time: content.visit_time || '',
    city_name: content.city_name || content.location_name || standardItem.name_zh || '',
    location_name: content.location_name || standardItem.name_zh || '',
    weather: content.weather || '',
    mood: content.mood || '',
    is_complete: Boolean(content.is_complete),
  };
}

function buildEntryRecord(content = {}, standardItem = {}, existingEntry = null) {
  const normalizedContent = normalizeEntryContent(content, standardItem);
  return {
    entry_id: existingEntry?.entry_id || existingEntry?._id || createEntryId(),
    ...normalizedContent,
    created_at: existingEntry?.created_at || db.serverDate(),
    updated_at: db.serverDate(),
  };
}

function getCheckinEntries(checkin) {
  const safeCheckin = checkin || {};
  const contents = Array.isArray(safeCheckin.contents) ? safeCheckin.contents : [];
  return contents;
}

function buildEntryView(checkin, entry = {}) {
  const safeCheckin = checkin || {};
  return {
    ...safeCheckin,
    _id: entry.entry_id || safeCheckin._id,
    parent_checkin_id: safeCheckin._id,
    checked_in_at: entry.created_at || safeCheckin.checked_in_at,
    created_at: entry.created_at || safeCheckin.created_at,
    updated_at: entry.updated_at || safeCheckin.updated_at,
    content: {
      title: entry.title || '',
      description: entry.description || '',
      attachments: Array.isArray(entry.attachments) ? entry.attachments : [],
      visit_time: entry.visit_time || '',
      city_name: entry.city_name || '',
      location_name: entry.location_name || '',
      weather: entry.weather || '',
      mood: entry.mood || '',
      is_complete: Boolean(entry.is_complete),
    },
  };
}

async function enrichSnapshotsWithUserProfile(rows = []) {
  if (!Array.isArray(rows) || !rows.length) {
    return [];
  }

  const userIds = Array.from(new Set(rows.map((row) => row.user_id).filter(Boolean)));
  if (!userIds.length) {
    return rows;
  }

  const { data: users } = await usersCollection
    .where({
      _id: _.in(userIds),
    })
    .limit(Math.min(userIds.length, 100))
    .get();

  const userMap = new Map(
    (users || []).map((user) => [
      user._id,
      {
        full_name: user.full_name || '',
        username: user.username || '',
        avatar_url: user.profile?.avatar_url || '',
      },
    ])
  );

  return rows.map((row) => {
    const userProfile = userMap.get(row.user_id) || {};
    return {
      ...row,
      full_name: userProfile.full_name || row.full_name || '',
      username: userProfile.username || row.username || '',
      avatar_url: userProfile.avatar_url || row.avatar_url || '',
    };
  });
}

function createAggregateEntry(userId) {
  return {
    user_id: userId,
    item_ids: new Set(),
    continents: new Set(),
    china_regions: new Set(),
    activity_groups: new Set(),
    world_tier_counts: {
      A: 0,
      B: 0,
      C: 0,
    },
    interaction_raw_score: 0,
  };
}

function buildSnapshotMetrics(code, aggregateEntry) {
  const rawCount = aggregateEntry.item_ids.size;
  const influenceRawScore = aggregateEntry.interaction_raw_score;
  const influenceScore = roundScore(Math.log(1 + influenceRawScore) * 10);

  if (code === 'world_travel') {
    const achievementScore = roundScore(
      rawCount * 4 +
        aggregateEntry.continents.size * 5 +
        aggregateEntry.world_tier_counts.A * 0.2 +
        aggregateEntry.world_tier_counts.B * 0.4 +
        aggregateEntry.world_tier_counts.C * 0.8
    );

    return {
      raw_count: rawCount,
      achievement_score: achievementScore,
      influence_score: influenceScore,
      final_score: roundScore(achievementScore * 0.7 + influenceScore * 0.3),
    };
  }

  if (code === 'china_travel') {
    const achievementScore = roundScore(rawCount * 2 + aggregateEntry.china_regions.size * 5);

    return {
      raw_count: rawCount,
      achievement_score: achievementScore,
      influence_score: influenceScore,
      final_score: roundScore(achievementScore * 0.7 + influenceScore * 0.3),
    };
  }

  if (code === 'activity') {
    const achievementScore = roundScore(rawCount * 2 + aggregateEntry.activity_groups.size * 4);

    return {
      raw_count: rawCount,
      achievement_score: achievementScore,
      influence_score: influenceScore,
      final_score: roundScore(achievementScore * 0.7 + influenceScore * 0.3),
    };
  }

  return {
    raw_count: rawCount,
    achievement_score: 0,
    influence_score: influenceScore,
    final_score: influenceScore,
  };
}

async function refreshOverallSnapshots() {
  const subCodes = ['world_travel', 'china_travel', 'activity'];
  const { data: subSnapshots } = await snapshotsCollection
    .where({
      leaderboard_code: _.in(subCodes),
    })
    .limit(5000)
    .get();

  const aggregateMap = new Map();

  for (const snapshot of subSnapshots || []) {
    const userId = snapshot.user_id;
    if (!userId) {
      continue;
    }

    const current = aggregateMap.get(userId) || {
      user_id: userId,
      raw_count: 0,
      world_final_score: 0,
      world_raw_count: 0,
      china_final_score: 0,
      activity_final_score: 0,
    };

    current.raw_count += snapshot.raw_count || 0;

    if (snapshot.leaderboard_code === 'world_travel') {
      current.world_final_score = snapshot.final_score || 0;
      current.world_raw_count = snapshot.raw_count || 0;
    }

    if (snapshot.leaderboard_code === 'china_travel') {
      current.china_final_score = snapshot.final_score || 0;
    }

    if (snapshot.leaderboard_code === 'activity') {
      current.activity_final_score = snapshot.final_score || 0;
    }

    aggregateMap.set(userId, current);
  }

  const { data: existingSnapshots } = await snapshotsCollection
    .where({
      leaderboard_code: _.in(getLeaderboardCodeCandidates('overall')),
    })
    .limit(5000)
    .get();

  const existingMap = new Map((existingSnapshots || []).map((item) => [`${item.user_id}_${item.leaderboard_code}`, item]));
  const nextKeySet = new Set();
  const rows = Array.from(aggregateMap.values())
    .map((entry) => {
      const finalScore = roundScore(
        entry.world_final_score * 0.7 + entry.china_final_score * 0.2 + entry.activity_final_score * 0.1
      );
      const existingSnapshot = existingMap.get(`${entry.user_id}_overall`);

      return {
        user_id: entry.user_id,
        leaderboard_code: 'overall',
        raw_count: entry.raw_count,
        world_raw_count: entry.world_raw_count,
        achievement_score: finalScore,
        influence_score: 0,
        final_score: finalScore,
        score_updated_at: resolveScoreUpdatedAt(existingSnapshot, finalScore),
      };
    })
    .sort(compareOverallRows)
    .map((entry, index, array) => ({
      ...entry,
      rank: index + 1,
      percentile:
        array.length <= 1
          ? 100
          : Math.max(0, Math.round(((array.length - (index + 1)) / (array.length - 1)) * 100)),
      tags: buildSnapshotTags('overall', entry.raw_count),
      updated_at: db.serverDate(),
    }));

  for (const row of rows) {
    const snapshotKey = `${row.user_id}_${row.leaderboard_code}`;
    nextKeySet.add(snapshotKey);
    const existingSnapshot = existingMap.get(snapshotKey);

    if (existingSnapshot?._id) {
      await snapshotsCollection.doc(existingSnapshot._id).update({
        raw_count: row.raw_count,
        achievement_score: row.achievement_score,
        influence_score: row.influence_score,
        final_score: row.final_score,
        world_raw_count: row.world_raw_count,
        rank: row.rank,
        percentile: row.percentile,
        tags: row.tags,
        score_updated_at: row.score_updated_at,
        updated_at: db.serverDate(),
      });
    } else {
      await snapshotsCollection.add({
        ...row,
        created_at: db.serverDate(),
      });
    }
  }

  for (const snapshot of existingSnapshots || []) {
    const snapshotKey = `${snapshot.user_id}_${snapshot.leaderboard_code}`;
    if (!nextKeySet.has(snapshotKey) && snapshot._id) {
      await snapshotsCollection.doc(snapshot._id).remove();
    }
  }
}

async function refreshLeaderboardSnapshots(code) {
  if (!code) {
    return;
  }

  const normalizedCode = normalizeLeaderboardCode(code);
  const codeCandidates = getLeaderboardCodeCandidates(normalizedCode);
  const [{ data: checkins }, { data: standardItems }] = await Promise.all([
    checkinsCollection
      .where({
        leaderboard_code: _.in(codeCandidates),
        is_active: true,
      })
      .limit(5000)
      .get(),
    standardItemsCollection
      .where({
        leaderboard_code: _.in(codeCandidates),
        is_active: true,
      })
      .limit(5000)
      .get(),
  ]);

  const aggregateMap = new Map();
  const standardItemMap = new Map((standardItems || []).map((item) => [item._id, item]));

  for (const checkin of checkins || []) {
    const userId = checkin.user_id;
    if (!userId) {
      continue;
    }

    const current = aggregateMap.get(userId) || createAggregateEntry(userId);
    current.interaction_raw_score += getInteractionRawScore(checkin.interaction);

    if (current.item_ids.has(checkin.item_id)) {
      continue;
    }

    current.item_ids.add(checkin.item_id);

    const standardItem = standardItemMap.get(checkin.item_id);
    if (normalizedCode === 'world_travel') {
      const continent = standardItem?.continent || standardItem?.category;
      const tier = standardItem?.tier;
      if (continent) {
        current.continents.add(continent);
      }
      if (tier && current.world_tier_counts[tier] !== undefined) {
        current.world_tier_counts[tier] += 1;
      }
    }

    if (normalizedCode === 'china_travel') {
      const regionGroup = standardItem?.region_group || standardItem?.category;
      if (regionGroup) {
        current.china_regions.add(regionGroup);
      }
    }

    if (normalizedCode === 'activity') {
      const activityGroup = standardItem?.activity_group || standardItem?.category;
      if (activityGroup) {
        current.activity_groups.add(activityGroup);
      }
    }

    aggregateMap.set(userId, current);
  }

  const { data: existingSnapshots } = await snapshotsCollection
    .where({
      leaderboard_code: _.in(codeCandidates),
    })
    .limit(5000)
    .get();

  const existingMap = new Map((existingSnapshots || []).map((item) => [`${item.user_id}_${item.leaderboard_code}`, item]));
  const nextKeySet = new Set();
  const rows = Array.from(aggregateMap.values())
    .map((entry) => {
      const metrics = buildSnapshotMetrics(normalizedCode, entry);
      const existingSnapshot = existingMap.get(`${entry.user_id}_${normalizedCode}`);

      return {
        user_id: entry.user_id,
        leaderboard_code: normalizedCode,
        ...metrics,
        score_updated_at: resolveScoreUpdatedAt(existingSnapshot, metrics.final_score),
      };
    })
    .sort(compareLeaderboardRows)
    .map((entry, index, array) => ({
      ...entry,
      rank: index + 1,
      percentile:
        array.length <= 1
          ? 100
          : Math.max(0, Math.round(((array.length - (index + 1)) / (array.length - 1)) * 100)),
      tags: buildSnapshotTags(normalizedCode, entry.raw_count),
      updated_at: db.serverDate(),
    }));

  for (const row of rows) {
    const snapshotKey = `${row.user_id}_${row.leaderboard_code}`;
    nextKeySet.add(snapshotKey);
    const existingSnapshot = existingMap.get(snapshotKey);

    if (existingSnapshot?._id) {
      await snapshotsCollection.doc(existingSnapshot._id).update({
        raw_count: row.raw_count,
        achievement_score: row.achievement_score,
        influence_score: row.influence_score,
        final_score: row.final_score,
        rank: row.rank,
        percentile: row.percentile,
        tags: row.tags,
        score_updated_at: row.score_updated_at,
        updated_at: db.serverDate(),
      });
    } else {
      await snapshotsCollection.add({
        ...row,
        created_at: db.serverDate(),
      });
    }
  }

  for (const snapshot of existingSnapshots || []) {
    const snapshotKey = `${snapshot.user_id}_${snapshot.leaderboard_code}`;
    if (!nextKeySet.has(snapshotKey) && snapshot._id) {
      await snapshotsCollection.doc(snapshot._id).remove();
    }
  }

  if (normalizedCode !== 'overall') {
    await refreshOverallSnapshots();
  }
}

async function hasActiveCheckins(code, userId) {
  const normalizedCode = normalizeLeaderboardCode(code);
  const codeCandidates = getLeaderboardCodeCandidates(normalizedCode);
  if (!normalizedCode) {
    return false;
  }

  const wherePayload = {
    leaderboard_code: _.in(codeCandidates),
    is_active: true,
  };

  if (userId) {
    wherePayload.user_id = userId;
  }

  const result = await checkinsCollection.where(wherePayload).limit(1).get();
  return Array.isArray(result.data) && result.data.length > 0;
}

/**
 * 获取标准项列表
 */
const getStandardItems = async (data = {}) => {
  const { code } = data;
  const normalizedCode = normalizeLeaderboardCode(code);
  const codeCandidates = getLeaderboardCodeCandidates(normalizedCode);
  if (!normalizedCode) return fail('缺少 leaderboard_code');

  try {
    const { data: items } = await db
      .collection('chart_standard_items')
      .where({
        leaderboard_code: _.in(codeCandidates),
        is_active: true,
      })
      .orderBy('sort_order', 'asc')
      .limit(1000)
      .get();

    return ok(items);
  } catch (error) {
    return fail('获取标准项失败', error);
  }
};

/**
 * 获取用户打卡记录
 */
const getUserCheckins = async (data = {}) => {
  const { userId, code } = data;
  const normalizedCode = normalizeLeaderboardCode(code);
  const codeCandidates = getLeaderboardCodeCandidates(normalizedCode);
  if (!userId || !normalizedCode) return fail('缺少参数');

  try {
    const { data: checkins } = await checkinsCollection
      .where({
        user_id: userId,
        leaderboard_code: _.in(codeCandidates),
        is_active: true,
      })
      .orderBy('checked_in_at', 'desc')
      .limit(1000)
      .get();

    return ok(checkins);
  } catch (error) {
    return fail('获取用户打卡记录失败', error);
  }
};

const getItemCheckinEntries = async (data = {}) => {
  const { userId, code, itemId } = data;
  const normalizedCode = normalizeLeaderboardCode(code);
  const codeCandidates = getLeaderboardCodeCandidates(normalizedCode);
  if (!userId || !normalizedCode || !itemId) return fail('缺少参数');

  try {
    const { data: checkins } = await checkinsCollection
      .where({
        user_id: userId,
        leaderboard_code: _.in(codeCandidates),
        item_id: itemId,
        is_active: true,
      })
      .orderBy('checked_in_at', 'desc')
      .limit(1000)
      .get();

    const entries = (checkins || [])
      .flatMap((checkin) => getCheckinEntries(checkin).map((entry) => buildEntryView(checkin, entry)))
      .sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());

    return ok(entries);
  } catch (error) {
    return fail('获取标准项录入记录失败', error);
  }
};

/**
 * 切换打卡状态
 */
const toggleCheckin = async (data = {}) => {
  const { userId, item, itemId, code, isChecked } = data;
  if (!userId || isChecked === undefined || (!item && !itemId)) {
    return fail('缺少参数');
  }

  try {
    const standardItem = item || (await getStandardItemById(itemId));
    if (!standardItem) {
      return fail('标准项不存在');
    }

    const leaderboardCode = normalizeLeaderboardCode(standardItem.leaderboard_code || code);
    const currentItemId = standardItem._id || itemId;
    const existingCheckin = await findCheckin(userId, leaderboardCode, currentItemId);

    if (isChecked) {
      const nextPayload = {
        user_id: userId,
        leaderboard_code: leaderboardCode,
        item_id: currentItemId,
        item_type: standardItem.item_type || standardItem.type || '',
        is_active: true,
        source_type: 'realtime_add',
        checked_in_at: db.serverDate(),
        interaction: existingCheckin?.interaction || {
          likes_count: 0,
          comments_count: 0,
          favorites_count: 0,
        },
        updated_at: db.serverDate(),
      };

      if (existingCheckin?._id) {
        await checkinsCollection.doc(existingCheckin._id).update(nextPayload);
      } else {
        await checkinsCollection.add({
          ...nextPayload,
          created_at: db.serverDate(),
        });
      }
    } else {
      if (existingCheckin?._id) {
        await checkinsCollection.doc(existingCheckin._id).remove();
      }
    }

    await refreshLeaderboardSnapshots(leaderboardCode);

    return ok(true);

  } catch (error) {
    return fail('切换打卡状态失败', error);
  }
};

/**
 * 批量打卡
 */
const batchCheckin = async (data = {}) => {
  const { userId, code, itemIds } = data;
  const normalizedCode = normalizeLeaderboardCode(code);
  if (!userId || !normalizedCode || !itemIds || !Array.isArray(itemIds)) {
    return fail('缺少参数');
  }

  try {
    const timestamp = db.serverDate();
    for (const itemId of itemIds) {
      const standardItem = await getStandardItemById(itemId);
      const existingCheckin = await findCheckin(userId, normalizedCode, itemId);
      const nextPayload = {
        user_id: userId,
        leaderboard_code: normalizedCode,
        item_id: itemId,
        item_type: standardItem ? standardItem.item_type || standardItem.type || '' : '',
        is_active: true,
        source_type: 'history_backfill',
        checked_in_at: timestamp,
        interaction: existingCheckin?.interaction || {
          likes_count: 0,
          comments_count: 0,
          favorites_count: 0,
        },
        updated_at: timestamp,
      };

      if (existingCheckin?._id) {
        await checkinsCollection.doc(existingCheckin._id).update(nextPayload);
      } else {
        await checkinsCollection.add({
          ...nextPayload,
          created_at: timestamp,
        });
      }
    }

    await refreshLeaderboardSnapshots(normalizedCode);

    return ok(true);
  } catch (error) {
    return fail('批量打卡失败', error);
  }
};

const saveCheckinEntry = async (data = {}) => {
  const { userId, item, itemId, code, entryId, content = {} } = data;
  if (!userId || (!item && !itemId)) {
    return fail('缺少参数');
  }

  try {
    const standardItem = item || (await getStandardItemById(itemId));
    if (!standardItem) {
      return fail('标准项不存在');
    }

    const leaderboardCode = normalizeLeaderboardCode(standardItem.leaderboard_code || code);
    const currentItemId = standardItem._id || itemId;
    const anchorCheckin = await findCheckin(userId, leaderboardCode, currentItemId);
    const existingEntries = getCheckinEntries(anchorCheckin);
    const existingEntry = entryId
      ? existingEntries.find((currentEntry) => currentEntry.entry_id === entryId) || null
      : null;
    const nextEntry = buildEntryRecord(content, standardItem, existingEntry);
    const nextEntries = existingEntry
      ? existingEntries.map((currentEntry) =>
          currentEntry.entry_id === nextEntry.entry_id ? { ...currentEntry, ...nextEntry } : currentEntry
        )
      : [nextEntry, ...existingEntries];
    const nextPayload = {
      user_id: userId,
      leaderboard_code: leaderboardCode,
      item_id: currentItemId,
      item_type: standardItem.item_type || standardItem.type || '',
      is_active: true,
      source_type: anchorCheckin?.source_type || 'realtime',
      checked_in_at: anchorCheckin?.checked_in_at || db.serverDate(),
      contents: nextEntries,
      interaction: anchorCheckin?.interaction || {
        likes_count: 0,
        comments_count: 0,
        favorites_count: 0,
      },
      updated_at: db.serverDate(),
    };

    let savedCheckinId = anchorCheckin?._id;

    if (anchorCheckin?._id) {
      await checkinsCollection.doc(anchorCheckin._id).update(nextPayload);
      savedCheckinId = anchorCheckin._id;
    } else {
      const createResult = await checkinsCollection.add({
        ...nextPayload,
        created_at: db.serverDate(),
      });
      savedCheckinId = createResult.id || createResult._id;
    }

    await refreshLeaderboardSnapshots(leaderboardCode);

    const savedCheckin = await findCheckinEntryById(savedCheckinId);
    const savedEntries = getCheckinEntries(savedCheckin);
    const savedEntry = savedEntries.find((currentEntry) => currentEntry.entry_id === nextEntry.entry_id) || nextEntry;
    return ok(buildEntryView(savedCheckin, savedEntry));
  } catch (error) {
    return fail('保存录入记录失败', error);
  }
};

/**
 * 获取我的榜单位置
 */
const getMyRank = async (data = {}) => {
  const { userId, code } = data;
  const normalizedCode = normalizeLeaderboardCode(code);
  const codeCandidates = getLeaderboardCodeCandidates(normalizedCode);
  if (!userId || !normalizedCode) {
    return fail('缺少参数');
  }

  try {
    const queryLatestSnapshot = () =>
      snapshotsCollection
        .where({
          user_id: userId,
          leaderboard_code: _.in(codeCandidates),
        })
        .orderBy('updated_at', 'desc')
        .limit(1)
        .get();

    let { data: rows } = await queryLatestSnapshot();

    if ((!rows || rows.length === 0) && (await hasActiveCheckins(normalizedCode, userId))) {
      await refreshLeaderboardSnapshots(normalizedCode);
      ({ data: rows } = await queryLatestSnapshot());
    }

    return ok(rows[0] || null);
  } catch (error) {
    return fail('获取用户榜单位置失败', error);
  }
};

/**
 * 获取榜单排名
 */
const getLeaderboardRankings = async (data = {}) => {
  const { code, page = 1, pageSize = 20 } = data;
  const normalizedCode = normalizeLeaderboardCode(code);
  const codeCandidates = getLeaderboardCodeCandidates(normalizedCode);
  if (!normalizedCode) {
    return fail('缺少 leaderboard_code');
  }

  try {
    const size = Math.min(Number(pageSize) || 20, 100);
    const currentPage = Math.max(Number(page) || 1, 1);
    const skip = (currentPage - 1) * size;

    const queryRankings = () =>
      snapshotsCollection
        .where({
          leaderboard_code: _.in(codeCandidates),
        })
        .limit(5000)
        .get();

    let { data: rows } = await queryRankings();

    if ((!rows || rows.length === 0) && (await hasActiveCheckins(normalizedCode))) {
      await refreshLeaderboardSnapshots(normalizedCode);
      ({ data: rows } = await queryRankings());
    }

    const sortedRows = (rows || [])
      .slice()
      .sort(normalizedCode === 'overall' ? compareOverallRows : compareLeaderboardRows)
      .slice(skip, skip + size);
    const enrichedRows = await enrichSnapshotsWithUserProfile(sortedRows);
    return ok(enrichedRows);
  } catch (error) {
    return fail('获取榜单排名失败', error);
  }
};

const getUploadCredentials = async () => {
  try {
    const secretId = getEnvValue(['COS_SECRET_ID', 'TCB_SECRET_ID', 'CLOUDBASE_SECRET_ID']);
    const secretKey = getEnvValue(['COS_SECRET_KEY', 'TCB_SECRET_KEY', 'CLOUDBASE_SECRET_KEY']);

    if (!secretId || !secretKey) {
      return fail('COS 密钥未配置，请先在云函数环境变量中配置 COS_SECRET_ID 和 COS_SECRET_KEY');
    }

    const bucket = getEnvValue(['COS_BUCKET'], DEFAULT_COS_BUCKET);
    const region = getEnvValue(['COS_REGION'], DEFAULT_COS_REGION);
    const publicDomain = getEnvValue(['COS_PUBLIC_DOMAIN'], DEFAULT_COS_PUBLIC_DOMAIN);
    const allowPrefixes = ['checkins/*', 'avatars/*'];
    const allowActions = [
      'name/cos:PutObject',
      'name/cos:PostObject',
      'name/cos:InitiateMultipartUpload',
      'name/cos:ListMultipartUploads',
      'name/cos:ListParts',
      'name/cos:UploadPart',
      'name/cos:CompleteMultipartUpload',
      'name/cos:AbortMultipartUpload',
    ];

    const policy = STS.getPolicy(
      allowPrefixes.flatMap((prefix) =>
        allowActions.map((action) => ({
          action,
          bucket,
          region,
          prefix,
        }))
      )
    );

    const result = await STS.getCredential({
      secretId,
      secretKey,
      durationSeconds: 1800,
      policy,
    });

    return ok({
      tmpSecretId: result.credentials.tmpSecretId,
      tmpSecretKey: result.credentials.tmpSecretKey,
      sessionToken: result.credentials.sessionToken,
      expiredTime: result.expiredTime,
      startTime: result.startTime,
      bucket,
      region,
      publicDomain,
    });
  } catch (error) {
    return fail('获取上传凭证失败', error);
  }
};

const actionMap = {
  getStandardItems,
  getUserCheckins,
  getItemCheckinEntries,
  toggleCheckin,
  batchCheckin,
  saveCheckinEntry,
  getMyRank,
  getLeaderboardRankings,
  getUploadCredentials,
};

function normalizeEventPayload(event = {}) {
  if (!event || typeof event !== 'object') {
    return {
      action: undefined,
      data: {},
    };
  }

  if (typeof event.action === 'string') {
    return {
      action: event.action,
      data: event.data || {},
    };
  }

  if (event.data && typeof event.data === 'object' && typeof event.data.action === 'string') {
    return {
      action: event.data.action,
      data: event.data.data || {},
    };
  }

  return {
    action: undefined,
    data: event.data || {},
  };
}

exports.main = async (event = {}) => {
  const { action, data } = normalizeEventPayload(event);
  const handler = actionMap[action];

  if (!handler) {
    return fail(`未知操作: ${action}`);
  }

  return handler(data || {});
};
