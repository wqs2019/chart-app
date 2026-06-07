import React, { useMemo, useState } from 'react';
import {
  Alert,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { useAppTheme } from '../../hooks/useAppTheme';
import userService from '../../services/userService';
import { User } from '../../types/user';
import Button from '../../components/common/Button';
import CommonModal from '../../components/common/CommonModal';

const UserDemoScreen: React.FC = () => {
  const { colors } = useAppTheme();
  const [userId, setUserId] = useState('');
  const [nickname, setNickname] = useState('Demo User');
  const [loading, setLoading] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [modalVisible, setModalVisible] = useState(false);

  const prettyCurrentUser = useMemo(() => {
    return currentUser ? JSON.stringify(currentUser, null, 2) : '暂无数据';
  }, [currentUser]);

  const prettyUsers = useMemo(() => {
    return users.length ? JSON.stringify(users, null, 2) : '暂无数据';
  }, [users]);

  const runAction = async (action: () => Promise<void>) => {
    try {
      setLoading(true);
      await action();
    } catch (error: any) {
      Alert.alert('请求失败', error?.message || '请先确认 TCB 配置和云函数部署');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () =>
    runAction(async () => {
      const created = await userService.createUser({
        phone: `138${Date.now().toString().slice(-8)}`,
        nickname: nickname || 'Demo User',
        bio: 'This is a demo user from scaffold template.',
      });
      setCurrentUser(created);
      setUserId(created._id);
      Alert.alert('创建成功', `新用户 ID: ${created._id}`);
    });

  const handleGet = () =>
    runAction(async () => {
      if (!userId.trim()) {
        throw new Error('请先输入用户 ID');
      }
      const user = await userService.getUser(userId.trim());
      setCurrentUser(user);
    });

  const handleList = () =>
    runAction(async () => {
      const result = await userService.listUsers();
      setUsers(result);
    });

  const handleUpdate = () =>
    runAction(async () => {
      if (!userId.trim()) {
        throw new Error('请先输入用户 ID');
      }
      await userService.updateUser(userId.trim(), {
        nickname: nickname || 'Updated Demo User',
      });
      const refreshed = await userService.getUser(userId.trim());
      setCurrentUser(refreshed);
      Alert.alert('更新成功', '昵称已更新');
    });

  const handleDelete = () =>
    runAction(async () => {
      if (!userId.trim()) {
        throw new Error('请先输入用户 ID');
      }
      await userService.deleteUser(userId.trim());
      setCurrentUser(null);
      setUserId('');
      Alert.alert('删除成功', '该用户已删除');
    });

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.title, { color: colors.text }]}>User Demo</Text>
          <Text style={[styles.desc, { color: colors.textSecondary }]}>
            这是模板保留的最小 demo，用于验证前端 service 和云函数 `user` 的连通性。
          </Text>
        </View>

        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.label, { color: colors.text }]}>用户 ID</Text>
          <TextInput
            value={userId}
            onChangeText={setUserId}
            placeholder="输入已存在的用户 ID"
            placeholderTextColor={colors.textSecondary}
            style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background }]}
            autoCapitalize="none"
          />

          <Text style={[styles.label, { color: colors.text, marginTop: 12 }]}>昵称</Text>
          <TextInput
            value={nickname}
            onChangeText={setNickname}
            placeholder="输入 demo 昵称"
            placeholderTextColor={colors.textSecondary}
            style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background }]}
          />

          <View style={styles.buttonGroup}>
            <Button
              title={loading ? '处理中...' : '创建 Demo 用户'}
              onPress={handleCreate}
              loading={loading}
            />
            <Button
              title="按 ID 查询"
              onPress={handleGet}
              variant="secondary"
            />
            <Button
              title="更新昵称"
              onPress={handleUpdate}
              variant="secondary"
            />
            <Button
              title="获取用户列表"
              onPress={handleList}
              variant="secondary"
            />
            <Button
              title="删除用户"
              onPress={handleDelete}
              variant="danger"
            />
            <Button
              title="测试弹窗"
              onPress={() => setModalVisible(true)}
              variant="secondary"
              style={{ marginTop: 10 }}
            />
          </View>
        </View>

        <CommonModal
          visible={modalVisible}
          onClose={() => setModalVisible(false)}
          title="示例弹窗"
        >
          <Text style={{ color: colors.text }}>这是一个 CommonModal 示例。</Text>
        </CommonModal>

        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>当前用户</Text>
          <Text style={[styles.codeBlock, { color: colors.text, backgroundColor: colors.background }]}>{prettyCurrentUser}</Text>
        </View>

        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>用户列表</Text>
          <Text style={[styles.codeBlock, { color: colors.text, backgroundColor: colors.background }]}>{prettyUsers}</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  content: { padding: 16, gap: 16 },
  card: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
  },
  desc: {
    marginTop: 8,
    fontSize: 14,
    lineHeight: 22,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 14,
  },
  buttonGroup: {
    marginTop: 16,
    gap: 10,
  },
  button: {
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: 'center',
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
  },
  dangerButton: {
    backgroundColor: '#EF4444',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  secondaryButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 12,
  },
  codeBlock: {
    borderRadius: 12,
    padding: 12,
    fontSize: 12,
    lineHeight: 18,
    fontFamily: 'Courier',
  },
});

export default UserDemoScreen;
