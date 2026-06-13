import Ionicons from '@expo/vector-icons/Ionicons';
import * as ImagePicker from 'expo-image-picker';
import * as VideoThumbnails from 'expo-video-thumbnails';
import React from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { useAppTheme } from '../../hooks/useAppTheme';
import { imageService } from '../../services/imageService';
import { MediaResource } from '../../types/media';
import { CheckinAttachment } from '../../types/rank';
import { MediaPreviewer } from './MediaPreviewer';

type MediaSelectorProps = {
  value: CheckinAttachment[];
  onChange: (attachments: CheckinAttachment[]) => void;
  itemId: string;
  maxCount?: number;
  disabled?: boolean;
};

type UploadingMedia = {
  id: string;
  media_type: 'image' | 'video';
  preview_uri: string;
  name?: string;
};

const getFileExtension = (fileNameOrUri: string, mediaType: 'image' | 'video') => {
  const matched = fileNameOrUri.match(/\.([a-zA-Z0-9]+)(?:\?|$)/);
  if (matched?.[1]) {
    return matched[1].toLowerCase();
  }

  return mediaType === 'video' ? 'mp4' : 'jpg';
};

const formatDuration = (durationMs?: number) => {
  if (!durationMs) {
    return '00:00';
  }

  const totalSeconds = Math.floor(durationMs / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
};

const mapAttachmentsToMedia = (attachments: CheckinAttachment[]): MediaResource[] =>
  attachments
    .filter((attachment) => Boolean(attachment.temp_url || attachment.thumbnail_temp_url))
    .map((attachment, index) => ({
      id: attachment.file_id || `attachment-${index}`,
      uri: attachment.temp_url || attachment.thumbnail_temp_url || '',
      thumbnail:
        attachment.media_type === 'video'
          ? attachment.thumbnail_temp_url || attachment.temp_url
          : attachment.temp_url,
      type: attachment.media_type === 'video' ? 'video' : 'image',
      name: attachment.name,
      durationMs: attachment.duration_ms,
    }));

const MediaSelector: React.FC<MediaSelectorProps> = ({
  value,
  onChange,
  itemId,
  maxCount = 9,
  disabled = false,
}) => {
  const { colors, isDark } = useAppTheme();
  const [previewVisible, setPreviewVisible] = React.useState(false);
  const [previewIndex, setPreviewIndex] = React.useState(0);
  const [uploading, setUploading] = React.useState<UploadingMedia[]>([]);
  const previewMedia = React.useMemo(() => mapAttachmentsToMedia(value), [value]);

  const handlePickMedia = React.useCallback(
    async (mode: 'image' | 'video') => {
      if (disabled) {
        return;
      }

      if (value.length + uploading.length >= maxCount) {
        Alert.alert('数量已达上限', `最多可上传 ${maxCount} 个附件。`);
        return;
      }

      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('需要授权', '请先允许访问相册，才能添加附件。');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: mode === 'video' ? ['videos'] : ['images'],
        allowsMultipleSelection: mode === 'image',
        selectionLimit: Math.max(1, maxCount - value.length - uploading.length),
        quality: 0.85,
      });

      if (result.canceled || !result.assets?.length) {
        return;
      }

      const tempUploading: UploadingMedia[] = result.assets.map((asset, index) => ({
        id: `${asset.uri}-${Date.now()}-${index}`,
        media_type: mode,
        preview_uri: asset.uri,
        name: asset.fileName || `${mode}-${Date.now()}`,
      }));

      setUploading((prev) => [...prev, ...tempUploading]);

      try {
        const uploadedItems: CheckinAttachment[] = [];
        for (let index = 0; index < result.assets.length; index += 1) {
          const asset = result.assets[index];
          const mediaType = mode === 'video' ? 'video' : 'image';
          const extension = getFileExtension(asset.fileName || asset.uri, mediaType);
          const { data: pathData } = await imageService.generateCloudPath(extension, `checkins/${itemId}`);
          const uploadResult = await imageService.uploadAsset(
            asset.uri,
            pathData.cloudPath,
            asset.mimeType || (mediaType === 'video' ? 'video/mp4' : 'image/jpeg')
          );

          if (!uploadResult.success || !uploadResult.data?.fileId) {
            throw new Error(uploadResult.message || '附件上传失败');
          }

          let thumbnailFileId: string | undefined;
          let thumbnailTempUrl: string | undefined;

          if (mediaType === 'video') {
            try {
              const thumbnail = await VideoThumbnails.getThumbnailAsync(asset.uri, { time: 1000 });
              const { data: thumbPathData } = await imageService.generateCloudPath('jpg', `checkins/${itemId}`);
              const thumbUploadResult = await imageService.uploadAsset(
                thumbnail.uri,
                thumbPathData.cloudPath,
                'image/jpeg'
              );

              if (thumbUploadResult.success && thumbUploadResult.data?.fileId) {
                thumbnailFileId = thumbUploadResult.data.fileId;
                thumbnailTempUrl = thumbUploadResult.data.url || thumbnail.uri;
              } else {
                thumbnailTempUrl = thumbnail.uri;
              }
            } catch (error) {
              console.warn('[MediaSelector] video thumbnail failed', error);
            }
          }

          uploadedItems.push({
            file_id: uploadResult.data.fileId,
            media_type: mediaType,
            name: asset.fileName || `${mediaType}-${Date.now()}.${extension}`,
            temp_url: uploadResult.data.url || asset.uri,
            thumbnail_file_id: thumbnailFileId,
            thumbnail_temp_url: thumbnailTempUrl,
            duration_ms: asset.duration ?? undefined,
          });
        }

        onChange([...value, ...uploadedItems]);
      } catch (error) {
        Alert.alert('上传失败', error instanceof Error ? error.message : '附件上传失败，请稍后再试。');
      } finally {
        setUploading((prev) =>
          prev.filter((item) => !tempUploading.some((uploadingItem) => uploadingItem.id === item.id))
        );
      }
    },
    [disabled, itemId, maxCount, onChange, uploading.length, value]
  );

  const openPicker = React.useCallback(() => {
    Alert.alert('选择附件', '请选择要添加的内容', [
      {
        text: '图片',
        onPress: () => {
          void handlePickMedia('image');
        },
      },
      {
        text: '视频',
        onPress: () => {
          void handlePickMedia('video');
        },
      },
      {
        text: '取消',
        style: 'cancel',
      },
    ]);
  }, [handlePickMedia]);

  const removeAttachment = React.useCallback(
    (target: CheckinAttachment) => {
      onChange(value.filter((attachment) => attachment.file_id !== target.file_id));
    },
    [onChange, value]
  );

  return (
    <View>
      <View style={styles.header}>
        <View>
          <Text style={[styles.title, { color: colors.text }]}>媒体附件</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            图片和视频都会显示为九宫格，可点击预览
          </Text>
        </View>
        <Text style={[styles.count, { color: colors.textSecondary }]}>
          {value.length}/{maxCount}
        </Text>
      </View>

      <View style={styles.grid}>
        {value.map((attachment, index) => {
          const previewUri =
            attachment.media_type === 'video'
              ? attachment.thumbnail_temp_url || attachment.temp_url
              : attachment.temp_url;

          return (
            <Pressable
              key={attachment.file_id}
              onPress={() => {
                setPreviewIndex(index);
                setPreviewVisible(true);
              }}
              style={[
                styles.card,
                {
                  backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : '#F8FBFF',
                  borderColor: colors.border,
                },
              ]}
            >
              {previewUri ? (
                <Image source={{ uri: previewUri }} style={styles.cover} />
              ) : (
                <View
                  style={[
                    styles.coverFallback,
                    { backgroundColor: isDark ? 'rgba(255,155,122,0.14)' : 'rgba(255,122,89,0.08)' },
                  ]}
                >
                  <Ionicons
                    name={attachment.media_type === 'video' ? 'videocam' : 'image'}
                    size={20}
                    color={colors.primary}
                  />
                </View>
              )}

              {attachment.media_type === 'video' ? (
                <>
                  <View style={styles.playOverlay}>
                    <Ionicons name="play-circle" size={26} color="rgba(255,255,255,0.92)" />
                  </View>
                  <View style={styles.durationBadge}>
                    <Text style={styles.durationText}>{formatDuration(attachment.duration_ms)}</Text>
                  </View>
                </>
              ) : null}

              <Pressable onPress={() => removeAttachment(attachment)} style={styles.removeButton}>
                <Ionicons name="close-circle" size={22} color="#FFFFFF" />
              </Pressable>
            </Pressable>
          );
        })}

        {uploading.map((attachment) => (
          <View
            key={attachment.id}
            style={[
              styles.card,
              {
                backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : '#F8FBFF',
                borderColor: colors.border,
              },
            ]}
          >
            <Image source={{ uri: attachment.preview_uri }} style={styles.cover} />
            <View style={styles.uploadingOverlay}>
              <ActivityIndicator color="#FFFFFF" />
              <Text style={styles.uploadingText}>上传中</Text>
            </View>
          </View>
        ))}

        {value.length + uploading.length < maxCount ? (
          <Pressable
            onPress={openPicker}
            disabled={disabled}
            style={[
              styles.addCard,
              {
                backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : '#F8FBFF',
                borderColor: colors.border,
                opacity: disabled ? 0.6 : 1,
              },
            ]}
          >
            <Ionicons name="add-circle-outline" size={28} color={colors.primary} />
            <Text style={[styles.addText, { color: colors.textSecondary }]}>添加附件</Text>
          </Pressable>
        ) : null}
      </View>

      <MediaPreviewer
        visible={previewVisible}
        media={previewMedia}
        initialIndex={previewIndex}
        onClose={() => setPreviewVisible(false)}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    gap: 12,
  },
  title: {
    fontSize: 15,
    fontWeight: '800',
  },
  subtitle: {
    marginTop: 4,
    fontSize: 12,
  },
  count: {
    fontSize: 12,
    fontWeight: '700',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  card: {
    width: 102,
    height: 102,
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
    position: 'relative',
  },
  addCard: {
    width: 102,
    height: 102,
    borderRadius: 16,
    borderWidth: 1,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addText: {
    marginTop: 6,
    fontSize: 12,
    fontWeight: '600',
  },
  cover: {
    width: '100%',
    height: '100%',
  },
  coverFallback: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  removeButton: {
    position: 'absolute',
    top: 6,
    right: 6,
  },
  playOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  durationBadge: {
    position: 'absolute',
    right: 6,
    bottom: 6,
    backgroundColor: 'rgba(0,0,0,0.68)',
    borderRadius: 999,
    paddingHorizontal: 6,
    paddingVertical: 3,
  },
  durationText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
  },
  uploadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(15,23,42,0.58)',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  uploadingText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
});

export default MediaSelector;
