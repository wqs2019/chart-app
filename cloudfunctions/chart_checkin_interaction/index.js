const cloud = require('@cloudbase/node-sdk');
const https = require('https');

const app = cloud.init({
  env: cloud.SYMBOL_CURRENT_ENV,
});

const db = app.database();
const _ = db.command;
const checkinsCollection = db.collection('chart_checkins');
const standardItemsCollection = db.collection('chart_standard_items');
const snapshotsCollection = db.collection('chart_score_snapshots');
const usersCollection = db.collection('chart_users');
const commentsCollection = db.collection('chart_comments');
const interactionsCollection = db.collection('chart_interactions');
const notificationsCollection = db.collection('chart_notifications');
const adminCollection = db.collection('admin_list');
const CHECKIN_CONTENT_TARGET_TYPE = 'checkin_content';
const ACTIVE_STATUS = 'active';
const CANCELLED_STATUS = 'cancelled';

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

function buildDisplayName(user = {}) {
  return user.full_name || (user.profile && user.profile.nickname) || user.username || '旅行玩家';
}

const sendPushNotification = (expoPushToken, title, body, data = {}) =>
  new Promise((resolve, reject) => {
    if (!expoPushToken) {
      resolve();
      return;
    }

    const message = {
      to: expoPushToken,
      sound: 'default',
      title,
      body,
      data,
    };

    const req = https.request(
      {
        hostname: 'exp.host',
        path: '/--/api/v2/push/send',
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Accept-encoding': 'application/json',
          'Content-Type': 'application/json',
        },
      },
      (res) => {
        let responseData = '';
        res.on('data', (chunk) => {
          responseData += chunk;
        });
        res.on('end', () => resolve(responseData));
      }
    );

    req.on('error', (error) => {
      console.error('Push notification error:', error);
      reject(error);
    });

    req.write(JSON.stringify(message));
    req.end();
  });

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

async function getStandardItemById(itemId) {
  if (!itemId) {
    return null;
  }

  try {
    const result = await standardItemsCollection.doc(itemId).get();
    const item = getDocData(result);
    if (item) {
      return item;
    }
  } catch (error) {
    console.log('chart_checkin_interaction.getStandardItemById fallback to where:', error);
  }

  const fallback = await standardItemsCollection.where({ _id: itemId }).limit(1).get();
  return getDocData(fallback);
}

async function findCheckinEntryContextByEntryId(entryId) {
  if (!entryId) {
    return null;
  }

  const limit = 1000;
  let offset = 0;

  while (true) {
    const result = await checkinsCollection
      .where({ is_active: true })
      .skip(offset)
      .limit(limit)
      .get();
    const checkins = Array.isArray(result.data) ? result.data : [];

    for (const checkin of checkins) {
      const entry = getCheckinEntries(checkin).find((currentEntry) => currentEntry.entry_id === entryId);
      if (entry) {
        return { checkin, entry };
      }
    }

    if (checkins.length < limit) {
      break;
    }

    offset += limit;
  }

  return null;
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
      china_raw_count: 0,
      china_final_score: 0,
      activity_raw_count: 0,
      activity_final_score: 0,
    };

    current.raw_count += snapshot.raw_count || 0;

    if (snapshot.leaderboard_code === 'world_travel') {
      current.world_final_score = snapshot.final_score || 0;
      current.world_raw_count = snapshot.raw_count || 0;
    }

    if (snapshot.leaderboard_code === 'china_travel') {
      current.china_raw_count = snapshot.raw_count || 0;
      current.china_final_score = snapshot.final_score || 0;
    }

    if (snapshot.leaderboard_code === 'activity') {
      current.activity_raw_count = snapshot.raw_count || 0;
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
        china_raw_count: entry.china_raw_count,
        activity_raw_count: entry.activity_raw_count,
        world_final_score: entry.world_final_score,
        china_final_score: entry.china_final_score,
        activity_final_score: entry.activity_final_score,
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
        china_raw_count: row.china_raw_count,
        activity_raw_count: row.activity_raw_count,
        world_final_score: row.world_final_score,
        china_final_score: row.china_final_score,
        activity_final_score: row.activity_final_score,
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
  };
}

