import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import AppColors from '../theme/AppColors';
import AppFonts from '../theme/AppFonts';

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
}

export const MoodSelector: React.FC<MoodSelectorProps> = ({
  currentMood,
  partnerMood,
  partnerName,
  onSelectMood,
}) => {
  const handleMoodPress = (mood: MoodOption) => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {
      // safe
    }
    onSelectMood(`${mood.label} ${mood.emoji}`);
  };

  return (
    <View style={styles.container}>
      {/* Partner Live Mood Card with Subtle Glass Glow */}
      <View style={styles.partnerMoodCard}>
        <View style={styles.partnerMoodHeader}>
          <View style={styles.pulseDot} />
          <Text style={styles.partnerLabel}>{partnerName}'s Mood Today</Text>
        </View>
        <View style={styles.partnerMoodContent}>
          <Text style={styles.partnerMoodValue}>{partnerMood}</Text>
          <View style={styles.heartGlowIcon}>
            <Ionicons name="sparkles" size={14} color="#FF6575" />
          </View>
        </View>
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
              <Text style={styles.moodEmoji}>{item.emoji}</Text>
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
  moodEmoji: {
    fontSize: 26,
    marginBottom: 4,
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
