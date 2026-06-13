const cloud = require('@cloudbase/node-sdk');

const app = cloud.init({
  env: cloud.SYMBOL_CURRENT_ENV,
});

const db = app.database();
const standardItemsCollection = db.collection('chart_standard_items');
const checkinsCollection = db.collection('chart_checkins');
const snapshotsCollection = db.collection('chart_score_snapshots');

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

async function getStandardItemById(itemId) {
  if (!itemId) {
    return null;
  }

  const result = await standardItemsCollection.doc(itemId).get();
  return getDocData(result);
}

/**
 * 获取标准项列表
 */
const getStandardItems = async (data = {}) => {
  const { code } = data;
  if (!code) return fail('缺少 leaderboard_code');

  try {
    const { data: items } = await db
      .collection('chart_standard_items')
      .where({
        leaderboard_code: code,
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
  if (!userId || !code) return fail('缺少参数');

  try {
    const { data: checkins } = await checkinsCollection
      .where({
        user_id: userId,
        leaderboard_code: code,
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

    const leaderboardCode = standardItem.leaderboard_code || code;
    const currentItemId = standardItem._id || itemId;
    const checkinId = `${userId}_${leaderboardCode}_${currentItemId}`;

    if (isChecked) {
      await checkinsCollection.doc(checkinId).set({
        user_id: userId,
        leaderboard_code: leaderboardCode,
        item_id: currentItemId,
        item_type: standardItem.item_type || standardItem.type || '',
        is_active: true,
        source_type: 'realtime_add',
        checked_in_at: db.serverDate(),
        interaction: {
          likes_count: 0,
          comments_count: 0,
          favorites_count: 0,
        },
        created_at: db.serverDate(),
        updated_at: db.serverDate(),
      });
    } else {
      await checkinsCollection.doc(checkinId).remove();
    }

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
  if (!userId || !code || !itemIds || !Array.isArray(itemIds)) {
    return fail('缺少参数');
  }

  try {
    const timestamp = db.serverDate();
    for (const itemId of itemIds) {
      const checkinId = `${userId}_${code}_${itemId}`;
      const standardItem = await getStandardItemById(itemId);

      await checkinsCollection.doc(checkinId).set({
        user_id: userId,
        leaderboard_code: code,
        item_id: itemId,
        item_type: standardItem ? standardItem.item_type || standardItem.type || '' : '',
        is_active: true,
        source_type: 'history_backfill',
        checked_in_at: timestamp,
        interaction: {
          likes_count: 0,
          comments_count: 0,
          favorites_count: 0,
        },
        created_at: timestamp,
        updated_at: timestamp,
      });
    }

    return ok(true);
  } catch (error) {
    return fail('批量打卡失败', error);
  }
};

/**
 * 获取我的榜单位置
 */
const getMyRank = async (data = {}) => {
  const { userId, code } = data;
  if (!userId || !code) {
    return fail('缺少参数');
  }

  try {
    const { data: rows } = await snapshotsCollection
      .where({
        user_id: userId,
        leaderboard_code: code,
      })
      .orderBy('updated_at', 'desc')
      .limit(1)
      .get();

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
  if (!code) {
    return fail('缺少 leaderboard_code');
  }

  try {
    const size = Math.min(Number(pageSize) || 20, 100);
    const currentPage = Math.max(Number(page) || 1, 1);
    const skip = (currentPage - 1) * size;

    const { data: rows } = await snapshotsCollection
      .where({
        leaderboard_code: code,
      })
      .orderBy('final_score', 'desc')
      .orderBy('updated_at', 'asc')
      .skip(skip)
      .limit(size)
      .get();

    return ok(rows);
  } catch (error) {
    return fail('获取榜单排名失败', error);
  }
};

const actionMap = {
  getStandardItems,
  getUserCheckins,
  toggleCheckin,
  batchCheckin,
  getMyRank,
  getLeaderboardRankings,
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
