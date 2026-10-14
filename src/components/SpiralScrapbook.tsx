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
  Alert,
  ActivityIndicator,
  Platform,
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
import PdfExportService from '../services/PdfExportService';
import FirestoreService from '../services/FirestoreService';
import ImageCompressService from '../services/ImageCompressService';

const { width } = Dimensions.get('window');
const isNative = Platform.OS !== 'web';

interface SpiralScrapbookProps {
  profile?: CoupleProfile | null;
  onWriteNewLetter?: () => void;
}

type CustomizerTab = 'text' | 'photos' | 'style' | 'pages';

const TEMPLATE_OPTIONS: {
  type: ScrapbookPageData['templateType'];
  label: string;
  emoji: string;
}[] = [
  { type: 'milestone_cover', label: 'Milestone Cover', emoji: '🌸' },
  { type: 'polaroid_collage', label: 'Polaroid Collage', emoji: '📸' },
  { type: 'handwritten_letter', label: 'Love Letter', emoji: '💌' },
  { type: 'adventure_ticket', label: 'Boarding Pass', emoji: '✈️' },
  { type: 'butterfly_pressed', label: 'Pressed Flora', emoji: '🦋' },
  { type: 'midnight_whispers', label: 'Midnight Stars', emoji: '🌌' },
];

const PAPER_THEMES = [
  { id: 'craft', label: 'Craft & Cream', bg: '#FFFDF9', border: '#EFE7DA' },
  { id: 'blush', label: 'Romantic Blush', bg: '#FFF5F7', border: '#FFDCE3' },
  { id: 'midnight', label: 'Midnight Dream', bg: '#1D122D', border: '#3B2358' },
  { id: 'ivory', label: 'Vintage Ivory', bg: '#FFFFFA', border: '#F0EDE1' },
  { id: 'matcha', label: 'Soft Matcha', bg: '#F4F8F4', border: '#DCEDDC' },
] as const;

const SEAL_ICONS = [
  { id: 'heart', emoji: '❤️' },
  { id: 'star', emoji: '⭐' },
  { id: 'butterfly', emoji: '🦋' },
  { id: 'sparkle', emoji: '✨' },
  { id: 'rose', emoji: '🌹' },
] as const;

