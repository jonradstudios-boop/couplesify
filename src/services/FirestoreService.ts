import {
  doc,
  setDoc,
  getDoc,
  collection,
  addDoc,
  onSnapshot,
  serverTimestamp,
} from 'firebase/firestore';
import { db, isInitialized } from './FirebaseConfig';
import {
  CoupleProfile,
  MemoryItem,
  ChatMessage,
  EphemeralSnap,
  SweetVoiceNote,
  SharedDoodle,
  ScrapbookPageData,
} from './StorageService';

/**
 * FirestoreService provides cloud data synchronization for Couplesify.
 * Syncs user profiles, memories, chat messages, ephemeral snaps,
 * sweet voice whispers, doodles, goals, and scrapbook pages.
 */
export const FirestoreService = {
  /**
   * Sync Couple Profile to Firestore
   */
  async syncProfileToCloud(profile: CoupleProfile): Promise<boolean> {
    if (!isInitialized || !db || !profile.inviteCode) {
      return false;
    }
    try {
      const coupleRef = doc(db, 'couples', profile.inviteCode);
      await setDoc(
        coupleRef,
        {
          profile: {
            ...profile,
            updatedAt: Date.now(),
          },
          lastActive: serverTimestamp(),
        },
        { merge: true }
      );
      return true;
    } catch (err) {
      console.warn('Firestore syncProfile error:', err);
      return false;
    }
  },

  /**
   * Fetch Partner's Profile from Cloud using Pairing Code
   */
  async fetchCloudProfile(inviteCode: string): Promise<CoupleProfile | null> {
    if (!isInitialized || !db || !inviteCode) return null;
    try {
      const coupleRef = doc(db, 'couples', inviteCode);
      const snapshot = await getDoc(coupleRef);
      if (snapshot.exists()) {
        const data = snapshot.data();
        return data?.profile || null;
      }
      return null;
    } catch (err) {
      console.warn('Firestore fetchProfile error:', err);
      return null;
    }
  },

  /**
   * Sync Ephemeral Snap to Cloud
   */
  async syncSnap(inviteCode: string, snap: EphemeralSnap | null): Promise<void> {
    if (!isInitialized || !db || !inviteCode) return;
    try {
      const ref = doc(db, 'couples', inviteCode, 'active_sync', 'snap');
      await setDoc(ref, { snap, updatedAt: Date.now() }, { merge: true });
    } catch (err) {
      console.warn('Firestore syncSnap error:', err);
    }
  },

  /**
   * Sync Voice Whisper to Cloud
   */
  async syncVoiceNote(inviteCode: string, note: SweetVoiceNote | null): Promise<void> {
    if (!isInitialized || !db || !inviteCode) return;
    try {
      const ref = doc(db, 'couples', inviteCode, 'active_sync', 'voice');
      await setDoc(ref, { note, updatedAt: Date.now() }, { merge: true });
    } catch (err) {
      console.warn('Firestore syncVoiceNote error:', err);
    }
  },

  /**
   * Sync Shared Doodle to Cloud
   */
  async syncDoodle(inviteCode: string, doodle: SharedDoodle | null): Promise<void> {
    if (!isInitialized || !db || !inviteCode) return;
    try {
      const ref = doc(db, 'couples', inviteCode, 'active_sync', 'doodle');
      await setDoc(ref, { doodle, updatedAt: Date.now() }, { merge: true });
    } catch (err) {
      console.warn('Firestore syncDoodle error:', err);
    }
  },

  /**
   * Sync Chat Message to Cloud
   */
  async sendChatMessage(inviteCode: string, message: ChatMessage): Promise<void> {
    if (!isInitialized || !db || !inviteCode) return;
    try {
      const messagesCol = collection(db, 'couples', inviteCode, 'messages');
      await addDoc(messagesCol, {
        ...message,
        serverTime: serverTimestamp(),
      });
    } catch (err) {
      console.warn('Firestore sendChatMessage error:', err);
    }
  },

  /**
   * Sync Scrapbook Pages to Cloud
   */
  async syncScrapbookPages(inviteCode: string, pages: ScrapbookPageData[]): Promise<void> {
    if (!isInitialized || !db || !inviteCode) return;
    try {
      const ref = doc(db, 'couples', inviteCode, 'scrapbook', 'pages');
      await setDoc(ref, { pages, updatedAt: Date.now() }, { merge: true });
    } catch (err) {
      console.warn('Firestore syncScrapbook error:', err);
    }
  },

  /**
   * Sync Memories to Cloud
   */
  async syncMemories(inviteCode: string, memories: MemoryItem[]): Promise<void> {
    if (!isInitialized || !db || !inviteCode) return;
    try {
      const ref = doc(db, 'couples', inviteCode, 'memories', 'collection');
      await setDoc(ref, { memories, updatedAt: Date.now() }, { merge: true });
    } catch (err) {
      console.warn('Firestore syncMemories error:', err);
    }
  },

  /**
   * Listen to Live Couple Sync Updates
   */
  subscribeToCoupleLiveUpdates(
    inviteCode: string,
    onUpdate: (data: {
      profile?: CoupleProfile;
      snap?: EphemeralSnap | null;
      voiceNote?: SweetVoiceNote | null;
      doodle?: SharedDoodle | null;
    }) => void
  ): () => void {
    if (!isInitialized || !db || !inviteCode) {
      return () => {};
    }

    try {
      const coupleRef = doc(db, 'couples', inviteCode);
      const unsub = onSnapshot(coupleRef, (snapshot) => {
        if (snapshot.exists()) {
          const d = snapshot.data();
          onUpdate({
            profile: d?.profile,
          });
        }
      });
      return unsub;
    } catch {
      return () => {};
    }
  },
};

export default FirestoreService;
