import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Modal,
  TextInput,
  Image,
  Platform,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons, Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import AppColors from '../theme/AppColors';
import AppFonts from '../theme/AppFonts';
import PolaroidCard from '../components/PolaroidCard';
import FallingHeartsBackground from '../components/FallingHeartsBackground';
import SpiralScrapbook from '../components/SpiralScrapbook';
import StorageService, {
  MemoryItem,
  LetterItem,
  CoupleProfile,
} from '../services/StorageService';
import FirestoreService from '../services/FirestoreService';

const MEMORY_TAGS = ['Date Night', 'Anniversary', 'Road Trip', 'Cozy Home', 'Milestone'];

export const MemoryScreen: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'memories' | 'messages'>('memories');
  const [memories, setMemories] = useState<MemoryItem[]>([]);
  const [letters, setLetters] = useState<LetterItem[]>([]);
  const [profile, setProfile] = useState<CoupleProfile | null>(null);

  // Memory Upload Modal State
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [newCaption, setNewCaption] = useState('');
  const [selectedTag, setSelectedTag] = useState('Date Night');
  const [selectedPhotoUri, setSelectedPhotoUri] = useState<string | null>(null);

  // Letter Modal State
  const [isLetterModalOpen, setIsLetterModalOpen] = useState(false);
  const [newLetterBody, setNewLetterBody] = useState('');

  useEffect(() => {
    loadData();

    let unsubMems = () => {};

    StorageService.getProfile().then((prof) => {
      if (prof.inviteCode) {
        unsubMems = FirestoreService.subscribeToMemories(prof.inviteCode, (cloudMems) => {
          if (cloudMems && cloudMems.length > 0) {
            setMemories(cloudMems);
            StorageService.saveMemories(cloudMems);
          }
        });
      }
    });

    return () => {
      unsubMems();
    };
  }, []);

  const loadData = async () => {
    const prof = await StorageService.getProfile();
    setProfile(prof);

    const mems = await StorageService.getMemories();
    const lets = await StorageService.getLetters();
    setMemories(mems);
    setLetters(lets);

    if (prof.inviteCode) {
      try {
        const cloudMems = await FirestoreService.fetchMemories(prof.inviteCode);
        if (cloudMems && cloudMems.length > 0) {
          setMemories(cloudMems);
          await StorageService.saveMemories(cloudMems);
        }
        const cloudLetters = await FirestoreService.fetchLetters(prof.inviteCode);
        if (cloudLetters && cloudLetters.length > 0) {
          setLetters(cloudLetters);
          await StorageService.saveLetters(cloudLetters);
        }
      } catch (err) {
        console.warn('Cloud memory load notice:', err);
      }
    }
  };

  const handlePickDeviceImage = async () => {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (permission.granted) {
        const result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          allowsEditing: true,
          aspect: [4, 3],
          quality: 0.85,
        });

        if (!result.canceled && result.assets && result.assets.length > 0) {
          setSelectedPhotoUri(result.assets[0].uri);
        }
      }
    } catch {
      // Safe fallback
    }
  };

  const handleAddMemory = async () => {
    if (!newCaption.trim() || !selectedPhotoUri) return;
    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {}

    const todayStr = new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }).format(new Date());

    const newItem: MemoryItem = {
      id: `m-${Date.now()}`,
      imageUri: selectedPhotoUri,
      caption: newCaption.trim(),
      date: todayStr,
      tag: selectedTag,
      likes: 1,
      isLiked: true,
    };

    const updated = [newItem, ...memories];
    setMemories(updated);
    await StorageService.saveMemories(updated);
    if (profile?.inviteCode) {
      await FirestoreService.syncMemories(profile.inviteCode, updated);
    }
    setNewCaption('');
    setSelectedPhotoUri(null);
    setIsUploadModalOpen(false);
  };

  const handleAddLetter = async () => {
    if (!newLetterBody.trim()) return;
    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {}

    const todayStr = new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }).format(new Date());

    const sender = profile?.userName && profile.userName !== 'You' ? profile.userName : 'You';

    const newLetter: LetterItem = {
      id: `l-${Date.now()}`,
      senderName: sender,
      body: newLetterBody.trim(),
      date: todayStr,
    };

    const updated = [newLetter, ...letters];
    setLetters(updated);
    await StorageService.saveLetters(updated);
    if (profile?.inviteCode) {
      await FirestoreService.syncLetters(profile.inviteCode, updated);
    }
    setNewLetterBody('');
    setIsLetterModalOpen(false);
  };

  const handleLikeToggle = async (id: string, isLiked: boolean) => {
    const updated = memories.map((m) => {
      if (m.id === id) {
        return {
          ...m,
          isLiked,
          likes: isLiked ? m.likes + 1 : Math.max(0, m.likes - 1),
        };
      }
      return m;
    });
    setMemories(updated);
    await StorageService.saveMemories(updated);
    if (profile?.inviteCode) {
      await FirestoreService.syncMemories(profile.inviteCode, updated);
    }
  };

  const handleDeleteMemory = async (id: string) => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch {}

    const performDelete = async () => {
      const updated = memories.filter((m) => m.id !== id);
      setMemories(updated);
      await StorageService.saveMemories(updated);
      if (profile?.inviteCode) {
        await FirestoreService.syncMemories(profile.inviteCode, updated);
      }
    };

    if (Platform.OS === 'web') {
      if (
        typeof window !== 'undefined' &&
        window.confirm('Are you sure you want to remove this memory from your scrapbook? 💕')
      ) {
        await performDelete();
      }
    } else {
      Alert.alert(
        'Remove Memory',
        'Are you sure you want to remove this memory from your scrapbook? 💕',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Remove',
            style: 'destructive',
            onPress: performDelete,
          },
        ]
      );
    }
  };

  const handleDeleteLetter = async (id: string) => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch {}

    const performDelete = async () => {
      const updated = letters.filter((l) => l.id !== id);
      setLetters(updated);
      await StorageService.saveLetters(updated);
    };

    if (Platform.OS === 'web') {
      if (
        typeof window !== 'undefined' &&
        window.confirm('Are you sure you want to remove this love letter? 💌')
      ) {
        await performDelete();
      }
    } else {
      Alert.alert(
        'Remove Love Letter',
        'Are you sure you want to remove this love letter? 💌',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Remove',
            style: 'destructive',
            onPress: performDelete,
          },
        ]
      );
    }
  };

  return (
    <LinearGradient colors={['#FCE8EC', '#FFF7F8']} style={styles.gradientContainer}>
      <FallingHeartsBackground />
      <SafeAreaView style={styles.safeArea}>
        {/* Top Header with Dual-toggle pill: "Memories" | "Letters" */}
        <View style={styles.headerRow}>
          <Text style={styles.screenTitle}>Memory Scrapbook</Text>
          <View style={styles.dualTogglePill}>
            <TouchableOpacity
              style={[styles.toggleSegment, activeTab === 'memories' && styles.toggleSegmentActive]}
              onPress={() => setActiveTab('memories')}
            >
              <Text
                style={[styles.toggleText, activeTab === 'memories' && styles.toggleTextActive]}
              >
                Memories
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.toggleSegment, activeTab === 'messages' && styles.toggleSegmentActive]}
              onPress={() => setActiveTab('messages')}
            >
              <Text
                style={[styles.toggleText, activeTab === 'messages' && styles.toggleTextActive]}
              >
                Letters
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
          {/* Scrapbook Banner */}
          <View style={styles.galleryHeroCard}>
            <View style={styles.heroTextCol}>
              <Text style={styles.heroTitle}>Our Shared Keepsakes</Text>
              <Text style={styles.heroSubtitle}>
                Every snapshot, heartfelt note, and couple adventure saved forever.
              </Text>
            </View>

            {activeTab === 'memories' ? (
              <TouchableOpacity
                style={styles.uploadBtn}
                onPress={() => {
                  setSelectedPhotoUri(null);
                  setIsUploadModalOpen(true);
                }}
                activeOpacity={0.85}
              >
                <Ionicons name="add" size={18} color="#FFFFFF" />
                <Text style={styles.uploadBtnText}>+ Upload Memory</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={styles.uploadBtn}
                onPress={() => setIsLetterModalOpen(true)}
                activeOpacity={0.85}
              >
                <Ionicons name="pencil" size={16} color="#FFFFFF" />
                <Text style={styles.uploadBtnText}>+ Write Letter</Text>
              </TouchableOpacity>
            )}
          </View>

          {activeTab === 'memories' ? (
            /* ======================================================== */
            /* MEMORIES TAB                                             */
            /* ======================================================== */
            memories.length === 0 ? (
              <View style={styles.emptyContainer}>
                <View style={styles.emptyIconCircle}>
                  <Ionicons name="camera-outline" size={38} color={AppColors.primary} />
                </View>
                <Text style={styles.emptyTitle}>Your Scrapbook is Empty</Text>
                <Text style={styles.emptySubtitle}>
                  Start saving your favorite real-life memories together. Tap below to choose your first couple photo!
                </Text>
                <TouchableOpacity
                  style={styles.emptyActionBtn}
                  onPress={() => {
                    setSelectedPhotoUri(null);
                    setIsUploadModalOpen(true);
                  }}
                  activeOpacity={0.85}
                >
                  <Ionicons name="add" size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
                  <Text style={styles.emptyActionBtnText}>Upload First Memory</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.timelineContainer}>
                <View style={styles.verticalTimelineLine} />
                {memories.map((m) => (
                  <View key={m.id} style={styles.timelineItemWrapper}>
                    {/* Timeline Node Heart */}
                    <View style={styles.timelineNode}>
                      <Ionicons name="heart" size={12} color="#FF6575" />
                    </View>

                    <View style={styles.timelineCardCol}>
                      <PolaroidCard
                        imageUri={m.imageUri}
                        caption={m.caption}
                        date={m.date}
                        tag={m.tag}
                        likes={m.likes}
                        isLiked={m.isLiked}
                        onLikeToggle={(liked) => handleLikeToggle(m.id, liked)}
                        onDelete={() => handleDeleteMemory(m.id)}
                      />
                    </View>
                  </View>
                ))}
              </View>
            )
          ) : (
            /* ======================================================== */
            /* LETTERS TAB: REAL SPIRAL NOTEBOOK SCRAPBOOK              */
            /* ======================================================== */
            <View style={{ width: '100%' }}>
              <SpiralScrapbook
                profile={profile}
                onWriteNewLetter={() => setIsLetterModalOpen(true)}
              />

              {/* Saved Individual Letters */}
              {letters.length > 0 && (
                <View style={[styles.lettersContainer, { marginTop: 16 }]}>
                  <Text style={styles.savedLettersSectionTitle}>Saved Love Letters</Text>
                  {letters.map((letter) => (
                    <View key={letter.id} style={styles.letterCard}>
                      <View style={styles.letterHeader}>
                        <Text style={styles.letterFrom}>From {letter.senderName} 💌</Text>
                        <View style={styles.letterMetaGroup}>
                          <Text style={styles.letterDate}>{letter.date}</Text>
                          <TouchableOpacity
                            onPress={() => handleDeleteLetter(letter.id)}
                            style={styles.deleteLetterBtn}
                            activeOpacity={0.75}
                            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                          >
                            <Ionicons name="trash-outline" size={13} color="#FF6575" />
                          </TouchableOpacity>
                        </View>
                      </View>
                      <Text style={styles.letterBody}>"{letter.body}"</Text>
                    </View>
                  ))}
                </View>
              )}
            </View>
          )}

          <View style={{ height: 110 }} />
        </ScrollView>

        {/* Modal: Upload New Memory */}
        <Modal visible={isUploadModalOpen} transparent animationType="slide">
          <View style={styles.modalOverlay}>
            <View style={styles.uploadModalCard}>
              <View style={styles.modalTopRow}>
                <Text style={styles.uploadModalTitle}>Add New Memory</Text>
                <TouchableOpacity onPress={() => setIsUploadModalOpen(false)}>
                  <Ionicons name="close" size={22} color={AppColors.textSecondary} />
                </TouchableOpacity>
              </View>

              {/* Tag selector */}
              <Text style={styles.inputLabel}>Memory Category</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tagsScroll}>
                {MEMORY_TAGS.map((tag) => (
                  <TouchableOpacity
                    key={tag}
                    style={[styles.tagPill, selectedTag === tag && styles.tagPillActive]}
                    onPress={() => setSelectedTag(tag)}
                  >
                    <Text style={[styles.tagPillText, selectedTag === tag && styles.tagPillTextActive]}>
                      {tag}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              {/* Photo Source Selector */}
              <Text style={styles.inputLabel}>Choose Photo</Text>
              {selectedPhotoUri ? (
                <View style={styles.chosenPhotoWrapper}>
                  <Image source={{ uri: selectedPhotoUri }} style={styles.chosenPhotoImage} />
                  <TouchableOpacity
                    style={styles.changePhotoBtn}
                    onPress={handlePickDeviceImage}
                    activeOpacity={0.8}
                  >
                    <Feather name="refresh-cw" size={13} color="#FFFFFF" />
                    <Text style={styles.changePhotoText}>Change Photo</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity
                  style={styles.devicePickBox}
                  onPress={handlePickDeviceImage}
                  activeOpacity={0.8}
                >
                  <View style={styles.devicePickIconCircle}>
                    <Feather name="image" size={26} color={AppColors.primary} />
                  </View>
                  <Text style={styles.devicePickTitle}>Select from Gallery</Text>
                  <Text style={styles.devicePickSubtitle}>Tap to pick a photo from your device</Text>
                </TouchableOpacity>
              )}

              {/* Caption Input */}
              <Text style={styles.inputLabel}>Caption / Sweet Note</Text>
              <TextInput
                style={styles.captionInput}
                placeholder="What made this moment special? ✨"
                placeholderTextColor="#C4B4BA"
                value={newCaption}
                onChangeText={setNewCaption}
                multiline
                numberOfLines={3}
              />

              <TouchableOpacity
                style={[
                  styles.confirmUploadBtn,
                  (!newCaption.trim() || !selectedPhotoUri) && styles.confirmUploadBtnDisabled,
                ]}
                onPress={handleAddMemory}
                disabled={!newCaption.trim() || !selectedPhotoUri}
              >
                <Ionicons name="sparkles" size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
                <Text style={styles.confirmUploadText}>
                  {selectedPhotoUri ? 'Post to Scrapbook' : 'Select a photo first'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* Modal: Write New Love Letter */}
        <Modal visible={isLetterModalOpen} transparent animationType="slide">
          <View style={styles.modalOverlay}>
            <View style={styles.uploadModalCard}>
              <View style={styles.modalTopRow}>
                <Text style={styles.uploadModalTitle}>Write Love Letter 💌</Text>
                <TouchableOpacity onPress={() => setIsLetterModalOpen(false)}>
                  <Ionicons name="close" size={22} color={AppColors.textSecondary} />
                </TouchableOpacity>
              </View>

              <Text style={styles.inputLabel}>
                {profile?.partnerName && profile.partnerName !== 'Partner'
                  ? `Letter for ${profile.partnerName}`
                  : 'Letter for your Partner'}
              </Text>
              <TextInput
                style={[styles.captionInput, { height: 120 }]}
                placeholder="Write a sweet, heartfelt message for your partner to keep forever..."
                placeholderTextColor="#C4B4BA"
                value={newLetterBody}
                onChangeText={setNewLetterBody}
                multiline
                numberOfLines={5}
              />

              <TouchableOpacity
                style={[
                  styles.confirmUploadBtn,
                  !newLetterBody.trim() && styles.confirmUploadBtnDisabled,
                ]}
                onPress={handleAddLetter}
                disabled={!newLetterBody.trim()}
              >
                <Ionicons name="heart" size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
                <Text style={styles.confirmUploadText}>Send Love Letter</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
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
  screenTitle: {
    fontFamily: AppFonts.title,
    fontSize: 26,
    color: AppColors.textPrimary,
  },
  dualTogglePill: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 3,
    borderWidth: 1,
    borderColor: '#FFE8EC',
  },
  toggleSegment: {
    paddingVertical: 5,
    paddingHorizontal: 12,
    borderRadius: 15,
  },
  toggleSegmentActive: {
    backgroundColor: AppColors.primary,
  },
  toggleText: {
    fontSize: 12,
    fontWeight: '700',
    color: AppColors.textSecondary,
  },
  toggleTextActive: {
    color: '#FFFFFF',
  },
  scrollContent: {
    paddingBottom: 24,
  },
  galleryHeroCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.58)',
    borderRadius: 24,
    padding: 18,
    marginHorizontal: 16,
    marginVertical: 10,
    shadowColor: '#E297A5',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 3,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.95)',
  },
  heroTextCol: {
    marginBottom: 12,
  },
  heroTitle: {
    fontFamily: AppFonts.title,
    fontSize: 22,
    color: AppColors.textPrimary,
    marginBottom: 4,
  },
  heroSubtitle: {
    fontSize: 12.5,
    color: AppColors.textSecondary,
    lineHeight: 17,
  },
  uploadBtn: {
    backgroundColor: AppColors.primary,
    borderRadius: 9999,
    paddingVertical: 12,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    shadowColor: AppColors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  uploadBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
  emptyContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.58)',
    borderRadius: 24,
    padding: 28,
    marginHorizontal: 16,
    marginTop: 14,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.92)',
    shadowColor: '#E297A5',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 3,
  },
  emptyIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#FFE8EC',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  emptyTitle: {
    fontFamily: AppFonts.title,
    fontSize: 22,
    color: AppColors.textPrimary,
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 13,
    color: AppColors.textSecondary,
    textAlign: 'center',
    lineHeight: 19,
    marginBottom: 18,
    paddingHorizontal: 12,
  },
  emptyActionBtn: {
    backgroundColor: AppColors.primary,
    borderRadius: 9999,
    paddingVertical: 12,
    paddingHorizontal: 22,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: AppColors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 3,
  },
  emptyActionBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
  timelineContainer: {
    position: 'relative',
    marginTop: 6,
  },
  verticalTimelineLine: {
    position: 'absolute',
    left: 28,
    top: 20,
    bottom: 20,
    width: 2.5,
    backgroundColor: '#FFCCD5',
    zIndex: 1,
  },
  timelineItemWrapper: {
    flexDirection: 'row',
    position: 'relative',
    zIndex: 2,
  },
  timelineNode: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#FFCCD5',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'absolute',
    left: 17,
    top: 26,
    zIndex: 10,
  },
  timelineCardCol: {
    flex: 1,
    paddingLeft: 22,
  },
  lettersContainer: {
    paddingHorizontal: 16,
    gap: 12,
    marginTop: 8,
  },
  letterCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.62)',
    borderRadius: 22,
    padding: 18,
    shadowColor: '#E297A5',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 3,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.92)',
  },
  letterHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  letterFrom: {
    fontFamily: AppFonts.title,
    fontSize: 17,
    color: AppColors.primary,
  },
  letterDate: {
    fontSize: 11,
    color: AppColors.textSecondary,
    fontWeight: '500',
  },
  letterMetaGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  deleteLetterBtn: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: 'rgba(255, 232, 236, 0.75)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.92)',
  },
  letterBody: {
    fontSize: 13.5,
    color: AppColors.textPrimary,
    lineHeight: 20,
    fontStyle: 'italic',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(45, 36, 43, 0.45)',
    justifyContent: 'center',
    padding: 20,
  },
  uploadModalCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.94)',
    borderRadius: 28,
    padding: 22,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.16,
    shadowRadius: 20,
    elevation: 8,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.95)',
  },
  modalTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  uploadModalTitle: {
    fontFamily: AppFonts.title,
    fontSize: 22,
    color: AppColors.textPrimary,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: AppColors.textSecondary,
    marginTop: 10,
    marginBottom: 6,
  },
  tagsScroll: {
    marginBottom: 6,
  },
  tagPill: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 247, 248, 0.7)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.92)',
    marginRight: 8,
  },
  tagPillActive: {
    backgroundColor: AppColors.primary,
    borderColor: AppColors.primary,
  },
  tagPillText: {
    fontSize: 12,
    fontWeight: '600',
    color: AppColors.textPrimary,
  },
  tagPillTextActive: {
    color: '#FFFFFF',
  },
  devicePickBox: {
    height: 100,
    borderRadius: 16,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: AppColors.primary,
    backgroundColor: 'rgba(255, 247, 248, 0.65)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  devicePickIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 232, 236, 0.85)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  devicePickTitle: {
    fontFamily: AppFonts.title,
    fontSize: 16,
    color: AppColors.primary,
  },
  devicePickSubtitle: {
    fontSize: 11,
    color: AppColors.textSecondary,
    marginTop: 2,
  },
  chosenPhotoWrapper: {
    borderRadius: 16,
    overflow: 'hidden',
    position: 'relative',
    height: 130,
    marginBottom: 8,
  },
  chosenPhotoImage: {
    width: '100%',
    height: '100%',
    borderRadius: 16,
  },
  changePhotoBtn: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    borderRadius: 20,
    paddingVertical: 5,
    paddingHorizontal: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  changePhotoText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  captionInput: {
    backgroundColor: 'rgba(255, 247, 248, 0.72)',
    borderRadius: 14,
    padding: 12,
    fontSize: 14,
    color: AppColors.textPrimary,
    borderWidth: 1.2,
    borderColor: 'rgba(255, 255, 255, 0.92)',
    textAlignVertical: 'top',
    height: 75,
  },
  confirmUploadBtn: {
    backgroundColor: AppColors.primary,
    borderRadius: 14,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 18,
  },
  confirmUploadBtnDisabled: {
    backgroundColor: '#E8CCD4',
  },
  confirmUploadText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 14,
  },
  savedLettersSectionTitle: {
    fontFamily: AppFonts.title,
    fontSize: 18,
    color: AppColors.textPrimary,
    marginBottom: 10,
    paddingHorizontal: 8,
  },
});

export default MemoryScreen;
