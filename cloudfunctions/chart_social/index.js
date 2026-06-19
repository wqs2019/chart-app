const cloud = require('@cloudbase/node-sdk');
const https = require('https');

const app = cloud.init({
  env: cloud.SYMBOL_CURRENT_ENV,
});

const db = app.database();
const _ = db.command;
const usersCollection = db.collection('chart_users');
const followsCollection = db.collection('chart_follows');
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
    console.log('chart_social.findUserById fallback to where:', error);
  }

  const fallback = await usersCollection.where({ _id: userId }).limit(1).get();
  return getDocData(fallback);
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

async function createFollowNotification(actor, target) {
  const actorName = buildDisplayName(actor);
  const actorAvatar = (actor.profile && actor.profile.avatar_url) || '';
  const title = '收到新的关注';
  const content = `${actorName} 关注了你`;

  await notificationsCollection.add({
    receiver_user_id: target._id,
    sender_user_id: actor._id,
    type: 'follow',
    title,
    content,
    related_id: actor._id,
    is_read: false,
    sender_snapshot: {
      display_name: actorName,
      avatar_url: actorAvatar,
    },
    extra_data: {
      screen: 'OverallDiaryFeed',
      params: {
        viewedUserId: actor._id,
        viewedUserName: actorName,
        viewedAvatarUrl: actorAvatar,
      },
      viewed_user_id: actor._id,
      viewed_user_name: actorName,
      viewed_avatar_url: actorAvatar,
    },
    created_at: db.serverDate(),
    updated_at: db.serverDate(),
  });

  if (target.push_token) {
    await sendPushNotification(target.push_token, title, content, {
      type: 'follow',
      screen: 'OverallDiaryFeed',
      params: {
        viewedUserId: actor._id,
        viewedUserName: actorName,
        viewedAvatarUrl: actorAvatar,
      },
      viewedUserId: actor._id,
      viewedUserName: actorName,
      viewedAvatarUrl: actorAvatar,
    });
  }
}

function buildFollowRow(relation = {}, user = {}, viewerFollowingSet) {
  return {
    relation_id: relation._id || '',
    user_id: user._id || relation.follower_user_id || relation.followed_user_id || '',
    display_name: buildDisplayName(user),
    avatar_url: (user.profile && user.profile.avatar_url) || '',
    bio: (user.profile && user.profile.bio) || '',
    followed_at: relation.updated_at || relation.created_at || '',
    is_unread: Boolean(relation.followed_user_unread),
    viewer_is_following: viewerFollowingSet ? viewerFollowingSet.has(user._id) : false,
  };
}

async function getUserMapByIds(userIds = []) {
  const uniqueIds = Array.from(new Set(userIds.filter(Boolean)));
  if (uniqueIds.length === 0) {
    return new Map();
  }

  const result = await usersCollection.where({
    _id: _.in(uniqueIds),
  }).get();

  return new Map((result.data || []).map((user) => [user._id, user]));
}

async function buildViewerFollowingSet(viewerUserId) {
  if (!viewerUserId) {
    return new Set();
  }

  const result = await followsCollection
    .where({
      follower_user_id: viewerUserId,
      status: 'active',
    })
    .limit(1000)
    .get();

  return new Set((result.data || []).map((item) => item.followed_user_id).filter(Boolean));
}

async function buildSocialSummary(userId, viewerUserId) {
  const [followersCountResult, followingCountResult, unreadCountResult] = await Promise.all([
    followsCollection.where({ followed_user_id: userId, status: 'active' }).count(),
    followsCollection.where({ follower_user_id: userId, status: 'active' }).count(),
    followsCollection.where({ followed_user_id: userId, status: 'active', followed_user_unread: true }).count(),
  ]);

  let viewerIsFollowing = false;
  if (viewerUserId && viewerUserId !== userId) {
    const viewerFollowResult = await followsCollection
      .where({
        follower_user_id: viewerUserId,
        followed_user_id: userId,
        status: 'active',
      })
      .limit(1)
      .get();

    viewerIsFollowing = (viewerFollowResult.data || []).length > 0;
  }

  return {
    follower_count: followersCountResult.total || 0,
    following_count: followingCountResult.total || 0,
    unread_follower_count: unreadCountResult.total || 0,
    viewer_is_following: viewerIsFollowing,
  };
}

