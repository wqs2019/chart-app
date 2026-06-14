import Ionicons from '@expo/vector-icons/Ionicons';
import * as ImagePicker from 'expo-image-picker';
import React from 'react';
import {
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import Button from '../../components/common/Button';
import { useAppTheme } from '../../hooks/useAppTheme';
import { RootStackParamList } from '../../navigation/RootNavigator';
import authService from '../../services/authService';
import imageService from '../../services/imageService';
import CloudService from '../../services/tcb';
import { useAppStore } from '../../store/appStore';
import { AuthUser, User } from '../../types/user';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';

const getFileExtension = (fileNameOrUri: string) => {
  const matched = fileNameOrUri.match(/\.([a-zA-Z0-9]+)(?:\?|$)/);
  return matched?.[1]?.toLowerCase() || 'jpg';
};

const mapUserToAuthUser = (user: User, fallback: AuthUser): AuthUser => ({
  _id: user._id,
  appleUserId: user.apple_user_id || fallback.appleUserId,
  email: user.email || fallback.email,
  fullName: user.full_name || fallback.fullName,
  username: user.username || fallback.username,
  profile: user.profile || fallback.profile || {},
});

const EditProfileScreen: React.FC = () => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { colors, isDark } = useAppTheme();
  const currentUser = useAppStore((state) => state.currentUser);
  const updateCurrentUser = useAppStore((state) => state.updateCurrentUser);

  const [displayName, setDisplayName] = React.useState(currentUser?.fullName || currentUser?.profile?.nickname || '');
  const [bio, setBio] = React.useState(currentUser?.profile?.bio || '');
  const [avatarUrl, setAvatarUrl] = React.useState(currentUser?.profile?.avatar_url || '');
  const [avatarFileId, setAvatarFileId] = React.useState(currentUser?.profile?.avatar_file_id || '');
  const [uploadingAvatar, setUploadingAvatar] = React.useState(false);
  const [saving, setSaving] = React.useState(false);

  const avatarFallback = React.useMemo(() => {
    return (displayName || '我').trim().charAt(0).toUpperCase() || '我';
  }, [displayName]);

  const handlePickAvatar = React.useCallback(async () => {
    if (!currentUser?._id || uploadingAvatar) {
      return;
    }

    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('需要授权', '请先允许访问相册，才能设置头像。');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.85,
    });

    if (result.canceled || !result.assets?.length) {
      return;
    }

    const asset = result.assets[0];

    try {
      setUploadingAvatar(true);
      const extension = getFileExtension(asset.fileName || asset.uri);
      const { data: pathData } = await imageService.generateCloudPath(extension, `avatars/${currentUser._id}`);
      const uploadResult = await imageService.uploadAsset(
        asset.uri,
        pathData.cloudPath,
        asset.mimeType || 'image/jpeg'
      );

      if (!uploadResult.success || !uploadResult.data?.fileId) {
        throw new Error(uploadResult.message || '头像上传失败');
      }

      const tempUrlMap = await CloudService.getTempFileURLs([uploadResult.data.fileId]);
      const resolvedAvatarUrl = tempUrlMap[uploadResult.data.fileId] || uploadResult.data.url || '';

      if (!resolvedAvatarUrl) {
        throw new Error('头像上传成功，但暂时无法获取可访问地址');
      }

      setAvatarFileId(uploadResult.data.fileId);
      setAvatarUrl(resolvedAvatarUrl);
    } catch (error) {
      Alert.alert('上传失败', error instanceof Error ? error.message : '头像上传失败，请稍后重试。');
    } finally {
      setUploadingAvatar(false);
    }
  }, [currentUser?._id, uploadingAvatar]);

  const handleSave = React.useCallback(async () => {
    if (!currentUser?._id) {
      return;
    }

    const trimmedDisplayName = displayName.trim();
    const trimmedBio = bio.trim();

    if (!trimmedDisplayName) {
      Alert.alert('请填写用户昵称', '用户昵称会用于个人主页和排行榜展示。');
      return;
    }

    try {
      setSaving(true);
      await authService.updateUser({
        _id: currentUser._id,
        full_name: trimmedDisplayName,
        profile: {
          nickname: trimmedDisplayName,
          bio: trimmedBio,
          avatar_url: avatarUrl,
          avatar_file_id: avatarFileId,
        },
      });

      const nextUser = await authService.getUser(currentUser._id);
      await updateCurrentUser(mapUserToAuthUser(nextUser, currentUser));
      Alert.alert('保存成功', '个人资料已更新。', [{ text: '好的', onPress: () => navigation.goBack() }]);
    } catch (error) {
      Alert.alert('保存失败', error instanceof Error ? error.message : '更新资料失败，请稍后重试。');
    } finally {
      setSaving(false);
    }
  }, [avatarFileId, avatarUrl, bio, currentUser, displayName, navigation, updateCurrentUser]);

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]} edges={['bottom']}>
      <KeyboardAvoidingView
        style={styles.safeArea}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View style={[styles.heroCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.eyebrow, { color: colors.textSecondary }]}>PROFILE EDITOR</Text>
            <Text style={[styles.title, { color: colors.text }]}>编辑个人资料</Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
              更新你的用户昵称、头像和简介，这些信息会同步到个人主页和榜单展示。
            </Text>

            <View style={styles.avatarSection}>
              <Pressable
                onPress={handlePickAvatar}
                style={[
                  styles.avatarWrap,
                  {
                    borderColor: colors.border,
                    backgroundColor: isDark ? 'rgba(255,155,122,0.12)' : 'rgba(255,122,89,0.08)',
                  },
                ]}
              >
                {avatarUrl ? (
                  <Image source={{ uri: avatarUrl }} style={styles.avatar} />
                ) : (
                  <Text style={[styles.avatarFallback, { color: colors.primary }]}>{avatarFallback}</Text>
                )}
                <View style={[styles.avatarBadge, { backgroundColor: colors.primary }]}>
                  <Ionicons name={uploadingAvatar ? 'cloud-upload' : 'camera'} size={14} color="#FFFFFF" />
                </View>
              </Pressable>
              <View style={styles.avatarTextWrap}>
                <Text style={[styles.avatarTitle, { color: colors.text }]}>头像</Text>
                <Text style={[styles.avatarHint, { color: colors.textSecondary }]}>
                  {uploadingAvatar ? '正在上传头像...' : '建议使用清晰的方形头像，点击即可更换。'}
                </Text>
              </View>
            </View>
          </View>

          <View style={[styles.formCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.fieldGroup}>
              <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>用户昵称</Text>
              <TextInput
                value={displayName}
                onChangeText={setDisplayName}
                placeholder="例如：青石"
                placeholderTextColor={colors.textSecondary}
                style={[
                  styles.input,
                  {
                    color: colors.text,
                    borderColor: colors.border,
                    backgroundColor: isDark ? 'rgba(255,255,255,0.02)' : '#F8FBFF',
                  },
                ]}
              />
            </View>

            <View style={styles.fieldGroup}>
              <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>个人简介</Text>
              <TextInput
                value={bio}
                onChangeText={setBio}
                multiline
                maxLength={120}
                textAlignVertical="top"
                placeholder="写一句关于你的旅行偏好或自我介绍"
                placeholderTextColor={colors.textSecondary}
                style={[
                  styles.input,
                  styles.textarea,
                  {
                    color: colors.text,
                    borderColor: colors.border,
                    backgroundColor: isDark ? 'rgba(255,255,255,0.02)' : '#F8FBFF',
                  },
                ]}
              />
              <Text style={[styles.counter, { color: colors.textSecondary }]}>{bio.length}/120</Text>
            </View>

            <View
              style={[
                styles.readonlyCard,
                {
                  borderColor: colors.border,
                  backgroundColor: isDark ? 'rgba(255,255,255,0.02)' : '#F8FBFF',
                },
              ]}
            >
              <Text style={[styles.readonlyLabel, { color: colors.textSecondary }]}>当前邮箱</Text>
              <Text style={[styles.readonlyValue, { color: colors.text }]}>{currentUser?.email || '未公开'}</Text>
            </View>
          </View>

          <View style={styles.footer}>
            <Button title="保存资料" loading={saving} onPress={handleSave} />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingBottom: 40,
    gap: 16,
  },
  heroCard: {
    borderWidth: 0,
    borderRadius: 28,
    padding: 20,
  },
  eyebrow: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1,
  },
  title: {
    marginTop: 8,
    fontSize: 28,
    fontWeight: '900',
  },
  subtitle: {
    marginTop: 10,
    fontSize: 14,
    lineHeight: 21,
  },
  avatarSection: {
    marginTop: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  avatarWrap: {
    width: 84,
    height: 84,
    borderRadius: 28,
    borderWidth: 1,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  avatar: {
    width: '100%',
    height: '100%',
  },
  avatarFallback: {
    fontSize: 30,
    fontWeight: '900',
  },
  avatarBadge: {
    position: 'absolute',
    right: 8,
    bottom: 8,
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarTextWrap: {
    flex: 1,
  },
  avatarTitle: {
    fontSize: 17,
    fontWeight: '800',
  },
  avatarHint: {
    marginTop: 6,
    fontSize: 13,
    lineHeight: 19,
  },
  formCard: {
    borderWidth: 0,
    borderRadius: 24,
    padding: 18,
    gap: 16,
  },
  fieldGroup: {
    gap: 8,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '700',
  },
  input: {
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 14,
    fontSize: 15,
  },
  textarea: {
    minHeight: 110,
  },
  counter: {
    alignSelf: 'flex-end',
    fontSize: 12,
  },
  readonlyCard: {
    borderWidth: 0,
    borderRadius: 16,
    padding: 14,
  },
  readonlyLabel: {
    fontSize: 12,
    fontWeight: '700',
  },
  readonlyValue: {
    marginTop: 6,
    fontSize: 15,
    fontWeight: '700',
  },
  footer: {
    paddingTop: 8,
  },
});

export default EditProfileScreen;
