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
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons, Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import AppColors from '../theme/AppColors';
import PolaroidCard from '../components/PolaroidCard';
import StorageService, { MemoryItem } from '../services/StorageService';

const SAMPLE_PRESET_PHOTOS = [
  'https://images.unsplash.com/photo-1518199266791-5375a83190b7?w=800&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1522673607200-164d1b6ce486?w=800&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1511285560929-80b456fea0bc?w=800&auto=format&fit=crop&q=80',
];

const MEMORY_TAGS = ['Date Night', 'Anniversary', 'Road Trip', 'Cozy Home', 'Milestone'];

export const MemoryScreen: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'memories' | 'messages'>('memories');
  const [memories, setMemories] = useState<MemoryItem[]>([]);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [newCaption, setNewCaption] = useState('');
  const [selectedTag, setSelectedTag] = useState('Date Night');
  const [selectedPhotoUri, setSelectedPhotoUri] = useState(SAMPLE_PRESET_PHOTOS[0]);

  useEffect(() => {
    loadMemories();
  }, []);

  const loadMemories = async () => {
    const data = await StorageService.getMemories();
    setMemories(data);
  };

  const handlePickDeviceImage = async () => {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (permission.granted) {
        const result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          allowsEditing: true,
          aspect: [4, 3],
          quality: 0.8,
        });

        if (!result.canceled && result.assets && result.assets.length > 0) {
          setSelectedPhotoUri(result.assets[0].uri);
        }
      }
    } catch {
      // In web or restricted environments, preset photos are available
    }
  };

  const handleAddMemory = async () => {
    if (!newCaption.trim()) return;
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
    setNewCaption('');
    setIsUploadModalOpen(false);
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
  };

  return (
    <LinearGradient colors={['#FCE8EC', '#FFF7F8']} style={styles.gradientContainer}>
      <SafeAreaView style={styles.safeArea}>
        {/* Top Header with Dual-toggle pill: "Memories" | "Messages" */}
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
          {/* "Start Your Gallery" Banner */}
          <View style={styles.galleryHeroCard}>
            <View style={styles.heroTextCol}>
              <Text style={styles.heroTitle}>Our Shared Scrapbook</Text>
              <Text style={styles.heroSubtitle}>
                Every snapshot, late night talk, and beautiful adventure saved forever.
              </Text>
            </View>

            <TouchableOpacity
              style={styles.uploadBtn}
              onPress={() => setIsUploadModalOpen(true)}
              activeOpacity={0.85}
            >
              <Ionicons name="add" size={18} color="#FFFFFF" />
              <Text style={styles.uploadBtnText}>+ Upload Memory</Text>
            </TouchableOpacity>
          </View>

          {activeTab === 'memories' ? (
            /* Timeline Feed */
            <View style={styles.timelineContainer}>
              <View style={styles.verticalTimelineLine} />

              {memories.map((m, idx) => (
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
                    />
                  </View>
                </View>
              ))}
            </View>
          ) : (
            /* Letters / Sweet Notes Tab */
            <View style={styles.lettersContainer}>
              <View style={styles.letterCard}>
                <View style={styles.letterHeader}>
                  <Text style={styles.letterFrom}>From Maya 💌</Text>
                  <Text style={styles.letterDate}>Yesterday, 11:24 PM</Text>
                </View>
                <Text style={styles.letterBody}>
                  "Thank you for always making me laugh when I'm stressed. You truly make every day feel lighter and full of warmth. Can't wait for our trip next month!"
                </Text>
              </View>

              <View style={styles.letterCard}>
                <View style={styles.letterHeader}>
                  <Text style={styles.letterFrom}>From Alex 💖</Text>
                  <Text style={styles.letterDate}>Oct 10, 2026</Text>
                </View>
                <Text style={styles.letterBody}>
                  "Happy anniversary my love! Looking at all these memories we've built makes me so grateful. Here's to 10,000 more days together."
                </Text>
              </View>
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
              <Text style={styles.inputLabel}>Select Romantic Photo</Text>
              <View style={styles.presetRow}>
                {SAMPLE_PRESET_PHOTOS.map((uri, idx) => (
                  <TouchableOpacity
                    key={idx}
                    style={[
                      styles.presetThumbWrapper,
                      selectedPhotoUri === uri && styles.presetThumbSelected,
                    ]}
                    onPress={() => setSelectedPhotoUri(uri)}
                  >
                    <View style={styles.presetThumb} />
                    <Text style={styles.presetLabel}>Photo {idx + 1}</Text>
                  </TouchableOpacity>
                ))}
                <TouchableOpacity style={styles.devicePickBtn} onPress={handlePickDeviceImage}>
                  <Feather name="image" size={18} color={AppColors.primary} />
                  <Text style={styles.devicePickText}>Gallery</Text>
                </TouchableOpacity>
              </View>

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

              <TouchableOpacity style={styles.confirmUploadBtn} onPress={handleAddMemory}>
                <Ionicons name="sparkles" size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
                <Text style={styles.confirmUploadText}>Post to Scrapbook</Text>
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
    fontSize: 22,
    fontWeight: '900',
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
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 18,
    marginHorizontal: 16,
    marginVertical: 10,
    shadowColor: '#E297A5',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.16,
    shadowRadius: 14,
    elevation: 3,
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
  heroTextCol: {
    marginBottom: 12,
  },
  heroTitle: {
    fontSize: 17,
    fontWeight: '800',
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
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 18,
    shadowColor: '#E297A5',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 3,
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
  letterHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  letterFrom: {
    fontSize: 14,
    fontWeight: '800',
    color: AppColors.primary,
  },
  letterDate: {
    fontSize: 11,
    color: AppColors.textSecondary,
    fontWeight: '500',
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
    backgroundColor: '#FFFFFF',
    borderRadius: 28,
    padding: 22,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 10,
  },
  modalTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  uploadModalTitle: {
    fontSize: 18,
    fontWeight: '800',
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
    backgroundColor: '#FFF7F8',
    borderWidth: 1,
    borderColor: '#F8DCE2',
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
  presetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  presetThumbWrapper: {
    alignItems: 'center',
    padding: 4,
    borderRadius: 10,
  },
  presetThumbSelected: {
    backgroundColor: '#FFE8EC',
  },
  presetThumb: {
    width: 52,
    height: 40,
    borderRadius: 8,
    backgroundColor: '#FFCCD4',
    marginBottom: 4,
  },
  presetLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: AppColors.textSecondary,
  },
  devicePickBtn: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: AppColors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  devicePickText: {
    fontSize: 12,
    fontWeight: '700',
    color: AppColors.primary,
  },
  captionInput: {
    backgroundColor: '#FFF7F8',
    borderRadius: 14,
    padding: 12,
    fontSize: 14,
    color: AppColors.textPrimary,
    borderWidth: 1,
    borderColor: '#F0D4DC',
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
  confirmUploadText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 14,
  },
});

export default MemoryScreen;