async function getSocialSummary(data = {}) {
  try {
    const { userId, viewerUserId } = data;
    if (!userId) {
      return fail('缺少用户 ID');
    }

    return ok(await buildSocialSummary(userId, viewerUserId || userId));
  } catch (error) {
    console.error('chart_social.getSocialSummary error:', error);
    return fail('获取社交概览失败', error);
  }
}

async function toggleFollow(data = {}) {
  try {
    const { userId, targetUserId } = data;
    if (!userId || !targetUserId) {
      return fail('缺少用户 ID');
    }
    if (userId === targetUserId) {
      return fail('不能关注自己');
    }

    const [actor, target] = await Promise.all([findUserById(userId), findUserById(targetUserId)]);
    if (!actor || !target) {
      return fail('用户不存在');
    }

    const existingResult = await followsCollection
      .where({
        follower_user_id: userId,
        followed_user_id: targetUserId,
      })
      .limit(1)
      .get();

    const existing = getDocData(existingResult);

    const willActivate = !existing || existing.status !== 'active';

    if (!existing) {
      await followsCollection.add({
        follower_user_id: userId,
        followed_user_id: targetUserId,
        status: 'active',
        followed_user_unread: true,
        followed_user_read_at: null,
        created_at: db.serverDate(),
        updated_at: db.serverDate(),
      });
    } else {
      await followsCollection.doc(existing._id).update({
        status: existing.status === 'active' ? 'cancelled' : 'active',
        followed_user_unread: existing.status === 'active' ? false : true,
        followed_user_read_at: existing.status === 'active' ? db.serverDate() : null,
        updated_at: db.serverDate(),
      });
    }

    if (willActivate) {
      await createFollowNotification(actor, target);
    }

    return ok(await buildSocialSummary(targetUserId, userId));
  } catch (error) {
    console.error('chart_social.toggleFollow error:', error);
    return fail('切换关注状态失败', error);
  }
}

async function getFollowCenter(data = {}) {
  try {
    const { userId, viewerUserId, markFollowersRead } = data;
    if (!userId) {
      return fail('缺少用户 ID');
    }

    if (markFollowersRead) {
      await followsCollection
        .where({
          followed_user_id: userId,
          status: 'active',
          followed_user_unread: true,
        })
        .update({
          followed_user_unread: false,
          followed_user_read_at: db.serverDate(),
          updated_at: db.serverDate(),
        });
    }

    const [followersResult, followingResult, viewerFollowingSet] = await Promise.all([
      followsCollection
        .where({
          followed_user_id: userId,
          status: 'active',
        })
        .orderBy('updated_at', 'desc')
        .limit(1000)
        .get(),
      followsCollection
        .where({
          follower_user_id: userId,
          status: 'active',
        })
        .orderBy('updated_at', 'desc')
        .limit(1000)
        .get(),
      buildViewerFollowingSet(viewerUserId || userId),
    ]);

    const followers = followersResult.data || [];
    const following = followingResult.data || [];
    const userMap = await getUserMapByIds([
      ...followers.map((item) => item.follower_user_id),
      ...following.map((item) => item.followed_user_id),
    ]);

    const payload = {
      summary: await buildSocialSummary(userId, viewerUserId || userId),
      followers: followers
        .map((relation) => buildFollowRow(relation, userMap.get(relation.follower_user_id) || {}, viewerFollowingSet))
        .filter((item) => item.user_id),
      following: following
        .map((relation) => buildFollowRow(relation, userMap.get(relation.followed_user_id) || {}, viewerFollowingSet))
        .filter((item) => item.user_id),
    };

    return ok(payload);
  } catch (error) {
    console.error('chart_social.getFollowCenter error:', error);
    return fail('获取粉丝关注数据失败', error);
  }
}

async function getUnreadFollowerCount(data = {}) {
  try {
    const { userId } = data;
    if (!userId) {
      return fail('缺少用户 ID');
    }

    const result = await followsCollection
      .where({
        followed_user_id: userId,
        status: 'active',
        followed_user_unread: true,
      })
      .count();

    return ok(result.total || 0);
  } catch (error) {
    console.error('chart_social.getUnreadFollowerCount error:', error);
    return fail('获取未读粉丝数失败', error);
  }
}

const actionMap = {
  getSocialSummary,
  toggleFollow,
  getFollowCenter,
  getUnreadFollowerCount,
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