function createCommentId() {
  return `comment_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function normalizeStoredInteraction(interaction = {}, fallbackInteraction = null) {
  const base = fallbackInteraction || createEmptyInteraction();

  return {
    likes_count: Math.max(Number(interaction.likes_count ?? base.likes_count ?? 0) || 0, 0),
    comments_count: Math.max(Number(interaction.comments_count ?? base.comments_count ?? 0) || 0, 0),
    favorites_count: Math.max(Number(interaction.favorites_count ?? base.favorites_count ?? 0) || 0, 0),
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

function flattenCommentTree(comments = []) {
  return (comments || []).flatMap((comment) => [
    {
      comment_id: comment.comment_id || createCommentId(),
      parent_comment_id: comment.parent_comment_id || '',
      content: String(comment.content || '').trim(),
      created_at: comment.created_at || db.serverDate(),
      updated_at: comment.updated_at || comment.created_at || db.serverDate(),
      author: normalizeCommentAuthor(comment.author),
    },
    ...flattenCommentTree(Array.isArray(comment.replies) ? comment.replies : []),
  ]);
}

function sortCommentTree(comments = [], isRootLevel = true) {
  const sorted = (comments || [])
    .slice()
    .sort((a, b) =>
      isRootLevel ? getDateValue(b.created_at) - getDateValue(a.created_at) : getDateValue(a.created_at) - getDateValue(b.created_at)
    );

  return sorted.map((comment) => ({
    ...comment,
    replies: sortCommentTree(comment.replies || [], false),
  }));
}

function buildUserSnapshotMap(users = []) {
  return new Map(
    (users || []).map((user) => [
      user._id,
      {
        user_id: user._id,
        full_name: user.full_name || '',
        username: user.username || '',
        avatar_url: user.profile?.avatar_url || '',
      },
    ])
  );
}

async function getUserSnapshotMapByIds(userIds = []) {
  const uniqueUserIds = Array.from(new Set((userIds || []).filter(Boolean)));
  if (!uniqueUserIds.length) {
    return new Map();
  }

  const snapshots = [];
  for (let index = 0; index < uniqueUserIds.length; index += 100) {
    const batch = uniqueUserIds.slice(index, index + 100);
    const { data } = await usersCollection
      .where({
        _id: _.in(batch),
      })
      .limit(batch.length)
      .get();
    snapshots.push(...(data || []));
  }

  return buildUserSnapshotMap(snapshots);
}

async function findUserById(userId) {
  if (!userId) {
    return null;
  }

  try {
    const result = await usersCollection.doc(userId).get();
    const user = getDocData(result);
    if (user) {
      return user;
    }
  } catch (error) {
    console.log('chart_checkin_interaction.findUserById fallback to where:', error);
  }

  const fallback = await usersCollection.where({ _id: userId }).limit(1).get();
  return getDocData(fallback);
}

async function findCommentDocByCommentId(commentId) {
  if (!commentId) {
    return null;
  }

  const { data } = await commentsCollection
    .where({
      comment_id: commentId,
      status: ACTIVE_STATUS,
    })
    .limit(1)
    .get();

  return getDocData({ data });
}

function buildNotificationSenderSnapshot(user = {}) {
  return {
    display_name: buildDisplayName(user),
    avatar_url: user.profile?.avatar_url || '',
  };
}

function getEntryPreview(entry = {}) {
  return String(entry.title || entry.description || '').trim();
}

function normalizeEntryModerationStatus(status) {
  return ['violating', 'reviewing'].includes(status) ? status : 'normal';
}

function isEntryRestricted(entry = {}) {
  return normalizeEntryModerationStatus(entry?.moderation_status) !== 'normal';
}

async function isAdminViewerByAppleId(appleUserId) {
  const normalizedAppleId = String(appleUserId || '').trim();
  if (!normalizedAppleId) {
    return false;
  }

  const result = await adminCollection.where({ apple_id: normalizedAppleId }).limit(1).get();
  return Boolean(getDocData(result));
}

async function createUserNotification({
  receiverUserId,
  senderUser,
  type,
  title,
  content,
  relatedId = '',
  extraData = {},
}) {
  if (!receiverUserId || !senderUser?._id || receiverUserId === senderUser._id) {
    return;
  }

  const receiverUser = await findUserById(receiverUserId);
  const senderSnapshot = buildNotificationSenderSnapshot(senderUser);

  await notificationsCollection.add({
    receiver_user_id: receiverUserId,
    sender_user_id: senderUser._id,
    type,
    title,
    content,
    related_id: relatedId,
    is_read: false,
    sender_snapshot: senderSnapshot,
    extra_data: extraData,
    created_at: db.serverDate(),
    updated_at: db.serverDate(),
  });

  if (receiverUser?.push_token) {
    await sendPushNotification(receiverUser.push_token, title, content, {
      type,
      ...extraData,
    });
  }
}

function buildCommentTree(legacyComments = [], commentDocs = [], userSnapshotMap = new Map()) {
  const nodes = new Map();

  const registerNode = (node) => {
    if (!node?.comment_id || nodes.has(node.comment_id)) {
      return;
    }

    nodes.set(node.comment_id, {
      comment_id: node.comment_id,
      parent_comment_id: node.parent_comment_id || '',
      content: String(node.content || '').trim(),
      created_at: node.created_at || db.serverDate(),
      updated_at: node.updated_at || node.created_at || db.serverDate(),
      author: normalizeCommentAuthor(node.author),
      replies: [],
    });
  };

  flattenCommentTree(normalizeStoredComments(legacyComments)).forEach(registerNode);

  (commentDocs || [])
    .filter((doc) => doc?.status === ACTIVE_STATUS)
    .forEach((doc) => {
      registerNode({
        comment_id: doc.comment_id || doc._id,
        parent_comment_id: doc.reply_to_comment_id || '',
        content: doc.content || '',
        created_at: doc.created_at || db.serverDate(),
        updated_at: doc.updated_at || doc.created_at || db.serverDate(),
        author: userSnapshotMap.get(doc.actor_user_id) || {
          user_id: doc.actor_user_id || '',
          full_name: '',
          username: '',
          avatar_url: '',
        },
      });
    });

  const roots = [];
  nodes.forEach((node) => {
    if (node.parent_comment_id && nodes.has(node.parent_comment_id)) {
      nodes.get(node.parent_comment_id).replies.push(node);
      return;
    }

    roots.push(node);
  });

  return sortCommentTree(roots, true);
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
      summary.likes_count += entryInteraction.likes_count;
      summary.favorites_count += entryInteraction.favorites_count;
      summary.comments_count += entryInteraction.comments_count || 0;

      return summary;
    },
    {
      likes_count: 0,
      comments_count: 0,
      favorites_count: 0,
    }
  );
}

async function getActiveCommentDocs(entryId) {
  if (!entryId) {
    return [];
  }

  const { data } = await commentsCollection
    .where({
      target_type: CHECKIN_CONTENT_TARGET_TYPE,
      target_id: entryId,
      status: ACTIVE_STATUS,
    })
    .limit(1000)
    .get();

  return Array.isArray(data) ? data : [];
}

async function getViewerInteractionDocs(entryId, viewerUserId) {
  if (!entryId || !viewerUserId) {
    return [];
  }

  const { data } = await interactionsCollection
    .where({
      target_type: CHECKIN_CONTENT_TARGET_TYPE,
      target_id: entryId,
      user_id: viewerUserId,
      interaction_type: _.in(['like', 'favorite']),
    })
    .limit(20)
    .get();

  return Array.isArray(data) ? data : [];
}

function pickLatestRecord(records = []) {
  if (!Array.isArray(records) || !records.length) {
    return null;
  }

  return records
    .slice()
    .sort((a, b) => getDateValue(b.updated_at || b.created_at) - getDateValue(a.updated_at || a.created_at))[0];
}

async function findExistingInteractionRecord(entryId, userId, reactionType) {
  if (!entryId || !userId || !reactionType) {
    return null;
  }

  const { data } = await interactionsCollection
    .where({
      target_type: CHECKIN_CONTENT_TARGET_TYPE,
      target_id: entryId,
      user_id: userId,
      interaction_type: reactionType,
    })
    .limit(20)
    .get();

  return pickLatestRecord(data || []);
}

async function resolveEntrySocialData(checkin, entry = {}, viewerUserId = '') {
  const legacyComments = normalizeStoredComments(entry.comments || []);
  const cachedInteraction = normalizeStoredInteraction(
    entry.interaction,
    getEntryFallbackInteraction(checkin, getCheckinEntries(checkin), entry)
  );
  const [commentDocs, viewerInteractionDocs] = await Promise.all([
    getActiveCommentDocs(entry.entry_id),
    getViewerInteractionDocs(entry.entry_id, viewerUserId),
  ]);
  const userSnapshotMap = await getUserSnapshotMapByIds(commentDocs.map((doc) => doc.actor_user_id));
  const comments = buildCommentTree(legacyComments, commentDocs, userSnapshotMap);
  const legacyLikedUserIds = Array.from(new Set((entry?.interaction?.liked_user_ids || []).filter(Boolean)));
  const legacyFavoritedUserIds = Array.from(new Set((entry?.interaction?.favorited_user_ids || []).filter(Boolean)));
  const viewerLikeRecord = pickLatestRecord(
    (viewerInteractionDocs || []).filter((record) => record.interaction_type === 'like')
  );
  const viewerFavoriteRecord = pickLatestRecord(
    (viewerInteractionDocs || []).filter((record) => record.interaction_type === 'favorite')
  );
  const interaction = {
    likes_count: cachedInteraction.likes_count,
    comments_count: Math.max(countComments(comments), cachedInteraction.comments_count || 0),
    favorites_count: cachedInteraction.favorites_count,
    viewer_has_liked: viewerLikeRecord
      ? viewerLikeRecord.status === ACTIVE_STATUS
      : Boolean(viewerUserId && legacyLikedUserIds.includes(viewerUserId)),
    viewer_has_favorited: viewerFavoriteRecord
      ? viewerFavoriteRecord.status === ACTIVE_STATUS
      : Boolean(viewerUserId && legacyFavoritedUserIds.includes(viewerUserId)),
  };

  return {
    comments,
    interaction,
  };
}

async function buildEntryView(checkin, entry = {}, viewerUserId = '') {
  const safeCheckin = checkin || {};
  const { comments, interaction } = await resolveEntrySocialData(safeCheckin, entry, viewerUserId);

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
      moderation_status: normalizeEntryModerationStatus(entry.moderation_status),
      moderation_updated_at: entry.moderation_updated_at || entry.updated_at || safeCheckin.updated_at,
      interaction,
      comments,
    },
  };
}

async function updateEntryInteractionCache(checkin, entryId, nextEntryInteraction) {
  const entries = getCheckinEntries(checkin);
  const nextEntries = entries.map((currentEntry) => {
    if (currentEntry.entry_id !== entryId) {
      return currentEntry;
    }

    return {
      ...currentEntry,
      interaction: normalizeStoredInteraction(nextEntryInteraction),
      updated_at: db.serverDate(),
    };
  });

  await checkinsCollection.doc(checkin._id).update({
    contents: nextEntries,
    interaction: summarizeCheckinInteraction(nextEntries, checkin.interaction),
    updated_at: db.serverDate(),
  });
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
  const { ownerUserId, viewerUserId = '', viewerAppleUserId = '', code, itemId, entryId } = data;
  const normalizedCode = normalizeLeaderboardCode(code);
  if (!ownerUserId || !normalizedCode || !itemId || !entryId) {
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

    if (isEntryRestricted(entry) && viewerUserId !== ownerUserId) {
      const isAdminViewer = await isAdminViewerByAppleId(viewerAppleUserId);
      if (!isAdminViewer) {
        return fail('日记不存在');
      }
    }

    return ok(await buildEntryView(checkin, entry, viewerUserId));
  } catch (error) {
    return fail('获取日记详情失败', error);
  }
}

async function getEntryContextById(data = {}) {
  const { entryId, viewerUserId = '', viewerAppleUserId = '' } = data;
  if (!entryId) {
    return fail('缺少参数');
  }

  try {
    const context = await findCheckinEntryContextByEntryId(entryId);
    if (!context?.checkin || !context.entry) {
      return fail('日记不存在');
    }

    const ownerUserId = context.checkin.user_id || '';
    if (isEntryRestricted(context.entry) && viewerUserId !== ownerUserId) {
      const isAdminViewer = await isAdminViewerByAppleId(viewerAppleUserId);
      if (!isAdminViewer) {
        return fail('日记不存在');
      }
    }

    const standardItem = await getStandardItemById(context.checkin.item_id);
    if (!standardItem) {
      return fail('标准项不存在');
    }

    return ok({
      entry: await buildEntryView(context.checkin, context.entry, viewerUserId),
      item: standardItem,
      code: normalizeLeaderboardCode(context.checkin.leaderboard_code),
      ownerUserId,
    });
  } catch (error) {
    return fail('获取日记上下文失败', error);
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
    const [checkin, actorUser] = await Promise.all([
      findCheckin(targetOwnerId, normalizedCode, itemId),
      findUserById(userId),
    ]);
    if (!checkin?._id) {
      return fail('日记不存在');
    }
    if (!actorUser?._id) {
      return fail('用户不存在');
    }

    const entries = getCheckinEntries(checkin);
    const entryIndex = entries.findIndex((currentEntry) => currentEntry.entry_id === entryId);
    if (entryIndex < 0) {
      return fail('日记不存在');
    }

    const entry = entries[entryIndex];
    if (isEntryRestricted(entry) && userId !== targetOwnerId) {
      return fail('当前日记暂不可互动');
    }
    const cachedInteraction = normalizeStoredInteraction(
      entry.interaction,
      getEntryFallbackInteraction(checkin, entries, entry)
    );
    const countKey = reactionType === 'like' ? 'likes_count' : 'favorites_count';
    const userIdsKey = reactionType === 'like' ? 'liked_user_ids' : 'favorited_user_ids';
    const legacyUserIds = Array.isArray(entry?.interaction?.[userIdsKey]) ? entry.interaction[userIdsKey] : [];
    const existingRecord = await findExistingInteractionRecord(entryId, userId, reactionType);
    const hasReacted = existingRecord
      ? existingRecord.status === ACTIVE_STATUS
      : Boolean(userId && legacyUserIds.includes(userId));
    const nextStatus = hasReacted ? CANCELLED_STATUS : ACTIVE_STATUS;

    if (existingRecord?._id) {
      await interactionsCollection.doc(existingRecord._id).update({
        status: nextStatus,
        updated_at: db.serverDate(),
      });
    } else {
      await interactionsCollection.add({
        user_id: userId,
        target_type: CHECKIN_CONTENT_TARGET_TYPE,
        target_id: entryId,
        target_user_id: targetOwnerId,
        interaction_type: reactionType,
        status: nextStatus,
        parent_checkin_id: checkin._id,
        leaderboard_code: normalizedCode,
        item_id: itemId,
        created_at: db.serverDate(),
        updated_at: db.serverDate(),
      });
    }

    await updateEntryInteractionCache(checkin, entryId, {
      ...cachedInteraction,
      [countKey]: Math.max(Number(cachedInteraction[countKey] || 0) + (hasReacted ? -1 : 1), 0),
    });
    await refreshLeaderboardSnapshots(normalizedCode);

    if (!hasReacted) {
      const senderName = buildDisplayName(actorUser);
      const entryPreview = getEntryPreview(entry);
      const title = reactionType === 'like' ? '收到新的点赞' : '收到新的收藏';
      const content = entryPreview
        ? `${senderName}${reactionType === 'like' ? ' 点赞了' : ' 收藏了'}你的日记「${entryPreview}」`
        : `${senderName}${reactionType === 'like' ? ' 点赞了' : ' 收藏了'}你的日记`;

      await createUserNotification({
        receiverUserId: targetOwnerId,
        senderUser: actorUser,
        type: reactionType,
        title,
        content,
        relatedId: entryId,
        extraData: {
          screen: 'CheckinEntryDetail',
          params: {
            entryId,
          },
          entryId,
        },
      });
    }

    const savedCheckin = await findCheckinById(checkin._id);
    const savedEntry = getCheckinEntries(savedCheckin).find((currentEntry) => currentEntry.entry_id === entryId) || entry;
    return ok(await buildEntryView(savedCheckin, savedEntry, userId));
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
    const [checkin, actorUser] = await Promise.all([
      findCheckin(targetOwnerId, normalizedCode, itemId),
      findUserById(userId),
    ]);
    if (!checkin?._id) {
      return fail('日记不存在');
    }
    if (!actorUser?._id) {
      return fail('用户不存在');
    }

    const entries = getCheckinEntries(checkin);
    const entryIndex = entries.findIndex((currentEntry) => currentEntry.entry_id === entryId);
    if (entryIndex < 0) {
      return fail('日记不存在');
    }

    const entry = entries[entryIndex];
    if (isEntryRestricted(entry) && userId !== targetOwnerId) {
      return fail('当前日记暂不可评论');
    }
    const cachedInteraction = normalizeStoredInteraction(
      entry.interaction,
      getEntryFallbackInteraction(checkin, entries, entry)
    );
    await commentsCollection.add({
      comment_id: createCommentId(),
      actor_user_id: userId,
      target_user_id: targetOwnerId,
      target_type: CHECKIN_CONTENT_TARGET_TYPE,
      target_id: entryId,
      content: trimmedContent,
      reply_to_comment_id: '',
      status: ACTIVE_STATUS,
      parent_checkin_id: checkin._id,
      leaderboard_code: normalizedCode,
      item_id: itemId,
      created_at: db.serverDate(),
      updated_at: db.serverDate(),
    });

    await updateEntryInteractionCache(checkin, entryId, {
      ...cachedInteraction,
      comments_count: Math.max(Number(cachedInteraction.comments_count || 0) + 1, 0),
    });
    await refreshLeaderboardSnapshots(normalizedCode);

    const senderName = buildDisplayName(actorUser);
    const entryPreview = getEntryPreview(entry);
    const commentPreview = trimmedContent.length > 24 ? `${trimmedContent.slice(0, 24)}...` : trimmedContent;
    const contentText = entryPreview
      ? `${senderName} 评论了你的日记「${entryPreview}」: ${commentPreview}`
      : `${senderName} 评论了你的日记: ${commentPreview}`;
    await createUserNotification({
      receiverUserId: targetOwnerId,
      senderUser: actorUser,
      type: 'comment',
      title: '收到新的评论',
      content: contentText,
      relatedId: entryId,
      extraData: {
        screen: 'CheckinEntryDetail',
        params: {
          entryId,
        },
        entryId,
      },
    });

    const savedCheckin = await findCheckinById(checkin._id);
    const savedEntry = getCheckinEntries(savedCheckin).find((currentEntry) => currentEntry.entry_id === entryId) || entry;
    return ok(await buildEntryView(savedCheckin, savedEntry, userId));
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
    const [checkin, actorUser] = await Promise.all([
      findCheckin(targetOwnerId, normalizedCode, itemId),
      findUserById(userId),
    ]);
    if (!checkin?._id) {
      return fail('日记不存在');
    }
    if (!actorUser?._id) {
      return fail('用户不存在');
    }

    const entries = getCheckinEntries(checkin);
    const entryIndex = entries.findIndex((currentEntry) => currentEntry.entry_id === entryId);
    if (entryIndex < 0) {
      return fail('日记不存在');
    }

    const entry = entries[entryIndex];
    if (isEntryRestricted(entry) && userId !== targetOwnerId) {
      return fail('当前日记暂不可评论');
    }
    const cachedInteraction = normalizeStoredInteraction(
      entry.interaction,
      getEntryFallbackInteraction(checkin, entries, entry)
    );
    const { comments } = await resolveEntrySocialData(checkin, entry, '');
    const hasTargetComment = flattenCommentTree(comments).some((comment) => comment.comment_id === commentId);
    if (!hasTargetComment) {
      return fail('评论不存在');
    }
    const replyTargetComment = await findCommentDocByCommentId(commentId);

    await commentsCollection.add({
      comment_id: createCommentId(),
      actor_user_id: userId,
      target_user_id: targetOwnerId,
      target_type: CHECKIN_CONTENT_TARGET_TYPE,
      target_id: entryId,
      content: trimmedContent,
      reply_to_comment_id: commentId,
      status: ACTIVE_STATUS,
      parent_checkin_id: checkin._id,
      leaderboard_code: normalizedCode,
      item_id: itemId,
      created_at: db.serverDate(),
      updated_at: db.serverDate(),
    });

    await updateEntryInteractionCache(checkin, entryId, {
      ...cachedInteraction,
      comments_count: Math.max(Number(cachedInteraction.comments_count || 0) + 1, 0),
    });
    await refreshLeaderboardSnapshots(normalizedCode);

    const replyReceiverUserId =
      replyTargetComment?.actor_user_id && replyTargetComment.actor_user_id !== userId
        ? replyTargetComment.actor_user_id
        : targetOwnerId !== userId
          ? targetOwnerId
          : '';
    const senderName = buildDisplayName(actorUser);
    const replyPreview = trimmedContent.length > 24 ? `${trimmedContent.slice(0, 24)}...` : trimmedContent;
    await createUserNotification({
      receiverUserId: replyReceiverUserId,
      senderUser: actorUser,
      type: 'reply',
      title: '收到新的回复',
      content: `${senderName} 回复了你的评论: ${replyPreview}`,
      relatedId: entryId,
      extraData: {
        screen: 'CheckinEntryDetail',
        params: {
          entryId,
          commentId,
        },
        entryId,
        commentId,
      },
    });

    const savedCheckin = await findCheckinById(checkin._id);
    const savedEntry = getCheckinEntries(savedCheckin).find((currentEntry) => currentEntry.entry_id === entryId) || entry;
    return ok(await buildEntryView(savedCheckin, savedEntry, userId));
  } catch (error) {
    return fail('回复评论失败', error);
  }
}

const actionMap = {
  getEntryDetail,
  getEntryContextById,
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
