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
import * as Haptics from 'expo-haptics';
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
import FirestoreService from '../services/FirestoreService';
import AuthService from '../services/AuthService';

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
    let unsubCouple: (() => void) | undefined;

    loadData().then(async (prof) => {
      if (prof?.inviteCode) {
        RealtimeService.setPairingCode(prof.inviteCode);
        const currentUser = await AuthService.getCurrentUser();

        // Real-time Firestore snapshot for couple room and live sync
        unsubCouple = FirestoreService.subscribeToCoupleLiveUpdates(
          prof.inviteCode,
          currentUser?.uid,
          (liveData) => {
            if (liveData.partnerMood) {
              setPartnerMood(liveData.partnerMood);
              StorageService.setPartnerMood(liveData.partnerMood);
            }
            if (liveData.snap !== undefined) {
              setActiveSnap(liveData.snap);
              StorageService.saveEphemeralSnap(liveData.snap);
            }
          }
        );
      }
    });

    // Listen to real-time partner mood and snap updates
    const unsubMood = RealtimeService.on('mood', (data) => {
      // Independent Mood Guard: Ignore mood broadcast if it originated from self
      if (data?.mood) {
        if (data.senderId && profile?.userName && data.senderId === profile.userName) {
          return;
        }
        setPartnerMood(data.mood);
        StorageService.setPartnerMood(data.mood);
      }
    });

    const unsubSnap = RealtimeService.on('snap', (snap) => {
      setActiveSnap(snap);
      StorageService.saveEphemeralSnap(snap);
    });

    return () => {
      unsubMood();
      unsubSnap();
      if (unsubCouple) unsubCouple();
    };
  }, [profile?.userName]);

  const loadData = async (): Promise<CoupleProfile | null> => {
    const prof = await StorageService.getProfile();
    const uMood = await StorageService.getUserMood();
    const pMood = await StorageService.getPartnerMood();
    const memories = await StorageService.getMemories();
    const snap = await StorageService.getEphemeralSnap();

    setProfile(prof);
    setUserMood(uMood || 'Loving 🥰');
    setPartnerMood(pMood);
    setActiveSnap(snap);
    if (memories.length > 0) {
      setTodayMemory(memories[0]);
    } else {
      setTodayMemory(null);
    }
    return prof;
  };

  const handleSelectMood = async (newMood: string) => {
    // 1. Update ONLY user's own mood - partner's mood remains completely unchanged
    setUserMood(newMood);
    await StorageService.setUserMood(newMood);

    // 2. Broadcast to partner with senderId so this device ignores echo
    const sender = profile?.userName || 'me';
    const currentUser = await AuthService.getCurrentUser();
    await RealtimeService.broadcastMood(newMood, sender, currentUser?.uid);

    // 3. Persist to Firestore cloud room
    if (profile?.inviteCode) {
      await FirestoreService.syncMood(
        profile.inviteCode,
        newMood,
        profile.userName || 'You',
        currentUser?.uid
      );
    }
  };

  const handleTogglePartnerMood = async () => {
    // Allows toggling partner mood independently (for testing/demo) without altering user's mood
    const moods = ['Cuddly 🧸', 'Loving 🥰', 'Needy 🥺', 'Sleepy 😴', 'Excited 🥳'];
    const currentIdx = moods.indexOf(partnerMood);
    const nextMood = moods[(currentIdx + 1) % moods.length];
    setPartnerMood(nextMood);
    await StorageService.setPartnerMood(nextMood);
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}
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
            <Image
              source={require('../../assets/couplesify-logo.png')}
              style={styles.headerLogoIcon}
              resizeMode="contain"
            />
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
          {activeSnap ? (
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
                  <Text style={styles.snapTeaserLabel}>
                    {activeSnap.author ? `${activeSnap.author} sent this snap 📸` : 'Sweet Snap for Partner'}
                  </Text>
                </View>
                <View style={styles.snapTeaserTimerChip}>
                  <Ionicons name="time-outline" size={12} color="#FF6575" />
                  <Text style={styles.snapTeaserTimerText}>7h Auto-Reset</Text>
                </View>
              </View>

              <View style={styles.snapTeaserImageWrapper}>
                <Image source={{ uri: activeSnap.imageUri }} style={styles.snapTeaserImage} />
                {activeSnap.caption ? (
                  <View style={styles.snapTeaserCaptionTag}>
                    <Text style={styles.snapTeaserCaptionText} numberOfLines={1}>
                      {activeSnap.caption}
                    </Text>
                  </View>
                ) : null}
                <View style={styles.snapTeaserBadge}>
                  <Ionicons name="heart" size={12} color="#FF6575" />
                  <Text style={styles.snapTeaserBadgeText}>Tap ❤️ to View, Save & Reply</Text>
                </View>
              </View>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={styles.emptySnapTeaserCard}
              onPress={() => {
                if (onOpenHeartHub) onOpenHeartHub();
              }}
              activeOpacity={0.85}
            >
              <View style={styles.emptySnapTeaserLeft}>
                <View style={styles.emptySnapCameraIcon}>
                  <Feather name="camera" size={16} color={AppColors.primary} />
                </View>
                <View>
                  <Text style={styles.emptySnapTeaserTitle}>
                    Sweet Snap for {profile?.partnerName || 'Partner'}
                  </Text>
                  <Text style={styles.emptySnapTeaserSubtitle}>
                    Upload a surprise photo that resets in 7h 📸
                  </Text>
                </View>
              </View>
              <View style={styles.emptySnapAddBtn}>
                <Ionicons name="add" size={14} color="#FFFFFF" />
                <Text style={styles.emptySnapAddBtnText}>Send Snap</Text>
              </View>
            </TouchableOpacity>
          )}

          {/* Mood Tracker Strip */}
          <MoodSelector
            currentMood={userMood}
            partnerMood={partnerMood}
            partnerName={profile?.isPaired ? profile.partnerName : 'Partner'}
            onSelectMood={handleSelectMood}
            onTogglePartnerMood={handleTogglePartnerMood}
          />

          {/* "Our Memories Today" Teaser */}
          <View style={styles.memoriesTeaserHeader}>
            <View>
              <Text style={styles.teaserSectionTitle}>Our Memories Today</Text>
              <Text style={styles.memoriesSubtag}>Shared with {profile?.partnerName || 'Partner'} 💕</Text>
            </View>
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
          <View style={{ height: 110 }} />
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
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  logoGroup: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerLogoIcon: {
    width: 28,
    height: 28,
    borderRadius: 7,
    marginRight: 6,
  },
  appTitle: {
    fontFamily: AppFonts.title,
    fontSize: 24,
    color: AppColors.textPrimary,
    letterSpacing: 0.3,
  },
  heartSparkle: {
    marginLeft: 3,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  syncStatusChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.68)',
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 16,
    shadowColor: '#E297A5',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.9)',
  },
  onlineDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: AppColors.onlineGreen,
    marginRight: 5,
  },
  syncStatusText: {
    fontSize: 11,
    fontWeight: '700',
    color: AppColors.textPrimary,
  },
  gearButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
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
  snapTeaserCaptionTag: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    maxWidth: '55%',
    backgroundColor: 'rgba(30, 20, 25, 0.65)',
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 8,
  },
  snapTeaserCaptionText: {
    fontSize: 10,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  emptySnapTeaserCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 16,
    marginHorizontal: 16,
    marginVertical: 6,
    borderWidth: 1,
    borderColor: '#FFE0E6',
    shadowColor: AppColors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  emptySnapTeaserLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  emptySnapCameraIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 235, 240, 0.9)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptySnapTeaserTitle: {
    fontSize: 12.5,
    fontWeight: '700',
    color: AppColors.textPrimary,
  },
  emptySnapTeaserSubtitle: {
    fontSize: 10,
    color: AppColors.textSecondary,
    marginTop: 1,
  },
  emptySnapAddBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: AppColors.primary,
    paddingVertical: 5,
    paddingHorizontal: 9,
    borderRadius: 10,
    gap: 3,
  },
  emptySnapAddBtnText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  memoriesTeaserHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginTop: 10,
    marginBottom: 4,
  },
  teaserSectionTitle: {
    fontFamily: AppFonts.title,
    fontSize: 17,
    color: AppColors.textPrimary,
  },
  memoriesSubtag: {
    fontSize: 10.5,
    color: AppColors.textSecondary,
    marginTop: 1,
    fontWeight: '500',
  },
  seeAllText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: AppColors.primary,
  },
  emptyMemoryCard: {
    marginHorizontal: 16,
    marginVertical: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.52)',
    borderRadius: 20,
    padding: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.8,
    borderStyle: 'dashed',
    borderColor: 'rgba(255, 255, 255, 0.9)',
    shadowColor: '#E297A5',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 2,
  },
  emptyMemoryIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 232, 236, 0.65)',
    borderWidth: 1.2,
    borderColor: 'rgba(255, 255, 255, 0.95)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  emptyMemoryCardTitle: {
    fontFamily: AppFonts.title,
    fontSize: 16,
    color: AppColors.textPrimary,
  },
  emptyMemoryCardSubtitle: {
    fontSize: 11.5,
    color: AppColors.textSecondary,
    textAlign: 'center',
    marginTop: 2,
    lineHeight: 15,
  },
});

export default HomeScreen;
