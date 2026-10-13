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
import DoodleCanvas from '../components/DoodleCanvas';
import StorageService, { SharedDoodle } from '../services/StorageService';
import WidgetSyncService from '../services/WidgetSyncService';

interface DoodleScreenProps {
  onBack: () => void;
}

export const DoodleScreen: React.FC<DoodleScreenProps> = ({ onBack }) => {
  const [activeDoodle, setActiveDoodle] = useState<SharedDoodle | null>(null);
  const [partnerName, setPartnerName] = useState<string>('Maya');
  const [syncStatus, setSyncStatus] = useState<string | null>(null);

  useEffect(() => {
    loadDoodle();
  }, []);

  const loadDoodle = async () => {
    const profile = await StorageService.getProfile();
    if (profile?.partnerName) setPartnerName(profile.partnerName);
    const saved = await StorageService.getSharedDoodle();
    if (saved) {
      setActiveDoodle(saved);
    }
  };

  const handleSaveDoodle = async (newDoodle: SharedDoodle) => {
    setActiveDoodle(newDoodle);
    const result = await WidgetSyncService.syncDoodleToWidget(newDoodle);
    setSyncStatus(result.message);
    setTimeout(() => setSyncStatus(null), 3500);
  };

  return (
    <LinearGradient
      colors={['#FCE8EC', '#FFF7F8']}
      style={styles.gradientContainer}
    >
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
            height={380}
            isCompact={false}
          />

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
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#E297A5',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 3,
  },
  headerTitleContainer: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  screenTitle: {
    fontSize: 17,
    fontWeight: '800',
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
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#FFE8EC',
    gap: 8,
  },
  tipsText: {
    flex: 1,
    fontSize: 12,
    color: AppColors.textSecondary,
    fontWeight: '500',
    lineHeight: 16,
  },
});

export default DoodleScreen;
