import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons, Feather, MaterialCommunityIcons } from '@expo/vector-icons';
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
  SharedDoodle,
} from '../services/StorageService';
import RealtimeService from '../services/RealtimeService';
import Svg, { Path } from 'react-native-svg';

interface HomeScreenProps {
  onNavigateToDoodle: () => void;
  onNavigateToMemories: () => void;
  onOpenSettings: () => void;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({
  onNavigateToDoodle,
  onNavigateToMemories,
  onOpenSettings,
}) => {
  const [profile, setProfile] = useState<CoupleProfile | null>(null);
  const [userMood, setUserMood] = useState<string>('Loving 🥰');
  const [partnerMood, setPartnerMood] = useState<string>('Waiting for partner... 💭');
  const [todayMemory, setTodayMemory] = useState<MemoryItem | null>(null);
  const [sharedDoodle, setSharedDoodle] = useState<SharedDoodle | null>(null);

  useEffect(() => {
    loadData();

    // Listen to real-time partner mood and doodle updates
    const unsubMood = RealtimeService.on('mood', (data) => {
      if (data?.mood) {
        setPartnerMood(data.mood);
      }
    });

    const unsubDoodle = RealtimeService.on('doodle', (doodle) => {
      if (doodle) {
        setSharedDoodle(doodle);
      }
    });

    return () => {
      unsubMood();
      unsubDoodle();
    };
  }, []);

  const loadData = async () => {
    const prof = await StorageService.getProfile();
    const uMood = await StorageService.getUserMood();
    const pMood = await StorageService.getPartnerMood();
    const memories = await StorageService.getMemories();
    const doodle = await StorageService.getSharedDoodle();

    setProfile(prof);
    setUserMood(uMood);
    setPartnerMood(pMood);
    setSharedDoodle(doodle);
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

  // Convert points for miniature preview
  const pointsToMiniSvg = (points: { x: number; y: number }[]) => {
    if (!points || points.length === 0) return '';
    return points.reduce(
      (acc, pt, idx) => (idx === 0 ? `M ${pt.x} ${pt.y}` : `${acc} L ${pt.x} ${pt.y}`),
      ''
    );
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

          {/* Prominent Widget Doodle Launcher Button */}
          <View style={styles.doodleLauncherWrapper}>
            <TouchableOpacity
              style={styles.doodleLauncherButton}
              onPress={() => {
                try {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                } catch {}
                onNavigateToDoodle();
              }}
              activeOpacity={0.88}
            >
              <View style={styles.launcherIconPill}>
                <Ionicons name="pencil" size={18} color={AppColors.primary} />
              </View>
              <Text style={styles.launcherButtonText}>Doodle on Widget &gt;</Text>
            </TouchableOpacity>
          </View>

          {/* Shared Homescreen Widget Preview Card */}
          <View style={styles.widgetCardContainer}>
            <View style={styles.widgetHeader}>
              <View style={styles.widgetTitleRow}>
                <MaterialCommunityIcons name="cellphone-text" size={16} color={AppColors.primary} />
                <Text style={styles.widgetLabel}>Live Lockscreen & Home Widget</Text>
              </View>
              <TouchableOpacity onPress={onNavigateToDoodle}>
                <Text style={styles.widgetEditLink}>
                  {sharedDoodle ? 'Edit Doodle' : 'Doodle Now'}
                </Text>
              </TouchableOpacity>
            </View>

            {sharedDoodle ? (
              <View style={styles.widgetCanvasPreview}>
                <Svg viewBox="0 0 280 200" style={StyleSheet.absoluteFill}>
                  {sharedDoodle.strokes.map((s, idx) => (
                    <Path
                      key={idx}
                      d={pointsToMiniSvg(s.points)}
                      stroke={s.color}
                      strokeWidth={s.width}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      fill="none"
                    />
                  ))}
                </Svg>
                <View style={styles.widgetWatermark}>
                  <Text style={styles.widgetWatermarkText}>
                    Updated by {sharedDoodle.author}
                  </Text>
                </View>
              </View>
            ) : (
              <TouchableOpacity
                style={styles.emptyWidgetPreview}
                onPress={onNavigateToDoodle}
                activeOpacity={0.8}
              >
                <Ionicons name="brush-outline" size={26} color="#E8CCD4" />
                <Text style={styles.emptyWidgetTitle}>No widget doodle yet</Text>
                <Text style={styles.emptyWidgetSubtitle}>
                  Tap to draw a sweet sketch for your partner's phone screen!
                </Text>
              </TouchableOpacity>
            )}
          </View>

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
  doodleLauncherWrapper: {
    paddingHorizontal: 20,
    marginVertical: 12,
  },
  doodleLauncherButton: {
    backgroundColor: AppColors.primary,
    borderRadius: 9999,
    paddingVertical: 14,
    paddingHorizontal: 22,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: AppColors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 5,
  },
  launcherIconPill: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  launcherButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  widgetCardContainer: {
    marginHorizontal: 16,
    marginVertical: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.58)',
    borderRadius: 24,
    padding: 14,
    borderWidth: 1.8,
    borderColor: 'rgba(255, 255, 255, 0.9)',
    shadowColor: '#E297A5',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 18,
    elevation: 3,
  },
  widgetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  widgetTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  widgetLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: AppColors.textPrimary,
  },
  widgetEditLink: {
    fontSize: 12,
    fontWeight: '700',
    color: AppColors.primary,
  },
  widgetCanvasPreview: {
    width: '100%',
    height: 120,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.42)',
    overflow: 'hidden',
    position: 'relative',
    borderWidth: 1.2,
    borderColor: 'rgba(255, 255, 255, 0.85)',
  },
  widgetWatermark: {
    position: 'absolute',
    bottom: 6,
    right: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
    paddingVertical: 2,
    paddingHorizontal: 8,
    borderRadius: 8,
  },
  widgetWatermarkText: {
    fontSize: 10,
    fontWeight: '600',
    color: AppColors.textSecondary,
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
  emptyWidgetPreview: {
    width: '100%',
    height: 110,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.38)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: 'rgba(255, 145, 160, 0.45)',
  },
  emptyWidgetTitle: {
    fontFamily: AppFonts.title,
    fontSize: 16,
    color: AppColors.textPrimary,
    marginTop: 6,
  },
  emptyWidgetSubtitle: {
    fontSize: 11,
    color: AppColors.textSecondary,
    textAlign: 'center',
    marginTop: 2,
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
