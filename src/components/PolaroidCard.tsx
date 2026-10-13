import React, { useState } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import AppColors from '../theme/AppColors';

interface PolaroidCardProps {
  imageUri: string;
  caption: string;
  date: string;
  tag: string;
  likes: number;
  isLiked?: boolean;
  onPress?: () => void;
  onLikeToggle?: (newLiked: boolean) => void;
}

export const PolaroidCard: React.FC<PolaroidCardProps> = ({
  imageUri,
  caption,
  date,
  tag,
  likes,
  isLiked = false,
  onPress,
  onLikeToggle,
}) => {
  const [liked, setLiked] = useState(isLiked);
  const [likeCount, setLikeCount] = useState(likes);
  const [lastTap, setLastTap] = useState<number>(0);

  const handleLike = () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch {
      // safe
    }
    const nextState = !liked;
    setLiked(nextState);
    setLikeCount((prev) => (nextState ? prev + 1 : Math.max(0, prev - 1)));
    if (onLikeToggle) {
      onLikeToggle(nextState);
    }
  };

  const handleDoubleTap = () => {
    const now = Date.now();
    if (lastTap && now - lastTap < 350) {
      if (!liked) {
        handleLike();
      }
    } else {
      setLastTap(now);
      if (onPress) onPress();
    }
  };

  return (
    <View style={styles.cardContainer}>
      <TouchableOpacity
        activeOpacity={0.92}
        onPress={handleDoubleTap}
        style={styles.innerCard}
      >
        {/* Photo Container styled like a modern polaroid */}
        <View style={styles.photoFrame}>
          <Image source={{ uri: imageUri }} style={styles.image} />
          {/* Tag Chip floating on top of photo */}
          <View style={styles.tagBadge}>
            <Text style={styles.tagText}>{tag}</Text>
          </View>
        </View>

        {/* Content Section below photo */}
        <View style={styles.contentSection}>
          <View style={styles.metaRow}>
            <Text style={styles.dateStamp}>{date}</Text>

            {/* Heart Reaction Button */}
            <TouchableOpacity
              onPress={handleLike}
              style={[styles.likeButton, liked && styles.likeButtonActive]}
              activeOpacity={0.7}
            >
              <Ionicons
                name={liked ? 'heart' : 'heart-outline'}
                size={18}
                color={liked ? '#FF4757' : AppColors.textSecondary}
              />
              <Text style={[styles.likeCount, liked && styles.likeCountActive]}>
                {likeCount}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Caption */}
          <Text style={styles.captionText}>{caption}</Text>
        </View>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  cardContainer: {
    marginVertical: 10,
    marginHorizontal: 16,
    borderRadius: 26,
    backgroundColor: '#FFFFFF',
    shadowColor: '#E297A5',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 18,
    elevation: 4,
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
  innerCard: {
    padding: 12,
    borderRadius: 26,
  },
  photoFrame: {
    width: '100%',
    height: 220,
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: '#FFF2F4',
    position: 'relative',
  },
  image: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  tagBadge: {
    position: 'absolute',
    top: 12,
    left: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.92)',
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  tagText: {
    fontSize: 11,
    fontWeight: '700',
    color: AppColors.primary,
    letterSpacing: 0.3,
  },
  contentSection: {
    paddingTop: 12,
    paddingHorizontal: 6,
    paddingBottom: 4,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  dateStamp: {
    fontSize: 12,
    fontWeight: '600',
    color: AppColors.textSecondary,
    letterSpacing: 0.2,
  },
  likeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF5F6',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 14,
  },
  likeButtonActive: {
    backgroundColor: '#FFE8EC',
  },
  likeCount: {
    fontSize: 12,
    fontWeight: '700',
    color: AppColors.textSecondary,
    marginLeft: 5,
  },
  likeCountActive: {
    color: '#FF4757',
  },
  captionText: {
    fontSize: 14,
    lineHeight: 20,
    color: AppColors.textPrimary,
    fontWeight: '500',
  },
});

export default PolaroidCard;
