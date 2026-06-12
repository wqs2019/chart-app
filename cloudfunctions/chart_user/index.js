const cloud = require('@cloudbase/node-sdk');

const app = cloud.init({
  env: cloud.SYMBOL_CURRENT_ENV,
});

const db = app.database();
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

function createDefaultStats() {
  return {
    score_version: 'balanced_v1',
    overall_score: 0,
    received_like_count: 0,
    received_comment_count: 0,
    received_favorite_count: 0,
    world: {
      count: 0,
      score: 0,
      rank: null,
    },
    china: {
      count: 0,
      score: 0,
      rank: null,
    },
    activity: {
      count: 0,
      score: 0,
      rank: null,
    },
  };
}

function buildUserPayload(data = {}) {
  return {
    phone: data.phone,
    email: data.email || '',
    username: data.username || '',
    profile: {
      nickname: data.nickname || '新用户',
      avatar_url: data.avatar_url || '',
      bio: data.bio || '',
      primary_tag: data.primary_tag || '成就起步者',
    },
    stats: createDefaultStats(),
    status: data.status || 'active',
    last_login_at: null,
    created_at: db.serverDate(),
    updated_at: db.serverDate(),
  };
}

async function addUser(data = {}) {
  try {
    if (!data.phone) {
      return fail('缺少手机号');
    }

    const existing = await usersCollection.where({ phone: data.phone }).limit(1).get();
    if (existing.data && existing.data.length > 0) {
      return fail('手机号已存在');
    }

    const payload = buildUserPayload(data);
    const result = await usersCollection.add(payload);

    return ok({
      _id: result.id || result._id,
      ...payload,
    });
  } catch (error) {
    console.error('chart_user.addUser error:', error);
    return fail('创建用户失败', error);
  }
}

async function getUser(data = {}) {
  try {
    let result;

    if (data._id) {
      result = await usersCollection.doc(data._id).get();
    } else if (data.phone) {
      result = await usersCollection.where({ phone: data.phone }).limit(1).get();
    } else {
      return fail('缺少用户 ID 或手机号');
    }

    const user = getDocData(result);
    if (!user) {
      return fail('用户不存在');
    }

    return ok(user);
  } catch (error) {
    console.error('chart_user.getUser error:', error);
    return fail('获取用户失败', error);
  }
}

async function listUsers(data = {}) {
  try {
    const limit = Math.min(Number(data.limit) || 20, 50);
    const result = await usersCollection.orderBy('created_at', 'desc').limit(limit).get();
    return ok(result.data || []);
  } catch (error) {
    console.error('chart_user.listUsers error:', error);
    return fail('获取用户列表失败', error);
  }
}

async function updateUser(data = {}) {
  try {
    const { _id, profile = {}, stats = {}, ...flatFields } = data;
    if (!_id) {
      return fail('缺少用户 ID');
    }

    const currentResult = await usersCollection.doc(_id).get();
    const currentUser = getDocData(currentResult);
    if (!currentUser) {
      return fail('用户不存在');
    }

    const payload = {
      ...currentUser,
      ...flatFields,
      profile: {
        ...(currentUser.profile || {}),
        ...profile,
      },
      stats: {
        ...(currentUser.stats || createDefaultStats()),
        ...stats,
      },
      updated_at: db.serverDate(),
    };

    delete payload._id;

    await usersCollection.doc(_id).update(payload);
    return ok(true);
  } catch (error) {
    console.error('chart_user.updateUser error:', error);
    return fail('更新用户失败', error);
  }
}

async function deleteUser(data = {}) {
  try {
    if (!data._id) {
      return fail('缺少用户 ID');
    }

    await usersCollection.doc(data._id).remove();
    return ok(true);
  } catch (error) {
    console.error('chart_user.deleteUser error:', error);
    return fail('删除用户失败', error);
  }
}

const actionMap = {
  add: addUser,
  get: getUser,
  list: listUsers,
  update: updateUser,
  delete: deleteUser,
};

exports.main = async (event = {}) => {
  const { action, data } = event;
  const handler = actionMap[action];

  if (!handler) {
    return fail('无效的 action');
  }

  return handler(data || {});
};
