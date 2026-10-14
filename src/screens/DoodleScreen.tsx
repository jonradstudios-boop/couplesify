import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  ScrollView,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import AppColors from '../theme/AppColors';
import AppFonts from '../theme/AppFonts';
import DoodleCanvas from '../components/DoodleCanvas';
import FallingHeartsBackground from '../components/FallingHeartsBackground';
import StorageService, { SharedDoodle } from '../services/StorageService';
import WidgetSyncService from '../services/WidgetSyncService';
import RealtimeService from '../services/RealtimeService';
import FirestoreService from '../services/FirestoreService';

interface DoodleScreenProps {
  onBack: () => void;
}

export const DoodleScreen: React.FC<DoodleScreenProps> = ({ onBack }) => {
  const [activeDoodle, setActiveDoodle] = useState<SharedDoodle | null>(null);
  const [partnerName, setPartnerName] = useState<string>('Partner');
  const [userName, setUserName] = useState<string>('You');
  const [syncStatus, setSyncStatus] = useState<string | null>(null);

  useEffect(() => {
    let unsubFirestore: (() => void) | undefined;
    const unsubRealtime = RealtimeService.on('doodle', (doodle) => {
      if (doodle) {
        setActiveDoodle(doodle);
        StorageService.saveSharedDoodle(doodle);
      }
    });

    loadDoodle().then((code) => {
      if (code) {
        unsubFirestore = FirestoreService.subscribeToDoodle(code, (doodle) => {
          if (doodle) {
            setActiveDoodle(doodle);
            StorageService.saveSharedDoodle(doodle);
          }
        });
      }
    });

    return () => {
      unsubRealtime();
      if (unsubFirestore) unsubFirestore();
    };
  }, []);

  const loadDoodle = async (): Promise<string | null> => {
    const profile = await StorageService.getProfile();
    if (profile?.partnerName) setPartnerName(profile.partnerName);
    if (profile?.userName) setUserName(profile.userName);
    const saved = await StorageService.getSharedDoodle();
    if (saved) {
      setActiveDoodle(saved);
    }
    return profile?.inviteCode || null;
  };

  const handleSaveDoodle = async (newDoodle: SharedDoodle) => {
    setActiveDoodle(newDoodle);
    const result = await WidgetSyncService.syncDoodleToWidget(newDoodle);
    setSyncStatus(result.message);
    setTimeout(() => setSyncStatus(null), 3500);
  };

  const handleClearCanvas = async () => {
    setActiveDoodle(null);
    await StorageService.saveSharedDoodle(null);
    setSyncStatus('Widget canvas cleared!');
    setTimeout(() => setSyncStatus(null), 3000);
  };

  const handleReplyCanvas = async () => {
    const blankReply: SharedDoodle = {
      id: `doodle-${Date.now()}`,
      strokes: [],
      updatedAt: Date.now(),
      author: userName || 'You',
      previewEmoji: '🎨',
    };
    setActiveDoodle(blankReply);
    await StorageService.saveSharedDoodle(blankReply);
    setSyncStatus(`Drawing your reply for ${partnerName}! 🎨`);
    setTimeout(() => setSyncStatus(null), 3000);
  };

  return (
    <LinearGradient
      colors={['#FCE8EC', '#FFF7F8']}
      style={styles.gradientContainer}
    >
      <FallingHeartsBackground />
      <SafeAreaView style={styles.safeArea}>
        {/* Header */}
        <View style={styles.headerRow}>
          <TouchableOpacity style={styles.backBtn} onPress={onBack} activeOpacity={0.7}>
            <Ionicons name="arrow-back" size={22} color={AppColors.textPrimary} />
          </TouchableOpacity>
          <View style={styles.headerTitleContainer}>
            <Text style={styles.screenTitle}>Shared Widget Canvas</Text>
            <Text style={styles.subtitle}>Updates {partnerName}'s homescreen widget</Text>
          </View>
          <View style={styles.headerBadge}>
            <Ionicons name="wifi" size={14} color={AppColors.mintDark} />
            <Text style={styles.badgeText}>Live Sync</Text>
          </View>
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {syncStatus && (
            <View style={styles.syncBanner}>
              <Ionicons name="checkmark-circle" size={18} color="#FFFFFF" />
              <Text style={styles.syncBannerText}>{syncStatus}</Text>
            </View>
          )}

          {/* Attribution Tag Header */}
          <View style={styles.attributionCard}>
            <View style={styles.attributionIconCircle}>
              <Ionicons name="color-palette" size={16} color={AppColors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.attributionTitle}>
                {activeDoodle?.strokes && activeDoodle.strokes.length > 0
                  ? `${activeDoodle.author || partnerName} has drawn this widget 🎨`
                  : `Draw for ${partnerName}'s home screen widget! 🎨`}
              </Text>
              <Text style={styles.attributionSub}>
                Synced with lockscreen & home widgets
              </Text>
            </View>
          </View>

          {/* Tips Pill */}
          <View style={styles.tipsPill}>
            <Ionicons name="sparkles" size={14} color={AppColors.primary} />
            <Text style={styles.tipsText}>
              Draw anything cute! It will appear directly on your partner's phone lockscreen.
            </Text>
          </View>

          {/* Full Featured Doodle Canvas */}
          <DoodleCanvas
            initialStrokes={activeDoodle?.strokes || []}
            onSave={handleSaveDoodle}
            height={420}
            isCompact={false}
            author={userName || 'You'}
            onClear={handleClearCanvas}
          />

          {/* Reply & Clear Action Buttons */}
          <View style={styles.actionRow}>
            <TouchableOpacity
              style={styles.replyBtn}
              onPress={handleReplyCanvas}
              activeOpacity={0.8}
            >
              <Ionicons name="arrow-undo" size={15} color="#FFFFFF" style={{ marginRight: 6 }} />
              <Text style={styles.replyBtnText}>Reply with Doodle</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.clearBtn}
              onPress={handleClearCanvas}
              activeOpacity={0.8}
            >
              <Ionicons name="trash-outline" size={15} color="#FF6575" style={{ marginRight: 6 }} />
              <Text style={styles.clearBtnText}>Clear Canvas</Text>
            </TouchableOpacity>
          </View>

          <View style={{ height: 120 }} />
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  gradientContainer: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
    paddingTop: Platform.OS === 'android' ? 32 : 0,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.72)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#E297A5',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 3,
    borderWidth: 1.2,
    borderColor: 'rgba(255, 255, 255, 0.95)',
  },
  headerTitleContainer: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  screenTitle: {
    fontFamily: AppFonts.title,
    fontSize: 21,
    color: AppColors.textPrimary,
  },
  subtitle: {
    fontSize: 11.5,
    fontWeight: '500',
    color: AppColors.textSecondary,
    marginTop: 1,
  },
  headerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: AppColors.mintGreen,
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 14,
    gap: 4,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: AppColors.mintDark,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 24,
  },
  syncBanner: {
    backgroundColor: AppColors.primary,
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 12,
    shadowColor: AppColors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  syncBannerText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
  },
  tipsPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.65)',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 18,
    marginBottom: 16,
    borderWidth: 1.2,
    borderColor: 'rgba(255, 255, 255, 0.92)',
    gap: 8,
  },
  tipsText: {
    flex: 1,
    fontSize: 12,
    color: AppColors.textSecondary,
    fontWeight: '500',
    lineHeight: 16,
  },
  attributionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
    borderRadius: 18,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1.2,
    borderColor: 'rgba(255, 255, 255, 0.95)',
    gap: 10,
    shadowColor: '#E297A5',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 2,
  },
  attributionIconCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(255, 232, 236, 0.9)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  attributionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: AppColors.textPrimary,
  },
  attributionSub: {
    fontSize: 11,
    color: AppColors.textSecondary,
    marginTop: 1,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 14,
    gap: 12,
  },
  replyBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: AppColors.primary,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 16,
    shadowColor: AppColors.primary,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
  },
  replyBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13.5,
  },
  clearBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 235, 238, 0.9)',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 205, 210, 0.9)',
  },
  clearBtnText: {
    color: '#FF6575',
    fontWeight: '700',
    fontSize: 13.5,
  },
});

export default DoodleScreen;
