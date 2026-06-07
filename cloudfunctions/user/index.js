const cloud = require('@cloudbase/node-sdk');

const app = cloud.init({
  env: cloud.SYMBOL_CURRENT_ENV,
});

const db = app.database();
const usersCollection = db.collection('users');

const getDocData = (result) =>
  result && result.data ? (Array.isArray(result.data) ? result.data[0] : result.data) : null;

const addUser = async (data = {}) => {
  try {
    const payload = {
      phone: data.phone || '',
      nickname: data.nickname || 'Demo User',
      avatar: data.avatar || '',
      bio: data.bio || '',
      createdAt: db.serverDate(),
      updatedAt: db.serverDate(),
    };

    const result = await usersCollection.add(payload);

    return {
      success: true,
      data: {
        _id: result.id || result._id,
        ...payload,
      },
    };
  } catch (error) {
    console.error('addUser error:', error);
    return {
      success: false,
      message: '创建用户失败',
      error: error.message,
    };
  }
};

const getUser = async (data = {}) => {
  try {
    if (!data._id) {
      return { success: false, message: '缺少用户 ID' };
    }

    const result = await usersCollection.doc(data._id).get();
    const user = getDocData(result);

    if (!user) {
      return { success: false, message: '用户不存在' };
    }

    return {
      success: true,
      data: user,
    };
  } catch (error) {
    console.error('getUser error:', error);
    return {
      success: false,
      message: '获取用户失败',
      error: error.message,
    };
  }
};

const listUsers = async () => {
  try {
    const result = await usersCollection.orderBy('createdAt', 'desc').limit(50).get();
    return {
      success: true,
      data: result.data || [],
    };
  } catch (error) {
    console.error('listUsers error:', error);
    return {
      success: false,
      message: '获取用户列表失败',
      error: error.message,
    };
  }
};

const updateUser = async (data = {}) => {
  try {
    const { _id, ...updateData } = data;
    if (!_id) {
      return { success: false, message: '缺少用户 ID' };
    }

    await usersCollection.doc(_id).update({
      ...updateData,
      updatedAt: db.serverDate(),
    });

    return {
      success: true,
      data: true,
    };
  } catch (error) {
    console.error('updateUser error:', error);
    return {
      success: false,
      message: '更新用户失败',
      error: error.message,
    };
  }
};

const deleteUser = async (data = {}) => {
  try {
    if (!data._id) {
      return { success: false, message: '缺少用户 ID' };
    }

    await usersCollection.doc(data._id).remove();
    return {
      success: true,
      data: true,
    };
  } catch (error) {
    console.error('deleteUser error:', error);
    return {
      success: false,
      message: '删除用户失败',
      error: error.message,
    };
  }
};

exports.main = async (event) => {
  const { action, data } = event;

  switch (action) {
    case 'add':
      return await addUser(data);
    case 'get':
      return await getUser(data);
    case 'list':
      return await listUsers();
    case 'update':
      return await updateUser(data);
    case 'delete':
      return await deleteUser(data);
    default:
      return {
        success: false,
        message: '无效的 action',
      };
  }
};
