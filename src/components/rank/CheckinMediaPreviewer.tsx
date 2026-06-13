import Ionicons from '@expo/vector-icons/Ionicons';
import { Video, ResizeMode } from 'expo-av';
import React from 'react';
import {
  Dimensions,
  FlatList,
  Image,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { useAppTheme } from '../../hooks/useAppTheme';
import { CheckinAttachment } from '../../types/rank';

const { width, height } = Dimensions.get('window');

type CheckinMediaPreviewerProps = {
  visible: boolean;
  attachments: CheckinAttachment[];
  initialIndex: number;
  onClose: () => void;
};

const CheckinMediaPreviewer: React.FC<CheckinMediaPreviewerProps> = ({
  visible,
  attachments,
  initialIndex,
  onClose,
}) => {
  const { colors } = useAppTheme();
  const [currentIndex, setCurrentIndex] = React.useState(initialIndex);

  React.useEffect(() => {
    if (visible) {
      setCurrentIndex(initialIndex);
    }
  }, [initialIndex, visible]);

  const renderItem = ({ item }: { item: CheckinAttachment }) => {
    const sourceUri = item.temp_url;

    return (
      <View style={styles.slide}>
        {item.media_type === 'video' ? (
          sourceUri ? (
            <Video
              source={{ uri: sourceUri }}
              style={styles.media}
              resizeMode={ResizeMode.CONTAIN}
              useNativeControls
              shouldPlay
            />
          ) : (
            <View style={styles.videoFallback}>
              <Ionicons name="videocam" size={44} color="#FFFFFF" />
              <Text style={styles.videoFallbackText}>视频暂不可预览</Text>
            </View>
          )
        ) : (
          <Image source={{ uri: sourceUri }} style={styles.media} resizeMode="contain" />
        )}
      </View>
    );
  };

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.counter}>
            {attachments.length ? `${currentIndex + 1} / ${attachments.length}` : '0 / 0'}
          </Text>
          <Pressable onPress={onClose} style={[styles.closeButton, { backgroundColor: 'rgba(15,23,42,0.56)' }]}>
            <Ionicons name="close" size={22} color="#FFFFFF" />
          </Pressable>
        </View>

        <FlatList
          data={attachments}
          horizontal
          pagingEnabled
          initialScrollIndex={Math.max(0, Math.min(initialIndex, attachments.length - 1))}
          keyExtractor={(item, index) => `${item.file_id}-${index}`}
          renderItem={renderItem}
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={(event) => {
            const nextIndex = Math.round(event.nativeEvent.contentOffset.x / width);
            setCurrentIndex(nextIndex);
          }}
          getItemLayout={(_, index) => ({
            length: width,
            offset: width * index,
            index,
          })}
        />

        <View style={[styles.footerHint, { backgroundColor: 'rgba(15,23,42,0.56)' }]}>
          <Text style={[styles.footerHintText, { color: colors.textSecondary }]}>
            左右滑动查看附件
          </Text>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  header: {
    position: 'absolute',
    top: 56,
    left: 16,
    right: 16,
    zIndex: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  counter: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  slide: {
    width,
    height,
    alignItems: 'center',
    justifyContent: 'center',
  },
  media: {
    width: width,
    height: height * 0.82,
  },
  videoFallback: {
    width: width * 0.7,
    height: width * 0.7,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  videoFallbackText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  footerHint: {
    position: 'absolute',
    bottom: 40,
    alignSelf: 'center',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  footerHintText: {
    fontSize: 12,
    color: '#CBD5E1',
  },
});

export default CheckinMediaPreviewer;
