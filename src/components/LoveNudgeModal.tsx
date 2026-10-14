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
} from '../services/StorageService';
import RealtimeService from '../services/RealtimeService';
import FirestoreService from '../services/FirestoreService';

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
  // Ephemeral Snap (7h Reset)
  const [snap, setSnap] = useState<EphemeralSnap | null>(null);
  const [snapRemainingTime, setSnapRemainingTime] = useState<string | null>(null);

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

    if (profile?.anniversaryDate) {
      setAnniversaryInput(profile.anniversaryDate);
    }

    // Also fetch fresh live cloud sync state from Firestore if available
    if (profile?.inviteCode) {
      try {
        const liveDoc = await FirestoreService.getLiveSyncDoc(profile.inviteCode);
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
        audioPlayerRef.current = null;
      }
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        try {
          mediaRecorderRef.current.stop();
          if (mediaRecorderRef.current.stream) {
            mediaRecorderRef.current.stream.getTracks().forEach((t: any) => t.stop());
          }
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

  // Helper to ensure photo is compressed and stored as a lightweight data URL
  const compressImageForSync = async (uri: string, base64?: string | null): Promise<string> => {
    if (Platform.OS === 'web' && typeof window !== 'undefined' && typeof document !== 'undefined') {
      return new Promise((resolve) => {
        const img = new (window as any).Image() as HTMLImageElement;
        img.crossOrigin = 'anonymous';
        img.onload = () => {
          const maxDim = 600;
          let w = img.width;
          let h = img.height;
          if (w > maxDim || h > maxDim) {
            if (w > h) {
              h = Math.round((h * maxDim) / w);
              w = maxDim;
            } else {
              w = Math.round((w * maxDim) / h);
              h = maxDim;
            }
          }
          const canvas = document.createElement('canvas');
          canvas.width = w;
          canvas.height = h;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0, w, h);
            resolve(canvas.toDataURL('image/jpeg', 0.65));
          } else {
            resolve(base64 ? `data:image/jpeg;base64,${base64}` : uri);
          }
        };
        img.onerror = () => {
          resolve(base64 ? `data:image/jpeg;base64,${base64}` : uri);
        };
        img.src = base64 ? `data:image/jpeg;base64,${base64}` : uri;
      });
    }
    return base64 ? `data:image/jpeg;base64,${base64}` : uri;
  };

  // 1. Ephemeral Snap Actions (7 hours reset)
  const handlePickSweetSnap = async () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        Alert.alert('Permission Needed', 'Please allow gallery access to pick a photo for your partner.');
        return;
      }

      const res = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.6,
        base64: true,
      });

      if (!res.canceled && res.assets && res.assets.length > 0) {
        const asset = res.assets[0];
        const finalImageUri = await compressImageForSync(asset.uri, asset.base64);

        const isReply = !!snap;
        const newSnap: EphemeralSnap = {
          id: `snap-${Date.now()}`,
          imageUri: finalImageUri,
          timestamp: Date.now(),
          author: userName || 'You',
          caption: isReply ? `Reply to ${snap?.author || partnerName} 💕` : 'Uploaded with love 💕',
        };
        setSnap(newSnap);
        await StorageService.saveEphemeralSnap(newSnap);
        await RealtimeService.broadcastSnap(newSnap);
        if (profile?.inviteCode) {
          await FirestoreService.syncSnap(profile.inviteCode, newSnap);
        }

        setSentMessage(
          isReply
            ? `Replied to snap for ${partnerName}! 📸`
            : `Sent sweet snap to ${partnerName}! Resets in 7h 📸`
        );
        setTimeout(() => setSentMessage(null), 3000);
      }
    } catch (err) {
      console.warn('Sweet snap upload warning:', err);
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
      if (profile?.inviteCode) {
        await FirestoreService.syncSnap(profile.inviteCode, null);
      }
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

  // 4. Sweet Voice Note Handlers with Real Microphone Recording & Playback
  const handleStartRecordVoice = async () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch {}

    if (Platform.OS === 'web' && typeof navigator !== 'undefined' && navigator.mediaDevices?.getUserMedia) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        audioChunksRef.current = [];

        let options: any = undefined;
        if (typeof MediaRecorder !== 'undefined') {
          if (MediaRecorder.isTypeSupported('audio/webm')) {
            options = { mimeType: 'audio/webm' };
          } else if (MediaRecorder.isTypeSupported('audio/mp4')) {
            options = { mimeType: 'audio/mp4' };
          } else if (MediaRecorder.isTypeSupported('audio/aac')) {
            options = { mimeType: 'audio/aac' };
          }
        }

        const recorder = new MediaRecorder(stream, options);
        recorder.ondataavailable = (event) => {
          if (event.data && event.data.size > 0) {
            audioChunksRef.current.push(event.data);
          }
        };
        recorder.start(100);
        mediaRecorderRef.current = recorder;
      } catch (micErr) {
        console.warn('Microphone permission or access error:', micErr);
        if (Platform.OS === 'web') {
          alert('Please allow microphone permissions in your browser to record a sweet voice whisper! 🎙️');
        } else {
          Alert.alert('Microphone Access', 'Please allow microphone access to record a sweet voice whisper! 🎙️');
        }
      }
    }

    setIsRecordingVoice(true);
    setRecordingSeconds(1);

    if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
    recordingTimerRef.current = setInterval(() => {
      setRecordingSeconds((prev) => prev + 1);
    }, 1000);
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

    let recordedAudioUri: string | undefined = undefined;

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try {
        const recorder = mediaRecorderRef.current;
        await new Promise<void>((resolve) => {
          recorder.onstop = () => resolve();
          recorder.stop();
        });

        if (recorder.stream) {
          recorder.stream.getTracks().forEach((t: any) => t.stop());
        }

        const mime = recorder.mimeType || 'audio/webm';
        const audioBlob = new Blob(audioChunksRef.current, { type: mime });
        if (audioBlob.size > 0) {
          recordedAudioUri = await new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.readAsDataURL(audioBlob);
          });
        }
      } catch (err) {
        console.warn('Error saving recorded voice note:', err);
      }
      mediaRecorderRef.current = null;
    }

    const newNote: SweetVoiceNote = {
      id: `voice-${Date.now()}`,
      duration: Math.max(2, recordingSeconds),
      timestamp: Date.now(),
      senderName: userName || 'You',
      audioUri: recordedAudioUri,
    };

    setVoiceNote(newNote);
    await StorageService.saveSweetVoiceNote(newNote);
    await RealtimeService.broadcastVoice(newNote);
    if (profile?.inviteCode) {
      await FirestoreService.syncVoiceNote(profile.inviteCode, newNote);
    }
    setRecordingSeconds(0);
    setSentMessage(`Sweet voice whisper saved for ${partnerName}! 🎙️`);
    setTimeout(() => setSentMessage(null), 3000);
  };

  const handleTogglePlayVoice = () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}

    if (isPlayingVoice) {
      if (audioPlayerRef.current) {
        audioPlayerRef.current.pause();
        audioPlayerRef.current = null;
      }
      setIsPlayingVoice(false);
    } else {
      if (voiceNote?.audioUri && Platform.OS === 'web' && typeof Audio !== 'undefined') {
        try {
          const audio = new Audio(voiceNote.audioUri);
          audioPlayerRef.current = audio;
          audio.onended = () => {
            setIsPlayingVoice(false);
            audioPlayerRef.current = null;
          };
          audio.onerror = () => {
            setIsPlayingVoice(false);
            audioPlayerRef.current = null;
          };
          audio.play().catch(() => {
            setIsPlayingVoice(false);
            audioPlayerRef.current = null;
          });
          setIsPlayingVoice(true);
          return;
        } catch {
          // Fallback to timer
        }
      }

      setIsPlayingVoice(true);
      const playDuration = (voiceNote?.duration || 5) * 1000;
      setTimeout(() => {
        setIsPlayingVoice(false);
      }, playDuration);
    }
  };

  const handleDeleteVoiceNote = () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch {}

    const doDelete = async () => {
      if (audioPlayerRef.current) {
        audioPlayerRef.current.pause();
        audioPlayerRef.current = null;
      }
      setVoiceNote(null);
      setIsPlayingVoice(false);
      await StorageService.saveSweetVoiceNote(null);
      if (profile?.inviteCode) {
        await FirestoreService.syncVoiceNote(profile.inviteCode, null);
      }
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
              <View>
                <Text style={styles.title}>Our Heart Hub</Text>
                <Text style={styles.subtitle}>Private space for you & {partnerName}</Text>
              </View>
            </View>

            <TouchableOpacity style={styles.closeBtn} onPress={onClose} activeOpacity={0.7}>
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
                    {snap ? `${snap.author || partnerName} sent this snap` : 'Sweet Snap for Partner'}
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
                {snap
                  ? `Sweet snap from ${snap.author || partnerName}. Tap reply to send your photo back!`
                  : `A sweet photo to make ${partnerName} smile. Disappears after 7 hours!`}
              </Text>

              {snap ? (
                <View style={styles.snapPreviewFrame}>
                  <Image source={{ uri: snap.imageUri }} style={styles.snapImage} />
                  <View style={styles.snapOverlayTag}>
                    <Ionicons name="heart" size={12} color="#FF6575" />
                    <Text style={styles.snapTagText}>
                      {snap.author || partnerName} sent this sweet snap 📸
                    </Text>
                  </View>

                  <View style={styles.snapActionsRow}>
                    <TouchableOpacity
                      style={styles.changeSnapBtn}
                      onPress={handlePickSweetSnap}
                      activeOpacity={0.8}
                    >
                      <Feather name="corner-up-left" size={13} color="#FFFFFF" />
                      <Text style={styles.changeSnapBtnText}>Reply with Snap</Text>
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
                <TouchableOpacity
                  style={styles.emptySnapBox}
                  onPress={handlePickSweetSnap}
                  activeOpacity={0.82}
                >
                  <View style={styles.snapCameraCircle}>
                    <Ionicons name="camera" size={26} color={AppColors.primary} />
                  </View>
                  <Text style={styles.emptySnapTitle}>No Active Sweet Snap</Text>
                  <Text style={styles.emptySnapSubtitle}>
                    Upload a cute surprise photo or selfie to brighten {partnerName}'s day!
                  </Text>
                  <View style={styles.uploadSnapBtn}>
                    <Ionicons name="add" size={15} color="#FFFFFF" style={{ marginRight: 4 }} />
                    <Text style={styles.uploadSnapBtnText}>Upload Sweet Snap (7h)</Text>
                  </View>
                </TouchableOpacity>
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
                  height={220}
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
    gap: 8,
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
});

export default LoveNudgeModal;
