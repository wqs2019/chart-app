const cloud = require('@cloudbase/node-sdk');

const app = cloud.init({
  env: cloud.SYMBOL_CURRENT_ENV,
});

const db = app.database();
const _ = db.command;
const feedbacksCollection = db.collection('chart_feedbacks');
const usersCollection = db.collection('chart_users');
const adminCollection = db.collection('admin_list');
const checkinsCollection = db.collection('chart_checkins');

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
    console.log('chart_feedback.findUserById fallback to where:', error);
  }

  const fallback = await usersCollection.where({ _id: userId }).limit(1).get();
  return getDocData(fallback);
}

function sanitizeMedia(media = []) {
  if (!Array.isArray(media)) {
    return [];
  }

  return media
    .filter((item) => item && item.file_id && item.media_type)
    .map((item) => ({
      file_id: item.file_id,
      media_type: item.media_type,
      name: item.name || '',
      temp_url: item.temp_url || '',
      thumbnail_file_id: item.thumbnail_file_id || '',
      thumbnail_temp_url: item.thumbnail_temp_url || '',
      duration_ms: item.duration_ms || null,
    }));
}

function sanitizeTargetUserSnapshot(snapshot = {}) {
  if (!snapshot || typeof snapshot !== 'object') {
    return {};
  }

  return {
    full_name: snapshot.full_name || '',
    avatar_url: snapshot.avatar_url || '',
  };
}

function sanitizeTargetEntrySnapshot(snapshot = {}) {
  if (!snapshot || typeof snapshot !== 'object') {
    return {};
  }

  return {
    title: snapshot.title || '',
    description: snapshot.description || '',
    media_count: Number(snapshot.media_count || 0) || 0,
    item_name_zh: snapshot.item_name_zh || '',
  };
}

function normalizeEntryModerationStatus(status) {
  return ['violating', 'reviewing'].includes(status) ? status : 'normal';
}

function getCheckinEntries(checkin) {
  return Array.isArray(checkin?.contents) ? checkin.contents : [];
}

async function findTargetCheckin(targetUserId, targetItemId) {
  if (!targetUserId || !targetItemId) {
    return null;
  }

  const result = await checkinsCollection
    .where({
      user_id: targetUserId,
      item_id: targetItemId,
      is_active: true,
    })
    .limit(1)
    .get();

  return getDocData(result);
}

async function syncEntryModerationState(feedbackRecord, nextStatus) {
  if (!feedbackRecord || !['report_entry', 'review_entry'].includes(feedbackRecord.type)) {
    return;
  }

  const checkin = await findTargetCheckin(feedbackRecord.target_user_id, feedbackRecord.target_item_id);
  if (!checkin?._id) {
    return;
  }

  const nextModerationStatus =
    feedbackRecord.type === 'report_entry'
      ? nextStatus === 'violation'
        ? 'violating'
        : 'normal'
      : nextStatus === 'resolved'
        ? 'normal'
        : nextStatus === 'violation'
          ? 'violating'
          : 'reviewing';

  const nextEntries = getCheckinEntries(checkin).map((entry) => {
    if (entry.entry_id !== feedbackRecord.target_entry_id) {
      return entry;
    }

    return {
      ...entry,
      moderation_status: normalizeEntryModerationStatus(nextModerationStatus),
      moderation_updated_at: db.serverDate(),
      updated_at: db.serverDate(),
    };
  });

  await checkinsCollection.doc(checkin._id).update({
    contents: nextEntries,
    updated_at: db.serverDate(),
  });
}

async function ensureAdminByAppleId(appleUserId) {
  const normalizedAppleId = String(appleUserId || '').trim();

  if (!normalizedAppleId) {
    throw new Error('缺少管理员身份');
  }

  const result = await adminCollection.where({ apple_id: normalizedAppleId }).limit(1).get();
  const adminUser = getDocData(result);

  if (!adminUser) {
    throw new Error('当前账号不是管理员');
  }

  return adminUser;
}

