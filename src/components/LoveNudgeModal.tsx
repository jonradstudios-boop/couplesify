import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  Image,
  TextInput,
  Platform,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons, Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import AppColors from '../theme/AppColors';
import AppFonts from '../theme/AppFonts';
import FallingHeartsBackground from './FallingHeartsBackground';
import DoodleCanvas from './DoodleCanvas';
import StorageService, {
  CoupleProfile,
  EphemeralSnap,
  SweetVoiceNote,
  SharedDoodle,
  MemoryItem,
} from '../services/StorageService';
import RealtimeService from '../services/RealtimeService';
import FirestoreService from '../services/FirestoreService';
import ImageCompressService from '../services/ImageCompressService';

interface LoveNudgeModalProps {
  visible: boolean;
  partnerName: string;
  userName?: string;
  profile?: CoupleProfile | null;
  onSaveProfile?: (profile: CoupleProfile) => void;
  onClose: () => void;
  onOpenDoodle?: () => void;
}

const SEVEN_HOURS_MS = 7 * 60 * 60 * 1000;

export const LoveNudgeModal: React.FC<LoveNudgeModalProps> = ({
  visible,
  partnerName,
  userName = 'You',
  profile,
  onSaveProfile,
  onClose,
  onOpenDoodle,
}) => {
  // Ephemeral Snap (7h Reset) & Staging Save Area
  const [snap, setSnap] = useState<EphemeralSnap | null>(null);
  const [snapRemainingTime, setSnapRemainingTime] = useState<string | null>(null);
  const [stagedSnapUri, setStagedSnapUri] = useState<string | null>(null);
  const [stagedSnapKb, setStagedSnapKb] = useState<number>(32);
  const [stagedCaption, setStagedCaption] = useState<string>('');
  const [isReplySnap, setIsReplySnap] = useState<boolean>(false);
  const [isSavingToMemories, setIsSavingToMemories] = useState<boolean>(true);
  const [isUploadingSnap, setIsUploadingSnap] = useState<boolean>(false);
  const [isSnapSavedToMemories, setIsSnapSavedToMemories] = useState<boolean>(false);
  const [isProcessingSnap, setIsProcessingSnap] = useState<boolean>(false);

  // Anniversary state & calculations
  const [anniversaryInput, setAnniversaryInput] = useState(
    profile?.anniversaryDate || new Date().toISOString().split('T')[0]
  );
  const [isEditingAnniversary, setIsEditingAnniversary] = useState(false);

  // Live Shared Doodle
  const [sharedDoodle, setSharedDoodle] = useState<SharedDoodle | null>(null);

  // Sweet Voice Note
  const [voiceNote, setVoiceNote] = useState<SweetVoiceNote | null>(null);
  const [isRecordingVoice, setIsRecordingVoice] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [isPlayingVoice, setIsPlayingVoice] = useState(false);
  const recordingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const mediaRecorderRef = useRef<any>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioPlayerRef = useRef<any>(null);

  // Nudge feedback
  const [sentMessage, setSentMessage] = useState<string | null>(null);

  const loadHubData = useCallback(async () => {
    const currentSnap = await StorageService.getEphemeralSnap();
    setSnap(currentSnap);

    const currentVoice = await StorageService.getSweetVoiceNote();
    setVoiceNote(currentVoice);

    const doodle = await StorageService.getSharedDoodle();
    setSharedDoodle(doodle);

    const effectiveProfile = profile || (await StorageService.getProfile());
    if (effectiveProfile?.anniversaryDate) {
      setAnniversaryInput(effectiveProfile.anniversaryDate);
    }

    // Also fetch fresh live cloud sync state from Firestore if available
    if (effectiveProfile?.inviteCode) {
      try {
        const liveDoc = await FirestoreService.getLiveSyncDoc(effectiveProfile.inviteCode);
        if (liveDoc) {
          if (liveDoc.snap !== undefined) {
            setSnap(liveDoc.snap);
            await StorageService.saveEphemeralSnap(liveDoc.snap);
          }
          if (liveDoc.voice !== undefined) {
            setVoiceNote(liveDoc.voice);
            await StorageService.saveSweetVoiceNote(liveDoc.voice);
          }
          if (liveDoc.doodle !== undefined) {
            setSharedDoodle(liveDoc.doodle);
            await StorageService.saveSharedDoodle(liveDoc.doodle);
          }
        }
      } catch (err) {
        console.warn('loadHubData cloud fetch error:', err);
      }
    }
  }, [profile]);

  // Load all hub data whenever modal becomes visible & subscribe to live updates
  useEffect(() => {
    if (visible) {
      loadHubData();
    }

    const unsubSnap = RealtimeService.on('snap', (newSnap) => {
      setSnap(newSnap);
      StorageService.saveEphemeralSnap(newSnap);
    });

    const unsubVoice = RealtimeService.on('voice', (newVoice) => {
      setVoiceNote(newVoice);
      StorageService.saveSweetVoiceNote(newVoice);
    });

    const unsubDoodle = RealtimeService.on('doodle', (newDoodle) => {
      setSharedDoodle(newDoodle);
      StorageService.saveSharedDoodle(newDoodle);
    });

    return () => {
      unsubSnap();
      unsubVoice();
      unsubDoodle();
      if (audioPlayerRef.current) {
        try {
          audioPlayerRef.current.pause();
        } catch {}
      }
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        try {
          mediaRecorderRef.current.stop();
        } catch {}
      }
    };
  }, [visible, loadHubData]);

  // Periodic timer for 7-hour snap countdown
  useEffect(() => {
    if (!visible || !snap) return;

    const checkSnapExpiry = () => {
      const elapsed = Date.now() - snap.timestamp;
      const remainingMs = SEVEN_HOURS_MS - elapsed;
      if (remainingMs <= 0) {
        setSnap(null);
        setSnapRemainingTime(null);
        StorageService.saveEphemeralSnap(null);
      } else {
        const hours = Math.floor(remainingMs / (1000 * 60 * 60));
        const minutes = Math.floor((remainingMs % (1000 * 60 * 60)) / (1000 * 60));
        setSnapRemainingTime(`${hours}h ${minutes}m left`);
      }
    };

    checkSnapExpiry();
    const interval = setInterval(checkSnapExpiry, 30000); // Check every 30 seconds
    return () => clearInterval(interval);
  }, [visible, snap]);

  // 1. Ephemeral Snap Actions (7 hours reset + Staging Save Area + Auto-Compress)
  const processAndStageAsset = async (asset: ImagePicker.ImagePickerAsset, isReply: boolean) => {
    setIsProcessingSnap(true);
    try {
      const compressedUri = await ImageCompressService.processPickerAsset(asset);
      const approxKb = ImageCompressService.getApproximateKb(compressedUri);
      setStagedSnapUri(compressedUri);
      setStagedSnapKb(approxKb);
      setIsReplySnap(isReply);
      setStagedCaption(isReply ? (snap?.author ? `Reply to ${snap.author} 💕` : 'Reply snap 💕') : '');
      setIsSnapSavedToMemories(false);
    } catch (err) {
      console.warn('processAndStageAsset error:', err);
      Alert.alert('Photo Error', 'Could not optimize photo. Please try another image.');
    } finally {
      setIsProcessingSnap(false);
    }
  };

  const handlePickSweetSnap = async (isReply = false) => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        Alert.alert('Permission Needed', 'Please allow gallery access to pick a photo for your partner.');
        return;
      }

      const res = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.6,
      });

      if (!res.canceled && res.assets && res.assets.length > 0) {
        await processAndStageAsset(res.assets[0], isReply);
      }
    } catch (err) {
      console.warn('handlePickSweetSnap error:', err);
    }
  };

  const handleTakePhotoSweetSnap = async (isReply = false) => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      const perm = await ImagePicker.requestCameraPermissionsAsync();
      if (!perm.granted) {
        Alert.alert('Permission Needed', 'Please allow camera access to take a sweet snap for your partner.');
        return;
      }

      const res = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.6,
      });

      if (!res.canceled && res.assets && res.assets.length > 0) {
        await processAndStageAsset(res.assets[0], isReply);
      }
    } catch (err) {
      console.warn('handleTakePhotoSweetSnap error:', err);
    }
  };

  const handleConfirmSaveSnap = async () => {
    if (!stagedSnapUri) return;
    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {}

    setIsUploadingSnap(true);
    try {
      const isReply = isReplySnap;
      const snapCaption =
        stagedCaption.trim() ||
        (isReply ? `Reply to ${snap?.author || partnerName} 💕` : 'Uploaded with love 💕');

      const newSnap: EphemeralSnap = {
        id: `snap-${Date.now()}`,
        imageUri: stagedSnapUri,
        timestamp: Date.now(),
        author: userName || 'You',
        caption: snapCaption,
      };

      setSnap(newSnap);
      await StorageService.saveEphemeralSnap(newSnap);
      await RealtimeService.broadcastSnap(newSnap);

      const effectiveProfile = profile || (await StorageService.getProfile());
      if (effectiveProfile?.inviteCode) {
        await FirestoreService.syncSnap(effectiveProfile.inviteCode, newSnap);
      }

      // If user chose to also save to Memories Keepsake:
      if (isSavingToMemories) {
        try {
          const currentMemories = await StorageService.getMemories();
          const todayStr = new Intl.DateTimeFormat('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
          }).format(new Date());

          const newMemory: MemoryItem = {
            id: `m-snap-${Date.now()}`,
            imageUri: stagedSnapUri,
            caption: snapCaption,
            date: todayStr,
            tag: 'Snap 📸',
            likes: 1,
            isLiked: true,
          };
          const updatedMemories = [newMemory, ...currentMemories];
          await StorageService.saveMemories(updatedMemories);
          if (effectiveProfile?.inviteCode) {
            await FirestoreService.syncMemories(effectiveProfile.inviteCode, updatedMemories);
          }
        } catch (memErr) {
          console.warn('Error saving snap copy to memories:', memErr);
        }
      }

      setStagedSnapUri(null);
      setStagedCaption('');
      setIsReplySnap(false);
      setSentMessage(
        isReply
          ? `Replied to snap for ${partnerName}! 📸`
          : `Sent sweet snap to ${partnerName}! Resets in 7h 📸`
      );
      setTimeout(() => setSentMessage(null), 3500);
    } catch (saveErr) {
      console.warn('handleConfirmSaveSnap error:', saveErr);
      Alert.alert('Upload Error', 'Could not sync sweet snap. Please check connection and try again.');
    } finally {
      setIsUploadingSnap(false);
    }
  };

  const handleCancelStagedSnap = () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}
    setStagedSnapUri(null);
    setStagedCaption('');
    setIsReplySnap(false);
  };

  const handleSaveActiveSnapToMemories = async () => {
    if (!snap) return;
    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {}

    try {
      const currentMemories = await StorageService.getMemories();
      const alreadySaved = currentMemories.some((m) => m.imageUri === snap.imageUri);
      if (!alreadySaved) {
        const todayStr = new Intl.DateTimeFormat('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        }).format(new Date());

        const newMemory: MemoryItem = {
          id: `m-snap-${Date.now()}`,
          imageUri: snap.imageUri,
          caption: snap.caption || `${snap.author || partnerName}'s Sweet Snap 📸`,
          date: todayStr,
          tag: 'Snap 📸',
          likes: 1,
          isLiked: true,
        };
        const updatedMemories = [newMemory, ...currentMemories];
        await StorageService.saveMemories(updatedMemories);
        const effectiveProfile = profile || (await StorageService.getProfile());
        if (effectiveProfile?.inviteCode) {
          await FirestoreService.syncMemories(effectiveProfile.inviteCode, updatedMemories);
        }
      }
      setIsSnapSavedToMemories(true);
      setSentMessage(`Saved ${snap.author || partnerName}'s snap to your scrapbook! 📸💕`);
      setTimeout(() => setSentMessage(null), 3000);
    } catch (err) {
      console.warn('handleSaveActiveSnapToMemories error:', err);
    }
  };

  const handleRemoveSweetSnap = async () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch {}

    const doRemove = async () => {
      setSnap(null);
      setSnapRemainingTime(null);
      await StorageService.saveEphemeralSnap(null);
      const effectiveProfile = profile || (await StorageService.getProfile());
      if (effectiveProfile?.inviteCode) {
        await FirestoreService.syncSnap(effectiveProfile.inviteCode, null);
      }
      RealtimeService.emit('snap', null);
    };

    if (Platform.OS === 'web') {
      if (typeof window !== 'undefined' && window.confirm('Remove this sweet snap? 💕')) {
        await doRemove();
      }
    } else {
      Alert.alert('Remove Sweet Snap', 'Are you sure you want to remove this sweet snap? 💕', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Remove', style: 'destructive', onPress: doRemove },
      ]);
    }
  };

  // 2. Anniversary Calculations
  const calculateAnniversaryDetails = () => {
    const annivStr = profile?.anniversaryDate || anniversaryInput;
    if (!annivStr) {
      return { daysTogether: 0, nextAnnivDays: 0, label: 'Not assigned' };
    }

    const parts = annivStr.split('-').map(Number);
    if (parts.length < 3 || isNaN(parts[0])) {
      return { daysTogether: 0, nextAnnivDays: 0, label: annivStr };
    }

    const annivDate = new Date(parts[0], parts[1] - 1, parts[2]);
    const now = new Date();

    // Total Days in Relationship
    const diffTime = now.getTime() - annivDate.getTime();
    const daysTogether = Math.max(0, Math.floor(diffTime / (1000 * 60 * 60 * 24)));

    // Next Anniversary Countdown
    const currentYear = now.getFullYear();
    let nextAnniv = new Date(currentYear, parts[1] - 1, parts[2]);
    const todayZero = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    if (nextAnniv.getTime() < todayZero.getTime()) {
      nextAnniv = new Date(currentYear + 1, parts[1] - 1, parts[2]);
    }

    const diffToNext = nextAnniv.getTime() - todayZero.getTime();
    const nextAnnivDays = Math.ceil(diffToNext / (1000 * 60 * 60 * 24));

    return {
      daysTogether,
      nextAnnivDays,
      label: annivDate.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      }),
    };
  };

  const handleSaveAnniversary = async () => {
    if (!anniversaryInput.trim()) return;
    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {}

    const currentProfile = profile || {
      userName: userName || 'You',
      partnerName,
      userAvatar: '',
      partnerAvatar: '',
      anniversaryDate: anniversaryInput.trim(),
      inviteCode: 'LOVE-77',
      isPaired: true,
      partnerOnline: true,
    };

    const updatedProfile: CoupleProfile = {
      ...currentProfile,
      anniversaryDate: anniversaryInput.trim(),
    };

    if (onSaveProfile) {
      onSaveProfile(updatedProfile);
    }
    await StorageService.saveProfile(updatedProfile);
    setIsEditingAnniversary(false);
    setSentMessage('Anniversary date updated! 💍');
    setTimeout(() => setSentMessage(null), 3000);
  };

  // 3. Shared Doodle Save Handler
  const handleSaveDoodle = async (doodle: SharedDoodle) => {
    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {}
    setSharedDoodle(doodle);
    await StorageService.saveSharedDoodle(doodle);
    await RealtimeService.broadcastDoodle(doodle);
    if (profile?.inviteCode) {
      await FirestoreService.syncDoodle(profile.inviteCode, doodle);
    }
    setSentMessage('Doodle saved & shared with partner! 🎨');
    setTimeout(() => setSentMessage(null), 3000);
  };

  const handleClearDoodle = async () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch {}
    setSharedDoodle(null);
    await StorageService.saveSharedDoodle(null);
    if (profile?.inviteCode) {
      await FirestoreService.syncDoodle(profile.inviteCode, null);
    }
    setSentMessage('Shared doodle cleared! 🎨');
    setTimeout(() => setSentMessage(null), 2500);
  };

  const handleReplyDoodle = async () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}
    const replyDoodle: SharedDoodle = {
      id: `doodle-${Date.now()}`,
      strokes: [],
      updatedAt: Date.now(),
      author: userName || 'You',
      previewEmoji: '🎨',
    };
    setSharedDoodle(replyDoodle);
    await StorageService.saveSharedDoodle(replyDoodle);
    setSentMessage(`Canvas ready: Draw your reply for ${partnerName}! 🎨`);
    setTimeout(() => setSentMessage(null), 3000);
  };

  const handleReplyVoiceNote = () => {
    handleStartRecordVoice();
    setSentMessage(`Recording your reply whisper for ${partnerName}... 🎙️`);
    setTimeout(() => setSentMessage(null), 3000);
  };

  // 4. Sweet Voice Note Handlers (Real Audio via MediaRecorder & HTML5 Audio)
  const handleStartRecordVoice = async () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch {}
    setIsRecordingVoice(true);
    setRecordingSeconds(1);

    if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
    recordingTimerRef.current = setInterval(() => {
      setRecordingSeconds((prev) => prev + 1);
    }, 1000);

    // Request actual microphone input and record
    if (typeof navigator !== 'undefined' && navigator.mediaDevices?.getUserMedia) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        audioChunksRef.current = [];
        const mimeType = typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported('audio/webm')
          ? 'audio/webm'
          : '';
        const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
        recorder.ondataavailable = (event) => {
          if (event.data && event.data.size > 0) {
            audioChunksRef.current.push(event.data);
          }
        };
        recorder.start(250);
        mediaRecorderRef.current = recorder;
      } catch (err) {
        console.warn('Microphone permission or recording notice:', err);
      }
    }
  };

  const handleStopRecordVoice = async () => {
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {}
    setIsRecordingVoice(false);
    const finalSeconds = Math.max(1, recordingSeconds);

    const saveVoiceNoteWithData = async (audioDataUri?: string) => {
      const newNote: SweetVoiceNote = {
        id: `voice-${Date.now()}`,
        duration: finalSeconds,
        timestamp: Date.now(),
        senderName: userName || 'You',
        audioUri: audioDataUri,
      };

      setVoiceNote(newNote);
      await StorageService.saveSweetVoiceNote(newNote);
      await RealtimeService.broadcastVoice(newNote);
      const effectiveProfile = profile || (await StorageService.getProfile());
      if (effectiveProfile?.inviteCode) {
        await FirestoreService.syncVoiceNote(effectiveProfile.inviteCode, newNote);
      }
      setRecordingSeconds(0);
      setSentMessage(`Sweet voice whisper saved for ${partnerName}! 🎙️`);
      setTimeout(() => setSentMessage(null), 3000);
    };

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.onstop = async () => {
        try {
          const blobType = audioChunksRef.current[0]?.type || 'audio/webm';
          const audioBlob = new Blob(audioChunksRef.current, { type: blobType });
          const reader = new FileReader();
          reader.onloadend = async () => {
            const base64Audio = reader.result as string;
            await saveVoiceNoteWithData(base64Audio);
          };
          reader.readAsDataURL(audioBlob);
        } catch {
          await saveVoiceNoteWithData();
        }
        try {
          mediaRecorderRef.current.stream?.getTracks().forEach((track: any) => track.stop());
        } catch {}
      };
      try {
        mediaRecorderRef.current.stop();
      } catch {
        await saveVoiceNoteWithData();
      }
    } else {
      await saveVoiceNoteWithData();
    }
  };

  const handleTogglePlayVoice = () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}

    if (isPlayingVoice) {
      if (audioPlayerRef.current) {
        try {
          audioPlayerRef.current.pause();
          audioPlayerRef.current.currentTime = 0;
        } catch {}
      }
      setIsPlayingVoice(false);
    } else {
      if (voiceNote?.audioUri && typeof Audio !== 'undefined') {
        try {
          if (audioPlayerRef.current) {
            audioPlayerRef.current.pause();
          }
          const audio = new Audio(voiceNote.audioUri);
          audioPlayerRef.current = audio;
          setIsPlayingVoice(true);
          audio.onended = () => setIsPlayingVoice(false);
          audio.onerror = () => setIsPlayingVoice(false);
          audio.play().catch(() => setIsPlayingVoice(false));
        } catch {
          setIsPlayingVoice(true);
          setTimeout(() => setIsPlayingVoice(false), (voiceNote.duration || 5) * 1000);
        }
      } else {
        setIsPlayingVoice(true);
        setTimeout(() => setIsPlayingVoice(false), (voiceNote?.duration || 5) * 1000);
      }
    }
  };

  const handleDeleteVoiceNote = () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch {}

    const doDelete = async () => {
      if (audioPlayerRef.current) {
        try {
          audioPlayerRef.current.pause();
        } catch {}
      }
      setVoiceNote(null);
      setIsPlayingVoice(false);
      await StorageService.saveSweetVoiceNote(null);
      const effectiveProfile = profile || (await StorageService.getProfile());
      if (effectiveProfile?.inviteCode) {
        await FirestoreService.syncVoiceNote(effectiveProfile.inviteCode, null);
      }
      RealtimeService.emit('voice', null);
      setSentMessage('Sweet voice whisper deleted! 🗑️');
      setTimeout(() => setSentMessage(null), 2500);
    };

    if (Platform.OS === 'web') {
      if (typeof window !== 'undefined' && window.confirm('Delete this sweet voice whisper? 💕')) {
        doDelete();
      }
    } else {
      Alert.alert('Delete Voice Note', 'Are you sure you want to delete this sweet voice whisper? 💕', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: doDelete },
      ]);
    }
  };

  const annivStats = calculateAnniversaryDetails();

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <FallingHeartsBackground />
        <View style={styles.modalCard}>
          {/* Top Bar with Close button */}
          <View style={styles.topHeaderBar}>
            <View style={styles.headerLeftTitleGroup}>
              <View style={styles.heartIconCircle}>
                <Ionicons name="heart" size={20} color="#FF6575" />
              </View>
              <View style={{ flex: 1, flexShrink: 1 }}>
                <Text style={styles.title} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75}>Our Heart Hub</Text>
                <Text style={styles.subtitle} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>Private space for you & {partnerName}</Text>
              </View>
            </View>

            <TouchableOpacity style={styles.closeBtn} onPress={onClose} activeOpacity={0.7} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Ionicons name="close" size={20} color={AppColors.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Feedback banner if an action happened */}
          {sentMessage && (
            <View style={styles.successBanner}>
              <Ionicons name="sparkles" size={14} color={AppColors.primary} style={{ marginRight: 6 }} />
              <Text style={styles.successText}>{sentMessage}</Text>
            </View>
          )}

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
          >
            {/* ======================================================== */}
            {/* SECTION 1: 7-HOUR SWEET SNAP FOR PARTNER                 */}
            {/* ======================================================== */}
            <View style={styles.glassSection}>
              <View style={styles.sectionHeaderRow}>
                <View style={styles.sectionTitleGroup}>
                  <Feather name="camera" size={17} color={AppColors.primary} />
                  <Text style={styles.sectionTitle}>
                    {stagedSnapUri
                      ? isReplySnap
                        ? `Reply Snap for ${partnerName}`
                        : 'Save Sweet Snap'
                      : snap
                      ? `${snap.author || partnerName} sent this snap`
                      : 'Sweet Snap for Partner'}
                  </Text>
                </View>
                <View style={styles.timerChip}>
                  <Ionicons name="time-outline" size={12} color="#FF6575" />
                  <Text style={styles.timerChipText}>
                    {snapRemainingTime ? snapRemainingTime : '7h Auto-Reset'}
                  </Text>
                </View>
              </View>
              <Text style={styles.sectionDescription}>
                {stagedSnapUri
                  ? `Review, add a sweet note, and save to sync with ${partnerName}'s account!`
                  : snap
                  ? `Sweet snap from ${snap.author || partnerName}. Tap reply to send your photo back!`
                  : `A sweet photo to make ${partnerName} smile. Disappears after 7 hours!`}
              </Text>

              {isProcessingSnap ? (
                /* OPTIMIZATION IN PROGRESS */
                <View style={styles.processingSnapCard}>
                  <ActivityIndicator size="large" color={AppColors.primary} />
                  <Text style={styles.processingSnapText}>
                    Optimizing photo for {partnerName}... 📸✨
                  </Text>
                  <Text style={styles.processingSnapSubtitle}>
                    Compressing high-res image for instant cloud sync
                  </Text>
                </View>
              ) : stagedSnapUri ? (
                /* STAGING SAVE AREA */
                <View style={styles.saveAreaCard}>
                  <View style={styles.stagedImageFrame}>
                    <Image source={{ uri: stagedSnapUri }} style={styles.stagedImage} />
                    <View style={styles.stagedBadge}>
                      <Ionicons
                        name={isReplySnap ? 'arrow-undo' : 'sparkles'}
                        size={12}
                        color="#FF6575"
                      />
                      <Text style={styles.stagedBadgeText}>
                        {isReplySnap ? `Reply to ${snap?.author || partnerName}` : 'Ready to Save & Sync'}
                      </Text>
                    </View>
                    <View style={styles.compressionPill}>
                      <Ionicons name="flash" size={10} color="#059669" />
                      <Text style={styles.compressionPillText}>
                        Auto-compressed: {stagedSnapKb} KB ⚡
                      </Text>
                    </View>
                    <View style={styles.stagedChangeBtnsRow}>
                      <TouchableOpacity
                        style={styles.stagedChangeBtn}
                        onPress={() => handlePickSweetSnap(isReplySnap)}
                        activeOpacity={0.8}
                      >
                        <Ionicons name="images-outline" size={11} color="#FFFFFF" />
                        <Text style={styles.stagedChangeBtnText}>Gallery</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.stagedChangeBtn}
                        onPress={() => handleTakePhotoSweetSnap(isReplySnap)}
                        activeOpacity={0.8}
                      >
                        <Feather name="camera" size={11} color="#FFFFFF" />
                        <Text style={styles.stagedChangeBtnText}>Camera</Text>
                      </TouchableOpacity>
                    </View>
                  </View>

                  {/* Caption Input */}
                  <View style={styles.captionArea}>
                    <Text style={styles.captionInputLabel}>Sweet Note or Caption 💕</Text>
                    <TextInput
                      style={styles.captionTextInput}
                      placeholder={`Write something lovely for ${partnerName}...`}
                      placeholderTextColor="#BAA3A9"
                      value={stagedCaption}
                      onChangeText={setStagedCaption}
                      maxLength={120}
                    />

                    {/* Quick suggestion pills */}
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      contentContainerStyle={styles.suggestionPillsRow}
                    >
                      {[
                        'Thinking of you 🥰',
                        'Look at this! 📸',
                        'My whole heart ❤️',
                        'Wish you were here 🌸',
                        'Just for you ✨',
                      ].map((pill, idx) => (
                        <TouchableOpacity
                          key={idx}
                          style={styles.suggestionPill}
                          onPress={() => setStagedCaption(pill)}
                          activeOpacity={0.7}
                        >
                          <Text style={styles.suggestionPillText}>{pill}</Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>

                  {/* Save to Memories Toggle */}
                  <TouchableOpacity
                    style={styles.memoryToggleRow}
                    onPress={() => setIsSavingToMemories(!isSavingToMemories)}
                    activeOpacity={0.8}
                  >
                    <View
                      style={[
                        styles.checkboxBox,
                        isSavingToMemories && styles.checkboxBoxActive,
                      ]}
                    >
                      {isSavingToMemories && (
                        <Ionicons name="checkmark" size={13} color="#FFFFFF" />
                      )}
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.memoryToggleTitle}>
                        Also save to Our Memories Keepsakes 📸
                      </Text>
                      <Text style={styles.memoryToggleSubtitle}>
                        Keeps this photo forever in your shared scrapbook even after 7h reset!
                      </Text>
                    </View>
                  </TouchableOpacity>

                  {/* Save Area Action Buttons */}
                  <View style={styles.saveAreaActionsRow}>
                    <TouchableOpacity
                      style={styles.cancelStagedBtn}
                      onPress={handleCancelStagedSnap}
                      activeOpacity={0.75}
                      disabled={isUploadingSnap}
                    >
                      <Text style={styles.cancelStagedBtnText}>Cancel</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[
                        styles.confirmSaveSnapBtn,
                        isUploadingSnap && styles.confirmSaveSnapBtnDisabled,
                      ]}
                      onPress={handleConfirmSaveSnap}
                      activeOpacity={0.85}
                      disabled={isUploadingSnap}
                    >
                      {isUploadingSnap ? (
                        <View style={styles.uploadingRow}>
                          <ActivityIndicator
                            size="small"
                            color="#FFFFFF"
                            style={{ marginRight: 6 }}
                          />
                          <Text style={styles.confirmSaveSnapBtnText}>
                            Syncing with {partnerName}... ☁️
                          </Text>
                        </View>
                      ) : (
                        <View style={styles.uploadingRow}>
                          <Ionicons
                            name="cloud-upload"
                            size={15}
                            color="#FFFFFF"
                            style={{ marginRight: 6 }}
                          />
                          <Text style={styles.confirmSaveSnapBtnText}>
                            {isReplySnap ? 'Save & Send Reply Snap' : 'Save & Sync Snap'}
                          </Text>
                        </View>
                      )}
                    </TouchableOpacity>
                  </View>
                </View>
              ) : snap ? (
                /* ACTIVE SNAP VIEW */
                <View style={styles.snapPreviewFrame}>
                  <Image source={{ uri: snap.imageUri }} style={styles.snapImage} />
                  <View style={styles.snapOverlayTag}>
                    <Ionicons name="heart" size={12} color="#FF6575" />
                    <Text style={styles.snapTagText}>
                      {snap.author || partnerName} sent this sweet snap 📸
                    </Text>
                  </View>

                  {snap.caption ? (
                    <View style={styles.snapCaptionOverlay}>
                      <Text style={styles.snapCaptionText} numberOfLines={2}>
                        {snap.caption}
                      </Text>
                    </View>
                  ) : null}

                  <View style={styles.snapActionsRow}>
                    <TouchableOpacity
                      style={[
                        styles.saveToMemoriesBtn,
                        isSnapSavedToMemories && styles.saveToMemoriesBtnActive,
                      ]}
                      onPress={handleSaveActiveSnapToMemories}
                      activeOpacity={0.8}
                    >
                      <Ionicons
                        name={isSnapSavedToMemories ? 'bookmark' : 'bookmark-outline'}
                        size={13}
                        color="#FFFFFF"
                      />
                      <Text style={styles.saveToMemoriesBtnText}>
                        {isSnapSavedToMemories ? 'Saved 💕' : 'Save to Memories'}
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.changeSnapBtn}
                      onPress={() => handlePickSweetSnap(true)}
                      activeOpacity={0.8}
                    >
                      <Feather name="corner-up-left" size={13} color="#FFFFFF" />
                      <Text style={styles.changeSnapBtnText}>Reply Snap</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.deleteSnapBtn}
                      onPress={handleRemoveSweetSnap}
                      activeOpacity={0.8}
                    >
                      <Ionicons name="trash-outline" size={14} color="#FF6575" />
                    </TouchableOpacity>
                  </View>
                </View>
              ) : (
                /* NO ACTIVE SNAP EMPTY STATE */
                <View style={styles.emptySnapBox}>
                  <View style={styles.snapCameraCircle}>
                    <Ionicons name="camera" size={26} color={AppColors.primary} />
                  </View>
                  <Text style={styles.emptySnapTitle}>No Active Sweet Snap</Text>
                  <Text style={styles.emptySnapSubtitle}>
                    Upload a cute surprise photo or selfie to brighten {partnerName}'s day!
                  </Text>
                  <View style={styles.snapButtonsRow}>
                    <TouchableOpacity
                      style={styles.uploadSnapBtn}
                      onPress={() => handlePickSweetSnap(false)}
                      activeOpacity={0.85}
                    >
                      <Ionicons name="images-outline" size={15} color="#FFFFFF" style={{ marginRight: 5 }} />
                      <Text style={styles.uploadSnapBtnText}>Upload Photo</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.cameraSnapBtn}
                      onPress={() => handleTakePhotoSweetSnap(false)}
                      activeOpacity={0.85}
                    >
                      <Feather name="camera" size={14} color={AppColors.primary} style={{ marginRight: 5 }} />
                      <Text style={styles.cameraSnapBtnText}>Take Selfie</Text>
                    </TouchableOpacity>
                  </View>
                  <View style={styles.autoCompressBadgeRow}>
                    <Ionicons name="flash" size={11} color="#059669" style={{ marginRight: 4 }} />
                    <Text style={styles.autoCompressBadgeText}>
                      Smart compression enabled: 4MB-10MB photos auto-optimize for fast sync
                    </Text>
                  </View>
                </View>
              )}
            </View>

            {/* ======================================================== */}
            {/* SECTION 2: RELATIONSHIP TIME & NEXT ANNIVERSARY COUNTDOWN */}
            {/* ======================================================== */}
            <View style={styles.glassSection}>
              <View style={styles.sectionHeaderRow}>
                <View style={styles.sectionTitleGroup}>
                  <Ionicons name="calendar-outline" size={17} color={AppColors.primary} />
                  <Text style={styles.sectionTitle}>Anniversary & Days in Love</Text>
                </View>
                <TouchableOpacity
                  style={styles.editDateBtn}
                  onPress={() => setIsEditingAnniversary(!isEditingAnniversary)}
                  activeOpacity={0.7}
                >
                  <Feather name="edit-2" size={12} color={AppColors.primary} />
                  <Text style={styles.editDateBtnText}>
                    {isEditingAnniversary ? 'Cancel' : 'Set Date'}
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Dual Counter Glass Cards */}
              <View style={styles.dualStatsRow}>
                {/* Stat 1: Time in Relationship */}
                <View style={styles.statTile}>
                  <View style={[styles.statIconBadge, { backgroundColor: '#FFE8EC' }]}>
                    <Ionicons name="heart" size={16} color="#FF6575" />
                  </View>
                  <Text style={styles.statNumber}>{annivStats.daysTogether}</Text>
                  <Text style={styles.statUnit}>Days in Love</Text>
                  <Text style={styles.statSub}>Together Forever 💕</Text>
                </View>

                {/* Stat 2: Next Anniversary Countdown */}
                <View style={styles.statTile}>
                  <View style={[styles.statIconBadge, { backgroundColor: '#F0E8FF' }]}>
                    <Ionicons name="sparkles" size={16} color="#8F78D2" />
                  </View>
                  <Text style={[styles.statNumber, { color: '#7A62B8' }]}>
                    {annivStats.nextAnnivDays}
                  </Text>
                  <Text style={styles.statUnit}>Days to Anniversary</Text>
                  <Text style={styles.statSub}>
                    {annivStats.nextAnnivDays === 0 ? 'Today is Anniversary! 🎉' : 'Upcoming Milestone 💍'}
                  </Text>
                </View>
              </View>

              {/* Inline Date Assignment Option */}
              {isEditingAnniversary && (
                <View style={styles.dateEditorBox}>
                  <Text style={styles.dateEditorLabel}>Assign Your Anniversary Date</Text>
                  <View style={styles.dateInputRow}>
                    <TextInput
                      style={styles.dateTextInput}
                      placeholder="YYYY-MM-DD (e.g. 2024-05-18)"
                      placeholderTextColor="#C4B4BA"
                      value={anniversaryInput}
                      onChangeText={setAnniversaryInput}
                    />
                    <TouchableOpacity
                      style={styles.saveDateBtn}
                      onPress={handleSaveAnniversary}
                      activeOpacity={0.8}
                    >
                      <Text style={styles.saveDateBtnText}>Save</Text>
                    </TouchableOpacity>
                  </View>
                  <Text style={styles.dateHelperText}>
                    Current: {annivStats.label}
                  </Text>
                </View>
              )}
            </View>

            {/* ======================================================== */}
            {/* SECTION 3: LIVE SHARED DOODLE CANVAS                     */}
            {/* ======================================================== */}
            {(() => {
              const isMyDoodle = Boolean(
                sharedDoodle?.author &&
                userName &&
                sharedDoodle.author.trim().toLowerCase() === userName.trim().toLowerCase()
              );
              return (
                <View style={styles.glassSection}>
                  <View style={styles.sectionHeaderRow}>
                    <View style={styles.sectionTitleGroup}>
                      <Ionicons name="brush" size={17} color={AppColors.primary} />
                      <Text style={styles.sectionTitle}>
                        {sharedDoodle?.strokes && sharedDoodle.strokes.length > 0
                          ? isMyDoodle
                            ? `Your Doodle for ${partnerName} 🎨`
                            : `${sharedDoodle.author || partnerName} has drawn this 🎨`
                          : 'Shared Sweet Doodle'}
                      </Text>
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <View style={styles.doodleAuthorChip}>
                        <Text style={styles.doodleAuthorText}>
                          {sharedDoodle?.author
                            ? isMyDoodle
                              ? 'Drawn by You'
                              : `By ${sharedDoodle.author}`
                            : 'Live Canvas'}
                        </Text>
                      </View>
                      {onOpenDoodle && (
                        <TouchableOpacity
                          style={styles.expandDoodleBtn}
                          onPress={onOpenDoodle}
                          activeOpacity={0.8}
                        >
                          <Ionicons name="expand" size={13} color={AppColors.primary} />
                          <Text style={styles.expandDoodleText}>Full</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>
                  <Text style={styles.sectionDescription}>
                    {sharedDoodle?.author
                      ? isMyDoodle
                        ? `Your sweet drawing is synced live with ${partnerName}! Tap Reply to add to it or draw anytime.`
                        : `${sharedDoodle.author} drew this widget canvas for you. Tap Reply to draw your response!`
                      : `Draw together right here — your shared couple canvas in one place!`}
                  </Text>

              {/* Embedded Interactive Doodle Canvas */}
              <View style={styles.canvasWrapper}>
                <DoodleCanvas
                  initialStrokes={sharedDoodle?.strokes || []}
                  onSave={handleSaveDoodle}
                  height={280}
                  isCompact={true}
                  author={userName || 'You'}
                  onClear={handleClearDoodle}
                />
              </View>

              {/* Reply & Clear actions toolbar */}
              <View style={styles.doodleActionToolbar}>
                <TouchableOpacity
                  style={styles.doodleReplyBtn}
                  onPress={handleReplyDoodle}
                  activeOpacity={0.8}
                >
                  <Feather name="corner-up-left" size={13} color="#FFFFFF" />
                  <Text style={styles.doodleReplyBtnText}>Reply with Doodle</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.doodleClearBtn}
                  onPress={handleClearDoodle}
                  activeOpacity={0.8}
                >
                  <Ionicons name="trash-outline" size={14} color="#FF6575" />
                  <Text style={styles.doodleClearBtnText}>Clear Doodle</Text>
                </TouchableOpacity>
              </View>

              {onOpenDoodle && (
                <TouchableOpacity
                  style={styles.openFullscreenDoodleBar}
                  onPress={onOpenDoodle}
                  activeOpacity={0.85}
                >
                  <Ionicons name="color-palette-outline" size={15} color="#FFFFFF" />
                  <Text style={styles.openFullscreenDoodleText}>Open Fullscreen Drawing Board 🎨</Text>
                </TouchableOpacity>
              )}
            </View>
              );
            })()}

            {/* ======================================================== */}
            {/* SECTION 4: SWEET VOICE NOTE AREA                         */}
            {/* ======================================================== */}
            <View style={styles.glassSection}>
              <View style={styles.sectionHeaderRow}>
                <View style={styles.sectionTitleGroup}>
                  <MaterialCommunityIcons name="microphone" size={18} color={AppColors.primary} />
                  <Text style={styles.sectionTitle}>
                    {voiceNote
                      ? `${voiceNote.senderName || partnerName} recorded this 🎙️`
                      : 'Sweet Voice Note Area'}
                  </Text>
                </View>
                {voiceNote && (
                  <View style={styles.voiceDurationChip}>
                    <Text style={styles.voiceDurationChipText}>
                      0:{voiceNote.duration < 10 ? `0${voiceNote.duration}` : voiceNote.duration}
                    </Text>
                  </View>
                )}
              </View>

              {voiceNote ? (
                /* Saved Voice Note Player */
                <View style={styles.voicePlayerCard}>
                  <TouchableOpacity
                    style={styles.voicePlayBtn}
                    onPress={handleTogglePlayVoice}
                    activeOpacity={0.8}
                  >
                    <Ionicons
                      name={isPlayingVoice ? 'pause' : 'play'}
                      size={20}
                      color="#FFFFFF"
                      style={!isPlayingVoice && { marginLeft: 2 }}
                    />
                  </TouchableOpacity>

                  <View style={styles.voicePlayerInfoCol}>
                    <Text style={styles.voiceSenderTitle}>
                      {voiceNote.senderName || partnerName} recorded this whisper 💌
                    </Text>
                    {/* Simulated dynamic audio waveform bars */}
                    <View style={styles.waveformRow}>
                      {[12, 22, 16, 26, 14, 20, 24, 18, 12, 22, 16, 28, 14, 18].map((h, i) => (
                        <View
                          key={i}
                          style={[
                            styles.waveBar,
                            {
                              height: isPlayingVoice ? ((h * (i % 2 === 0 ? 1.2 : 0.8)) % 26) + 6 : h,
                              backgroundColor: isPlayingVoice ? AppColors.primary : '#E2AAB5',
                            },
                          ]}
                        />
                      ))}
                    </View>
                  </View>

                  <View style={styles.voiceActionsRow}>
                    <TouchableOpacity
                      style={styles.replyVoiceBtn}
                      onPress={handleReplyVoiceNote}
                      activeOpacity={0.8}
                    >
                      <Feather name="corner-up-left" size={12} color="#FFFFFF" />
                      <Text style={styles.replyVoiceBtnText}>Reply</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.deleteVoiceBtn}
                      onPress={handleDeleteVoiceNote}
                      activeOpacity={0.7}
                    >
                      <Ionicons name="trash-outline" size={16} color="#FF4D67" />
                    </TouchableOpacity>
                  </View>
                </View>
              ) : null}

              {/* Voice Note Recording Controls */}
              {isRecordingVoice ? (
                <View style={styles.recordingActiveBox}>
                  <View style={styles.recordingPulseDot} />
                  <Text style={styles.recordingTimeText}>
                    Recording Whisper: 0:{recordingSeconds < 10 ? `0${recordingSeconds}` : recordingSeconds}
                  </Text>
                  <TouchableOpacity
                    style={styles.stopRecordBtn}
                    onPress={handleStopRecordVoice}
                    activeOpacity={0.85}
                  >
                    <Ionicons name="checkmark" size={16} color="#FFFFFF" style={{ marginRight: 4 }} />
                    <Text style={styles.stopRecordBtnText}>Save Whisper</Text>
                  </TouchableOpacity>
                </View>
              ) : !voiceNote ? (
                <TouchableOpacity
                  style={styles.emptyVoiceBox}
                  onPress={handleStartRecordVoice}
                  activeOpacity={0.8}
                >
                  <View style={styles.voiceMicCircle}>
                    <MaterialCommunityIcons name="microphone" size={24} color={AppColors.primary} />
                  </View>
                  <Text style={styles.emptyVoiceTitle}>No Voice Whisper Left</Text>
                  <Text style={styles.emptyVoiceSubtitle}>
                    Leave a sweet voice note or love whisper for your partner to play anytime!
                  </Text>
                  <View style={styles.recordVoiceActionBtn}>
                    <MaterialCommunityIcons name="microphone" size={15} color="#FFFFFF" style={{ marginRight: 4 }} />
                    <Text style={styles.recordVoiceActionBtnText}>Record Sweet Whisper</Text>
                  </View>
                </TouchableOpacity>
              ) : null}
            </View>

            <View style={{ height: 40 }} />
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(45, 36, 43, 0.45)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    width: '100%',
    maxHeight: '92%',
    backgroundColor: 'rgba(255, 255, 255, 0.88)',
    borderTopLeftRadius: 34,
    borderTopRightRadius: 34,
    paddingTop: 18,
    paddingHorizontal: 16,
    shadowColor: '#E297A5',
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.18,
    shadowRadius: 24,
    elevation: 10,
    borderTopWidth: 1.8,
    borderLeftWidth: 1.8,
    borderRightWidth: 1.8,
    borderColor: 'rgba(255, 255, 255, 0.95)',
  },
  topHeaderBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 220, 230, 0.6)',
  },
  headerLeftTitleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
    flexShrink: 1,
    marginRight: 8,
  },
  heartIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255, 232, 236, 0.9)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.95)',
    shadowColor: '#FF6575',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 3,
  },
  title: {
    fontFamily: AppFonts.title,
    fontSize: 22,
    color: AppColors.textPrimary,
  },
  subtitle: {
    fontSize: 11.5,
    color: AppColors.textSecondary,
    marginTop: 1,
  },
  closeBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(245, 236, 239, 0.85)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.2,
    borderColor: 'rgba(255, 255, 255, 0.95)',
  },
  successBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 232, 236, 0.92)',
    borderRadius: 14,
    paddingVertical: 9,
    paddingHorizontal: 14,
    marginTop: 10,
    borderWidth: 1.2,
    borderColor: 'rgba(255, 255, 255, 0.95)',
  },
  successText: {
    color: AppColors.primary,
    fontWeight: '700',
    fontSize: 12.5,
  },
  scrollContent: {
    paddingTop: 14,
    paddingBottom: 30,
    gap: 14,
  },
  glassSection: {
    backgroundColor: 'rgba(255, 255, 255, 0.65)',
    borderRadius: 24,
    padding: 16,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.92)',
    shadowColor: '#E297A5',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 2,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  sectionTitleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  sectionTitle: {
    fontFamily: AppFonts.title,
    fontSize: 18,
    color: AppColors.textPrimary,
  },
  sectionDescription: {
    fontSize: 12,
    color: AppColors.textSecondary,
    marginBottom: 12,
    lineHeight: 16,
  },
  timerChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 232, 236, 0.85)',
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 10,
    gap: 4,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.9)',
  },
  timerChipText: {
    fontSize: 11,
    fontWeight: '700',
    color: AppColors.primary,
  },
  snapPreviewFrame: {
    width: '100%',
    height: 200,
    borderRadius: 18,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: '#FFE8EC',
  },
  snapImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  snapOverlayTag: {
    position: 'absolute',
    top: 10,
    left: 10,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.88)',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 12,
    gap: 4,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.95)',
  },
  snapTagText: {
    fontSize: 11,
    fontWeight: '700',
    color: AppColors.primary,
  },
  snapActionsRow: {
    position: 'absolute',
    bottom: 10,
    right: 10,
    flexDirection: 'row',
    gap: 6,
  },
  saveToMemoriesBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(235, 78, 120, 0.92)',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 14,
    gap: 4,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.4)',
  },
  saveToMemoriesBtnActive: {
    backgroundColor: '#388E3C',
  },
  saveToMemoriesBtnText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  snapCaptionOverlay: {
    position: 'absolute',
    bottom: 44,
    left: 10,
    right: 10,
    backgroundColor: 'rgba(30, 20, 25, 0.72)',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 10,
    borderWidth: 0.5,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  snapCaptionText: {
    color: '#FFFFFF',
    fontSize: 11.5,
    fontWeight: '600',
  },
  saveAreaCard: {
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.88)',
    borderWidth: 1.5,
    borderColor: '#FFE0E6',
    padding: 12,
    gap: 10,
  },
  stagedImageFrame: {
    width: '100%',
    height: 200,
    borderRadius: 14,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: '#FFE8EC',
  },
  stagedImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  stagedBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.94)',
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 10,
    gap: 4,
    borderWidth: 1,
    borderColor: 'rgba(255, 220, 230, 0.8)',
  },
  stagedBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: AppColors.primary,
  },
  stagedChangeBtn: {
    position: 'absolute',
    top: 8,
    right: 8,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(30, 20, 25, 0.65)',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 10,
    gap: 4,
  },
  stagedChangeBtnText: {
    fontSize: 10.5,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  captionArea: {
    gap: 6,
  },
  captionInputLabel: {
    fontSize: 11.5,
    fontWeight: '700',
    color: AppColors.textPrimary,
  },
  captionTextInput: {
    backgroundColor: 'rgba(255, 245, 247, 0.95)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FFD9E1',
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 13,
    color: AppColors.textPrimary,
  },
  suggestionPillsRow: {
    flexDirection: 'row',
    gap: 6,
    paddingVertical: 2,
  },
  suggestionPill: {
    backgroundColor: 'rgba(255, 235, 240, 0.85)',
    paddingVertical: 4,
    paddingHorizontal: 9,
    borderRadius: 12,
    borderWidth: 0.5,
    borderColor: '#FFC8D4',
  },
  suggestionPillText: {
    fontSize: 11,
    color: AppColors.primary,
    fontWeight: '600',
  },
  memoryToggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 247, 249, 0.85)',
    padding: 10,
    borderRadius: 12,
    gap: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 225, 0.7)',
  },
  checkboxBox: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: '#FFB8C6',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  checkboxBoxActive: {
    backgroundColor: AppColors.primary,
    borderColor: AppColors.primary,
  },
  memoryToggleTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: AppColors.textPrimary,
  },
  memoryToggleSubtitle: {
    fontSize: 10,
    color: AppColors.textSecondary,
    marginTop: 1,
  },
  saveAreaActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  cancelStagedBtn: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 235, 238, 0.85)',
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 225, 0.8)',
  },
  cancelStagedBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: AppColors.textSecondary,
  },
  confirmSaveSnapBtn: {
    flex: 1,
    backgroundColor: AppColors.primary,
    paddingVertical: 11,
    paddingHorizontal: 16,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: AppColors.primary,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 5,
    elevation: 3,
  },
  confirmSaveSnapBtnDisabled: {
    opacity: 0.7,
  },
  confirmSaveSnapBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
  },
  uploadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  changeSnapBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: AppColors.primary,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 14,
    gap: 4,
  },
  changeSnapBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  deleteSnapBtn: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.95)',
  },
  emptySnapBox: {
    borderRadius: 18,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: '#F0CCD5',
    backgroundColor: 'rgba(255, 247, 248, 0.65)',
    paddingVertical: 20,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  snapCameraCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: 'rgba(255, 232, 236, 0.85)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  emptySnapTitle: {
    fontFamily: AppFonts.title,
    fontSize: 17,
    color: AppColors.textPrimary,
    marginBottom: 2,
  },
  emptySnapSubtitle: {
    fontSize: 12,
    color: AppColors.textSecondary,
    textAlign: 'center',
    lineHeight: 16,
    marginBottom: 12,
    paddingHorizontal: 8,
  },
  uploadSnapBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: AppColors.primary,
    paddingVertical: 9,
    paddingHorizontal: 18,
    borderRadius: 20,
  },
  uploadSnapBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
  },
  snapButtonsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  cameraSnapBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 235, 240, 0.95)',
    paddingVertical: 9,
    paddingHorizontal: 14,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 182, 193, 0.6)',
  },
  cameraSnapBtnText: {
    color: AppColors.primary,
    fontWeight: '700',
    fontSize: 13,
  },
  processingSnapCard: {
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.92)',
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1.5,
    borderColor: '#FFE0E6',
  },
  processingSnapText: {
    fontSize: 13,
    fontWeight: '700',
    color: AppColors.textPrimary,
    textAlign: 'center',
  },
  processingSnapSubtitle: {
    fontSize: 11,
    color: AppColors.textSecondary,
    textAlign: 'center',
  },
  stagedChangeBtnsRow: {
    position: 'absolute',
    top: 8,
    right: 8,
    flexDirection: 'row',
    gap: 6,
  },
  editDateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 240, 243, 0.8)',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 12,
    gap: 4,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.9)',
  },
  editDateBtnText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: AppColors.primary,
  },
  dualStatsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  statTile: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.72)',
    borderRadius: 18,
    padding: 14,
    alignItems: 'center',
    borderWidth: 1.2,
    borderColor: 'rgba(255, 255, 255, 0.92)',
  },
  statIconBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  statNumber: {
    fontFamily: AppFonts.title,
    fontSize: 26,
    color: AppColors.primary,
  },
  statUnit: {
    fontSize: 12,
    fontWeight: '700',
    color: AppColors.textPrimary,
    marginTop: 2,
  },
  statSub: {
    fontSize: 10.5,
    color: AppColors.textSecondary,
    marginTop: 2,
    textAlign: 'center',
  },
  dateEditorBox: {
    marginTop: 12,
    backgroundColor: 'rgba(255, 247, 248, 0.8)',
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.9)',
  },
  dateEditorLabel: {
    fontSize: 11.5,
    fontWeight: '700',
    color: AppColors.textSecondary,
    marginBottom: 6,
  },
  dateInputRow: {
    flexDirection: 'row',
    gap: 8,
  },
  dateTextInput: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 12,
    fontSize: 13,
    color: AppColors.textPrimary,
    fontWeight: '600',
    borderWidth: 1,
    borderColor: '#E8CCD4',
  },
  saveDateBtn: {
    backgroundColor: AppColors.primary,
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveDateBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 12.5,
  },
  dateHelperText: {
    fontSize: 11,
    color: AppColors.textSecondary,
    marginTop: 6,
  },
  doodleAuthorChip: {
    backgroundColor: 'rgba(240, 232, 255, 0.8)',
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.9)',
  },
  doodleAuthorText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#8F78D2',
  },
  canvasWrapper: {
    borderRadius: 18,
    overflow: 'hidden',
  },
  doodleActionToolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 10,
    gap: 10,
  },
  doodleReplyBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: AppColors.primary,
    paddingVertical: 9,
    paddingHorizontal: 14,
    borderRadius: 14,
    gap: 6,
    shadowColor: AppColors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3,
  },
  doodleReplyBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 12.5,
  },
  doodleClearBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 235, 238, 0.9)',
    paddingVertical: 9,
    paddingHorizontal: 14,
    borderRadius: 14,
    gap: 6,
    borderWidth: 1,
    borderColor: 'rgba(255, 205, 210, 0.9)',
  },
  doodleClearBtnText: {
    color: '#FF6575',
    fontWeight: '700',
    fontSize: 12.5,
  },
  replyVoiceBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: AppColors.primary,
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 14,
    gap: 4,
  },
  replyVoiceBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 12,
  },
  voiceDurationChip: {
    backgroundColor: 'rgba(255, 232, 236, 0.85)',
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 10,
  },
  voiceDurationChipText: {
    fontSize: 11,
    fontWeight: '700',
    color: AppColors.primary,
  },
  voicePlayerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.72)',
    borderRadius: 18,
    padding: 12,
    borderWidth: 1.2,
    borderColor: 'rgba(255, 255, 255, 0.92)',
    gap: 12,
  },
  voicePlayBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: AppColors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  voicePlayerInfoCol: {
    flex: 1,
  },
  voiceSenderTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: AppColors.textPrimary,
    marginBottom: 4,
  },
  waveformRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  waveBar: {
    width: 3.5,
    borderRadius: 2,
  },
  voiceActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  recordNewVoiceBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(255, 232, 236, 0.85)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.9)',
  },
  deleteVoiceBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(255, 235, 238, 0.85)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 205, 210, 0.9)',
  },
  recordingActiveBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255, 232, 236, 0.9)',
    borderRadius: 16,
    padding: 12,
    borderWidth: 1.2,
    borderColor: 'rgba(255, 255, 255, 0.95)',
  },
  recordingPulseDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#FF3B47',
    marginRight: 6,
  },
  recordingTimeText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '700',
    color: AppColors.primary,
  },
  stopRecordBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: AppColors.primary,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 12,
  },
  stopRecordBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 12,
  },
  emptyVoiceBox: {
    borderRadius: 18,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: '#F0CCD5',
    backgroundColor: 'rgba(255, 247, 248, 0.65)',
    paddingVertical: 18,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  voiceMicCircle: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(255, 232, 236, 0.85)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  emptyVoiceTitle: {
    fontFamily: AppFonts.title,
    fontSize: 17,
    color: AppColors.textPrimary,
    marginBottom: 2,
  },
  emptyVoiceSubtitle: {
    fontSize: 12,
    color: AppColors.textSecondary,
    textAlign: 'center',
    lineHeight: 16,
    marginBottom: 12,
    paddingHorizontal: 10,
  },
  recordVoiceActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: AppColors.primary,
    paddingVertical: 9,
    paddingHorizontal: 18,
    borderRadius: 20,
  },
  recordVoiceActionBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
  },
  expandDoodleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FFE8EC',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  expandDoodleText: {
    fontSize: 11,
    fontWeight: '700',
    color: AppColors.primary,
  },
  openFullscreenDoodleBar: {
    marginTop: 10,
    backgroundColor: AppColors.primary,
    borderRadius: 18,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    shadowColor: AppColors.primary,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
  },
  openFullscreenDoodleText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
  compressionPill: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(236, 253, 245, 0.94)',
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 10,
    gap: 4,
    borderWidth: 1,
    borderColor: 'rgba(167, 243, 208, 0.9)',
  },
  compressionPillText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#065F46',
  },
  autoCompressBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(236, 253, 245, 0.85)',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 10,
    marginTop: 8,
    borderWidth: 1,
    borderColor: 'rgba(167, 243, 208, 0.7)',
  },
  autoCompressBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#047857',
  },
});

export default LoveNudgeModal;
