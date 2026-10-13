import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Animated,
  Easing,
  Modal,
  TextInput,
  Dimensions,
  ScrollView,
} from 'react-native';
import { Ionicons, Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import AppColors from '../theme/AppColors';
import AppFonts from '../theme/AppFonts';
import StorageService, {
  ScrapbookPageData,
  CoupleProfile,
} from '../services/StorageService';

const { width } = Dimensions.get('window');

interface SpiralScrapbookProps {
  profile?: CoupleProfile | null;
  onWriteNewLetter?: () => void;
}

export const SpiralScrapbook: React.FC<SpiralScrapbookProps> = ({
  profile,
  onWriteNewLetter,
}) => {
  const [pages, setPages] = useState<ScrapbookPageData[]>([]);
  const [currentPageIndex, setCurrentPageIndex] = useState(0);

  // Animation values for page turning
  const flipAnim = useRef(new Animated.Value(0)).current;
  const isFlipping = useRef(false);

  // Edit Page Modal State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editSubtitle, setEditSubtitle] = useState('');
  const [editBodyText, setEditBodyText] = useState('');
  const [editCaption1, setEditCaption1] = useState('');
  const [editCaption2, setEditCaption2] = useState('');

  useEffect(() => {
    loadPages();
  }, []);

  const loadPages = async () => {
    const data = await StorageService.getScrapbookPages();
    setPages(data);
  };

  const activePage = pages[currentPageIndex] || null;

  // Turn page forward or backward
  const handleTurnPage = (direction: 'next' | 'prev') => {
    if (isFlipping.current) return;
    const targetIdx = direction === 'next' ? currentPageIndex + 1 : currentPageIndex - 1;
    if (targetIdx < 0 || targetIdx >= pages.length) return;

    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch {}

    isFlipping.current = true;
    flipAnim.setValue(0);

    Animated.timing(flipAnim, {
      toValue: direction === 'next' ? 1 : -1,
      duration: 320,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start(() => {
      setCurrentPageIndex(targetIdx);
      flipAnim.setValue(direction === 'next' ? -0.8 : 0.8);
      Animated.timing(flipAnim, {
        toValue: 0,
        duration: 260,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start(() => {
        isFlipping.current = false;
      });
    });
  };

  // Upload or change photo on active page
  const handlePickPhotoForSlot = async (slotNumber: 1 | 2) => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) return;

      const res = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.85,
      });

      if (!res.canceled && res.assets && res.assets.length > 0) {
        const selectedUri = res.assets[0].uri;
        const updated = pages.map((p, idx) => {
          if (idx === currentPageIndex) {
            return {
              ...p,
              [slotNumber === 1 ? 'photoUri1' : 'photoUri2']: selectedUri,
            };
          }
          return p;
        });

        setPages(updated);
        await StorageService.saveScrapbookPages(updated);
        try {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        } catch {}
      }
    } catch {
      // safe
    }
  };

  // Open Edit Modal for active page
  const handleOpenEditModal = () => {
    if (!activePage) return;
    setEditTitle(activePage.title || '');
    setEditSubtitle(activePage.subtitle || '');
    setEditBodyText(activePage.bodyText || '');
    setEditCaption1(activePage.caption1 || '');
    setEditCaption2(activePage.caption2 || '');
    setIsEditModalOpen(true);
  };

  // Save changes from Edit Modal
  const handleSavePageEdits = async () => {
    if (!activePage) return;
    const updated = pages.map((p, idx) => {
      if (idx === currentPageIndex) {
        return {
          ...p,
          title: editTitle.trim() || p.title,
          subtitle: editSubtitle.trim() || p.subtitle,
          bodyText: editBodyText.trim() || p.bodyText,
          caption1: editCaption1.trim() || p.caption1,
          caption2: editCaption2.trim() || p.caption2,
        };
      }
      return p;
    });

    setPages(updated);
    await StorageService.saveScrapbookPages(updated);
    setIsEditModalOpen(false);
    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {}
  };

  const pageTranslateX = flipAnim.interpolate({
    inputRange: [-1, 0, 1],
    outputRange: [60, 0, -60],
  });

  const pageOpacity = flipAnim.interpolate({
    inputRange: [-1, -0.2, 0, 0.2, 1],
    outputRange: [0.3, 0.9, 1, 0.9, 0.3],
  });

  return (
    <View style={styles.container}>
      {/* Scrapbook Section Header Bar */}
      <View style={styles.headerBar}>
        <View style={styles.headerTitleGroup}>
          <Text style={styles.scrapbookHeading}>Couple Spiral Scrapbook</Text>
          <Text style={styles.scrapbookSubheading}>
            Turn pages, pin photos & cherish heartfelt letters
          </Text>
        </View>

        <TouchableOpacity
          style={styles.editPageActionBtn}
          onPress={handleOpenEditModal}
          activeOpacity={0.8}
        >
          <Feather name="edit-3" size={14} color={AppColors.primary} />
          <Text style={styles.editPageActionText}>Customize</Text>
        </TouchableOpacity>
      </View>

      {/* Real Spiral Notebook Book Container */}
      <View style={styles.notebookBook}>
        {/* Spiral Binder (Left Margin Silver Metallic Coils) */}
        <View style={styles.spiralBindingCol}>
          {[...Array(12)].map((_, i) => (
            <View key={i} style={styles.spiralHoleUnit}>
              <View style={styles.spiralHole} />
              <View style={styles.spiralCoilLoop}>
                <LinearGradient
                  colors={['#D8D8DC', '#FFFFFF', '#9C9CA4', '#C0C0C8']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0.8 }}
                  style={styles.spiralCoilGradient}
                />
              </View>
            </View>
          ))}
        </View>

        {/* The Realistic Scrapbook Page Sheet */}
        <Animated.View
          style={[
            styles.scrapbookPageSheet,
            {
              transform: [{ translateX: pageTranslateX }],
              opacity: pageOpacity,
            },
          ]}
        >
          {/* Subtle textured page border & background */}
          {activePage && (
            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.pageInnerScroll}
            >
              {/* ======================================================== */}
              {/* TEMPLATE 1: MILESTONE COVER & CHAPTER ONE               */}
              {/* ======================================================== */}
              {activePage.templateType === 'milestone_cover' && (
                <View style={styles.templateMilestoneCover}>
                  {/* Pinned Kraft Badge */}
                  <View style={styles.pinnedKraftBadge}>
                    <Text style={styles.kraftBadgeText}>
                      {activePage.dateStr || 'OUR LOVE CHAPTER'}
                    </Text>
                  </View>

                  <Text style={styles.pageBigTitle}>{activePage.title}</Text>
                  <Text style={styles.pageSubtitleScript}>{activePage.subtitle}</Text>

                  {/* Main Centerpiece Photo Box with Washi Tape */}
                  <View style={styles.photoFrameCenter}>
                    {/* Corner Washi Tape Pink */}
                    <View style={[styles.washiTape, styles.washiTapeTopLeft]} />
                    <View style={[styles.washiTape, styles.washiTapeBottomRight]} />

                    <TouchableOpacity
                      style={styles.photoTouchable}
                      onPress={() => handlePickPhotoForSlot(1)}
                      activeOpacity={0.9}
                    >
                      {activePage.photoUri1 ? (
                        <Image source={{ uri: activePage.photoUri1 }} style={styles.photoFull} />
                      ) : (
                        <View style={styles.emptyPhotoBox}>
                          <Ionicons name="camera" size={32} color={AppColors.primary} />
                          <Text style={styles.emptyPhotoText}>Tap to add cover photo</Text>
                        </View>
                      )}
                      <View style={styles.photoChangeBadge}>
                        <Feather name="camera" size={12} color="#FFFFFF" />
                      </View>
                    </TouchableOpacity>

                    {activePage.caption1 && (
                      <Text style={styles.photoPolaroidCaption}>{activePage.caption1}</Text>
                    )}
                  </View>

                  {/* Vow text on torn paper motif */}
                  <View style={styles.tornVowCard}>
                    <Text style={styles.vowBodyText}>{activePage.bodyText}</Text>
                    <View style={styles.waxSealStamp}>
                      <Ionicons name="heart" size={16} color="#FFFFFF" />
                    </View>
                  </View>

                  {/* Realistic Butterfly Embellishment */}
                  <View style={styles.butterflyEmbellishmentRight}>
                    <Image
                      source={require('../../assets/scrapbook_butterflies.jpg')}
                      style={styles.butterflyCrop}
                      resizeMode="contain"
                    />
                  </View>
                </View>
              )}

              {/* ======================================================== */}
              {/* TEMPLATE 2: POLAROID COLLAGE & LITTLE MOMENTS           */}
              {/* ======================================================== */}
              {activePage.templateType === 'polaroid_collage' && (
                <View style={styles.templatePolaroidCollage}>
                  <Text style={styles.pageBigTitle}>{activePage.title}</Text>
                  <Text style={styles.pageSubtitleScript}>{activePage.subtitle}</Text>

                  {/* Dual Tilted Polaroids */}
                  <View style={styles.polaroidsRow}>
                    {/* Polaroid 1 (Tilted left) */}
                    <View style={[styles.tiltedPolaroid, { transform: [{ rotate: '-3.5deg' }] }]}>
                      <View style={[styles.washiTape, styles.washiTapeTopCenter]} />
                      <TouchableOpacity
                        style={styles.polaroidPhotoSlot}
                        onPress={() => handlePickPhotoForSlot(1)}
                        activeOpacity={0.9}
                      >
                        {activePage.photoUri1 ? (
                          <Image source={{ uri: activePage.photoUri1 }} style={styles.photoFull} />
                        ) : (
                          <View style={styles.emptyPolaroidSlot}>
                            <Ionicons name="camera-outline" size={24} color={AppColors.primary} />
                            <Text style={styles.emptySlotText}>Add Photo</Text>
                          </View>
                        )}
                      </TouchableOpacity>
                      <Text style={styles.polaroidHandwrittenCaption}>
                        {activePage.caption1 || 'Golden Hour ✨'}
                      </Text>
                    </View>

                    {/* Polaroid 2 (Tilted right) */}
                    <View style={[styles.tiltedPolaroid, { transform: [{ rotate: '4deg' }] }]}>
                      <View style={[styles.washiTape, styles.washiTapeTopCenter, { backgroundColor: '#B8E2D8' }]} />
                      <TouchableOpacity
                        style={styles.polaroidPhotoSlot}
                        onPress={() => handlePickPhotoForSlot(2)}
                        activeOpacity={0.9}
                      >
                        {activePage.photoUri2 ? (
                          <Image source={{ uri: activePage.photoUri2 }} style={styles.photoFull} />
                        ) : (
                          <View style={styles.emptyPolaroidSlot}>
                            <Ionicons name="camera-outline" size={24} color={AppColors.primary} />
                            <Text style={styles.emptySlotText}>Add Photo</Text>
                          </View>
                        )}
                      </TouchableOpacity>
                      <Text style={styles.polaroidHandwrittenCaption}>
                        {activePage.caption2 || 'My favorite smile 💕'}
                      </Text>
                    </View>
                  </View>

                  {/* Sticky Note */}
                  <View style={styles.stickyNoteBox}>
                    <View style={styles.pinNeedle} />
                    <Text style={styles.stickyNoteText}>{activePage.bodyText}</Text>
                  </View>
                </View>
              )}

              {/* ======================================================== */}
              {/* TEMPLATE 3: HANDWRITTEN LOVE LETTER ON PARCHMENT         */}
              {/* ======================================================== */}
              {activePage.templateType === 'handwritten_letter' && (
                <View style={styles.templateHandwrittenLetter}>
                  {/* Parchment Letter Box */}
                  <View style={styles.parchmentLetterSheet}>
                    <View style={styles.letterHeaderRow}>
                      <View>
                        <Text style={styles.parchmentLetterTitle}>{activePage.title}</Text>
                        <Text style={styles.parchmentSalutation}>
                          To My Dearest {profile?.partnerName || 'Partner'} 💌
                        </Text>
                      </View>
                      <View style={styles.postageStampBadge}>
                        <Ionicons name="heart-sharp" size={16} color="#FF6575" />
                        <Text style={styles.postageStampText}>LOVE</Text>
                      </View>
                    </View>

                    {/* Ruled lines with letter body text */}
                    <View style={styles.ruledLinesContainer}>
                      <Text style={styles.handwrittenLetterBody}>{activePage.bodyText}</Text>
                    </View>

                    <View style={styles.letterSignatureRow}>
                      <Text style={styles.signatureScript}>
                        Forever & Always, {profile?.userName || 'You'}
                      </Text>
                      <View style={styles.waxSealRed}>
                        <Ionicons name="heart" size={15} color="#FFFFFF" />
                      </View>
                    </View>

                    {/* Butterfly perched on letter corner */}
                    <View style={styles.letterButterflyCorner}>
                      <Image
                        source={require('../../assets/scrapbook_butterflies.jpg')}
                        style={styles.butterflySmall}
                        resizeMode="contain"
                      />
                    </View>
                  </View>
                </View>
              )}

              {/* ======================================================== */}
              {/* TEMPLATE 4: ADVENTURES & PASSPORT KEEPSAKE              */}
              {/* ======================================================== */}
              {activePage.templateType === 'adventure_ticket' && (
                <View style={styles.templateAdventure}>
                  {/* Boarding Pass Motif */}
                  <View style={styles.boardingPassCard}>
                    <View style={styles.passHeaderRow}>
                      <View style={styles.passFlightGroup}>
                        <Ionicons name="airplane" size={16} color={AppColors.primary} />
                        <Text style={styles.passFlightText}>COUPLE BOARDING PASS</Text>
                      </View>
                      <Text style={styles.passGateText}>GATE: FOREVER</Text>
                    </View>

                    <Text style={styles.passMainDest}>{activePage.title}</Text>
                    <Text style={styles.passSubDest}>{activePage.subtitle}</Text>

                    {/* Panoramic Adventure Photo */}
                    <TouchableOpacity
                      style={styles.adventurePanoramicSlot}
                      onPress={() => handlePickPhotoForSlot(1)}
                      activeOpacity={0.9}
                    >
                      {activePage.photoUri1 ? (
                        <Image source={{ uri: activePage.photoUri1 }} style={styles.photoFull} />
                      ) : (
                        <View style={styles.emptyPhotoBox}>
                          <Ionicons name="map-outline" size={28} color={AppColors.primary} />
                          <Text style={styles.emptyPhotoText}>Tap to add trip photo ✈️</Text>
                        </View>
                      )}
                      <View style={styles.photoChangeBadge}>
                        <Feather name="camera" size={12} color="#FFFFFF" />
                      </View>
                    </TouchableOpacity>

                    {activePage.caption1 && (
                      <Text style={styles.adventureCaption}>{activePage.caption1}</Text>
                    )}

                    <Text style={styles.adventureVow}>{activePage.bodyText}</Text>
                  </View>
                </View>
              )}

              {/* ======================================================== */}
              {/* TEMPLATE 5: BOTANICAL PRESSED BUTTERFLIES                */}
              {/* ======================================================== */}
              {activePage.templateType === 'butterfly_pressed' && (
                <View style={styles.templateBotanical}>
                  {/* Large Gemini Generated Butterfly Graphic */}
                  <View style={styles.botanicalHeroButterflyBox}>
                    <Image
                      source={require('../../assets/scrapbook_butterflies.jpg')}
                      style={styles.butterflyLargeHero}
                      resizeMode="contain"
                    />
                  </View>

                  <Text style={styles.pageBigTitle}>{activePage.title}</Text>
                  <Text style={styles.pageSubtitleScript}>{activePage.subtitle}</Text>

                  {/* Oval Romantic Photo Frame */}
                  <TouchableOpacity
                    style={styles.ovalPhotoFrame}
                    onPress={() => handlePickPhotoForSlot(1)}
                    activeOpacity={0.9}
                  >
                    {activePage.photoUri1 ? (
                      <Image source={{ uri: activePage.photoUri1 }} style={styles.photoFull} />
                    ) : (
                      <View style={styles.emptyPhotoBox}>
                        <Ionicons name="flower-outline" size={26} color={AppColors.primary} />
                        <Text style={styles.emptyPhotoText}>Add couple snapshot</Text>
                      </View>
                    )}
                    <View style={styles.photoChangeBadge}>
                      <Feather name="camera" size={12} color="#FFFFFF" />
                    </View>
                  </TouchableOpacity>

                  {/* 4 Pressed Note Strips */}
                  <View style={styles.pressedStripsList}>
                    <View style={styles.pressedStrip}>
                      <Text style={styles.pressedStripBullet}>🌸</Text>
                      <Text style={styles.pressedStripText}>
                        The tender way you look at me across a crowded room
                      </Text>
                    </View>
                    <View style={styles.pressedStrip}>
                      <Text style={styles.pressedStripBullet}>✨</Text>
                      <Text style={styles.pressedStripText}>
                        Your warm laugh that instantly eases all my worries
                      </Text>
                    </View>
                    <View style={styles.pressedStrip}>
                      <Text style={styles.pressedStripBullet}>🦋</Text>
                      <Text style={styles.pressedStripText}>
                        Holding your hand anywhere in the world
                      </Text>
                    </View>
                  </View>

                  <Text style={styles.botanicalQuoteText}>{activePage.bodyText}</Text>
                </View>
              )}

              {/* ======================================================== */}
              {/* TEMPLATE 6: MIDNIGHT VOWS & STARLIGHT DREAMS            */}
              {/* ======================================================== */}
              {activePage.templateType === 'midnight_whispers' && (
                <View style={styles.templateMidnight}>
                  <LinearGradient
                    colors={['#1E1233', '#2D1647', '#150A26']}
                    style={styles.midnightParchment}
                  >
                    <View style={styles.midnightHeaderRow}>
                      <Text style={styles.midnightStars}>✨ 🌌 ✨</Text>
                      <Text style={styles.midnightTitle}>{activePage.title}</Text>
                      <Text style={styles.midnightSubtitle}>{activePage.subtitle}</Text>
                    </View>

                    {/* Starlight Photo Slot */}
                    <TouchableOpacity
                      style={styles.midnightPhotoSlot}
                      onPress={() => handlePickPhotoForSlot(1)}
                      activeOpacity={0.9}
                    >
                      {activePage.photoUri1 ? (
                        <Image source={{ uri: activePage.photoUri1 }} style={styles.photoFull} />
                      ) : (
                        <View style={styles.emptyPhotoBoxDark}>
                          <Ionicons name="moon-outline" size={28} color="#FFB8C6" />
                          <Text style={styles.emptyPhotoTextDark}>Add Midnight Photo ✨</Text>
                        </View>
                      )}
                      <View style={styles.photoChangeBadge}>
                        <Feather name="camera" size={12} color="#FFFFFF" />
                      </View>
                    </TouchableOpacity>

                    {activePage.caption1 && (
                      <Text style={styles.midnightCaption}>{activePage.caption1}</Text>
                    )}

                    <Text style={styles.midnightBody}>{activePage.bodyText}</Text>

                    <View style={styles.waxSealGold}>
                      <Ionicons name="star" size={14} color="#6E4400" />
                    </View>
                  </LinearGradient>
                </View>
              )}
            </ScrollView>
          )}
        </Animated.View>
      </View>

      {/* Realistic Page Turner Bottom Bar */}
      <View style={styles.pageTurnNavigationRow}>
        <TouchableOpacity
          style={[styles.turnPageBtn, currentPageIndex === 0 && styles.turnPageBtnDisabled]}
          onPress={() => handleTurnPage('prev')}
          disabled={currentPageIndex === 0}
          activeOpacity={0.8}
        >
          <Ionicons
            name="chevron-back"
            size={18}
            color={currentPageIndex === 0 ? '#C4B8BC' : AppColors.primary}
          />
          <Text
            style={[
              styles.turnPageText,
              currentPageIndex === 0 && styles.turnPageTextDisabled,
            ]}
          >
            Turn Page
          </Text>
        </TouchableOpacity>

        {/* Page Indicator Badge */}
        <View style={styles.pageIndicatorPill}>
          <Text style={styles.pageIndicatorText}>
            Page {currentPageIndex + 1} of {pages.length}
          </Text>
        </View>

        <TouchableOpacity
          style={[
            styles.turnPageBtn,
            currentPageIndex === pages.length - 1 && styles.turnPageBtnDisabled,
          ]}
          onPress={() => handleTurnPage('next')}
          disabled={currentPageIndex === pages.length - 1}
          activeOpacity={0.8}
        >
          <Text
            style={[
              styles.turnPageText,
              currentPageIndex === pages.length - 1 && styles.turnPageTextDisabled,
            ]}
          >
            Turn Page
          </Text>
          <Ionicons
            name="chevron-forward"
            size={18}
            color={currentPageIndex === pages.length - 1 ? '#C4B8BC' : AppColors.primary}
          />
        </TouchableOpacity>
      </View>

      {/* ======================================================== */}
      {/* MODAL: CUSTOMIZE ACTIVE SCRAPBOOK PAGE                   */}
      {/* ======================================================== */}
      <Modal visible={isEditModalOpen} transparent animationType="slide">
        <View style={styles.editModalBackdrop}>
          <View style={styles.editModalCard}>
            <View style={styles.editModalHeader}>
              <Text style={styles.editModalTitle}>Customize Page {currentPageIndex + 1}</Text>
              <TouchableOpacity onPress={() => setIsEditModalOpen(false)}>
                <Ionicons name="close" size={22} color={AppColors.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.editModalForm}>
              <Text style={styles.inputLabel}>Page Title</Text>
              <TextInput
                style={styles.textInput}
                value={editTitle}
                onChangeText={setEditTitle}
                placeholder="Title..."
                placeholderTextColor="#A89B9E"
              />

              <Text style={styles.inputLabel}>Subtitle / Date</Text>
              <TextInput
                style={styles.textInput}
                value={editSubtitle}
                onChangeText={setEditSubtitle}
                placeholder="Subtitle or date..."
                placeholderTextColor="#A89B9E"
              />

              <Text style={styles.inputLabel}>Love Note / Vow Text</Text>
              <TextInput
                style={[styles.textInput, styles.textAreaInput]}
                value={editBodyText}
                onChangeText={setEditBodyText}
                placeholder="Write your heartfelt note..."
                placeholderTextColor="#A89B9E"
                multiline
                numberOfLines={4}
              />

              <Text style={styles.inputLabel}>Photo Caption</Text>
              <TextInput
                style={styles.textInput}
                value={editCaption1}
                onChangeText={setEditCaption1}
                placeholder="Caption for photo 1..."
                placeholderTextColor="#A89B9E"
              />

              <TouchableOpacity
                style={styles.savePageEditsBtn}
                onPress={handleSavePageEdits}
                activeOpacity={0.85}
              >
                <Ionicons name="checkmark" size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
                <Text style={styles.savePageEditsBtnText}>Save Page Keepsake</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 10,
    paddingHorizontal: 12,
  },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 6,
    marginBottom: 10,
  },
  headerTitleGroup: {
    flex: 1,
  },
  scrapbookHeading: {
    fontFamily: AppFonts.title,
    fontSize: 20,
    color: AppColors.textPrimary,
  },
  scrapbookSubheading: {
    fontSize: 11,
    color: AppColors.textSecondary,
    marginTop: 2,
  },
  editPageActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 232, 236, 0.85)',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#FFBAC8',
    gap: 4,
  },
  editPageActionText: {
    fontSize: 11,
    fontWeight: '800',
    color: AppColors.primary,
  },

  // Spiral Notebook Architecture
  notebookBook: {
    flexDirection: 'row',
    backgroundColor: '#F3E9DD', // Real craft book cover backing
    borderRadius: 22,
    paddingVertical: 10,
    paddingRight: 10,
    paddingLeft: 4,
    shadowColor: '#BCA89E',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.22,
    shadowRadius: 16,
    elevation: 4,
    minHeight: 520,
    borderWidth: 1.5,
    borderColor: '#E6D7C8',
  },
  spiralBindingCol: {
    width: 26,
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingVertical: 16,
    zIndex: 10,
  },
  spiralHoleUnit: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    height: 28,
  },
  spiralHole: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#7D7068',
    borderWidth: 1,
    borderColor: '#5C5049',
  },
  spiralCoilLoop: {
    position: 'absolute',
    left: -2,
    width: 18,
    height: 10,
    borderRadius: 5,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 1, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 2,
    elevation: 3,
  },
  spiralCoilGradient: {
    width: '100%',
    height: '100%',
  },

  // Scrapbook Sheet
  scrapbookPageSheet: {
    flex: 1,
    backgroundColor: '#FFFDF9', // Real parchment off-white paper
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#EFE7DA',
    overflow: 'hidden',
    shadowColor: '#8C7E74',
    shadowOffset: { width: -2, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
  },
  pageInnerScroll: {
    padding: 16,
    paddingBottom: 28,
  },

  // Common Template Typography & Elements
  pageBigTitle: {
    fontFamily: AppFonts.title,
    fontSize: 22,
    color: '#3E3034',
    textAlign: 'center',
    letterSpacing: 0.4,
  },
  pageSubtitleScript: {
    fontSize: 12,
    color: '#8A767C',
    textAlign: 'center',
    marginTop: 2,
    marginBottom: 14,
    fontStyle: 'italic',
  },
  photoFull: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  photoChangeBadge: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    backgroundColor: 'rgba(0,0,0,0.55)',
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  washiTape: {
    position: 'absolute',
    width: 44,
    height: 14,
    backgroundColor: 'rgba(255, 182, 193, 0.85)',
    borderRadius: 2,
    zIndex: 5,
  },
  washiTapeTopLeft: {
    top: -6,
    left: 10,
    transform: [{ rotate: '-8deg' }],
  },
  washiTapeBottomRight: {
    bottom: -6,
    right: 10,
    transform: [{ rotate: '8deg' }],
  },
  washiTapeTopCenter: {
    top: -6,
    alignSelf: 'center',
    transform: [{ rotate: '-2deg' }],
  },

  // Template 1: Milestone Cover
  templateMilestoneCover: {
    alignItems: 'center',
  },
  pinnedKraftBadge: {
    backgroundColor: '#EBDCCE',
    paddingVertical: 3,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#D4C0AD',
  },
  kraftBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#6E5647',
    letterSpacing: 1,
  },
  photoFrameCenter: {
    width: '92%',
    backgroundColor: '#FFFFFF',
    padding: 10,
    borderRadius: 12,
    shadowColor: '#9C8980',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.16,
    shadowRadius: 10,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#EBE2D5',
    position: 'relative',
    marginBottom: 16,
  },
  photoTouchable: {
    width: '100%',
    height: 170,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#F7F0E8',
  },
  emptyPhotoBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 232, 236, 0.4)',
  },
  emptyPhotoText: {
    fontSize: 11,
    color: AppColors.primary,
    fontWeight: '700',
    marginTop: 6,
  },
  photoPolaroidCaption: {
    fontSize: 12,
    fontStyle: 'italic',
    color: '#635357',
    textAlign: 'center',
    marginTop: 8,
  },
  tornVowCard: {
    width: '92%',
    backgroundColor: '#FAF4EC',
    borderRadius: 10,
    padding: 14,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#D8C3B4',
    position: 'relative',
    marginTop: 4,
  },
  vowBodyText: {
    fontSize: 12,
    color: '#524348',
    lineHeight: 18,
    fontStyle: 'italic',
  },
  waxSealStamp: {
    position: 'absolute',
    bottom: -10,
    right: 12,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#C83244',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#E86374',
  },
  butterflyEmbellishmentRight: {
    position: 'absolute',
    top: 6,
    right: 4,
    width: 50,
    height: 50,
    zIndex: 10,
  },
  butterflyCrop: {
    width: 50,
    height: 50,
  },

  // Template 2: Polaroid Collage
  templatePolaroidCollage: {
    alignItems: 'center',
  },
  polaroidsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 16,
  },
  tiltedPolaroid: {
    width: (width - 100) / 2,
    backgroundColor: '#FFFFFF',
    padding: 8,
    borderRadius: 10,
    shadowColor: '#8C7B72',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.16,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#ECE3D7',
    position: 'relative',
  },
  polaroidPhotoSlot: {
    width: '100%',
    height: 110,
    borderRadius: 6,
    overflow: 'hidden',
    backgroundColor: '#F5ECE2',
  },
  emptyPolaroidSlot: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptySlotText: {
    fontSize: 10,
    color: AppColors.primary,
    fontWeight: '700',
    marginTop: 4,
  },
  polaroidHandwrittenCaption: {
    fontSize: 10,
    color: '#5C4A50',
    textAlign: 'center',
    marginTop: 6,
    fontStyle: 'italic',
  },
  stickyNoteBox: {
    width: '92%',
    backgroundColor: '#FFF5CD',
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#EAD9A6',
    position: 'relative',
  },
  pinNeedle: {
    position: 'absolute',
    top: -5,
    alignSelf: 'center',
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#FF6575',
  },
  stickyNoteText: {
    fontSize: 12,
    color: '#6B5829',
    lineHeight: 18,
    textAlign: 'center',
  },

  // Template 3: Handwritten Love Letter
  templateHandwrittenLetter: {
    alignItems: 'center',
  },
  parchmentLetterSheet: {
    width: '100%',
    backgroundColor: '#FCF8F2',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E8DCB8',
    position: 'relative',
  },
  letterHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    borderBottomWidth: 1,
    borderBottomColor: '#E2D5C8',
    paddingBottom: 8,
    marginBottom: 10,
  },
  parchmentLetterTitle: {
    fontFamily: AppFonts.title,
    fontSize: 17,
    color: '#443237',
  },
  parchmentSalutation: {
    fontSize: 12,
    color: AppColors.primary,
    fontWeight: '700',
    marginTop: 2,
  },
  postageStampBadge: {
    width: 38,
    height: 38,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: '#C498A3',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFF0F2',
  },
  postageStampText: {
    fontSize: 8,
    fontWeight: '900',
    color: '#FF6575',
  },
  ruledLinesContainer: {
    paddingVertical: 8,
  },
  handwrittenLetterBody: {
    fontSize: 13,
    color: '#45383C',
    lineHeight: 22,
    fontStyle: 'italic',
  },
  letterSignatureRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 14,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#E2D5C8',
  },
  signatureScript: {
    fontSize: 12,
    fontWeight: '800',
    color: '#6E5057',
  },
  waxSealRed: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#BA1E32',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E65E6E',
  },
  letterButterflyCorner: {
    position: 'absolute',
    top: 4,
    right: 46,
    width: 38,
    height: 38,
  },
  butterflySmall: {
    width: 38,
    height: 38,
  },

  // Template 4: Adventure Boarding Pass
  templateAdventure: {
    alignItems: 'center',
  },
  boardingPassCard: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1.5,
    borderColor: '#E4D7CA',
    shadowColor: '#8E7B70',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 3,
  },
  passHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderStyle: 'dashed',
    borderBottomColor: '#D8C6B6',
    paddingBottom: 6,
    marginBottom: 8,
  },
  passFlightGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  passFlightText: {
    fontSize: 10,
    fontWeight: '900',
    color: AppColors.primary,
    letterSpacing: 1,
  },
  passGateText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#7D695D',
  },
  passMainDest: {
    fontFamily: AppFonts.title,
    fontSize: 18,
    color: '#382A2E',
  },
  passSubDest: {
    fontSize: 11,
    color: '#7A686D',
    marginBottom: 10,
  },
  adventurePanoramicSlot: {
    width: '100%',
    height: 140,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#F5EDE4',
  },
  adventureCaption: {
    fontSize: 11,
    fontStyle: 'italic',
    color: '#635357',
    textAlign: 'center',
    marginTop: 6,
  },
  adventureVow: {
    fontSize: 12,
    color: '#524348',
    lineHeight: 18,
    marginTop: 10,
    fontStyle: 'italic',
  },

  // Template 5: Botanical Butterflies
  templateBotanical: {
    alignItems: 'center',
  },
  botanicalHeroButterflyBox: {
    width: '100%',
    height: 110,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  butterflyLargeHero: {
    width: 140,
    height: 100,
  },
  ovalPhotoFrame: {
    width: 140,
    height: 140,
    borderRadius: 70,
    overflow: 'hidden',
    backgroundColor: '#F5ECE1',
    borderWidth: 3,
    borderColor: '#D4AF37', // Gold ring
    shadowColor: '#9C887B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 4,
    marginBottom: 12,
  },
  pressedStripsList: {
    width: '100%',
    gap: 6,
    marginBottom: 10,
  },
  pressedStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 248, 240, 0.9)',
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#E8DBCB',
  },
  pressedStripBullet: {
    fontSize: 12,
    marginRight: 6,
  },
  pressedStripText: {
    fontSize: 11,
    color: '#54464A',
    fontWeight: '600',
  },
  botanicalQuoteText: {
    fontSize: 11,
    fontStyle: 'italic',
    color: '#6E5C62',
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 16,
  },

  // Template 6: Midnight Whispers
  templateMidnight: {
    width: '100%',
    borderRadius: 14,
    overflow: 'hidden',
  },
  midnightParchment: {
    padding: 16,
    borderRadius: 14,
  },
  midnightHeaderRow: {
    alignItems: 'center',
    marginBottom: 10,
  },
  midnightStars: {
    fontSize: 14,
    marginBottom: 2,
  },
  midnightTitle: {
    fontFamily: AppFonts.title,
    fontSize: 18,
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  midnightSubtitle: {
    fontSize: 11,
    color: '#FFB8C6',
    marginTop: 2,
  },
  midnightPhotoSlot: {
    width: '100%',
    height: 140,
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: '#271940',
    borderWidth: 1,
    borderColor: 'rgba(255, 184, 198, 0.4)',
  },
  emptyPhotoBoxDark: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyPhotoTextDark: {
    fontSize: 11,
    color: '#FFB8C6',
    fontWeight: '700',
    marginTop: 4,
  },
  midnightCaption: {
    fontSize: 11,
    fontStyle: 'italic',
    color: '#FFB8C6',
    textAlign: 'center',
    marginTop: 6,
  },
  midnightBody: {
    fontSize: 12,
    color: '#E8DCF5',
    lineHeight: 18,
    marginTop: 10,
    fontStyle: 'italic',
  },
  waxSealGold: {
    alignSelf: 'flex-end',
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#D4AF37',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#FFE082',
  },

  // Page Turn Bottom Navigation
  pageTurnNavigationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
    paddingHorizontal: 6,
  },
  turnPageBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
    borderWidth: 1.2,
    borderColor: '#FFD4DD',
    gap: 4,
    shadowColor: '#E297A5',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 2,
  },
  turnPageBtnDisabled: {
    opacity: 0.45,
  },
  turnPageText: {
    fontSize: 12,
    fontWeight: '800',
    color: AppColors.primary,
  },
  turnPageTextDisabled: {
    color: '#9C8E92',
  },
  pageIndicatorPill: {
    backgroundColor: 'rgba(255, 232, 236, 0.8)',
    paddingVertical: 5,
    paddingHorizontal: 12,
    borderRadius: 14,
  },
  pageIndicatorText: {
    fontSize: 11,
    fontWeight: '700',
    color: AppColors.primary,
  },

  // Edit Modal Styles
  editModalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  editModalCard: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 20,
    maxHeight: '85%',
  },
  editModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  editModalTitle: {
    fontFamily: AppFonts.title,
    fontSize: 18,
    color: AppColors.textPrimary,
  },
  editModalForm: {
    paddingBottom: 24,
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: AppColors.textSecondary,
    marginBottom: 4,
    marginTop: 8,
    textTransform: 'uppercase',
  },
  textInput: {
    backgroundColor: '#FAF5F6',
    borderWidth: 1,
    borderColor: '#EFE2E5',
    borderRadius: 12,
    paddingVertical: 9,
    paddingHorizontal: 12,
    fontSize: 13,
    color: AppColors.textPrimary,
  },
  textAreaInput: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  savePageEditsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: AppColors.primary,
    borderRadius: 22,
    paddingVertical: 12,
    marginTop: 18,
    shadowColor: AppColors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 3,
  },
  savePageEditsBtnText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 14,
  },
});

export default SpiralScrapbook;
