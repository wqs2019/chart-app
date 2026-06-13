const cloud = require('@cloudbase/node-sdk');
const crypto = require('crypto');

const app = cloud.init({
  env: cloud.SYMBOL_CURRENT_ENV,
});

const db = app.database();
const usersCollection = db.collection('chart_users');
const SESSION_TTL_MS = 365 * 24 * 60 * 60 * 1000;

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

function generateSessionToken(userId) {
  const timestamp = Date.now();
  const randomStr = Math.random().toString(36).slice(2, 12);
  const signature = crypto.createHash('md5').update(`${userId}.${timestamp}.${randomStr}`).digest('hex');
  return `${userId}.${timestamp}.${signature}`;
}

function buildAuthUser(user = {}) {
  return {
    _id: user._id,
    appleUserId: user.apple_user_id || '',
    email: user.email || null,
    fullName: user.full_name || null,
    username: user.username || '',
    profile: user.profile || {},
  };
}

function buildSessionPayload(user = {}, token) {
  return {
    token,
    user: buildAuthUser(user),
  };
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
    console.log('chart_user.findUserById fallback to where:', error);
  }

  const fallback = await usersCollection.where({ _id: userId }).limit(1).get();
  return getDocData(fallback);
}

async function findUserByAppleId(appleUserId) {
  if (!appleUserId) {
    return null;
  }

  const result = await usersCollection.where({ apple_user_id: appleUserId }).limit(1).get();
  return getDocData(result);
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

function buildAppleUserPayload(data = {}) {
  const nickname = data.fullName || `Apple用户${String(data.userId || '').slice(-4) || '0000'}`;

  return {
    phone: '',
    email: data.email || '',
    username: data.username || `apple_${String(data.userId || '').slice(-8)}`,
    apple_user_id: data.userId,
    full_name: data.fullName || '',
    profile: {
      nickname,
      avatar_url: '',
      bio: '',
      primary_tag: '成就起步者',
    },
    stats: createDefaultStats(),
    status: 'active',
    session_token: '',
    session_issued_at: null,
    last_login_at: db.serverDate(),
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

async function appleLogin(data = {}) {
  try {
    const { userId, email, fullName } = data;
    if (!userId) {
      return fail('缺少 Apple 用户标识');
    }

    let user = await findUserByAppleId(userId);

    if (!user) {
      const payload = buildAppleUserPayload({
        userId,
        email,
        fullName,
      });
      const result = await usersCollection.add(payload);
      user = {
        _id: result.id || result._id,
        ...payload,
      };
    } else {
      const userIdForUpdate = user._id;
      const nextProfile = {
        ...(user.profile || {}),
        ...(fullName ? { nickname: fullName } : {}),
      };

      const payload = {
        email: email || user.email || '',
        full_name: fullName || user.full_name || '',
        username: user.username || `apple_${String(userId).slice(-8)}`,
        profile: nextProfile,
        last_login_at: db.serverDate(),
        updated_at: db.serverDate(),
      };

      await usersCollection.doc(userIdForUpdate).update(payload);
      user = {
        ...user,
        ...payload,
      };
    }

    const token = generateSessionToken(user._id);
    await usersCollection.doc(user._id).update({
      session_token: token,
      session_issued_at: Date.now(),
      last_login_at: db.serverDate(),
      updated_at: db.serverDate(),
    });

    return ok(buildSessionPayload(user, token));
  } catch (error) {
    console.error('chart_user.appleLogin error:', error);
    return fail('Apple 登录失败', error);
  }
}

async function validateSession(data = {}) {
  try {
    const { token } = data;
    if (!token) {
      return fail('缺少登录 token');
    }

    const tokenParts = token.split('.');
    if (tokenParts.length !== 3) {
      return fail('token 格式错误');
    }

    const [userId, timestamp] = tokenParts;
    if (!userId || !timestamp) {
      return fail('token 内容无效');
    }

    if (Date.now() - Number(timestamp) > SESSION_TTL_MS) {
      return fail('登录已过期');
    }

    const user = await findUserById(userId);
    if (!user) {
      return fail('用户不存在');
    }

    if (user.status && user.status !== 'active') {
      return fail('当前账户不可用');
    }

    if (!user.session_token || user.session_token !== token) {
      return fail('登录态已失效');
    }

    return ok(buildSessionPayload(user, token));
  } catch (error) {
    console.error('chart_user.validateSession error:', error);
    return fail('登录态校验失败', error);
  }
}

const actionMap = {
  add: addUser,
  get: getUser,
  list: listUsers,
  update: updateUser,
  delete: deleteUser,
  appleLogin,
  validateSession,
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
