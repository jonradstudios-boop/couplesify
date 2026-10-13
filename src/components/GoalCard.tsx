import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import AppColors from '../theme/AppColors';
import AppFonts from '../theme/AppFonts';
import { CoupleGoal } from '../services/StorageService';

interface GoalCardProps {
  goal: CoupleGoal;
  onToggle: (goalId: string) => void;
  onIncrement?: (goalId: string) => void;
}

export const GoalCard: React.FC<GoalCardProps> = ({ goal, onToggle, onIncrement }) => {
  const isCompleted = goal.completed || goal.progress >= goal.total;
  const percentage = Math.min(100, Math.round((goal.progress / goal.total) * 100));

  const handleToggle = () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {
      // safe
    }
    onToggle(goal.id);
  };

  const handleIncrement = () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {
      // safe
    }
    if (onIncrement) {
      onIncrement(goal.id);
    }
  };

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <View style={styles.titleContainer}>
          <View style={[styles.categoryPill, { backgroundColor: `${goal.color}20` }]}>
            <Text style={[styles.categoryText, { color: goal.color }]}>{goal.category}</Text>
          </View>
          <Text
            style={[styles.title, isCompleted && styles.titleCompleted]}
            numberOfLines={2}
          >
            {goal.title}
          </Text>
        </View>

        {/* Checkbox Button */}
        <TouchableOpacity
          onPress={handleToggle}
          style={[
            styles.checkCircle,
            isCompleted && { backgroundColor: goal.color, borderColor: goal.color },
          ]}
          activeOpacity={0.7}
        >
          {isCompleted && <Ionicons name="checkmark" size={16} color="#FFFFFF" />}
        </TouchableOpacity>
      </View>

      {/* Progress Bar & Details */}
      <View style={styles.progressSection}>
        <View style={styles.barBackground}>
          <View
            style={[
              styles.barFill,
              { width: `${percentage}%`, backgroundColor: goal.color },
            ]}
          />
        </View>

        <View style={styles.progressFooter}>
          <Text style={styles.progressLabel}>
            {goal.progress} / {goal.total} completed ({percentage}%)
          </Text>

          {!isCompleted && goal.total > 1 && onIncrement && (
            <TouchableOpacity
              onPress={handleIncrement}
              style={styles.addStepButton}
              activeOpacity={0.7}
            >
              <Ionicons name="add" size={14} color={AppColors.primary} />
              <Text style={styles.addStepText}>+1 Step</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: 'rgba(255, 255, 255, 0.58)',
    borderRadius: 22,
    padding: 16,
    marginVertical: 6,
    marginHorizontal: 16,
    shadowColor: '#E297A5',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 3,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.92)',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  titleContainer: {
    flex: 1,
    marginRight: 12,
  },
  categoryPill: {
    alignSelf: 'flex-start',
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 8,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.8)',
  },
  categoryText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  title: {
    fontFamily: AppFonts.title,
    fontSize: 17,
    color: AppColors.textPrimary,
  },
  titleCompleted: {
    textDecorationLine: 'line-through',
    color: AppColors.textSecondary,
  },
  checkCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 1.8,
    borderColor: 'rgba(255, 255, 255, 0.95)',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
  },
  progressSection: {
    marginTop: 2,
  },
  barBackground: {
    height: 7,
    backgroundColor: 'rgba(245, 236, 240, 0.7)',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 6,
  },
  barFill: {
    height: '100%',
    borderRadius: 4,
  },
  progressFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  progressLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: AppColors.textSecondary,
  },
  addStepButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 242, 244, 0.85)',
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.9)',
  },
  addStepText: {
    fontSize: 11,
    fontWeight: '700',
    color: AppColors.primary,
    marginLeft: 2,
  },
});

export default GoalCard;
