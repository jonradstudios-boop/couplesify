import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Platform,
  Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons, Feather } from '@expo/vector-icons';
import AppColors from '../theme/AppColors';
import AppFonts from '../theme/AppFonts';
import CoupleAvatarRing from '../components/CoupleAvatarRing';
import MoodSelector from '../components/MoodSelector';
import PolaroidCard from '../components/PolaroidCard';
import FallingHeartsBackground from '../components/FallingHeartsBackground';
import StorageService, {
  CoupleProfile,
  MemoryItem,
  EphemeralSnap,
} from '../services/StorageService';
import RealtimeService from '../services/RealtimeService';

interface HomeScreenProps {
  onNavigateToDoodle: () => void;
  onNavigateToMemories: () => void;
  onOpenSettings: () => void;
  onOpenHeartHub?: () => void;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({
  onNavigateToDoodle,
  onNavigateToMemories,
  onOpenSettings,
  onOpenHeartHub,
}) => {
  const [profile, setProfile] = useState<CoupleProfile | null>(null);
  const [userMood, setUserMood] = useState<string>('Loving 🥰');
  const [partnerMood, setPartnerMood] = useState<string>('');
  const [todayMemory, setTodayMemory] = useState<MemoryItem | null>(null);
  const [activeSnap, setActiveSnap] = useState<EphemeralSnap | null>(null);

  useEffect(() => {
    loadData();

    // Listen to real-time partner mood and snap updates
    const unsubMood = RealtimeService.on('mood', (data) => {
      if (data?.mood) {
        setPartnerMood(data.mood);
      }
    });

    const unsubSnap = RealtimeService.on('snap', (snap) => {
      setActiveSnap(snap);
    });

    return () => {
      unsubMood();
      unsubSnap();
    };
  }, []);

  const loadData = async () => {
    const prof = await StorageService.getProfile();
    const uMood = await StorageService.getUserMood();
    const pMood = await StorageService.getPartnerMood();
    const memories = await StorageService.getMemories();
    const snap = await StorageService.getEphemeralSnap();

    setProfile(prof);
    setUserMood(uMood);
    setPartnerMood(pMood);
    setActiveSnap(snap);
    if (memories.length > 0) {
      setTodayMemory(memories[0]);
    } else {
      setTodayMemory(null);
    }
  };

  const handleSelectMood = async (newMood: string) => {
    setUserMood(newMood);
    await StorageService.setUserMood(newMood);
    await RealtimeService.broadcastMood(newMood);
  };

  return (
    <LinearGradient
      colors={['#FCE8EC', '#FFF7F8']}
      style={styles.gradientContainer}
    >
      <FallingHeartsBackground />
      <SafeAreaView style={styles.safeArea}>
        {/* Top Header */}
        <View style={styles.headerRow}>
          <View style={styles.logoGroup}>
            <Text style={styles.appTitle}>Couplesify</Text>
            <View style={styles.heartSparkle}>
              <Ionicons name="heart" size={14} color={AppColors.primary} />
            </View>
          </View>

          <View style={styles.headerRight}>
            {/* Partner Sync Status Chip */}
            <TouchableOpacity
              style={styles.syncStatusChip}
              onPress={onOpenSettings}
              activeOpacity={0.8}
            >
              <View
                style={[
                  styles.onlineDot,
                  !profile?.isPaired && { backgroundColor: AppColors.offlineGray },
                ]}
              />
              <Text style={styles.syncStatusText}>
                {profile?.isPaired ? `${profile.partnerName} (Paired)` : 'Pair Partner'}
              </Text>
            </TouchableOpacity>

            {/* Settings Gear */}
            <TouchableOpacity
              style={styles.gearButton}
              onPress={onOpenSettings}
              activeOpacity={0.7}
            >
              <Feather name="settings" size={19} color={AppColors.textPrimary} />
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {/* Relationship Counter Ring */}
          {profile && (
            <CoupleAvatarRing
              userAvatar={profile.userAvatar}
              partnerAvatar={profile.partnerAvatar}
              userName={profile.userName}
              partnerName={profile.partnerName}
              anniversaryDate={profile.anniversaryDate}
            />
          )}

          {/* Active 7-Hour Sweet Snap for Partner */}
          {activeSnap && (
            <TouchableOpacity
              style={styles.snapTeaserCard}
              onPress={() => {
                if (onOpenHeartHub) onOpenHeartHub();
              }}
              activeOpacity={0.88}
            >
              <View style={styles.snapTeaserHeader}>
                <View style={styles.snapTeaserTitleRow}>
                  <Feather name="camera" size={15} color={AppColors.primary} />
                  <Text style={styles.snapTeaserLabel}>Sweet Snap for Partner</Text>
                </View>
                <View style={styles.snapTeaserTimerChip}>
                  <Ionicons name="time-outline" size={12} color="#FF6575" />
                  <Text style={styles.snapTeaserTimerText}>7h Auto-Reset</Text>
                </View>
              </View>

              <View style={styles.snapTeaserImageWrapper}>
                <Image source={{ uri: activeSnap.imageUri }} style={styles.snapTeaserImage} />
                <View style={styles.snapTeaserBadge}>
                  <Ionicons name="heart" size={12} color="#FF6575" />
                  <Text style={styles.snapTeaserBadgeText}>Tap central ❤️ for Heart Hub</Text>
                </View>
              </View>
            </TouchableOpacity>
          )}

          {/* Mood Tracker Strip */}
          <MoodSelector
            currentMood={userMood}
            partnerMood={partnerMood}
            partnerName={profile?.isPaired ? profile.partnerName : 'Partner'}
            onSelectMood={handleSelectMood}
          />

          {/* "Our Memories Today" Teaser */}
          <View style={styles.memoriesTeaserHeader}>
            <Text style={styles.teaserSectionTitle}>Our Memories Today</Text>
            <TouchableOpacity onPress={onNavigateToMemories}>
              <Text style={styles.seeAllText}>View Scrapbook &gt;</Text>
            </TouchableOpacity>
          </View>

          {todayMemory ? (
            <PolaroidCard
              imageUri={todayMemory.imageUri}
              caption={todayMemory.caption}
              date={todayMemory.date}
              tag={todayMemory.tag}
              likes={todayMemory.likes}
              isLiked={todayMemory.isLiked}
              onPress={onNavigateToMemories}
            />
          ) : (
            <TouchableOpacity
              style={styles.emptyMemoryCard}
              onPress={onNavigateToMemories}
              activeOpacity={0.85}
            >
              <View style={styles.emptyMemoryIconCircle}>
                <Ionicons name="images-outline" size={26} color={AppColors.primary} />
              </View>
              <Text style={styles.emptyMemoryCardTitle}>No memories captured yet</Text>
              <Text style={styles.emptyMemoryCardSubtitle}>
                Tap to upload your first keepsake to the scrapbook! 📸
              </Text>
            </TouchableOpacity>
          )}

          {/* Bottom spacing for floating bar */}
          <View style={{ height: 100 }} />
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
  logoGroup: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  appTitle: {
    fontFamily: AppFonts.title,
    fontSize: 28,
    color: AppColors.textPrimary,
    letterSpacing: 0.5,
  },
  heartSparkle: {
    marginLeft: 4,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  syncStatusChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.68)',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
    shadowColor: '#E297A5',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.9)',
  },
  onlineDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: AppColors.onlineGreen,
    marginRight: 6,
  },
  syncStatusText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: AppColors.textPrimary,
  },
  gearButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.68)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#E297A5',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.9)',
  },
  scrollContent: {
    paddingBottom: 20,
  },
  snapTeaserCard: {
    marginHorizontal: 16,
    marginVertical: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.58)',
    borderRadius: 24,
    padding: 14,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.92)',
    shadowColor: '#E297A5',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 18,
    elevation: 3,
  },
  snapTeaserHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  snapTeaserTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  snapTeaserLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: AppColors.textPrimary,
  },
  snapTeaserTimerChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 232, 236, 0.85)',
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 10,
    gap: 4,
  },
  snapTeaserTimerText: {
    fontSize: 11,
    fontWeight: '700',
    color: AppColors.primary,
  },
  snapTeaserImageWrapper: {
    width: '100%',
    height: 140,
    borderRadius: 18,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: '#FFE8EC',
  },
  snapTeaserImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  snapTeaserBadge: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 10,
    gap: 4,
  },
  snapTeaserBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: AppColors.primary,
  },
  memoriesTeaserHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginTop: 14,
    marginBottom: 4,
  },
  teaserSectionTitle: {
    fontFamily: AppFonts.title,
    fontSize: 20,
    color: AppColors.textPrimary,
  },
  seeAllText: {
    fontSize: 12,
    fontWeight: '700',
    color: AppColors.primary,
  },
  emptyMemoryCard: {
    marginHorizontal: 16,
    marginVertical: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.52)',
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.8,
    borderStyle: 'dashed',
    borderColor: 'rgba(255, 255, 255, 0.9)',
    shadowColor: '#E297A5',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 14,
    elevation: 2,
  },
  emptyMemoryIconCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: 'rgba(255, 232, 236, 0.65)',
    borderWidth: 1.2,
    borderColor: 'rgba(255, 255, 255, 0.95)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  emptyMemoryCardTitle: {
    fontFamily: AppFonts.title,
    fontSize: 18,
    color: AppColors.textPrimary,
  },
  emptyMemoryCardSubtitle: {
    fontSize: 12,
    color: AppColors.textSecondary,
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 16,
  },
});

export default HomeScreen;