async function addFeedback(data = {}) {
  try {
    const {
      user_id,
      type,
      content,
      contact = '',
      media = [],
      source = 'app',
      user_snapshot = {},
      report_reason = '',
      target_user_id = '',
      target_entry_id = '',
      target_item_id = '',
      target_user_snapshot = {},
      target_entry_snapshot = {},
      leaderboard_code = '',
      requested_item_name = '',
      requested_category = '',
      requested_category_label = '',
      search_keyword = '',
    } = data;

    if (!user_id) {
      return fail('缺少用户 ID');
    }

    if (!type || !['bug', 'feature', 'other', 'item_request', 'report_entry', 'review_entry'].includes(type)) {
      return fail('反馈类型不正确');
    }

    if (type !== 'item_request' && (!content || !String(content).trim())) {
      return fail('反馈内容不能为空');
    }

    if (type === 'item_request') {
      if (!leaderboard_code || !['activity'].includes(String(leaderboard_code))) {
        return fail('榜单类型不正确');
      }

      if (!requested_item_name || !String(requested_item_name).trim()) {
        return fail('项目名称不能为空');
      }

      if (!requested_category || !String(requested_category).trim()) {
        return fail('项目分类不能为空');
      }
    }

    if (type === 'report_entry' || type === 'review_entry') {
      if (!target_user_id || !target_entry_id || !target_item_id) {
        return fail(type === 'review_entry' ? '复审目标信息不完整' : '举报目标信息不完整');
      }

      if (type === 'report_entry' && user_id === target_user_id) {
        return fail('不能举报自己的记录');
      }

      if (
        type === 'report_entry' &&
        !['spam', 'abuse', 'harassment', 'pornography', 'violence', 'fraud', 'other'].includes(report_reason)
      ) {
        return fail('举报原因不正确');
      }
    }

    const user = await findUserById(user_id);
    if (!user) {
      return fail('用户不存在');
    }

    const payload = {
      user_id,
      type,
      content:
        type === 'item_request'
          ? String(content || '').trim() ||
            `申请收录项目：${String(requested_item_name || '').trim()} / ${String(requested_category_label || requested_category || '').trim()}`
          : String(content).trim(),
      contact: String(contact || '').trim(),
      media: sanitizeMedia(media),
      status: type === 'report_entry' ? 'pending' : 'processing',
      source,
      report_reason: type === 'report_entry' ? report_reason : '',
      target_user_id: ['report_entry', 'review_entry'].includes(type) ? target_user_id : '',
      target_entry_id: ['report_entry', 'review_entry'].includes(type) ? target_entry_id : '',
      target_item_id: ['report_entry', 'review_entry'].includes(type) ? target_item_id : '',
      user_snapshot: {
        full_name: user_snapshot.full_name || user.full_name || user.profile?.nickname || '',
        email: user_snapshot.email || user.email || '',
        avatar_url: user_snapshot.avatar_url || user.profile?.avatar_url || '',
      },
      target_user_snapshot:
        ['report_entry', 'review_entry'].includes(type) ? sanitizeTargetUserSnapshot(target_user_snapshot) : {},
      target_entry_snapshot:
        ['report_entry', 'review_entry'].includes(type) ? sanitizeTargetEntrySnapshot(target_entry_snapshot) : {},
      leaderboard_code: type === 'item_request' ? String(leaderboard_code || '').trim() : '',
      requested_item_name: type === 'item_request' ? String(requested_item_name || '').trim() : '',
      requested_category: type === 'item_request' ? String(requested_category || '').trim() : '',
      requested_category_label:
        type === 'item_request' ? String(requested_category_label || requested_category || '').trim() : '',
      search_keyword: type === 'item_request' ? String(search_keyword || '').trim() : '',
      created_at: db.serverDate(),
      updated_at: db.serverDate(),
    };

    const result = await feedbacksCollection.add(payload);

    return ok({
      _id: result.id || result._id,
      ...payload,
    });
  } catch (error) {
    console.error('chart_feedback.addFeedback error:', error);
    return fail('提交反馈失败', error);
  }
}

async function listFeedbacks(data = {}) {
  try {
    await ensureAdminByAppleId(data.appleUserId);

    const type = String(data.type || 'all');
    const status = String(data.status || 'all');
    const limit = Math.min(Math.max(Number(data.limit) || 50, 1), 100);

    const wherePayload = {};
    if (type !== 'all') {
      wherePayload.type = type === 'report_entry' ? _.in(['report_entry', 'review_entry']) : type;
    }
    if (status !== 'all') {
      wherePayload.status = status;
    }

    const query = Object.keys(wherePayload).length > 0 ? feedbacksCollection.where(wherePayload) : feedbacksCollection;
    const result = await query.orderBy('created_at', 'desc').limit(limit).get();

    return ok(result.data || []);
  } catch (error) {
    console.error('chart_feedback.listFeedbacks error:', error);
    return fail('获取反馈列表失败', error);
  }
}

async function getAdminPendingSummary(data = {}) {
  try {
    await ensureAdminByAppleId(data.appleUserId);

    const [feedbackPendingResult, reportPendingResult] = await Promise.all([
      feedbacksCollection
        .where({
          type: _.in(['bug', 'feature', 'other', 'item_request']),
          status: 'processing',
        })
        .count(),
      feedbacksCollection
        .where({
          type: _.in(['report_entry', 'review_entry']),
          status: _.in(['pending', 'processing']),
        })
        .count(),
    ]);

    const feedbackPendingCount = feedbackPendingResult.total || 0;
    const reportPendingCount = reportPendingResult.total || 0;

    return ok({
      feedbackPendingCount,
      reportPendingCount,
      totalPendingCount: feedbackPendingCount + reportPendingCount,
    });
  } catch (error) {
    console.error('chart_feedback.getAdminPendingSummary error:', error);
    return fail('获取管理员待处理统计失败', error);
  }
}

async function updateFeedbackStatus(data = {}) {
  try {
    await ensureAdminByAppleId(data.appleUserId);

    const feedbackId = String(data.feedbackId || '').trim();
    const status = String(data.status || '').trim();

    if (!feedbackId) {
      return fail('缺少反馈记录 ID');
    }

    if (!['processing', 'violation', 'resolved', 'rejected'].includes(status)) {
      return fail('反馈状态不正确');
    }

    const existingResult = await feedbacksCollection.doc(feedbackId).get();
    const existingRecord = getDocData(existingResult);
    if (!existingRecord) {
      return fail('反馈记录不存在');
    }

    const currentStatus =
      existingRecord.status || (existingRecord.type === 'report_entry' ? 'pending' : 'processing');
    if (
      currentStatus === 'resolved' ||
      currentStatus === 'rejected' ||
      ((existingRecord.type === 'report_entry' || existingRecord.type === 'review_entry') &&
        currentStatus === 'violation')
    ) {
      return fail('当前记录已结案，状态不可再次修改');
    }

    await feedbacksCollection.doc(feedbackId).update({
      status,
      updated_at: db.serverDate(),
    });

    await syncEntryModerationState(existingRecord, status);

    const result = await feedbacksCollection.doc(feedbackId).get();
    return ok(getDocData(result));
  } catch (error) {
    console.error('chart_feedback.updateFeedbackStatus error:', error);
    return fail('更新反馈状态失败', error);
  }
}

const actionMap = {
  add: addFeedback,
  list: listFeedbacks,
  pendingSummary: getAdminPendingSummary,
  updateStatus: updateFeedbackStatus,
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
    return fail('无效的 action');
  }

  return handler(data || {});
};
