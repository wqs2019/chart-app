import Ionicons from '@expo/vector-icons/Ionicons';
import React, { useMemo, useState } from 'react';
import { Dimensions, Image, Pressable, StyleSheet, Text, View } from 'react-native';

import { MediaResource } from '../../types/media';
import { MediaPreviewer } from './MediaPreviewer';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const IMAGE_MARGIN = 4;

interface NineGridMediaProps {
  media: MediaResource[];
  containerWidth?: number;
}

export const NineGridMedia: React.FC<NineGridMediaProps> = ({
  media,
  containerWidth = SCREEN_WIDTH - 32,
}) => {
  const [previewVisible, setPreviewVisible] = useState(false);
  const [previewIndex, setPreviewIndex] = useState(0);

  const safeMedia = useMemo(() => media.filter((item) => Boolean(item?.uri || item?.thumbnail)), [media]);

  if (!safeMedia.length) {
    return null;
  }

  const mediaCount = safeMedia.length;

  const getLayout = () => {
    if (mediaCount === 1) {
      return { columns: 1, itemWidth: Math.floor(containerWidth * 0.7) };
    }

    if (mediaCount === 2 || mediaCount === 4) {
      return { columns: 2, itemWidth: Math.floor((containerWidth - IMAGE_MARGIN) / 2) };
    }

    return { columns: 3, itemWidth: Math.floor((containerWidth - IMAGE_MARGIN * 2) / 3) };
  };

  const { columns, itemWidth } = getLayout();

  return (
    <View style={[styles.mediaGrid, { width: containerWidth }]}>
      {safeMedia.map((mediaItem, index) => {
        const isLastInRow = (index + 1) % columns === 0;
        const isLastRow = Math.floor(index / columns) === Math.floor((mediaCount - 1) / columns);

        return (
          <Pressable
            key={mediaItem.id || `${mediaItem.uri}-${index}`}
            onPress={() => {
              setPreviewIndex(index);
              setPreviewVisible(true);
            }}
            style={[
              styles.mediaWrapper,
              {
                width: itemWidth,
                height: itemWidth,
                marginRight: isLastInRow ? 0 : IMAGE_MARGIN,
                marginBottom: isLastRow ? 0 : IMAGE_MARGIN,
              },
            ]}
          >
            {mediaItem.thumbnail || mediaItem.uri ? (
              <Image source={{ uri: mediaItem.thumbnail || mediaItem.uri }} style={styles.mediaImage} resizeMode="cover" />
            ) : (
              <View style={styles.mediaFallback}>
                <Ionicons
                  name={mediaItem.type === 'video' ? 'videocam-outline' : mediaItem.type === 'livePhoto' ? 'aperture-outline' : 'image-outline'}
                  size={24}
                  color="#FFFFFF"
                />
              </View>
            )}

            {mediaItem.type === 'video' ? (
              <View style={styles.playOverlay}>
                <Ionicons name="play" size={Math.max(18, itemWidth * 0.22)} color="#FFF" />
              </View>
            ) : null}

            {mediaItem.type === 'livePhoto' ? (
              <View style={styles.liveBadge}>
                <Ionicons name="aperture" size={12} color="#FFF" />
                <Text style={styles.liveText}>实况</Text>
              </View>
            ) : null}
          </Pressable>
        );
      })}

      <MediaPreviewer
        visible={previewVisible}
        media={safeMedia}
        initialIndex={previewIndex}
        onClose={() => setPreviewVisible(false)}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  mediaGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  mediaWrapper: {
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#F3F4F6',
  },
  mediaImage: {
    width: '100%',
    height: '100%',
  },
  mediaFallback: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#CBD5E1',
  },
  playOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  liveBadge: {
    position: 'absolute',
    top: 4,
    left: 4,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 4,
  },
  liveText: {
    color: '#FFF',
    fontSize: 10,
    marginLeft: 2,
  },
});
