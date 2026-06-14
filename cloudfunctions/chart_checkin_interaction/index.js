const cloud = require('@cloudbase/node-sdk');

const app = cloud.init({
  env: cloud.SYMBOL_CURRENT_ENV,
});

const db = app.database();
const _ = db.command;
const checkinsCollection = db.collection('chart_checkins');
const standardItemsCollection = db.collection('chart_standard_items');
const snapshotsCollection = db.collection('chart_score_snapshots');
const usersCollection = db.collection('chart_users');

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

async function findCheckinById(checkinId) {
  if (!checkinId) {
    return null;
  }

  const result = await checkinsCollection.doc(checkinId).get();
  return getDocData(result);
}

async function getUserSnapshot(userId) {
  if (!userId) {
    return {
      user_id: '',
      full_name: '',
      username: '',
      avatar_url: '',
    };
  }

  const user = await usersCollection.doc(userId).get().then(getDocData).catch(() => null);

  return {
    user_id: userId,
    full_name: user?.full_name || '',
    username: user?.username || '',
    avatar_url: user?.profile?.avatar_url || '',
  };
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

function createEmptyInteraction() {
  return {
    likes_count: 0,
    comments_count: 0,
    favorites_count: 0,
    liked_user_ids: [],
    favorited_user_ids: [],
  };
}

function createEntryId() {
  return `entry_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function createCommentId() {
  return `comment_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function normalizeStoredInteraction(interaction = {}, fallbackInteraction = null) {
  const base = fallbackInteraction || createEmptyInteraction();
  const likedUserIds = Array.from(new Set((interaction.liked_user_ids || base.liked_user_ids || []).filter(Boolean)));
  const favoritedUserIds = Array.from(
    new Set((interaction.favorited_user_ids || base.favorited_user_ids || []).filter(Boolean))
  );

  return {
    likes_count: Math.max(Number(interaction.likes_count ?? base.likes_count ?? 0) || 0, 0),
    comments_count: Math.max(Number(interaction.comments_count ?? base.comments_count ?? 0) || 0, 0),
    favorites_count: Math.max(Number(interaction.favorites_count ?? base.favorites_count ?? 0) || 0, 0),
    liked_user_ids: likedUserIds,
    favorited_user_ids: favoritedUserIds,
  };
}

function normalizeCommentAuthor(author = {}) {
  return {
    user_id: author.user_id || '',
    full_name: author.full_name || '',
    username: author.username || '',
    avatar_url: author.avatar_url || '',
  };
}

function normalizeStoredComment(comment = {}) {
  return {
    comment_id: comment.comment_id || createCommentId(),
    parent_comment_id: comment.parent_comment_id || '',
    content: String(comment.content || '').trim(),
    created_at: comment.created_at || db.serverDate(),
    updated_at: comment.updated_at || db.serverDate(),
    author: normalizeCommentAuthor(comment.author),
    replies: Array.isArray(comment.replies) ? comment.replies.map(normalizeStoredComment) : [],
  };
}

function normalizeStoredComments(comments = []) {
  return Array.isArray(comments) ? comments.map(normalizeStoredComment) : [];
}

function countComments(comments = []) {
  return (comments || []).reduce(
    (total, comment) => total + 1 + countComments(Array.isArray(comment.replies) ? comment.replies : []),
    0
  );
}

function getCheckinEntries(checkin) {
  const safeCheckin = checkin || {};
  return Array.isArray(safeCheckin.contents) ? safeCheckin.contents : [];
}

function getEntryFallbackInteraction(checkin, existingEntries = [], existingEntry = null) {
  if (existingEntry?.interaction) {
    return existingEntry.interaction;
  }

  if (existingEntries.length <= 1 && checkin?.interaction) {
    return checkin.interaction;
  }

  return null;
}

function summarizeCheckinInteraction(entries = [], fallbackInteraction = null) {
  if (!Array.isArray(entries) || !entries.length) {
    return normalizeStoredInteraction(fallbackInteraction);
  }

  return entries.reduce(
    (summary, entry) => {
      const entryInteraction = normalizeStoredInteraction(entry.interaction);
      const commentCount = countComments(entry.comments || []);

      summary.likes_count += entryInteraction.likes_count;
      summary.favorites_count += entryInteraction.favorites_count;
      summary.comments_count += commentCount || entryInteraction.comments_count || 0;

      return summary;
    },
    {
      likes_count: 0,
      comments_count: 0,
      favorites_count: 0,
    }
  );
}

function buildEntryView(checkin, entry = {}, viewerUserId = '') {
  const safeCheckin = checkin || {};
  const safeEntries = getCheckinEntries(safeCheckin);
  const fallbackInteraction = getEntryFallbackInteraction(safeCheckin, safeEntries, entry);
  const storedInteraction = normalizeStoredInteraction(entry.interaction, fallbackInteraction);
  const comments = normalizeStoredComments(entry.comments || []);
  const commentCount = countComments(comments);
  const interaction = {
    likes_count: storedInteraction.likes_count,
    comments_count: commentCount || storedInteraction.comments_count || 0,
    favorites_count: storedInteraction.favorites_count,
    viewer_has_liked: Boolean(viewerUserId && storedInteraction.liked_user_ids.includes(viewerUserId)),
    viewer_has_favorited: Boolean(viewerUserId && storedInteraction.favorited_user_ids.includes(viewerUserId)),
  };

  return {
    ...safeCheckin,
    _id: entry.entry_id || safeCheckin._id,
    parent_checkin_id: safeCheckin._id,
    checked_in_at: entry.created_at || safeCheckin.checked_in_at,
    created_at: entry.created_at || safeCheckin.created_at,
    updated_at: entry.updated_at || safeCheckin.updated_at,
    interaction,
    comments,
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
      interaction,
      comments,
    },
  };
}

async function refreshLeaderboardSnapshots(code) {
  const normalizedCode = normalizeLeaderboardCode(code);
  const codeCandidates = getLeaderboardCodeCandidates(normalizedCode);
  if (!normalizedCode) {
    return;
  }

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
    current.interaction_raw_score += getInteractionRawScore(
      summarizeCheckinInteraction(getCheckinEntries(checkin), checkin.interaction)
    );

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

async function getEntryDetail(data = {}) {
  const { ownerUserId, viewerUserId = '', code, itemId, entryId } = data;
  const normalizedCode = normalizeLeaderboardCode(code);
  if (!ownerUserId || !viewerUserId || !normalizedCode || !itemId || !entryId) {
    return fail('缺少参数');
  }

  try {
    const checkin = await findCheckin(ownerUserId, normalizedCode, itemId);
    if (!checkin) {
      return fail('日记不存在');
    }

    const entry = getCheckinEntries(checkin).find((currentEntry) => currentEntry.entry_id === entryId);
    if (!entry) {
      return fail('日记不存在');
    }

    return ok(buildEntryView(checkin, entry, viewerUserId));
  } catch (error) {
    return fail('获取日记详情失败', error);
  }
}

async function toggleReaction(data = {}, reactionType) {
  const { userId, ownerUserId, code, itemId, entryId } = data;
  const normalizedCode = normalizeLeaderboardCode(code);
  const targetOwnerId = ownerUserId || userId;
  if (!userId || !targetOwnerId || !normalizedCode || !itemId || !entryId) {
    return fail('缺少参数');
  }

  try {
    const checkin = await findCheckin(targetOwnerId, normalizedCode, itemId);
    if (!checkin?._id) {
      return fail('日记不存在');
    }

    const entries = getCheckinEntries(checkin);
    const entryIndex = entries.findIndex((currentEntry) => currentEntry.entry_id === entryId);
    if (entryIndex < 0) {
      return fail('日记不存在');
    }

    const entry = entries[entryIndex];
    const fallbackInteraction = getEntryFallbackInteraction(checkin, entries, entry);
    const normalizedInteraction = normalizeStoredInteraction(entry.interaction, fallbackInteraction);
    const userIdsKey = reactionType === 'like' ? 'liked_user_ids' : 'favorited_user_ids';
    const countKey = reactionType === 'like' ? 'likes_count' : 'favorites_count';
    const currentUserIds = Array.isArray(normalizedInteraction[userIdsKey]) ? normalizedInteraction[userIdsKey] : [];
    const hasReacted = currentUserIds.includes(userId);
    const nextUserIds = hasReacted
      ? currentUserIds.filter((currentUserId) => currentUserId !== userId)
      : [...currentUserIds, userId];
    const nextInteraction = {
      ...normalizedInteraction,
      [userIdsKey]: nextUserIds,
      [countKey]: Math.max(Number(normalizedInteraction[countKey] || 0) + (hasReacted ? -1 : 1), 0),
    };
    const nextEntries = entries.map((currentEntry, index) =>
      index === entryIndex
        ? {
            ...currentEntry,
            interaction: nextInteraction,
            updated_at: db.serverDate(),
          }
        : currentEntry
    );

    await checkinsCollection.doc(checkin._id).update({
      contents: nextEntries,
      interaction: summarizeCheckinInteraction(nextEntries, checkin.interaction),
      updated_at: db.serverDate(),
    });
    await refreshLeaderboardSnapshots(normalizedCode);

    const savedCheckin = await findCheckinById(checkin._id);
    const savedEntry = getCheckinEntries(savedCheckin).find((currentEntry) => currentEntry.entry_id === entryId) || entry;
    return ok(buildEntryView(savedCheckin, savedEntry, userId));
  } catch (error) {
    return fail(reactionType === 'like' ? '点赞操作失败' : '收藏操作失败', error);
  }
}

async function addComment(data = {}) {
  const { userId, ownerUserId, code, itemId, entryId, content } = data;
  const normalizedCode = normalizeLeaderboardCode(code);
  const targetOwnerId = ownerUserId || userId;
  const trimmedContent = String(content || '').trim();
  if (!userId || !targetOwnerId || !normalizedCode || !itemId || !entryId || !trimmedContent) {
    return fail('缺少参数');
  }

  try {
    const checkin = await findCheckin(targetOwnerId, normalizedCode, itemId);
    if (!checkin?._id) {
      return fail('日记不存在');
    }

    const entries = getCheckinEntries(checkin);
    const entryIndex = entries.findIndex((currentEntry) => currentEntry.entry_id === entryId);
    if (entryIndex < 0) {
      return fail('日记不存在');
    }

    const entry = entries[entryIndex];
    const author = await getUserSnapshot(userId);
    const nextComments = [
      {
        comment_id: createCommentId(),
        parent_comment_id: '',
        content: trimmedContent,
        author,
        replies: [],
        created_at: db.serverDate(),
        updated_at: db.serverDate(),
      },
      ...normalizeStoredComments(entry.comments || []),
    ];
    const fallbackInteraction = getEntryFallbackInteraction(checkin, entries, entry);
    const nextInteraction = normalizeStoredInteraction(entry.interaction, fallbackInteraction);
    nextInteraction.comments_count = countComments(nextComments);

    const nextEntries = entries.map((currentEntry, index) =>
      index === entryIndex
        ? {
            ...currentEntry,
            comments: nextComments,
            interaction: nextInteraction,
            updated_at: db.serverDate(),
          }
        : currentEntry
    );

    await checkinsCollection.doc(checkin._id).update({
      contents: nextEntries,
      interaction: summarizeCheckinInteraction(nextEntries, checkin.interaction),
      updated_at: db.serverDate(),
    });
    await refreshLeaderboardSnapshots(normalizedCode);

    const savedCheckin = await findCheckinById(checkin._id);
    const savedEntry = getCheckinEntries(savedCheckin).find((currentEntry) => currentEntry.entry_id === entryId) || entry;
    return ok(buildEntryView(savedCheckin, savedEntry, userId));
  } catch (error) {
    return fail('发表评论失败', error);
  }
}

async function replyComment(data = {}) {
  const { userId, ownerUserId, code, itemId, entryId, commentId, content } = data;
  const normalizedCode = normalizeLeaderboardCode(code);
  const targetOwnerId = ownerUserId || userId;
  const trimmedContent = String(content || '').trim();
  if (!userId || !targetOwnerId || !normalizedCode || !itemId || !entryId || !commentId || !trimmedContent) {
    return fail('缺少参数');
  }

  try {
    const checkin = await findCheckin(targetOwnerId, normalizedCode, itemId);
    if (!checkin?._id) {
      return fail('日记不存在');
    }

    const entries = getCheckinEntries(checkin);
    const entryIndex = entries.findIndex((currentEntry) => currentEntry.entry_id === entryId);
    if (entryIndex < 0) {
      return fail('日记不存在');
    }

    const entry = entries[entryIndex];
    const author = await getUserSnapshot(userId);
    let foundComment = false;
    const nextComments = normalizeStoredComments(entry.comments || []).map((comment) => {
      if (comment.comment_id !== commentId) {
        return comment;
      }

      foundComment = true;
      return {
        ...comment,
        replies: [
          ...(comment.replies || []),
          {
            comment_id: createCommentId(),
            parent_comment_id: commentId,
            content: trimmedContent,
            author,
            replies: [],
            created_at: db.serverDate(),
            updated_at: db.serverDate(),
          },
        ],
        updated_at: db.serverDate(),
      };
    });

    if (!foundComment) {
      return fail('评论不存在');
    }

    const fallbackInteraction = getEntryFallbackInteraction(checkin, entries, entry);
    const nextInteraction = normalizeStoredInteraction(entry.interaction, fallbackInteraction);
    nextInteraction.comments_count = countComments(nextComments);
    const nextEntries = entries.map((currentEntry, index) =>
      index === entryIndex
        ? {
            ...currentEntry,
            comments: nextComments,
            interaction: nextInteraction,
            updated_at: db.serverDate(),
          }
        : currentEntry
    );

    await checkinsCollection.doc(checkin._id).update({
      contents: nextEntries,
      interaction: summarizeCheckinInteraction(nextEntries, checkin.interaction),
      updated_at: db.serverDate(),
    });
    await refreshLeaderboardSnapshots(normalizedCode);

    const savedCheckin = await findCheckinById(checkin._id);
    const savedEntry = getCheckinEntries(savedCheckin).find((currentEntry) => currentEntry.entry_id === entryId) || entry;
    return ok(buildEntryView(savedCheckin, savedEntry, userId));
  } catch (error) {
    return fail('回复评论失败', error);
  }
}

const actionMap = {
  getEntryDetail,
  toggleLike: (data) => toggleReaction(data, 'like'),
  toggleFavorite: (data) => toggleReaction(data, 'favorite'),
  addComment,
  replyComment,
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
