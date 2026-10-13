import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import AppColors from '../theme/AppColors';
import AppFonts from '../theme/AppFonts';
import FallingHeartsBackground from './FallingHeartsBackground';
import RealtimeService from '../services/RealtimeService';

interface LoveNudgeModalProps {
  visible: boolean;
  partnerName: string;
  userName?: string;
  onClose: () => void;
  onOpenDoodle: () => void;
}

const NUDGE_ACTIONS = [
  { id: 'squeeze', title: 'Warm Squeeze', emoji: '🤗', text: 'sent you a warm squeeze! 💕' },
  { id: 'miss_you', title: 'Miss You Ping', emoji: '💌', text: 'is missing you right now! ✨' },
  { id: 'kiss', title: 'Kiss Alert', emoji: '💋', text: 'sent you a sweet kiss! 💖' },
  { id: 'cuddle', title: 'Cuddle Request', emoji: '🧸', text: 'wants endless cuddles! 🥺' },
];

export const LoveNudgeModal: React.FC<LoveNudgeModalProps> = ({
  visible,
  partnerName,
  userName = 'Your partner',
  onClose,
  onOpenDoodle,
}) => {
  const [sentMessage, setSentMessage] = useState<string | null>(null);

  const handleSendNudge = (action: (typeof NUDGE_ACTIONS)[0]) => {
    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {}

    const sender = userName && userName !== 'You' ? userName : 'Your partner';
    RealtimeService.broadcastLoveNudge(`${sender} ${action.text}`);
    setSentMessage(`Sent "${action.title}" to ${partnerName}! 💕`);

    setTimeout(() => {
      setSentMessage(null);
      onClose();
    }, 1500);
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <FallingHeartsBackground />
        <View style={styles.modalCard}>
          <TouchableOpacity style={styles.closeBtn} onPress={onClose} activeOpacity={0.7}>
            <Ionicons name="close" size={20} color={AppColors.textSecondary} />
          </TouchableOpacity>

          {/* Glowing Top Heart */}
          <View style={styles.heartIconCircle}>
            <Ionicons name="heart" size={36} color="#FF6575" />
          </View>

          <Text style={styles.title}>Send Love Nudge</Text>
          <Text style={styles.subtitle}>
            Instantly buzz {partnerName}'s phone with a sweet surprise
          </Text>

          {sentMessage ? (
            <View style={styles.successBanner}>
              <Text style={styles.successText}>{sentMessage}</Text>
            </View>
          ) : (
            <View style={styles.actionsGrid}>
              {NUDGE_ACTIONS.map((item) => (
                <TouchableOpacity
                  key={item.id}
                  style={styles.nudgeBtn}
                  onPress={() => handleSendNudge(item)}
                  activeOpacity={0.8}
                >
                  <Text style={styles.nudgeEmoji}>{item.emoji}</Text>
                  <Text style={styles.nudgeTitle}>{item.title}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* Quick Doodle shortcut */}
          <TouchableOpacity
            style={styles.doodleShortcut}
            onPress={() => {
              onClose();
              onOpenDoodle();
            }}
            activeOpacity={0.8}
          >
            <Ionicons name="brush" size={16} color={AppColors.primary} style={{ marginRight: 6 }} />
            <Text style={styles.doodleShortcutText}>Draw on Widget instead</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(45, 36, 43, 0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalCard: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 30,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#E297A5',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.25,
    shadowRadius: 24,
    elevation: 10,
    borderWidth: 2,
    borderColor: '#FFFFFF',
    position: 'relative',
  },
  closeBtn: {
    position: 'absolute',
    top: 18,
    right: 18,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F5ECEF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heartIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#FFE8EC',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    borderWidth: 3,
    borderColor: '#FFFFFF',
    shadowColor: '#FF6575',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  title: {
    fontFamily: AppFonts.title,
    fontSize: 24,
    color: AppColors.textPrimary,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 13,
    color: AppColors.textSecondary,
    textAlign: 'center',
    marginBottom: 20,
    paddingHorizontal: 10,
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    width: '100%',
    gap: 12,
  },
  nudgeBtn: {
    width: '48%',
    backgroundColor: '#FFF7F8',
    borderRadius: 20,
    paddingVertical: 16,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#F8DCE2',
  },
  nudgeEmoji: {
    fontSize: 30,
    marginBottom: 6,
  },
  nudgeTitle: {
    fontFamily: AppFonts.title,
    fontSize: 15,
    color: AppColors.textPrimary,
  },
  successBanner: {
    backgroundColor: '#FFE8EC',
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 20,
    width: '100%',
    alignItems: 'center',
    marginVertical: 14,
  },
  successText: {
    color: AppColors.primary,
    fontWeight: '700',
    fontSize: 14,
  },
  doodleShortcut: {
    marginTop: 18,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  doodleShortcutText: {
    color: AppColors.primary,
    fontWeight: '700',
    fontSize: 13,
  },
});

export default LoveNudgeModal;
