import Ionicons from '@expo/vector-icons/Ionicons';
import React from 'react';
import { Image, Pressable, StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';

import { useAppTheme } from '../../hooks/useAppTheme';

type DiaryMasonryCardProps = {
  width: number;
  coverHeight: number;
  coverUri?: string;
  onPress: () => void;
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  placeholderText: string;
  placeholderIconName?: keyof typeof Ionicons.glyphMap;
  placeholderIconColor?: string;
  showVideoBadge?: boolean;
};

const DiaryMasonryCard: React.FC<DiaryMasonryCardProps> = ({
  width,
  coverHeight,
  coverUri,
  onPress,
  children,
  style,
  placeholderText,
  placeholderIconName = 'image-outline',
  placeholderIconColor,
  showVideoBadge = false,
}) => {
  const { colors, isDark } = useAppTheme();
  const resolvedPlaceholderIconColor = placeholderIconColor || colors.textSecondary;

  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.card,
        {
          width,
          backgroundColor: colors.surface,
        },
        style,
      ]}
    >
      <View
        style={[
          styles.coverWrap,
          {
            height: coverHeight,
            backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : '#FFF6F0',
          },
        ]}
      >
        {coverUri ? (
          <>
            <Image source={{ uri: coverUri }} style={styles.cover} resizeMode="cover" />
            {showVideoBadge ? (
              <View style={styles.videoBadge}>
                <Ionicons name="play" size={12} color="#FFFFFF" />
              </View>
            ) : null}
          </>
        ) : (
          <View style={styles.coverPlaceholder}>
            <Ionicons name={placeholderIconName} size={24} color={resolvedPlaceholderIconColor} />
            <Text style={[styles.coverPlaceholderText, { color: colors.textSecondary }]}>{placeholderText}</Text>
          </View>
        )}
      </View>

      <View style={styles.info}>{children}</View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 18,
    overflow: 'hidden',
  },
  coverWrap: {
    overflow: 'hidden',
  },
  cover: {
    width: '100%',
    height: '100%',
  },
  coverPlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
    gap: 8,
  },
  coverPlaceholderText: {
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
  },
  videoBadge: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(15,23,42,0.7)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  info: {
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
});

export default DiaryMasonryCard;