export const SpiralScrapbook: React.FC<SpiralScrapbookProps> = ({
  profile,
}) => {
  const [pages, setPages] = useState<ScrapbookPageData[]>([]);
  // Current spread index: 0 means Left=Cover, Right=Page 0; 1 means Left=Page 0, Right=Page 1...
  const [currentSpreadIndex, setCurrentSpreadIndex] = useState(0);

  // 3D Real-Life Page Flip Animation
  const flipAnim = useRef(new Animated.Value(0)).current;
  const isFlipping = useRef(false);
  const [flippingDirection, setFlippingDirection] = useState<'next' | 'prev' | null>(null);
  const [flippingPage, setFlippingPage] = useState<ScrapbookPageData | null>(null);

  // PDF Export State
  const [isExportingPdf, setIsExportingPdf] = useState(false);

  // Customizer Modal State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingPageIndex, setEditingPageIndex] = useState<number>(0);
  const [activeTab, setActiveTab] = useState<CustomizerTab>('text');

  // Edit fields
  const [editTitle, setEditTitle] = useState('');
  const [editSubtitle, setEditSubtitle] = useState('');
  const [editDateStr, setEditDateStr] = useState('');
  const [editBodyText, setEditBodyText] = useState('');
  const [editCaption1, setEditCaption1] = useState('');
  const [editCaption2, setEditCaption2] = useState('');
  const [editSalutation, setEditSalutation] = useState('');
  const [editSignature, setEditSignature] = useState('');
  const [editTemplate, setEditTemplate] = useState<ScrapbookPageData['templateType']>('milestone_cover');
  const [editPaperTheme, setEditPaperTheme] = useState<ScrapbookPageData['paperTheme']>('craft');
  const [editSealIcon, setEditSealIcon] = useState<ScrapbookPageData['sealIcon']>('heart');
  const [editPhotoUri1, setEditPhotoUri1] = useState<string | undefined>(undefined);
  const [editPhotoUri2, setEditPhotoUri2] = useState<string | undefined>(undefined);

  // Photo Action Modal
  const [isPhotoModalOpen, setIsPhotoModalOpen] = useState(false);
  const [targetPhotoPageIndex, setTargetPhotoPageIndex] = useState(0);
  const [activePhotoSlot, setActivePhotoSlot] = useState<1 | 2>(1);
  const [inputPhotoUrl, setInputPhotoUrl] = useState('');

  useEffect(() => {
    let unsubCloud: (() => void) | undefined;

    const loadPages = async (): Promise<string | null> => {
      const data = await StorageService.getScrapbookPages();
      setPages(data);

      const prof = profile || (await StorageService.getProfile());
      if (prof?.inviteCode) {
        try {
          const cloudPages = await FirestoreService.fetchScrapbookPages(prof.inviteCode);
          if (cloudPages && cloudPages.length > 0) {
            setPages(cloudPages);
            await StorageService.saveScrapbookPages(cloudPages);
          }
        } catch (err) {
          console.warn('Scrapbook cloud load notice:', err);
        }
        return prof.inviteCode;
      }
      return null;
    };

    loadPages().then((code) => {
      if (code) {
        unsubCloud = FirestoreService.subscribeToScrapbookPages(code, (cloudPages) => {
          if (cloudPages && cloudPages.length > 0) {
            setPages(cloudPages);
            StorageService.saveScrapbookPages(cloudPages);
          }
        });
      }
    });

    return () => {
      if (unsubCloud) unsubCloud();
    };
  }, [profile]);

  // Sizing calculations for two-page open book
  const notebookWidth = Math.min(width - 24, 760);
  const spineWidth = 26;
  const pageWidth = Math.floor((notebookWidth - spineWidth - 18) / 2);
  const notebookHeight = Math.min(Math.max(480, pageWidth * 1.95), 560);

  // Pages currently displayed in open spread
  // Left page: if spread === 0, inside cover plate; else pages[spread - 1]
  const leftPage: ScrapbookPageData | null =
    currentSpreadIndex > 0 ? pages[currentSpreadIndex - 1] || null : null;
  // Right page: pages[spread]
  const rightPage: ScrapbookPageData | null =
    currentSpreadIndex < pages.length ? pages[currentSpreadIndex] || null : null;

  // Total spreads: cover spread (0) up to pages.length
  const maxSpreads = pages.length;

  // -------------------------------------------------------------
  // REAL-LIFE 3D PAGE TURN ANIMATION (Right page flips to Left)
  // -------------------------------------------------------------
  const handleTurnPage = (direction: 'next' | 'prev') => {
    if (isFlipping.current) return;

    if (direction === 'next') {
      if (currentSpreadIndex >= maxSpreads) return;
      const pageToFlip = rightPage;
      if (!pageToFlip) return;

      isFlipping.current = true;
      setFlippingDirection('next');
      setFlippingPage(pageToFlip);
      flipAnim.setValue(0);

      try {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      } catch {}

      Animated.timing(flipAnim, {
        toValue: 1,
        duration: 550,
        easing: Easing.bezier(0.25, 0.1, 0.25, 1),
        useNativeDriver: isNative,
      }).start(() => {
        setCurrentSpreadIndex((prev) => prev + 1);
        flipAnim.setValue(0);
        setFlippingDirection(null);
        setFlippingPage(null);
        isFlipping.current = false;
        try {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        } catch {}
      });
    } else {
      if (currentSpreadIndex <= 0) return;
      const pageToFlip = leftPage;

      isFlipping.current = true;
      setFlippingDirection('prev');
      setFlippingPage(pageToFlip);
      flipAnim.setValue(0);

      try {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      } catch {}

      Animated.timing(flipAnim, {
        toValue: 1,
        duration: 550,
        easing: Easing.bezier(0.25, 0.1, 0.25, 1),
        useNativeDriver: isNative,
      }).start(() => {
        setCurrentSpreadIndex((prev) => prev - 1);
        flipAnim.setValue(0);
        setFlippingDirection(null);
        setFlippingPage(null);
        isFlipping.current = false;
        try {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        } catch {}
      });
    }
  };

  const handleJumpToSpread = (idx: number) => {
    if (idx < 0 || idx > maxSpreads || idx === currentSpreadIndex || isFlipping.current) return;
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}
    setCurrentSpreadIndex(idx);
  };

  // -------------------------------------------------------------
  // PHOTO UPLOADS & MANAGEMENT
  // -------------------------------------------------------------
  const openPhotoSlotPicker = (pageIdx: number, slot: 1 | 2) => {
    setTargetPhotoPageIndex(pageIdx);
    setActivePhotoSlot(slot);
    setInputPhotoUrl('');
    setIsPhotoModalOpen(true);
  };

  const handlePickFromGallery = async (slot: 1 | 2) => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        Alert.alert('Permission needed', 'Please grant photo library access to upload memories.');
        return;
      }

      const res = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.6,
        base64: true,
      });

      if (!res.canceled && res.assets && res.assets.length > 0) {
        const asset = res.assets[0];
        const uri = await ImageCompressService.processPickerAsset(asset);
        applyPhotoToSlot(targetPhotoPageIndex, slot, uri);
        setIsPhotoModalOpen(false);
      }
    } catch (err) {
      console.warn('Gallery pick failed:', err);
    }
  };

  const handleTakePhotoWithCamera = async (slot: 1 | 2) => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      const perm = await ImagePicker.requestCameraPermissionsAsync();
      if (!perm.granted) {
        Alert.alert('Camera needed', 'Please grant camera access to take a new scrapbook photo.');
        return;
      }

      const res = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.6,
        base64: true,
      });

      if (!res.canceled && res.assets && res.assets.length > 0) {
        const asset = res.assets[0];
        const uri = await ImageCompressService.processPickerAsset(asset);
        applyPhotoToSlot(targetPhotoPageIndex, slot, uri);
        setIsPhotoModalOpen(false);
      }
    } catch (err) {
      console.warn('Camera capture failed:', err);
    }
  };

  const handleApplyPhotoUrl = (slot: 1 | 2) => {
    if (!inputPhotoUrl.trim()) return;
    applyPhotoToSlot(targetPhotoPageIndex, slot, inputPhotoUrl.trim());
    setInputPhotoUrl('');
    setIsPhotoModalOpen(false);
  };

  const handleRemovePhoto = (slot: 1 | 2) => {
    applyPhotoToSlot(targetPhotoPageIndex, slot, undefined);
    setIsPhotoModalOpen(false);
  };

  const applyPhotoToSlot = async (pageIdx: number, slot: 1 | 2, uri?: string) => {
    const updated = pages.map((p, idx) => {
      if (idx === pageIdx) {
        return {
          ...p,
          [slot === 1 ? 'photoUri1' : 'photoUri2']: uri,
        };
      }
      return p;
    });

    setPages(updated);
    if (pageIdx === editingPageIndex) {
      if (slot === 1) setEditPhotoUri1(uri);
      if (slot === 2) setEditPhotoUri2(uri);
    }
    await StorageService.saveScrapbookPages(updated);
    const prof = profile || (await StorageService.getProfile());
    if (prof?.inviteCode) {
      await FirestoreService.syncScrapbookPages(prof.inviteCode, updated);
    }

    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {}
  };

  // -------------------------------------------------------------
  // CUSTOMIZER MODAL CONTROLS
  // -------------------------------------------------------------
  // OPEN CUSTOMIZER MODAL
  // -------------------------------------------------------------
  const handleOpenEditModal = (pageIdx: number, defaultTab: CustomizerTab = 'text') => {
    const target = pages[pageIdx];
    if (!target) return;
    setEditingPageIndex(pageIdx);
    setEditTitle(target.title || '');
    setEditSubtitle(target.subtitle || '');
    setEditDateStr(target.dateStr || '');
    setEditBodyText(target.bodyText || '');
    setEditCaption1(target.caption1 || '');
    setEditCaption2(target.caption2 || '');
    setEditSalutation(target.salutation || '');
    setEditSignature(target.signature || '');
    setEditTemplate(target.templateType || 'milestone_cover');
    setEditPaperTheme(target.paperTheme || 'craft');
    setEditSealIcon(target.sealIcon || 'heart');
    setEditPhotoUri1(target.photoUri1);
    setEditPhotoUri2(target.photoUri2);
    setActiveTab(defaultTab);
    setIsEditModalOpen(true);
  };

  const handleSavePageEdits = async () => {
    const updated = pages.map((p, idx) => {
      if (idx === editingPageIndex) {
        return {
          ...p,
          title: editTitle.trim(),
          subtitle: editSubtitle.trim(),
          dateStr: editDateStr.trim(),
          bodyText: editBodyText.trim(),
          caption1: editCaption1.trim(),
          caption2: editCaption2.trim(),
          salutation: editSalutation.trim(),
          signature: editSignature.trim(),
          templateType: editTemplate,
          paperTheme: editPaperTheme,
          sealIcon: editSealIcon,
          photoUri1: editPhotoUri1,
          photoUri2: editPhotoUri2,
        };
      }
      return p;
    });

    setPages(updated);
    await StorageService.saveScrapbookPages(updated);
    const prof = profile || (await StorageService.getProfile());
    if (prof?.inviteCode) {
      await FirestoreService.syncScrapbookPages(prof.inviteCode, updated);
    }
    setIsEditModalOpen(false);

    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {}
  };

  // -------------------------------------------------------------
  // PAGE MANAGEMENT: ADD / DUPLICATE / DELETE / RESET
  // -------------------------------------------------------------
  const handleAddNewPage = async () => {
    const newPage: ScrapbookPageData = {
      id: `page-${Date.now()}`,
      templateType: 'milestone_cover',
      title: '',
      subtitle: '',
      dateStr: '',
      bodyText: '',
      caption1: '',
      caption2: '',
      paperTheme: 'craft',
      sealIcon: 'heart',
      photoUri1: undefined,
      photoUri2: undefined,
    };

    const updated = [...pages, newPage];
    setPages(updated);
    await StorageService.saveScrapbookPages(updated);
    const prof = profile || (await StorageService.getProfile());
    if (prof?.inviteCode) {
      await FirestoreService.syncScrapbookPages(prof.inviteCode, updated);
    }
    setCurrentSpreadIndex(updated.length);

    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {}
  };

  const handleResetAllPages = () => {
    Alert.alert(
      'Start Fresh Scrapbook?',
      'This will clear all scrapbook pages and reset to a clean blank book so you can customize only what you want.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset to Blank',
          style: 'destructive',
          onPress: async () => {
            const blankPages = await StorageService.resetScrapbookPages();
            setPages(blankPages);
            setCurrentSpreadIndex(0);
            const prof = profile || (await StorageService.getProfile());
            if (prof?.inviteCode) {
              await FirestoreService.syncScrapbookPages(prof.inviteCode, blankPages);
            }
            setIsEditModalOpen(false);

            try {
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            } catch {}
          },
        },
      ]
    );
  };

  const handleDuplicatePage = async (pageIdx: number) => {
    const target = pages[pageIdx];
    if (!target) return;
    const duplicated: ScrapbookPageData = {
      ...target,
      id: `page-${Date.now()}`,
      title: target.title ? `${target.title} (Copy)` : '',
    };

    const updated = [...pages];
    updated.splice(pageIdx + 1, 0, duplicated);
    setPages(updated);
    await StorageService.saveScrapbookPages(updated);
    const prof = profile || (await StorageService.getProfile());
    if (prof?.inviteCode) {
      await FirestoreService.syncScrapbookPages(prof.inviteCode, updated);
    }

    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {}
  };

  const handleDeletePage = (pageIdx: number) => {
    if (pages.length <= 1) {
      Alert.alert('Cannot Delete', 'Your scrapbook must have at least one keepsake page.');
      return;
    }

    Alert.alert(
      'Delete Page?',
      `Are you sure you want to remove Page ${pageIdx + 1}${pages[pageIdx]?.title ? ` ("${pages[pageIdx]?.title}")` : ''}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            const updated = pages.filter((_, idx) => idx !== pageIdx);
            setPages(updated);
            setCurrentSpreadIndex((prev) => Math.min(prev, updated.length));
            await StorageService.saveScrapbookPages(updated);
            const prof = profile || (await StorageService.getProfile());
            if (prof?.inviteCode) {
              await FirestoreService.syncScrapbookPages(prof.inviteCode, updated);
            }
            setIsEditModalOpen(false);

            try {
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            } catch {}
          },
        },
      ]
    );
  };

  // -------------------------------------------------------------
  // EXPORT TO PDF
  // -------------------------------------------------------------
  const handleExportPdf = async () => {
    if (isExportingPdf) return;
    try {
      setIsExportingPdf(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      const res = await PdfExportService.exportScrapbookToPdf(pages, profile);
      if (res.success) {
        try {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        } catch {}
      } else {
        Alert.alert('Export Failed', res.error || 'Could not generate PDF document.');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'PDF export failed';
      Alert.alert('Export Error', msg);
    } finally {
      setIsExportingPdf(false);
    }
  };

  // -------------------------------------------------------------
  // 3D FLIP TRANSFORM CALCULATIONS
  // -------------------------------------------------------------
  // When flipping NEXT (Right page moves to Left):
  // Angle rotates from 0deg to -180deg
  const rotateNextY = flipAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '-180deg'],
  });

  // When flipping PREV (Left page moves to Right):
  // Angle rotates from 0deg to 180deg
  const rotatePrevY = flipAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '180deg'],
  });

  // Front face shows during first 90deg (0 to 0.5)
  const frontFaceOpacity = flipAnim.interpolate({
    inputRange: [0, 0.49, 0.5, 1],
    outputRange: [1, 1, 0, 0],
  });

  // Back face shows during 90deg to 180deg (0.5 to 1)
  const backFaceOpacity = flipAnim.interpolate({
    inputRange: [0, 0.5, 0.51, 1],
    outputRange: [0, 0, 1, 1],
  });

  // Dynamic shadow on page lift
  const flipLiftShadow = flipAnim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0, 0.4, 0],
  });

  // -------------------------------------------------------------
  // SINGLE PAGE CONTENT RENDERER
  // -------------------------------------------------------------
  const renderPageSheetContent = (
    page: ScrapbookPageData | null,
    isLeft: boolean,
    pageIndex: number
  ) => {
    // If Left side on Spread 0, render Inside Book Cover
    if (isLeft && page === null) {
      return (
        <View style={styles.insideCoverContainer}>
          <View style={styles.coverCrownBadge}>
            <Text style={{ fontSize: 24 }}>👑</Text>
          </View>
          <Text style={styles.coverEditionTitle}>COUPLESIFY JOURNAL</Text>
          <Text style={styles.coverCoupleNames}>
            {profile?.userName || 'You'} & {profile?.partnerName || 'Partner'}
          </Text>
          <View style={styles.coverGoldDivider} />
          <Text style={styles.coverDedicationText}>
            "Every love story is beautiful, but ours is my absolute favorite."
          </Text>
          <View style={styles.coverEstTag}>
            <Text style={styles.coverEstTagText}>
              EST. {profile?.anniversaryDate || 'FOREVER'}
            </Text>
          </View>
          <View style={styles.coverWaxSealSmall}>
            <Text style={{ fontSize: 14 }}>❤️</Text>
          </View>
        </View>
      );
    }

    if (!page) {
      // Empty end page
      return (
        <View style={styles.endOfBookContainer}>
          <Text style={{ fontSize: 28, marginBottom: 8 }}>💖</Text>
          <Text style={styles.endOfBookTitle}>To Be Continued...</Text>
          <Text style={styles.endOfBookSub}>Our sweetest adventures are yet to unfold.</Text>
          <TouchableOpacity style={styles.addPagePromptBtn} onPress={handleAddNewPage}>
            <Feather name="plus" size={14} color="#FFFFFF" style={{ marginRight: 4 }} />
            <Text style={styles.addPagePromptText}>Add Page</Text>
          </TouchableOpacity>
        </View>
      );
    }

    const currentTheme = PAPER_THEMES.find((t) => t.id === page.paperTheme) || PAPER_THEMES[0];
    const currentSealIcon = SEAL_ICONS.find((s) => s.id === page.sealIcon) || SEAL_ICONS[0];

    return (
      <View style={[styles.pageContentWrapper, { backgroundColor: currentTheme.bg }]}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.pageInnerScroll}
        >
          {/* Header Row */}
          {!!page.dateStr && (
            <TouchableOpacity
              onPress={() => handleOpenEditModal(pageIndex, 'text')}
              activeOpacity={0.8}
              style={styles.pageDateRibbon}
            >
              <Text style={styles.pageDateRibbonText}>{page.dateStr}</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            onPress={() => handleOpenEditModal(pageIndex, 'text')}
            activeOpacity={0.8}
          >
            {page.title ? (
              <Text style={styles.pageMiniTitle} numberOfLines={2}>
                {page.title}
              </Text>
            ) : (
              <View style={styles.blankTitlePlaceholder}>
                <Feather name="edit-3" size={12} color={AppColors.primary} style={{ marginRight: 5 }} />
                <Text style={styles.blankTitlePlaceholderText}>+ Tap to add title ✨</Text>
              </View>
            )}
            {!!page.subtitle && (
              <Text style={styles.pageMiniSubtitle} numberOfLines={1}>
                {page.subtitle}
              </Text>
            )}
          </TouchableOpacity>

          {/* TEMPLATE 1: MILESTONE COVER */}
          {page.templateType === 'milestone_cover' && (
            <View style={styles.templateBox}>
              <View style={styles.photoFrameCenter}>
                <View style={[styles.washiTape, styles.washiTapeTopLeft]} />
                <View style={[styles.washiTape, styles.washiTapeBottomRight]} />
                <TouchableOpacity
                  style={styles.photoTouchable}
                  onPress={() => openPhotoSlotPicker(pageIndex, 1)}
                  activeOpacity={0.9}
                >
                  {page.photoUri1 ? (
                    <Image source={{ uri: page.photoUri1 }} style={styles.photoFull} />
                  ) : (
                    <View style={styles.emptyPhotoBox}>
                      <Ionicons name="camera-outline" size={24} color={AppColors.primary} />
                      <Text style={styles.emptyPhotoText}>+ Add Photo</Text>
                    </View>
                  )}
                  {page.photoUri1 && (
                    <View style={styles.photoChangeBadge}>
                      <Feather name="camera" size={10} color="#FFFFFF" />
                    </View>
                  )}
                </TouchableOpacity>
                {!!page.caption1 && (
                  <Text style={styles.photoPolaroidCaption} numberOfLines={1}>
                    {page.caption1}
                  </Text>
                )}
              </View>

              <TouchableOpacity
                onPress={() => handleOpenEditModal(pageIndex, 'text')}
                activeOpacity={0.8}
                style={styles.tornVowCard}
              >
                {page.bodyText ? (
                  <Text style={styles.vowBodyText} numberOfLines={5}>
                    {page.bodyText}
                  </Text>
                ) : (
                  <View style={styles.emptyBodyPrompt}>
                    <Feather name="edit-2" size={12} color="#9C8690" style={{ marginRight: 5 }} />
                    <Text style={styles.emptyBodyPromptText}>Tap to write your memory... ✍️</Text>
                  </View>
                )}
                <View style={styles.waxSealStamp}>
                  <Text style={{ fontSize: 11 }}>{currentSealIcon.emoji}</Text>
                </View>
              </TouchableOpacity>
            </View>
          )}

          {/* TEMPLATE 2: POLAROID COLLAGE */}
          {page.templateType === 'polaroid_collage' && (
            <View style={styles.templateBox}>
              <View style={styles.miniPolaroidBox}>
                <View style={styles.washiTapeMini} />
                <TouchableOpacity
                  style={styles.polaroidSlotMini}
                  onPress={() => openPhotoSlotPicker(pageIndex, 1)}
                  activeOpacity={0.9}
                >
                  {page.photoUri1 ? (
                    <Image source={{ uri: page.photoUri1 }} style={styles.photoFull} />
                  ) : (
                    <View style={styles.emptyPhotoBox}>
                      <Ionicons name="camera-outline" size={20} color={AppColors.primary} />
                      <Text style={styles.emptyPhotoText}>+ Add Photo 1</Text>
                    </View>
                  )}
                </TouchableOpacity>
                {!!page.caption1 && <Text style={styles.miniCaption}>{page.caption1}</Text>}
              </View>

              <View style={[styles.miniPolaroidBox, { marginTop: 6 }]}>
                <View style={[styles.washiTapeMini, { backgroundColor: '#B8E2D8' }]} />
                <TouchableOpacity
                  style={styles.polaroidSlotMini}
                  onPress={() => openPhotoSlotPicker(pageIndex, 2)}
                  activeOpacity={0.9}
                >
                  {page.photoUri2 ? (
                    <Image source={{ uri: page.photoUri2 }} style={styles.photoFull} />
                  ) : (
                    <View style={styles.emptyPhotoBox}>
                      <Ionicons name="camera-outline" size={20} color={AppColors.primary} />
                      <Text style={styles.emptyPhotoText}>+ Add Photo 2</Text>
                    </View>
                  )}
                </TouchableOpacity>
                {!!page.caption2 && <Text style={styles.miniCaption}>{page.caption2}</Text>}
              </View>

              <TouchableOpacity
                onPress={() => handleOpenEditModal(pageIndex, 'text')}
                activeOpacity={0.8}
                style={styles.stickyNoteMini}
              >
                <View style={styles.pinNeedle} />
                {page.bodyText ? (
                  <Text style={styles.stickyNoteText} numberOfLines={4}>
                    {page.bodyText}
                  </Text>
                ) : (
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
                    <Feather name="edit-2" size={11} color="#8A7A70" style={{ marginRight: 4 }} />
                    <Text style={[styles.stickyNoteText, { color: '#8A7A70', fontStyle: 'italic' }]}>
                      Tap to add note...
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            </View>
          )}

          {/* TEMPLATE 3: HANDWRITTEN LOVE LETTER */}
          {page.templateType === 'handwritten_letter' && (
            <TouchableOpacity
              onPress={() => handleOpenEditModal(pageIndex, 'text')}
              activeOpacity={0.8}
              style={styles.parchmentLetterSheet}
            >
              <View style={styles.letterHeaderRow}>
                <Text
                  style={[
                    styles.parchmentSalutation,
                    !page.salutation && { color: '#B09E94', fontStyle: 'italic', fontWeight: '400' },
                  ]}
                  numberOfLines={1}
                >
                  {page.salutation || 'Tap to add salutation (e.g. Dearest...) 💌'}
                </Text>
                <View style={styles.postageStampBadge}>
                  <Text style={{ fontSize: 10 }}>💌</Text>
                </View>
              </View>
              <View style={styles.ruledLinesContainer}>
                {page.bodyText ? (
                  <Text style={styles.handwrittenLetterBody} numberOfLines={8}>
                    {page.bodyText}
                  </Text>
                ) : (
                  <Text style={[styles.handwrittenLetterBody, { color: '#B09E94', fontStyle: 'italic' }]}>
                    Tap here to write your handwritten letter... ✍️
                  </Text>
                )}
              </View>
              <View style={styles.letterSignatureRow}>
                <Text
                  style={[
                    styles.signatureScript,
                    !page.signature && { color: '#B09E94', fontStyle: 'italic', fontSize: 13 },
                  ]}
                  numberOfLines={1}
                >
                  {page.signature || 'Tap to sign letter...'}
                </Text>
                <View style={styles.waxSealRed}>
                  <Text style={{ fontSize: 10 }}>{currentSealIcon.emoji}</Text>
                </View>
              </View>
            </TouchableOpacity>
          )}

          {/* TEMPLATE 4: ADVENTURE BOARDING PASS */}
          {page.templateType === 'adventure_ticket' && (
            <View style={styles.templateBox}>
              <View style={styles.boardingPassCard}>
                <View style={styles.passHeaderRow}>
                  <Ionicons name="airplane" size={12} color={AppColors.primary} />
                  <Text style={styles.passFlightText}>BOARDING PASS</Text>
                </View>
                <TouchableOpacity
                  style={styles.adventurePanoramicSlot}
                  onPress={() => openPhotoSlotPicker(pageIndex, 1)}
                  activeOpacity={0.9}
                >
                  {page.photoUri1 ? (
                    <Image source={{ uri: page.photoUri1 }} style={styles.photoFull} />
                  ) : (
                    <View style={styles.emptyPhotoBox}>
                      <Ionicons name="map-outline" size={20} color={AppColors.primary} />
                      <Text style={styles.emptyPhotoText}>+ Add Trip Photo</Text>
                    </View>
                  )}
                </TouchableOpacity>
                {!!page.caption1 && (
                  <Text style={styles.adventureCaption}>{page.caption1}</Text>
                )}
                {page.bodyText ? (
                  <Text style={styles.adventureVow} numberOfLines={4}>
                    {page.bodyText}
                  </Text>
                ) : (
                  <Text style={[styles.adventureVow, { color: '#A8948B', fontStyle: 'italic' }]}>
                    Tap to write travel memories... ✈️
                  </Text>
                )}
              </View>
            </View>
          )}

          {/* TEMPLATE 5: BOTANICAL PRESSED */}
          {page.templateType === 'butterfly_pressed' && (
            <View style={styles.templateBox}>
              <View style={styles.ovalPhotoFrame}>
                <TouchableOpacity
                  style={{ width: '100%', height: '100%' }}
                  onPress={() => openPhotoSlotPicker(pageIndex, 1)}
                  activeOpacity={0.9}
                >
                  {page.photoUri1 ? (
                    <Image source={{ uri: page.photoUri1 }} style={styles.photoFull} />
                  ) : (
                    <View style={styles.emptyPhotoBox}>
                      <Text style={{ fontSize: 20 }}>🦋</Text>
                      <Text style={styles.emptyPhotoText}>+ Add Photo</Text>
                    </View>
                  )}
                </TouchableOpacity>
              </View>
              {page.bodyText ? (
                <Text style={styles.botanicalQuoteText} numberOfLines={5}>
                  {page.bodyText}
                </Text>
              ) : (
                <Text style={[styles.botanicalQuoteText, { color: '#A8948B', fontStyle: 'italic' }]}>
                  Tap to write delicate thoughts... 🌸
                </Text>
              )}
            </View>
          )}

          {/* TEMPLATE 6: MIDNIGHT WHISPERS */}
          {page.templateType === 'midnight_whispers' && (
            <View style={styles.templateMidnight}>
              <LinearGradient
                colors={['#1E1233', '#2D1647', '#150A26']}
                style={styles.midnightParchment}
              >
                <Text style={styles.midnightStars}>✨ 🌌 ✨</Text>
                <TouchableOpacity
                  style={styles.midnightPhotoSlot}
                  onPress={() => openPhotoSlotPicker(pageIndex, 1)}
                  activeOpacity={0.9}
                >
                  {page.photoUri1 ? (
                    <Image source={{ uri: page.photoUri1 }} style={styles.photoFull} />
                  ) : (
                    <View style={styles.emptyPhotoBoxDark}>
                      <Ionicons name="moon-outline" size={20} color="#FFB8C6" />
                      <Text style={styles.emptyPhotoTextDark}>+ Add Night Photo</Text>
                    </View>
                  )}
                </TouchableOpacity>
                {page.bodyText ? (
                  <Text style={styles.midnightBody} numberOfLines={5}>
                    {page.bodyText}
                  </Text>
                ) : (
                  <Text style={[styles.midnightBody, { color: '#B8A6CE', fontStyle: 'italic' }]}>
                    Tap to write midnight whispers... ✨
                  </Text>
                )}
                <View style={styles.waxSealGold}>
                  <Text style={{ fontSize: 10 }}>{currentSealIcon.emoji}</Text>
                </View>
              </LinearGradient>
            </View>
          )}

          {/* Bottom Page Number Badge */}
          <View style={styles.pageBottomNumRow}>
            <Text style={styles.pageBottomNumText}>Page {pageIndex + 1}</Text>
            <TouchableOpacity
              onPress={() => handleOpenEditModal(pageIndex, 'text')}
              style={styles.miniEditIconBtn}
            >
              <Feather name="edit-2" size={10} color={AppColors.primary} />
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Scrapbook Section Header Bar */}
      <View style={styles.headerBar}>
        <View style={styles.headerTitleGroup}>
          <Text style={styles.scrapbookHeading}>Couple Spiral Scrapbook</Text>
          <Text style={styles.scrapbookSubheading}>
            Open two-page spread with real-life page turning ✨
          </Text>
        </View>

        <View style={styles.headerActionsRow}>
          {/* EXPORT TO PDF BUTTON */}
          <TouchableOpacity
            style={[styles.headerActionPill, styles.pdfExportPill]}
            onPress={handleExportPdf}
            disabled={isExportingPdf}
            activeOpacity={0.8}
          >
            {isExportingPdf ? (
              <ActivityIndicator size="small" color="#FFFFFF" style={{ marginRight: 4 }} />
            ) : (
              <Feather name="download" size={13} color="#FFFFFF" />
            )}
            <Text style={styles.pdfExportText}>
              {isExportingPdf ? 'Exporting...' : 'Export PDF'}
            </Text>
          </TouchableOpacity>

          {/* CUSTOMIZE BUTTON */}
          <TouchableOpacity
            style={[styles.headerActionPill, styles.customizePill]}
            onPress={() => {
              const target = rightPage ? currentSpreadIndex : Math.max(0, currentSpreadIndex - 1);
              handleOpenEditModal(target, 'text');
            }}
            activeOpacity={0.8}
          >
            <Feather name="edit-3" size={13} color={AppColors.primary} />
            <Text style={styles.customizeText}>Customize</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* ======================================================== */}
      {/* OPEN REALISTIC SCRAPBOOK NOTEBOOK (LEFT & RIGHT PAGES)   */}
      {/* ======================================================== */}
      <View style={[styles.openNotebookWrapper, { width: notebookWidth, height: notebookHeight }]}>
        {/* Layered Book Page Edge Depth (Visual Paper Stack Thickness) */}
        <View style={styles.leftBookEdgeDepth} />
        <View style={styles.rightBookEdgeDepth} />

        {/* LEFT PAGE OF SPREAD */}
        <View style={[styles.pageSlotContainer, { width: pageWidth }]}>
          {renderPageSheetContent(leftPage, true, currentSpreadIndex - 1)}
        </View>

        {/* CENTER SPIRAL BINDER COLUMN (METALLIC DOUBLE-RINGS) */}
        <View style={[styles.centerSpiralSpine, { width: spineWidth }]}>
          <View style={styles.spineShadowLine} />
          {[...Array(11)].map((_, i) => (
            <View key={i} style={styles.spineSpiralUnit}>
              <View style={styles.spineHoleLeft} />
              <View style={styles.spineCoilRing}>
                <LinearGradient
                  colors={['#8E8E98', '#FFFFFF', '#73737E', '#D0D0D8', '#63636E']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0.8 }}
                  style={StyleSheet.absoluteFill}
                />
              </View>
              <View style={styles.spineHoleRight} />
            </View>
          ))}
        </View>

        {/* RIGHT PAGE OF SPREAD */}
        <View style={[styles.pageSlotContainer, { width: pageWidth }]}>
          {renderPageSheetContent(rightPage, false, currentSpreadIndex)}
        </View>

        {/* ======================================================== */}
        {/* 3D ANIMATED FLIPPING PAGE (REAL-LIFE FLIP ANIMATION)     */}
        {/* ======================================================== */}
        {isFlipping.current && flippingDirection === 'next' && (
          <Animated.View
            pointerEvents="none"
            style={[
              styles.flippingSheetAnchor,
              {
                left: pageWidth + spineWidth + 8,
                width: pageWidth,
                height: notebookHeight - 16,
                transform: [
                  { perspective: 1200 },
                  { translateX: -pageWidth / 2 },
                  { rotateY: rotateNextY },
                  { translateX: pageWidth / 2 },
                ],
              },
            ]}
          >
            {/* FRONT FACE OF FLIPPING PAGE */}
            <Animated.View
              style={[
                styles.flippingFace,
                { opacity: frontFaceOpacity },
              ]}
            >
              {renderPageSheetContent(flippingPage, false, currentSpreadIndex)}
              <Animated.View style={[styles.flipShadowOverlay, { opacity: flipLiftShadow }]} />
            </Animated.View>

            {/* BACK FACE OF FLIPPING PAGE */}
            <Animated.View
              style={[
                styles.flippingFace,
                {
                  opacity: backFaceOpacity,
                  transform: [{ scaleX: -1 }], // Invert horizontal so back face reads correctly
                },
              ]}
            >
              <View style={styles.flippingPageBackside}>
                <View style={styles.backsideTexture}>
                  <Text style={{ fontSize: 24, opacity: 0.15 }}>📖</Text>
                  <Text style={styles.backsideWatermark}>Couplesify Memories</Text>
                </View>
              </View>
              <Animated.View style={[styles.flipShadowOverlay, { opacity: flipLiftShadow }]} />
            </Animated.View>
          </Animated.View>
        )}

        {isFlipping.current && flippingDirection === 'prev' && (
          <Animated.View
            pointerEvents="none"
            style={[
              styles.flippingSheetAnchor,
              {
                left: 8,
                width: pageWidth,
                height: notebookHeight - 16,
                transform: [
                  { perspective: 1200 },
                  { translateX: pageWidth / 2 },
                  { rotateY: rotatePrevY },
                  { translateX: -pageWidth / 2 },
                ],
              },
            ]}
          >
            {/* FRONT FACE OF FLIPPING PAGE */}
            <Animated.View
              style={[
                styles.flippingFace,
                { opacity: frontFaceOpacity },
              ]}
            >
              {renderPageSheetContent(flippingPage, true, currentSpreadIndex - 1)}
              <Animated.View style={[styles.flipShadowOverlay, { opacity: flipLiftShadow }]} />
            </Animated.View>

            {/* BACK FACE OF FLIPPING PAGE */}
            <Animated.View
              style={[
                styles.flippingFace,
                {
                  opacity: backFaceOpacity,
                  transform: [{ scaleX: -1 }],
                },
              ]}
            >
              <View style={styles.flippingPageBackside}>
                <View style={styles.backsideTexture}>
                  <Text style={{ fontSize: 24, opacity: 0.15 }}>📖</Text>
                  <Text style={styles.backsideWatermark}>Couplesify Memories</Text>
                </View>
              </View>
              <Animated.View style={[styles.flipShadowOverlay, { opacity: flipLiftShadow }]} />
            </Animated.View>
          </Animated.View>
        )}
      </View>

      {/* Realistic Page Turner Bottom Bar */}
      <View style={styles.pageTurnNavigationRow}>
        <TouchableOpacity
          style={[styles.turnPageBtn, currentSpreadIndex === 0 && styles.turnPageBtnDisabled]}
          onPress={() => handleTurnPage('prev')}
          disabled={currentSpreadIndex === 0}
          activeOpacity={0.8}
        >
          <Ionicons
            name="chevron-back"
            size={18}
            color={currentSpreadIndex === 0 ? '#C4B8BC' : AppColors.primary}
          />
          <Text
            style={[
              styles.turnPageText,
              currentSpreadIndex === 0 && styles.turnPageTextDisabled,
            ]}
          >
            Turn Page
          </Text>
        </TouchableOpacity>

        {/* Spread Indicator & Quick Actions */}
        <View style={styles.pageIndicatorContainer}>
          <TouchableOpacity
            style={styles.pageIndicatorPill}
            onPress={() => {
              const target = rightPage ? currentSpreadIndex : Math.max(0, currentSpreadIndex - 1);
              handleOpenEditModal(target, 'pages');
            }}
            activeOpacity={0.8}
          >
            <Text style={styles.pageIndicatorText}>
              {currentSpreadIndex === 0
                ? `Cover Spread (1 of ${maxSpreads})`
                : `Spread ${currentSpreadIndex} of ${maxSpreads}`}
            </Text>
          </TouchableOpacity>

          {/* Quick Add Page Icon */}
          <TouchableOpacity
            style={styles.quickAddPageBtn}
            onPress={handleAddNewPage}
            activeOpacity={0.8}
          >
            <Feather name="plus" size={15} color={AppColors.primary} />
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={[
            styles.turnPageBtn,
            currentSpreadIndex >= maxSpreads && styles.turnPageBtnDisabled,
          ]}
          onPress={() => handleTurnPage('next')}
          disabled={currentSpreadIndex >= maxSpreads}
          activeOpacity={0.8}
        >
          <Text
            style={[
              styles.turnPageText,
              currentSpreadIndex >= maxSpreads && styles.turnPageTextDisabled,
            ]}
          >
            Turn Page
          </Text>
          <Ionicons
            name="chevron-forward"
            size={18}
            color={currentSpreadIndex >= maxSpreads ? '#C4B8BC' : AppColors.primary}
          />
        </TouchableOpacity>
      </View>

      {/* ======================================================== */}
      {/* MODAL 1: PHOTO UPLOAD & OPTIONS PICKER                   */}
      {/* ======================================================== */}
      <Modal visible={isPhotoModalOpen} transparent animationType="fade">
        <View style={styles.photoModalBackdrop}>
          <View style={styles.photoModalCard}>
            <View style={styles.photoModalHeader}>
              <Text style={styles.photoModalTitle}>
                Upload Photo (Slot {activePhotoSlot})
              </Text>
              <TouchableOpacity onPress={() => setIsPhotoModalOpen(false)}>
                <Ionicons name="close" size={22} color={AppColors.textSecondary} />
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={styles.photoModalBtnPrimary}
              onPress={() => handlePickFromGallery(activePhotoSlot)}
              activeOpacity={0.85}
            >
              <Ionicons name="images" size={18} color="#FFFFFF" style={{ marginRight: 8 }} />
              <Text style={styles.photoModalBtnPrimaryText}>Upload from Gallery / Files</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.photoModalBtnSecondary}
              onPress={() => handleTakePhotoWithCamera(activePhotoSlot)}
              activeOpacity={0.85}
            >
              <Ionicons name="camera" size={18} color={AppColors.primary} style={{ marginRight: 8 }} />
              <Text style={styles.photoModalBtnSecondaryText}>Take a Photo with Camera</Text>
            </TouchableOpacity>

            {/* URL Input */}
            <View style={styles.urlInputRow}>
              <TextInput
                style={styles.urlTextInput}
                placeholder="Or paste web image link (https://...)"
                placeholderTextColor="#A89B9E"
                value={inputPhotoUrl}
                onChangeText={setInputPhotoUrl}
              />
              <TouchableOpacity
                style={styles.urlApplyBtn}
                onPress={() => handleApplyPhotoUrl(activePhotoSlot)}
                activeOpacity={0.8}
              >
                <Text style={styles.urlApplyBtnText}>Apply</Text>
              </TouchableOpacity>
            </View>

            {/* Remove photo option */}
            {((activePhotoSlot === 1 && pages[targetPhotoPageIndex]?.photoUri1) ||
              (activePhotoSlot === 2 && pages[targetPhotoPageIndex]?.photoUri2)) && (
              <TouchableOpacity
                style={styles.removePhotoBtn}
                onPress={() => handleRemovePhoto(activePhotoSlot)}
                activeOpacity={0.8}
              >
                <Feather name="trash-2" size={14} color="#D12040" style={{ marginRight: 6 }} />
                <Text style={styles.removePhotoBtnText}>Remove Photo from Slot</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </Modal>

      {/* ======================================================== */}
      {/* MODAL 2: COMPLETE SCRAPBOOK CUSTOMIZER (4 TABS)           */}
      {/* ======================================================== */}
      <Modal visible={isEditModalOpen} transparent animationType="slide">
        <View style={styles.editModalBackdrop}>
          <View style={styles.editModalCard}>
            {/* Modal Header */}
            <View style={styles.editModalHeader}>
              <View>
                <Text style={styles.editModalTitle}>
                  Customize Page {editingPageIndex + 1}
                </Text>
                <Text style={styles.editModalSubtitle}>
                  Tailor memories, photos & vintage styling
                </Text>
              </View>
              <TouchableOpacity onPress={() => setIsEditModalOpen(false)}>
                <Ionicons name="close" size={24} color={AppColors.textSecondary} />
              </TouchableOpacity>
            </View>

            {/* 4 Tabs Selector */}
            <View style={styles.customizerTabsRow}>
              <TouchableOpacity
                style={[styles.customizerTab, activeTab === 'text' && styles.customizerTabActive]}
                onPress={() => setActiveTab('text')}
              >
                <Text
                  style={[
                    styles.customizerTabText,
                    activeTab === 'text' && styles.customizerTabTextActive,
                  ]}
                >
                  📝 Text
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.customizerTab, activeTab === 'photos' && styles.customizerTabActive]}
                onPress={() => setActiveTab('photos')}
              >
                <Text
                  style={[
                    styles.customizerTabText,
                    activeTab === 'photos' && styles.customizerTabTextActive,
                  ]}
                >
                  📸 Photos
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.customizerTab, activeTab === 'style' && styles.customizerTabActive]}
                onPress={() => setActiveTab('style')}
              >
                <Text
                  style={[
                    styles.customizerTabText,
                    activeTab === 'style' && styles.customizerTabTextActive,
                  ]}
                >
                  🎨 Themes
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.customizerTab, activeTab === 'pages' && styles.customizerTabActive]}
                onPress={() => setActiveTab('pages')}
              >
                <Text
                  style={[
                    styles.customizerTabText,
                    activeTab === 'pages' && styles.customizerTabTextActive,
                  ]}
                >
                  📑 Pages
                </Text>
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.editModalForm}>
              {/* TAB 1: TEXTS & STORY */}
              {activeTab === 'text' && (
                <View>
                  <Text style={styles.inputLabel}>Page Title</Text>
                  <TextInput
                    style={styles.textInput}
                    value={editTitle}
                    onChangeText={setEditTitle}
                    placeholder="e.g. Our Sweet Journey"
                    placeholderTextColor="#A89B9E"
                  />

                  <Text style={styles.inputLabel}>Subtitle / Chapter</Text>
                  <TextInput
                    style={styles.textInput}
                    value={editSubtitle}
                    onChangeText={setEditSubtitle}
                    placeholder="e.g. Where Forever Began • Chapter 1"
                    placeholderTextColor="#A89B9E"
                  />

                  <Text style={styles.inputLabel}>Badge Ribbon / Date Tag</Text>
                  <TextInput
                    style={styles.textInput}
                    value={editDateStr}
                    onChangeText={setEditDateStr}
                    placeholder="e.g. Established Together"
                    placeholderTextColor="#A89B9E"
                  />

                  <Text style={styles.inputLabel}>Heartfelt Love Note / Vow Text</Text>
                  <TextInput
                    style={[styles.textInput, styles.textAreaInput]}
                    value={editBodyText}
                    onChangeText={setEditBodyText}
                    placeholder="Write your beautiful love note or story..."
                    placeholderTextColor="#A89B9E"
                    multiline
                    numberOfLines={4}
                  />

                  <Text style={styles.inputLabel}>Photo 1 Caption</Text>
                  <TextInput
                    style={styles.textInput}
                    value={editCaption1}
                    onChangeText={setEditCaption1}
                    placeholder="e.g. The first chapter of us ✨"
                    placeholderTextColor="#A89B9E"
                  />

                  <Text style={styles.inputLabel}>Photo 2 Caption (if collage)</Text>
                  <TextInput
                    style={styles.textInput}
                    value={editCaption2}
                    onChangeText={setEditCaption2}
                    placeholder="e.g. Stolen glances and sweet smiles 💕"
                    placeholderTextColor="#A89B9E"
                  />

                  {editTemplate === 'handwritten_letter' && (
                    <>
                      <Text style={styles.inputLabel}>Salutation</Text>
                      <TextInput
                        style={styles.textInput}
                        value={editSalutation}
                        onChangeText={setEditSalutation}
                        placeholder="To My Dearest Partner 💌"
                        placeholderTextColor="#A89B9E"
                      />

                      <Text style={styles.inputLabel}>Signature Sign-Off</Text>
                      <TextInput
                        style={styles.textInput}
                        value={editSignature}
                        onChangeText={setEditSignature}
                        placeholder="Forever & Always, You"
                        placeholderTextColor="#A89B9E"
                      />
                    </>
                  )}
                </View>
              )}

              {/* TAB 2: PHOTOS */}
              {activeTab === 'photos' && (
                <View>
                  {/* Photo Slot 1 */}
                  <View style={styles.photoCustomizerCard}>
                    <Text style={styles.photoSlotTitle}>Photo Slot 1 (Primary)</Text>
                    <View style={styles.photoPreviewRow}>
                      {editPhotoUri1 ? (
                        <Image source={{ uri: editPhotoUri1 }} style={styles.photoSlotThumb} />
                      ) : (
                        <View style={styles.emptyPhotoThumb}>
                          <Ionicons name="image-outline" size={26} color="#A89B9E" />
                        </View>
                      )}
                      <View style={styles.photoSlotActions}>
                        <TouchableOpacity
                          style={styles.slotUploadBtn}
                          onPress={() => {
                            setTargetPhotoPageIndex(editingPageIndex);
                            handlePickFromGallery(1);
                          }}
                        >
                          <Ionicons name="images" size={14} color="#FFFFFF" style={{ marginRight: 4 }} />
                          <Text style={styles.slotUploadBtnText}>Upload from Gallery</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={styles.slotCameraBtn}
                          onPress={() => {
                            setTargetPhotoPageIndex(editingPageIndex);
                            handleTakePhotoWithCamera(1);
                          }}
                        >
                          <Ionicons name="camera" size={14} color={AppColors.primary} style={{ marginRight: 4 }} />
                          <Text style={styles.slotCameraBtnText}>Take Camera Photo</Text>
                        </TouchableOpacity>

                        {editPhotoUri1 && (
                          <TouchableOpacity
                            style={styles.slotRemoveBtn}
                            onPress={() => setEditPhotoUri1(undefined)}
                          >
                            <Text style={styles.slotRemoveBtnText}>Remove</Text>
                          </TouchableOpacity>
                        )}
                      </View>
                    </View>
                  </View>

                  {/* Photo Slot 2 */}
                  <View style={styles.photoCustomizerCard}>
                    <Text style={styles.photoSlotTitle}>Photo Slot 2 (Secondary / Collage)</Text>
                    <View style={styles.photoPreviewRow}>
                      {editPhotoUri2 ? (
                        <Image source={{ uri: editPhotoUri2 }} style={styles.photoSlotThumb} />
                      ) : (
                        <View style={styles.emptyPhotoThumb}>
                          <Ionicons name="image-outline" size={26} color="#A89B9E" />
                        </View>
                      )}
                      <View style={styles.photoSlotActions}>
                        <TouchableOpacity
                          style={styles.slotUploadBtn}
                          onPress={() => {
                            setTargetPhotoPageIndex(editingPageIndex);
                            handlePickFromGallery(2);
                          }}
                        >
                          <Ionicons name="images" size={14} color="#FFFFFF" style={{ marginRight: 4 }} />
                          <Text style={styles.slotUploadBtnText}>Upload from Gallery</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={styles.slotCameraBtn}
                          onPress={() => {
                            setTargetPhotoPageIndex(editingPageIndex);
                            handleTakePhotoWithCamera(2);
                          }}
                        >
                          <Ionicons name="camera" size={14} color={AppColors.primary} style={{ marginRight: 4 }} />
                          <Text style={styles.slotCameraBtnText}>Take Camera Photo</Text>
                        </TouchableOpacity>

                        {editPhotoUri2 && (
                          <TouchableOpacity
                            style={styles.slotRemoveBtn}
                            onPress={() => setEditPhotoUri2(undefined)}
                          >
                            <Text style={styles.slotRemoveBtnText}>Remove</Text>
                          </TouchableOpacity>
                        )}
                      </View>
                    </View>
                  </View>
                </View>
              )}

              {/* TAB 3: LAYOUT & THEMES */}
              {activeTab === 'style' && (
                <View>
                  <Text style={styles.inputLabel}>Page Layout Template</Text>
                  <View style={styles.templateOptionsGrid}>
                    {TEMPLATE_OPTIONS.map((tmpl) => {
                      const isSelected = editTemplate === tmpl.type;
                      return (
                        <TouchableOpacity
                          key={tmpl.type}
                          style={[
                            styles.templateOptionCard,
                            isSelected && styles.templateOptionCardSelected,
                          ]}
                          onPress={() => setEditTemplate(tmpl.type)}
                          activeOpacity={0.8}
                        >
                          <Text style={styles.templateOptionEmoji}>{tmpl.emoji}</Text>
                          <Text
                            style={[
                              styles.templateOptionLabel,
                              isSelected && styles.templateOptionLabelSelected,
                            ]}
                          >
                            {tmpl.label}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>

                  <Text style={styles.inputLabel}>Paper Theme / Background</Text>
                  <View style={styles.themesListRow}>
                    {PAPER_THEMES.map((theme) => {
                      const isSelected = editPaperTheme === theme.id;
                      return (
                        <TouchableOpacity
                          key={theme.id}
                          style={[
                            styles.themePill,
                            { backgroundColor: theme.bg, borderColor: isSelected ? AppColors.primary : theme.border },
                            isSelected && styles.themePillSelected,
                          ]}
                          onPress={() => setEditPaperTheme(theme.id)}
                          activeOpacity={0.8}
                        >
                          <Text
                            style={[
                              styles.themePillText,
                              { color: theme.id === 'midnight' ? '#FFBAC8' : '#4E3A42' },
                              isSelected && { fontWeight: '900' },
                            ]}
                          >
                            {theme.label}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>

                  <Text style={styles.inputLabel}>Wax Seal Stamp Motif</Text>
                  <View style={styles.sealRow}>
                    {SEAL_ICONS.map((seal) => {
                      const isSelected = editSealIcon === seal.id;
                      return (
                        <TouchableOpacity
                          key={seal.id}
                          style={[styles.sealOptionBtn, isSelected && styles.sealOptionBtnSelected]}
                          onPress={() => setEditSealIcon(seal.id)}
                          activeOpacity={0.8}
                        >
                          <Text style={{ fontSize: 20 }}>{seal.emoji}</Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              )}

              {/* TAB 4: MANAGE PAGES */}
              {activeTab === 'pages' && (
                <View>
                  <Text style={styles.inputLabel}>Jump to Page / Spread</Text>
                  <View style={styles.pagesJumpRow}>
                    {pages.map((p, idx) => (
                      <TouchableOpacity
                        key={p.id}
                        style={[
                          styles.pageJumpBadge,
                          idx === editingPageIndex && styles.pageJumpBadgeActive,
                        ]}
                        onPress={() => {
                          handleOpenEditModal(idx, activeTab);
                          handleJumpToSpread(idx + 1);
                        }}
                      >
                        <Text
                          style={[
                            styles.pageJumpBadgeText,
                            idx === editingPageIndex && styles.pageJumpBadgeTextActive,
                          ]}
                        >
                          {idx + 1}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  <View style={styles.pageManagementActions}>
                    <TouchableOpacity
                      style={styles.managementBtnPrimary}
                      onPress={handleAddNewPage}
                      activeOpacity={0.85}
                    >
                      <Feather name="plus-circle" size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
                      <Text style={styles.managementBtnPrimaryText}>Add New Scrapbook Page</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.managementBtnSecondary}
                      onPress={() => handleDuplicatePage(editingPageIndex)}
                      activeOpacity={0.85}
                    >
                      <Feather name="copy" size={15} color={AppColors.primary} style={{ marginRight: 6 }} />
                      <Text style={styles.managementBtnSecondaryText}>Duplicate Page {editingPageIndex + 1}</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.managementBtnDanger}
                      onPress={() => handleDeletePage(editingPageIndex)}
                      activeOpacity={0.85}
                    >
                      <Feather name="trash-2" size={15} color="#D12040" style={{ marginRight: 6 }} />
                      <Text style={styles.managementBtnDangerText}>Delete Page {editingPageIndex + 1}</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.managementBtnReset}
                      onPress={handleResetAllPages}
                      activeOpacity={0.85}
                    >
                      <Feather name="refresh-cw" size={14} color="#A83248" style={{ marginRight: 6 }} />
                      <Text style={styles.managementBtnResetText}>Clear All &amp; Start Fresh</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}

              {/* Save Button */}
              <TouchableOpacity
                style={styles.savePageEditsBtn}
                onPress={handleSavePageEdits}
                activeOpacity={0.85}
              >
                <Ionicons name="checkmark" size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
                <Text style={styles.savePageEditsBtnText}>Save Scrapbook Changes</Text>
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
    alignItems: 'center',
  },
  headerBar: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    marginBottom: 10,
  },
  headerTitleGroup: {
    flex: 1,
    paddingRight: 8,
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
  headerActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  headerActionPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 16,
    gap: 4,
  },
  pdfExportPill: {
    backgroundColor: '#E60067',
    shadowColor: '#E60067',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  pdfExportText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  customizePill: {
    backgroundColor: 'rgba(255, 232, 236, 0.95)',
    borderWidth: 1,
    borderColor: '#FFBAC8',
  },
  customizeText: {
    fontSize: 11,
    fontWeight: '800',
    color: AppColors.primary,
  },

  // =========================================================
  // OPEN NOTEBOOK WRAPPER (TWO PAGES SIDE BY SIDE)
  // =========================================================
  openNotebookWrapper: {
    flexDirection: 'row',
    backgroundColor: '#E8D8C4', // Rich craft leather backing board
    borderRadius: 18,
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderWidth: 2,
    borderColor: '#D4C0A8',
    shadowColor: '#8C7A6B',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 18,
    elevation: 8,
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  leftBookEdgeDepth: {
    position: 'absolute',
    left: 2,
    top: 14,
    bottom: 14,
    width: 4,
    backgroundColor: '#F5ECE0',
    borderTopLeftRadius: 3,
    borderBottomLeftRadius: 3,
    borderLeftWidth: 1,
    borderColor: '#D8C6B0',
    zIndex: 1,
  },
  rightBookEdgeDepth: {
    position: 'absolute',
    right: 2,
    top: 14,
    bottom: 14,
    width: 4,
    backgroundColor: '#F5ECE0',
    borderTopRightRadius: 3,
    borderBottomRightRadius: 3,
    borderRightWidth: 1,
    borderColor: '#D8C6B0',
    zIndex: 1,
  },
  pageSlotContainer: {
    height: '100%',
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: '#FFFDF9',
    borderWidth: 1,
    borderColor: '#EFE7DA',
    shadowColor: '#6E5C50',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 2,
  },
  pageContentWrapper: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  pageInnerScroll: {
    padding: 10,
    paddingBottom: 22,
  },

  // CENTER METALLIC DOUBLE-RING SPIRAL SPINE
  centerSpiralSpine: {
    height: '100%',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingVertical: 12,
    zIndex: 15,
    position: 'relative',
  },
  spineShadowLine: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 10,
    backgroundColor: 'rgba(0,0,0,0.18)',
    borderRadius: 5,
  },
  spineSpiralUnit: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    height: 22,
    position: 'relative',
  },
  spineHoleLeft: {
    position: 'absolute',
    left: -4,
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: '#423730',
    borderWidth: 1,
    borderColor: '#241D19',
    zIndex: 5,
  },
  spineHoleRight: {
    position: 'absolute',
    right: -4,
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: '#423730',
    borderWidth: 1,
    borderColor: '#241D19',
    zIndex: 5,
  },
  spineCoilRing: {
    width: 22,
    height: 11,
    borderRadius: 5.5,
    overflow: 'hidden',
    borderWidth: 0.8,
    borderColor: '#54545E',
    shadowColor: '#000',
    shadowOffset: { width: 1, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 2,
    elevation: 4,
    zIndex: 20,
  },

  // 3D FLIPPING PAGE SHEET
  flippingSheetAnchor: {
    position: 'absolute',
    top: 8,
    borderRadius: 10,
    zIndex: 100,
    overflow: 'visible',
  },
  flippingFace: {
    ...StyleSheet.absoluteFill,
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: '#FFFDF9',
    borderWidth: 1,
    borderColor: '#EFE7DA',
    shadowColor: '#4A3D34',
    shadowOffset: { width: 4, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 10,
  },
  flippingPageBackside: {
    flex: 1,
    backgroundColor: '#FAF4EB',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E4D6C4',
  },
  backsideTexture: {
    alignItems: 'center',
    justifyContent: 'center',
    opacity: 0.6,
  },
  backsideWatermark: {
    fontFamily: AppFonts.title,
    fontSize: 12,
    color: '#8A7769',
    letterSpacing: 1,
    marginTop: 6,
  },
  flipShadowOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: '#000000',
  },

  // INSIDE BOOK COVER (PAGE 0 LEFT)
  insideCoverContainer: {
    flex: 1,
    padding: 14,
    backgroundColor: '#FFF8F4',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: '#FFCAD4',
    borderRadius: 8,
    margin: 4,
  },
  coverCrownBadge: {
    marginBottom: 6,
  },
  coverEditionTitle: {
    fontSize: 9,
    fontWeight: '900',
    color: AppColors.primary,
    letterSpacing: 1.5,
    marginBottom: 4,
  },
  coverCoupleNames: {
    fontFamily: AppFonts.title,
    fontSize: 16,
    color: '#3B2A30',
    textAlign: 'center',
    marginBottom: 6,
  },
  coverGoldDivider: {
    width: 40,
    height: 1.5,
    backgroundColor: '#D4AF37',
    marginBottom: 8,
  },
  coverDedicationText: {
    fontSize: 10,
    fontStyle: 'italic',
    color: '#7A626A',
    textAlign: 'center',
    lineHeight: 14,
    marginBottom: 10,
  },
  coverEstTag: {
    backgroundColor: '#FFE8EC',
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#FFBAC8',
  },
  coverEstTagText: {
    fontSize: 8.5,
    fontWeight: '800',
    color: AppColors.primary,
    letterSpacing: 0.8,
  },
  coverWaxSealSmall: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#BA1E32',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E65E6E',
  },

  // END OF BOOK SCREEN
  endOfBookContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
  },
  endOfBookTitle: {
    fontFamily: AppFonts.title,
    fontSize: 14,
    color: '#3B2A30',
    marginBottom: 4,
  },
  endOfBookSub: {
    fontSize: 10,
    color: '#8A727A',
    textAlign: 'center',
    fontStyle: 'italic',
    marginBottom: 12,
  },
  addPagePromptBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: AppColors.primary,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 14,
  },
  addPagePromptText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#FFFFFF',
  },

  // TYPOGRAPHY & ELEMENTS
  pageDateRibbon: {
    alignSelf: 'flex-start',
    backgroundColor: '#F0E4D6',
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: 4,
    marginBottom: 4,
    borderWidth: 0.8,
    borderColor: '#D8C8B6',
  },
  pageDateRibbonText: {
    fontSize: 8.5,
    fontWeight: '800',
    color: '#6E5647',
    letterSpacing: 0.5,
  },
  pageMiniTitle: {
    fontFamily: AppFonts.title,
    fontSize: 15,
    color: '#3A2C30',
    lineHeight: 18,
    marginBottom: 2,
  },
  pageMiniSubtitle: {
    fontSize: 10,
    fontStyle: 'italic',
    color: '#8A767C',
    marginBottom: 8,
  },
  templateBox: {
    alignItems: 'center',
  },

  // PHOTOS & POLAROIDS
  photoFrameCenter: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    padding: 6,
    borderRadius: 8,
    shadowColor: '#9C8980',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 5,
    elevation: 2,
    borderWidth: 0.8,
    borderColor: '#EBE2D5',
    position: 'relative',
    marginBottom: 10,
  },
  photoTouchable: {
    width: '100%',
    height: 120,
    borderRadius: 6,
    overflow: 'hidden',
    backgroundColor: '#F7F0E8',
  },
  photoFull: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  emptyPhotoBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 232, 236, 0.4)',
  },
  emptyPhotoText: {
    fontSize: 9.5,
    color: AppColors.primary,
    fontWeight: '700',
    marginTop: 3,
  },
  photoChangeBadge: {
    position: 'absolute',
    bottom: 6,
    right: 6,
    backgroundColor: 'rgba(0,0,0,0.6)',
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoPolaroidCaption: {
    fontSize: 9.5,
    fontStyle: 'italic',
    color: '#635357',
    textAlign: 'center',
    marginTop: 4,
  },
  washiTape: {
    position: 'absolute',
    width: 32,
    height: 10,
    backgroundColor: 'rgba(255, 182, 193, 0.85)',
    borderRadius: 2,
    zIndex: 5,
  },
  washiTapeTopLeft: {
    top: -4,
    left: 6,
    transform: [{ rotate: '-8deg' }],
  },
  washiTapeBottomRight: {
    bottom: -4,
    right: 6,
    transform: [{ rotate: '8deg' }],
  },
  washiTapeMini: {
    position: 'absolute',
    top: -4,
    alignSelf: 'center',
    width: 28,
    height: 9,
    backgroundColor: 'rgba(255, 182, 193, 0.85)',
    borderRadius: 2,
    zIndex: 5,
  },

  // MINI POLAROID
  miniPolaroidBox: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    padding: 5,
    borderRadius: 6,
    borderWidth: 0.8,
    borderColor: '#ECE3D7',
    position: 'relative',
    marginBottom: 8,
  },
  polaroidSlotMini: {
    width: '100%',
    height: 85,
    borderRadius: 4,
    overflow: 'hidden',
    backgroundColor: '#F5ECE2',
  },
  miniCaption: {
    fontSize: 8.5,
    fontStyle: 'italic',
    color: '#5C4A50',
    textAlign: 'center',
    marginTop: 3,
  },

  // TORN VOW CARD
  tornVowCard: {
    width: '100%',
    backgroundColor: '#FAF4EC',
    borderRadius: 8,
    padding: 8,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#D8C3B4',
    position: 'relative',
  },
  vowBodyText: {
    fontSize: 10,
    color: '#524348',
    lineHeight: 14,
    fontStyle: 'italic',
  },
  waxSealStamp: {
    position: 'absolute',
    bottom: -8,
    right: 8,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#C83244',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E86374',
  },

  // STICKY NOTE
  stickyNoteMini: {
    width: '100%',
    backgroundColor: '#FFF5CD',
    padding: 8,
    borderRadius: 6,
    borderWidth: 0.8,
    borderColor: '#EAD9A6',
    position: 'relative',
    marginTop: 4,
  },
  pinNeedle: {
    position: 'absolute',
    top: -4,
    alignSelf: 'center',
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FF6575',
  },
  stickyNoteText: {
    fontSize: 9.5,
    color: '#6B5829',
    lineHeight: 13,
    textAlign: 'center',
  },

  // PARCHMENT LETTER
  parchmentLetterSheet: {
    width: '100%',
    backgroundColor: '#FCF8F2',
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: '#E8DCB8',
  },
  letterHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 0.8,
    borderBottomColor: '#E2D5C8',
    paddingBottom: 4,
    marginBottom: 6,
  },
  parchmentSalutation: {
    fontSize: 10,
    color: AppColors.primary,
    fontWeight: '800',
    flex: 1,
  },
  postageStampBadge: {
    width: 22,
    height: 22,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#C498A3',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFF0F2',
  },
  ruledLinesContainer: {
    paddingVertical: 4,
  },
  handwrittenLetterBody: {
    fontSize: 10,
    color: '#45383C',
    lineHeight: 16,
    fontStyle: 'italic',
  },
  letterSignatureRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    paddingTop: 4,
    borderTopWidth: 0.8,
    borderTopColor: '#E2D5C8',
  },
  signatureScript: {
    fontSize: 9.5,
    fontWeight: '800',
    color: '#6E5057',
    flex: 1,
  },
  waxSealRed: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#BA1E32',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // ADVENTURE BOARDING PASS
  boardingPassCard: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 8,
    borderWidth: 1,
    borderColor: '#E4D7CA',
  },
  passHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderBottomWidth: 0.8,
    borderStyle: 'dashed',
    borderBottomColor: '#D8C6B6',
    paddingBottom: 4,
    marginBottom: 6,
  },
  passFlightText: {
    fontSize: 8.5,
    fontWeight: '900',
    color: AppColors.primary,
    letterSpacing: 0.5,
  },
  adventurePanoramicSlot: {
    width: '100%',
    height: 90,
    borderRadius: 6,
    overflow: 'hidden',
    backgroundColor: '#F5EDE4',
  },
  adventureCaption: {
    fontSize: 8.5,
    fontStyle: 'italic',
    color: '#635357',
    textAlign: 'center',
    marginTop: 3,
  },
  adventureVow: {
    fontSize: 9.5,
    color: '#524348',
    lineHeight: 14,
    marginTop: 6,
    fontStyle: 'italic',
  },

  // BOTANICAL PRESSED
  ovalPhotoFrame: {
    width: 100,
    height: 100,
    borderRadius: 50,
    overflow: 'hidden',
    backgroundColor: '#F5ECE1',
    borderWidth: 2,
    borderColor: '#D4AF37',
    alignSelf: 'center',
    marginBottom: 8,
  },
  botanicalQuoteText: {
    fontSize: 9.5,
    fontStyle: 'italic',
    color: '#6E5C62',
    textAlign: 'center',
    lineHeight: 14,
  },

  // MIDNIGHT WHISPERS
  templateMidnight: {
    width: '100%',
    borderRadius: 8,
    overflow: 'hidden',
  },
  midnightParchment: {
    padding: 8,
    borderRadius: 8,
  },
  midnightStars: {
    fontSize: 10,
    textAlign: 'center',
    marginBottom: 4,
  },
  midnightPhotoSlot: {
    width: '100%',
    height: 95,
    borderRadius: 6,
    overflow: 'hidden',
    backgroundColor: '#271940',
  },
  emptyPhotoBoxDark: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyPhotoTextDark: {
    fontSize: 9,
    color: '#FFB8C6',
    fontWeight: '700',
    marginTop: 2,
  },
  midnightBody: {
    fontSize: 9.5,
    color: '#E8DCF5',
    lineHeight: 14,
    marginTop: 6,
    fontStyle: 'italic',
  },
  waxSealGold: {
    alignSelf: 'flex-end',
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#D4AF37',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6,
  },

  pageBottomNumRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    paddingTop: 4,
    borderTopWidth: 0.6,
    borderTopColor: '#EBE0D5',
  },
  pageBottomNumText: {
    fontSize: 8.5,
    color: '#9C8690',
    fontWeight: '600',
  },
  miniEditIconBtn: {
    padding: 2,
  },

  // BOTTOM NAVIGATION BAR
  pageTurnNavigationRow: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
    paddingHorizontal: 12,
  },
  turnPageBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    paddingVertical: 8,
    paddingHorizontal: 12,
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
  pageIndicatorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  pageIndicatorPill: {
    backgroundColor: 'rgba(255, 232, 236, 0.95)',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#FFCAD4',
  },
  pageIndicatorText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: AppColors.primary,
  },
  quickAddPageBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 232, 236, 0.95)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#FFCAD4',
  },

  // PHOTO ACTION MODAL
  photoModalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  photoModalCard: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 8,
  },
  photoModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  photoModalTitle: {
    fontFamily: AppFonts.title,
    fontSize: 17,
    color: AppColors.textPrimary,
  },
  photoModalBtnPrimary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: AppColors.primary,
    paddingVertical: 12,
    borderRadius: 14,
    marginBottom: 10,
  },
  photoModalBtnPrimaryText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 13,
  },
  photoModalBtnSecondary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFE8EC',
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#FFB8C6',
    marginBottom: 14,
  },
  photoModalBtnSecondaryText: {
    color: AppColors.primary,
    fontWeight: '800',
    fontSize: 13,
  },
  urlInputRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 10,
  },
  urlTextInput: {
    flex: 1,
    backgroundColor: '#FAF5F6',
    borderWidth: 1,
    borderColor: '#EFE2E5',
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 12,
    fontSize: 12,
    color: AppColors.textPrimary,
  },
  urlApplyBtn: {
    backgroundColor: '#6C5CE7',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 12,
    justifyContent: 'center',
  },
  urlApplyBtnText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 12,
  },
  removePhotoBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    marginTop: 4,
  },
  removePhotoBtnText: {
    color: '#D12040',
    fontSize: 12,
    fontWeight: '700',
  },

  // EDIT MODAL
  editModalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  editModalCard: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 20,
    maxHeight: '90%',
  },
  editModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  editModalTitle: {
    fontFamily: AppFonts.title,
    fontSize: 19,
    color: AppColors.textPrimary,
  },
  editModalSubtitle: {
    fontSize: 11,
    color: AppColors.textSecondary,
    marginTop: 2,
  },
  customizerTabsRow: {
    flexDirection: 'row',
    backgroundColor: '#F7EDEE',
    borderRadius: 12,
    padding: 3,
    marginBottom: 14,
  },
  customizerTab: {
    flex: 1,
    paddingVertical: 7,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
  },
  customizerTabActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#E297A5',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 2,
  },
  customizerTabText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#8A727A',
  },
  customizerTabTextActive: {
    color: AppColors.primary,
    fontWeight: '800',
  },
  editModalForm: {
    paddingBottom: 28,
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: AppColors.textSecondary,
    marginBottom: 5,
    marginTop: 10,
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
    minHeight: 85,
    textAlignVertical: 'top',
  },

  // PHOTO CUSTOMIZER
  photoCustomizerCard: {
    backgroundColor: '#FAF5F6',
    borderRadius: 14,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#EFE2E5',
  },
  photoSlotTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: AppColors.textPrimary,
    marginBottom: 8,
  },
  photoPreviewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  photoSlotThumb: {
    width: 70,
    height: 70,
    borderRadius: 10,
    resizeMode: 'cover',
  },
  emptyPhotoThumb: {
    width: 70,
    height: 70,
    borderRadius: 10,
    backgroundColor: '#EAE0E3',
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoSlotActions: {
    flex: 1,
    gap: 6,
  },
  slotUploadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: AppColors.primary,
    paddingVertical: 7,
    paddingHorizontal: 10,
    borderRadius: 10,
  },
  slotUploadBtnText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
  },
  slotCameraBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFE8EC',
    paddingVertical: 7,
    paddingHorizontal: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#FFBAC8',
  },
  slotCameraBtnText: {
    color: AppColors.primary,
    fontSize: 11,
    fontWeight: '700',
  },
  slotRemoveBtn: {
    alignItems: 'center',
    paddingVertical: 4,
  },
  slotRemoveBtnText: {
    color: '#D12040',
    fontSize: 10,
    fontWeight: '700',
  },

  // THEMES & TEMPLATES
  templateOptionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 10,
  },
  templateOptionCard: {
    width: (width - 70) / 3,
    backgroundColor: '#FAF5F6',
    borderWidth: 1.2,
    borderColor: '#EFE2E5',
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  templateOptionCardSelected: {
    borderColor: AppColors.primary,
    backgroundColor: '#FFE8EC',
  },
  templateOptionEmoji: {
    fontSize: 22,
    marginBottom: 4,
  },
  templateOptionLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#7A626A',
    textAlign: 'center',
  },
  templateOptionLabelSelected: {
    color: AppColors.primary,
    fontWeight: '800',
  },
  themesListRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 10,
  },
  themePill: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 14,
    borderWidth: 1.5,
  },
  themePillSelected: {
    borderWidth: 2,
    shadowColor: AppColors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  themePillText: {
    fontSize: 11,
    fontWeight: '700',
  },
  sealRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 10,
  },
  sealOptionBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FAF5F6',
    borderWidth: 1.5,
    borderColor: '#EFE2E5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sealOptionBtnSelected: {
    borderColor: AppColors.primary,
    backgroundColor: '#FFE8EC',
    transform: [{ scale: 1.1 }],
  },

  // MANAGE PAGES
  pagesJumpRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  pageJumpBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FAF5F6',
    borderWidth: 1,
    borderColor: '#EFE2E5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pageJumpBadgeActive: {
    backgroundColor: AppColors.primary,
    borderColor: AppColors.primary,
  },
  pageJumpBadgeText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#6E555E',
  },
  pageJumpBadgeTextActive: {
    color: '#FFFFFF',
    fontWeight: '900',
  },
  pageManagementActions: {
    gap: 10,
    marginTop: 8,
  },
  managementBtnPrimary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#6C5CE7',
    paddingVertical: 12,
    borderRadius: 14,
  },
  managementBtnPrimaryText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 13,
  },
  managementBtnSecondary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFE8EC',
    borderWidth: 1,
    borderColor: '#FFBAC8',
    paddingVertical: 12,
    borderRadius: 14,
  },
  managementBtnSecondaryText: {
    color: AppColors.primary,
    fontWeight: '800',
    fontSize: 13,
  },
  managementBtnDanger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFF0F2',
    borderWidth: 1,
    borderColor: '#FFD4DD',
    paddingVertical: 12,
    borderRadius: 14,
  },
  managementBtnDangerText: {
    color: '#D12040',
    fontWeight: '800',
    fontSize: 13,
  },
  managementBtnReset: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFF5F6',
    borderWidth: 1,
    borderColor: '#F6BAC7',
    paddingVertical: 12,
    borderRadius: 14,
  },
  managementBtnResetText: {
    color: '#A83248',
    fontWeight: '800',
    fontSize: 13,
  },

  // BLANK PLACEHOLDERS
  blankTitlePlaceholder: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#E2D0C2',
    backgroundColor: 'rgba(255, 248, 240, 0.6)',
    alignSelf: 'flex-start',
    marginBottom: 6,
  },
  blankTitlePlaceholderText: {
    fontSize: 11,
    fontWeight: '700',
    color: AppColors.primary,
  },
  emptyBodyPrompt: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
  },
  emptyBodyPromptText: {
    fontSize: 10,
    color: '#9C8690',
    fontStyle: 'italic',
  },

  // SAVE BUTTON
  savePageEditsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: AppColors.primary,
    borderRadius: 22,
    paddingVertical: 13,
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
