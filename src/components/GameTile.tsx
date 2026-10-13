import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import * as Haptics from 'expo-haptics';
import AppColors from '../theme/AppColors';
import AppFonts from '../theme/AppFonts';

interface GameTileProps {
  title: string;
  tagline: string;
  emoji: string;
  bgColor: string;
  badgeText?: string;
  onPress: () => void;
}

export const GameTile: React.FC<GameTileProps> = ({
  title,
  tagline,
  emoji,
  bgColor,
  badgeText,
  onPress,
}) => {
  const handlePress = () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch {
      // safe
    }
    onPress();
  };

  return (
    <TouchableOpacity
      style={[styles.tileCard, { backgroundColor: bgColor }]}
      onPress={handlePress}
      activeOpacity={0.85}
    >
      {badgeText && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{badgeText}</Text>
        </View>
      )}

      <View style={styles.emojiCircle}>
        <Text style={styles.emojiText}>{emoji}</Text>
      </View>

      <Text style={styles.titleText}>{title}</Text>
      <Text style={styles.taglineText} numberOfLines={2}>
        {tagline}
      </Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  tileCard: {
    flex: 1,
    minHeight: 155,
    borderRadius: 24,
    padding: 16,
    justifyContent: 'space-between',
    margin: 6,
    shadowColor: '#E297A5',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.16,
    shadowRadius: 12,
    elevation: 4,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.95)',
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.92)',
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 10,
  },
  badgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: AppColors.primary,
    textTransform: 'uppercase',
  },
  emojiCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
    marginBottom: 8,
  },
  emojiText: {
    fontSize: 22,
  },
  titleText: {
    fontFamily: AppFonts.title,
    fontSize: 18,
    color: AppColors.textPrimary,
    marginBottom: 4,
  },
  taglineText: {
    fontSize: 11.5,
    fontWeight: '500',
    color: AppColors.textSecondary,
    lineHeight: 15,
  },
});

export default GameTile;
