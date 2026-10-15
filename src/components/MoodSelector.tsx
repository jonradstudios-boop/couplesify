import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import AppColors from '../theme/AppColors';
import AppFonts from '../theme/AppFonts';
import AnimatedGifEmoji from './AnimatedGifEmoji';

export interface MoodOption {
  id: string;
  label: string;
  emoji: string;
  bgPastel: string;
}

export const MOOD_OPTIONS: MoodOption[] = [
  { id: 'loving', label: 'Loving', emoji: '🥰', bgPastel: 'rgba(255, 232, 236, 0.62)' },
  { id: 'needy', label: 'Needy', emoji: '🥺', bgPastel: 'rgba(227, 217, 248, 0.58)' },
  { id: 'cuddly', label: 'Cuddly', emoji: '🧸', bgPastel: 'rgba(255, 236, 204, 0.58)' },
  { id: 'sleepy', label: 'Sleepy', emoji: '😴', bgPastel: 'rgba(215, 238, 255, 0.58)' },
  { id: 'excited', label: 'Excited', emoji: '🥳', bgPastel: 'rgba(211, 242, 228, 0.58)' },
  { id: 'grumpy', label: 'Grumpy', emoji: '😤', bgPastel: 'rgba(252, 228, 236, 0.58)' },
];

interface MoodSelectorProps {
  currentMood: string;
  partnerMood: string;
  partnerName: string;
  onSelectMood: (moodString: string) => void;
  onTogglePartnerMood?: () => void;
}

export const MoodSelector: React.FC<MoodSelectorProps> = ({
  currentMood,
  partnerMood,
  partnerName,
  onSelectMood,
  onTogglePartnerMood,
}) => {
  const handleMoodPress = (mood: MoodOption) => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {
      // safe
    }
    onSelectMood(`${mood.label} ${mood.emoji}`);
  };

  const effectivePartnerMood = partnerMood && partnerMood.trim().length > 0 && !partnerMood.toLowerCase().includes('waiting')
    ? partnerMood
    : 'Cuddly 🧸';

  return (
    <View style={styles.container}>
      {/* Duo Couple Mood Status Card: Shows both My Mood and Partner's Mood Side-by-Side */}
      <View style={styles.duoMoodCard}>
        {/* User's Mood */}
        <View style={styles.duoMoodSide}>
          <View style={styles.duoMoodAvatarCircle}>
            <Text style={{ fontSize: 16 }}>💖</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.duoMoodOwnerLabel}>YOUR MOOD (YOU)</Text>
            <View style={styles.duoMoodRow}>
              <AnimatedGifEmoji emoji={currentMood} size={20} style={{ marginRight: 5 }} />
              <Text style={styles.duoMoodText} numberOfLines={1}>
                {currentMood || 'Loving 🥰'}
              </Text>
            </View>
          </View>
        </View>

        {/* Sync Heart Divider */}
        <View style={styles.duoMoodDivider}>
          <Ionicons name="heart" size={16} color={AppColors.primary} />
          <Text style={styles.duoMoodDividerText}>SYNCED</Text>
        </View>

        {/* Partner's Mood */}
        <TouchableOpacity
          style={styles.duoMoodSide}
          onPress={() => {
            if (onTogglePartnerMood) {
              onTogglePartnerMood();
            }
          }}
          activeOpacity={0.8}
        >
          <View style={[styles.duoMoodAvatarCircle, { backgroundColor: '#F3E8FF' }]}>
            <Text style={{ fontSize: 16 }}>🌸</Text>
          </View>
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Text style={styles.duoMoodOwnerLabel} numberOfLines={1}>
                {partnerName.toUpperCase()}'S MOOD
              </Text>
            </View>
            <View style={styles.duoMoodRow}>
              <AnimatedGifEmoji emoji={effectivePartnerMood} size={20} style={{ marginRight: 5 }} />
              <Text style={styles.duoMoodText} numberOfLines={1}>
                {effectivePartnerMood}
              </Text>
            </View>
          </View>
        </TouchableOpacity>
      </View>

      {/* Horizontal Mood Selector for User */}
      <View style={styles.selectorHeader}>
        <Text style={styles.selectorTitle}>How are you feeling?</Text>
        <Text style={styles.selectorSubtitle}>Tap to update your widget & partner</Text>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {MOOD_OPTIONS.map((item) => {
          const isSelected = currentMood.includes(item.label) || currentMood.includes(item.emoji);
          return (
            <TouchableOpacity
              key={item.id}
              style={[
                styles.moodBadge,
                { backgroundColor: item.bgPastel },
                isSelected && styles.selectedBadge,
              ]}
              onPress={() => handleMoodPress(item)}
              activeOpacity={0.8}
            >
              <AnimatedGifEmoji
                emoji={item.emoji}
                size={38}
                isSelected={isSelected}
                style={styles.moodEmojiContainer}
              />
              <Text
                style={[
                  styles.moodLabel,
                  isSelected && styles.selectedMoodLabel,
                ]}
              >
                {item.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 8,
  },
  duoMoodCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.72)',
    borderRadius: 20,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginHorizontal: 16,
    marginBottom: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.95)',
    shadowColor: '#E297A5',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 3,
  },
  duoMoodSide: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  duoMoodAvatarCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FFE8EC',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.9)',
  },
  duoMoodOwnerLabel: {
    fontSize: 9.5,
    fontWeight: '800',
    color: AppColors.textSecondary,
    letterSpacing: 0.5,
  },
  duoMoodRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  duoMoodText: {
    fontSize: 13,
    fontWeight: '800',
    color: AppColors.textPrimary,
  },
  duoMoodDivider: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
  },
  duoMoodDividerText: {
    fontSize: 8.5,
    fontWeight: '900',
    color: AppColors.primary,
    letterSpacing: 0.5,
    marginTop: 2,
  },
  partnerMoodCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.58)',
    borderRadius: 22,
    paddingVertical: 14,
    paddingHorizontal: 18,
    marginHorizontal: 16,
    marginBottom: 16,
    shadowColor: '#E297A5',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 3,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.92)',
  },
  partnerMoodHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  pulseDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: AppColors.onlineGreen,
    marginRight: 8,
  },
  partnerLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: AppColors.textSecondary,
    letterSpacing: 0.2,
    textTransform: 'uppercase',
  },
  partnerMoodContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  partnerMoodRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  partnerEmojiSpacing: {
    marginRight: 10,
  },
  partnerMoodValue: {
    fontSize: 18,
    fontWeight: '800',
    color: AppColors.textPrimary,
  },
  heartGlowIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#FFE8EC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectorHeader: {
    paddingHorizontal: 20,
    marginBottom: 10,
  },
  selectorTitle: {
    fontFamily: AppFonts.title,
    fontSize: 18,
    color: AppColors.textPrimary,
  },
  selectorSubtitle: {
    fontSize: 12,
    fontWeight: '400',
    color: AppColors.textSecondary,
    marginTop: 2,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 6,
    gap: 10,
  },
  moodBadge: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 20,
    minWidth: 78,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.92)',
    shadowColor: '#F5B0C0',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 2,
  },
  selectedBadge: {
    borderColor: AppColors.primary,
    borderWidth: 2,
    transform: [{ scale: 1.05 }],
    shadowColor: AppColors.primary,
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 5,
  },
  moodEmojiContainer: {
    marginBottom: 6,
  },
  moodLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: AppColors.textPrimary,
  },
  selectedMoodLabel: {
    color: AppColors.primary,
    fontWeight: '800',
  },
});

export default MoodSelector;
