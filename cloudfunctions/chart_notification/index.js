const cloud = require('@cloudbase/node-sdk');

const app = cloud.init({
  env: cloud.SYMBOL_CURRENT_ENV,
});

const db = app.database();
const _ = db.command;
const notificationsCollection = db.collection('chart_notifications');

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

function buildCondition(data = {}, unreadOnly = false) {
  const condition = {
    receiver_user_id: data.userId,
  };

  if (unreadOnly) {
    condition.is_read = false;
  }

  if (Array.isArray(data.types) && data.types.length > 0) {
    condition.type = _.in(data.types);
  }

  return condition;
}

async function getNotifications(data = {}) {
  try {
    const { userId, page = 1, pageSize = 20 } = data;
    if (!userId) {
      return fail('缺少用户 ID');
    }

    const normalizedPage = Math.max(Number(page) || 1, 1);
    const normalizedPageSize = Math.min(Math.max(Number(pageSize) || 20, 1), 50);
    const skip = (normalizedPage - 1) * normalizedPageSize;
    const condition = buildCondition(data);

    const [listResult, countResult] = await Promise.all([
      notificationsCollection
        .where(condition)
        .orderBy('created_at', 'desc')
        .skip(skip)
        .limit(normalizedPageSize)
        .get(),
      notificationsCollection.where(condition).count(),
    ]);

    return ok({
      list: listResult.data || [],
      total: countResult.total || 0,
      page: normalizedPage,
      pageSize: normalizedPageSize,
    });
  } catch (error) {
    console.error('chart_notification.getNotifications error:', error);
    return fail('获取通知失败', error);
  }
}

async function markRead(data = {}) {
  try {
    const { userId, notificationIds, markAll = false } = data;
    if (!userId) {
      return fail('缺少用户 ID');
    }

    const condition = buildCondition(data, true);
    if (!markAll) {
      if (!Array.isArray(notificationIds) || notificationIds.length === 0) {
        return fail('缺少通知 ID');
      }
      condition._id = _.in(notificationIds);
    }

    await notificationsCollection.where(condition).update({
      is_read: true,
      updated_at: db.serverDate(),
    });

    return ok(true);
  } catch (error) {
    console.error('chart_notification.markRead error:', error);
    return fail('标记已读失败', error);
  }
}

async function getUnreadCount(data = {}) {
  try {
    const { userId } = data;
    if (!userId) {
      return fail('缺少用户 ID');
    }

    const result = await notificationsCollection.where(buildCondition(data, true)).count();
    return ok(result.total || 0);
  } catch (error) {
    console.error('chart_notification.getUnreadCount error:', error);
    return fail('获取未读数量失败', error);
  }
}

const actionMap = {
  getNotifications,
  markRead,
  getUnreadCount,
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
