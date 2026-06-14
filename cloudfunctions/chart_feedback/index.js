const cloud = require('@cloudbase/node-sdk');

const app = cloud.init({
  env: cloud.SYMBOL_CURRENT_ENV,
});

const db = app.database();
const feedbacksCollection = db.collection('chart_feedbacks');
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

async function addFeedback(data = {}) {
  try {
    const { user_id, type, content, contact = '', media = [], source = 'app', user_snapshot = {} } = data;

    if (!user_id) {
      return fail('缺少用户 ID');
    }

    if (!type || !['bug', 'feature', 'other'].includes(type)) {
      return fail('反馈类型不正确');
    }

    if (!content || !String(content).trim()) {
      return fail('反馈内容不能为空');
    }

    const user = await findUserById(user_id);
    if (!user) {
      return fail('用户不存在');
    }

    const payload = {
      user_id,
      type,
      content: String(content).trim(),
      contact: String(contact || '').trim(),
      media: sanitizeMedia(media),
      status: 'pending',
      source,
      user_snapshot: {
        full_name: user_snapshot.full_name || user.full_name || user.profile?.nickname || '',
        email: user_snapshot.email || user.email || '',
        avatar_url: user_snapshot.avatar_url || user.profile?.avatar_url || '',
      },
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

const actionMap = {
  add: addFeedback,
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
