import {
  doc,
  setDoc,
  getDoc,
  updateDoc,
  collection,
  addDoc,
  getDocs,
  query,
  orderBy,
  limit,
  onSnapshot,
  serverTimestamp,
} from 'firebase/firestore';
import { db, isInitialized } from './FirebaseConfig';
import {
  CoupleProfile,
  MemoryItem,
  LetterItem,
  ChatMessage,
  EphemeralSnap,
  SweetVoiceNote,
  SharedDoodle,
  ScrapbookPageData,
} from './StorageService';

export interface FirestorePartnerData {
  uid: string;
  name: string;
  gender: 'male' | 'female';
  email: string;
  avatarUri?: string;
  online?: boolean;
  lastActive?: number;
}

export interface FirestoreCoupleRoom {
  pairCode: string;
  createdAt: number;
  anniversaryDate: string;
  isPaired: boolean;
  partner1: FirestorePartnerData;
  partner2?: FirestorePartnerData | null;
  lastUpdated: number;
}

/**
 * FirestoreService provides complete cloud synchronization for Couplesify:
 * - Real-time accounts & partner pairing verification
 * - Persistent cross-device chat messages
 * - Synchronized memories, letters, scrapbook pages
 * - Ephemeral snaps, sweet voice notes, shared doodles, and moods
 */
export const FirestoreService = {
  /**
   * Save or update user profile document in Firestore: `users/{uid}`
   */
  async saveUserDoc(user: {
    uid: string;
    email: string;
    userName: string;
    gender: 'male' | 'female';
    avatarUri?: string;
    inviteCode: string;
    partnerName?: string;
    partnerAvatar?: string;
    anniversaryDate?: string;
    isPaired?: boolean;
  }): Promise<boolean> {
    if (!isInitialized || !db || !user.uid) return false;
    try {
      const userRef = doc(db, 'users', user.uid);
      await setDoc(
        userRef,
        {
          ...user,
          updatedAt: Date.now(),
        },
        { merge: true }
      );
      return true;
    } catch (err) {
      console.warn('Firestore saveUserDoc error:', err);
      return false;
    }
  },

  /**
   * Get user document from `users/{uid}`
   */
  async getUserDoc(uid: string): Promise<any | null> {
    if (!isInitialized || !db || !uid) return null;
    try {
      const userRef = doc(db, 'users', uid);
      const snap = await getDoc(userRef);
      return snap.exists() ? snap.data() : null;
    } catch (err) {
      console.warn('Firestore getUserDoc error:', err);
      return null;
    }
  },

  /**
   * Create a couple room: `couples/{pairCode}`
   */
  async createCoupleRoom(
    pairCode: string,
    partner1: FirestorePartnerData,
    anniversaryDate = '2024-05-18'
  ): Promise<boolean> {
    if (!isInitialized || !db || !pairCode) return false;
    try {
      const coupleRef = doc(db, 'couples', pairCode.trim().toUpperCase());
      const roomData: FirestoreCoupleRoom = {
        pairCode: pairCode.trim().toUpperCase(),
        createdAt: Date.now(),
        anniversaryDate,
        isPaired: false,
        partner1,
        partner2: null,
        lastUpdated: Date.now(),
      };
      await setDoc(coupleRef, roomData, { merge: true });
      return true;
    } catch (err) {
      console.warn('Firestore createCoupleRoom error:', err);
      return false;
    }
  },

  /**
   * Fetch a couple room by pairing code: `couples/{pairCode}`
   */
  async getCoupleRoom(pairCode: string): Promise<FirestoreCoupleRoom | null> {
    if (!isInitialized || !db || !pairCode) return null;
    try {
      const coupleRef = doc(db, 'couples', pairCode.trim().toUpperCase());
      const snap = await getDoc(coupleRef);
      return snap.exists() ? (snap.data() as FirestoreCoupleRoom) : null;
    } catch (err) {
      console.warn('Firestore getCoupleRoom error:', err);
      return null;
    }
  },

  /**
   * Pair partner with existing pairing code
   */
  async joinCoupleRoom(
    pairCode: string,
    partner2: FirestorePartnerData
  ): Promise<{
    success: boolean;
    partner1?: FirestorePartnerData;
    error?: string;
  }> {
    if (!isInitialized || !db || !pairCode) {
      return { success: false, error: 'Database is not initialized.' };
    }

    const cleanCode = pairCode.trim().toUpperCase();
    try {
      const coupleRef = doc(db, 'couples', cleanCode);
      const snap = await getDoc(coupleRef);

      if (!snap.exists()) {
        return {
          success: false,
          error: `Pairing code "${cleanCode}" was not found. Please check with your partner.`,
        };
      }

      const coupleData = snap.data() as FirestoreCoupleRoom;
      const partner1 = coupleData.partner1;

      // Link partner2 to the room
      await updateDoc(coupleRef, {
        partner2,
        isPaired: true,
        lastUpdated: Date.now(),
      });

      // Update partner1 user document if uid exists
      if (partner1?.uid) {
        try {
          const p1Ref = doc(db, 'users', partner1.uid);
          await updateDoc(p1Ref, {
            isPaired: true,
            partnerName: partner2.name,
            partnerAvatar: partner2.avatarUri || '',
            partnerUid: partner2.uid,
            updatedAt: Date.now(),
          });
        } catch {}
      }

      // Update partner2 user document if uid exists
      if (partner2?.uid) {
        try {
          const p2Ref = doc(db, 'users', partner2.uid);
          await updateDoc(p2Ref, {
            inviteCode: cleanCode,
            isPaired: true,
            partnerName: partner1?.name || 'Partner',
            partnerAvatar: partner1?.avatarUri || '',
            partnerUid: partner1?.uid || '',
            anniversaryDate: coupleData.anniversaryDate || '2024-05-18',
            updatedAt: Date.now(),
          });
        } catch {}
      }

      return { success: true, partner1 };
    } catch (err: any) {
      return {
        success: false,
        error: err?.message || 'Failed to link pairing code.',
      };
    }
  },

  /**
   * Sync Couple Profile to Cloud
   */
  async syncProfileToCloud(profile: CoupleProfile, currentUserId?: string): Promise<boolean> {
    if (!isInitialized || !db || !profile.inviteCode) return false;
    try {
      const code = profile.inviteCode.trim().toUpperCase();
      const coupleRef = doc(db, 'couples', code);

      const snap = await getDoc(coupleRef);
      if (snap.exists()) {
        const room = snap.data() as FirestoreCoupleRoom;
        const isP1 = !room.partner1 || room.partner1.uid === currentUserId || room.partner1.name === profile.userName;

        const updatePayload: any = {
          anniversaryDate: profile.anniversaryDate,
          isPaired: profile.isPaired,
          lastUpdated: Date.now(),
        };

        if (isP1) {
          updatePayload['partner1.name'] = profile.userName;
          if (profile.userAvatar) updatePayload['partner1.avatarUri'] = profile.userAvatar;
          if (profile.partnerName) updatePayload['partner2.name'] = profile.partnerName;
          if (profile.partnerAvatar) updatePayload['partner2.avatarUri'] = profile.partnerAvatar;
        } else {
          updatePayload['partner2.name'] = profile.userName;
          if (profile.userAvatar) updatePayload['partner2.avatarUri'] = profile.userAvatar;
          if (profile.partnerName) updatePayload['partner1.name'] = profile.partnerName;
          if (profile.partnerAvatar) updatePayload['partner1.avatarUri'] = profile.partnerAvatar;
        }

        await updateDoc(coupleRef, updatePayload);
      } else {
        await setDoc(
          coupleRef,
          {
            pairCode: code,
            isPaired: profile.isPaired,
            anniversaryDate: profile.anniversaryDate,
            partner1: {
              uid: currentUserId || 'local',
              name: profile.userName,
              gender: 'male',
              email: '',
              avatarUri: profile.userAvatar,
            },
            partner2: profile.partnerName
              ? {
                  uid: '',
                  name: profile.partnerName,
                  gender: 'female',
                  email: '',
                  avatarUri: profile.partnerAvatar,
                }
              : null,
            lastUpdated: Date.now(),
          },
          { merge: true }
        );
      }
      return true;
    } catch (err) {
      console.warn('Firestore syncProfile error:', err);
      return false;
    }
  },

  /**
   * Fetch Partner's Profile from Cloud using Pairing Code
   */
  async fetchCloudProfile(
    inviteCode: string,
    currentUserId?: string
  ): Promise<CoupleProfile | null> {
    if (!isInitialized || !db || !inviteCode) return null;
    try {
      const code = inviteCode.trim().toUpperCase();
      const coupleRef = doc(db, 'couples', code);
      const snapshot = await getDoc(coupleRef);

      if (snapshot.exists()) {
        const d = snapshot.data() as FirestoreCoupleRoom;
        const isP1 =
          currentUserId && d.partner1?.uid === currentUserId;

        const user = isP1 ? d.partner1 : d.partner2 || d.partner1;
        const partner = isP1 ? d.partner2 : d.partner1;

        return {
          userName: user?.name || 'You',
          partnerName: partner?.name || 'Partner',
          userAvatar: user?.avatarUri || '',
          partnerAvatar: partner?.avatarUri || '',
          anniversaryDate: d.anniversaryDate || '2024-05-18',
          inviteCode: code,
          isPaired: !!d.isPaired,
          partnerOnline: !!partner?.online,
        };
      }
      return null;
    } catch (err) {
      console.warn('Firestore fetchProfile error:', err);
      return null;
    }
  },

  /**
   * Send a Chat Message to Firestore: `couples/{pairCode}/messages`
   */
  async sendChatMessage(
    inviteCode: string,
    message: ChatMessage,
    currentUserId?: string
  ): Promise<void> {
    if (!isInitialized || !db || !inviteCode) return;
    try {
      const code = inviteCode.trim().toUpperCase();
      const messagesCol = collection(db, 'couples', code, 'messages');
      await addDoc(messagesCol, {
        id: message.id,
        senderUid: currentUserId || 'user',
        type: message.type,
        text: message.text || '',
        imageUri: message.imageUri || '',
        voiceSeconds: message.voiceSeconds || 0,
        timestamp: message.timestamp || Date.now(),
        serverTime: serverTimestamp(),
        status: 'delivered',
      });
    } catch (err) {
      console.warn('Firestore sendChatMessage error:', err);
    }
  },

  /**
   * Fetch all Chat Messages from Firestore
   */
  async fetchChatMessages(
    inviteCode: string,
    currentUserId?: string
  ): Promise<ChatMessage[]> {
    if (!isInitialized || !db || !inviteCode) return [];
    try {
      const code = inviteCode.trim().toUpperCase();
      const messagesCol = collection(db, 'couples', code, 'messages');
      const q = query(messagesCol, orderBy('timestamp', 'asc'), limit(150));
      const snap = await getDocs(q);

      return snap.docs.map((d) => {
        const data = d.data();
        const isFromMe = currentUserId ? data.senderUid === currentUserId : data.sender === 'user';
        return {
          id: data.id || d.id,
          sender: isFromMe ? 'user' : 'partner',
          type: data.type || 'text',
          text: data.text || '',
          imageUri: data.imageUri || '',
          voiceSeconds: data.voiceSeconds || 0,
          timestamp: data.timestamp || Date.now(),
          status: 'read',
        };
      });
    } catch (err) {
      console.warn('Firestore fetchChatMessages error:', err);
      return [];
    }
  },

  /**
   * Subscribe to real-time chat messages
   */
  subscribeToChatMessages(
    inviteCode: string,
    currentUserId: string | undefined,
    onMessages: (messages: ChatMessage[]) => void
  ): () => void {
    if (!isInitialized || !db || !inviteCode) return () => {};
    try {
      const code = inviteCode.trim().toUpperCase();
      const messagesCol = collection(db, 'couples', code, 'messages');
      const q = query(messagesCol, orderBy('timestamp', 'asc'), limit(150));

      return onSnapshot(
        q,
        (snap) => {
          const list: ChatMessage[] = snap.docs.map((d) => {
            const data = d.data();
            const isFromMe = currentUserId ? data.senderUid === currentUserId : data.sender === 'user';
            return {
              id: data.id || d.id,
              sender: isFromMe ? 'user' : 'partner',
              type: data.type || 'text',
              text: data.text || '',
              imageUri: data.imageUri || '',
              voiceSeconds: data.voiceSeconds || 0,
              timestamp: data.timestamp || Date.now(),
              status: 'read',
            };
          });
          onMessages(list);
        },
        (error) => {
          console.warn('Firestore chat subscribe error:', error);
        }
      );
    } catch {
      return () => {};
    }
  },

  /**
   * Sync Memories to Cloud
   */
  async syncMemories(inviteCode: string, memories: MemoryItem[]): Promise<void> {
    if (!isInitialized || !db || !inviteCode) return;
    try {
      const code = inviteCode.trim().toUpperCase();
      const ref = doc(db, 'couples', code, 'memories', 'collection');
      await setDoc(ref, { memories, updatedAt: Date.now() }, { merge: true });
    } catch (err) {
      console.warn('Firestore syncMemories error:', err);
    }
  },

  /**
   * Fetch Memories from Cloud
   */
  async fetchMemories(inviteCode: string): Promise<MemoryItem[]> {
    if (!isInitialized || !db || !inviteCode) return [];
    try {
      const code = inviteCode.trim().toUpperCase();
      const ref = doc(db, 'couples', code, 'memories', 'collection');
      const snap = await getDoc(ref);
      if (snap.exists()) {
        const data = snap.data();
        return Array.isArray(data?.memories) ? data.memories : [];
      }
      return [];
    } catch (err) {
      console.warn('Firestore fetchMemories error:', err);
      return [];
    }
  },

  /**
   * Subscribe to Memories in real-time
   */
  subscribeToMemories(
    inviteCode: string,
    onMemories: (memories: MemoryItem[]) => void
  ): () => void {
    if (!isInitialized || !db || !inviteCode) return () => {};
    try {
      const code = inviteCode.trim().toUpperCase();
      const ref = doc(db, 'couples', code, 'memories', 'collection');
      return onSnapshot(ref, (snap) => {
        if (snap.exists()) {
          const data = snap.data();
          if (Array.isArray(data?.memories)) {
            onMemories(data.memories);
          }
        }
      });
    } catch {
      return () => {};
    }
  },

  /**
   * Sync Letters to Cloud
   */
  async syncLetters(inviteCode: string, letters: LetterItem[]): Promise<void> {
    if (!isInitialized || !db || !inviteCode) return;
    try {
      const code = inviteCode.trim().toUpperCase();
      const ref = doc(db, 'couples', code, 'letters', 'collection');
      await setDoc(ref, { letters, updatedAt: Date.now() }, { merge: true });
    } catch (err) {
      console.warn('Firestore syncLetters error:', err);
    }
  },

  /**
   * Fetch Letters from Cloud
   */
  async fetchLetters(inviteCode: string): Promise<LetterItem[]> {
    if (!isInitialized || !db || !inviteCode) return [];
    try {
      const code = inviteCode.trim().toUpperCase();
      const ref = doc(db, 'couples', code, 'letters', 'collection');
      const snap = await getDoc(ref);
      if (snap.exists()) {
        const data = snap.data();
        return Array.isArray(data?.letters) ? data.letters : [];
      }
      return [];
    } catch (err) {
      console.warn('Firestore fetchLetters error:', err);
      return [];
    }
  },

  /**
   * Sync Scrapbook Pages to Cloud
   */
  async syncScrapbookPages(inviteCode: string, pages: ScrapbookPageData[]): Promise<void> {
    if (!isInitialized || !db || !inviteCode) return;
    try {
      const code = inviteCode.trim().toUpperCase();
      const ref = doc(db, 'couples', code, 'scrapbook', 'pages');
      await setDoc(ref, { pages, updatedAt: Date.now() }, { merge: true });
    } catch (err) {
      console.warn('Firestore syncScrapbook error:', err);
    }
  },

  /**
   * Fetch Scrapbook Pages from Cloud
   */
  async fetchScrapbookPages(inviteCode: string): Promise<ScrapbookPageData[]> {
    if (!isInitialized || !db || !inviteCode) return [];
    try {
      const code = inviteCode.trim().toUpperCase();
      const ref = doc(db, 'couples', code, 'scrapbook', 'pages');
      const snap = await getDoc(ref);
      if (snap.exists()) {
        const data = snap.data();
        return Array.isArray(data?.pages) ? data.pages : [];
      }
      return [];
    } catch (err) {
      console.warn('Firestore fetchScrapbook error:', err);
      return [];
    }
  },

  /**
   * Sync Ephemeral Snap to Cloud
   */
  async syncSnap(inviteCode: string, snap: EphemeralSnap | null): Promise<void> {
    if (!isInitialized || !db || !inviteCode) return;
    try {
      const code = inviteCode.trim().toUpperCase();
      const ref = doc(db, 'couples', code, 'active_sync', 'snap');
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
      const code = inviteCode.trim().toUpperCase();
      const ref = doc(db, 'couples', code, 'active_sync', 'voice');
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
      const code = inviteCode.trim().toUpperCase();
      const ref = doc(db, 'couples', code, 'active_sync', 'doodle');
      await setDoc(ref, { doodle, updatedAt: Date.now() }, { merge: true });
    } catch (err) {
      console.warn('Firestore syncDoodle error:', err);
    }
  },

  /**
   * Listen to Live Couple Sync Updates
   */
  subscribeToCoupleLiveUpdates(
    inviteCode: string,
    currentUserId: string | undefined,
    onUpdate: (data: {
      profile?: CoupleProfile;
      snap?: EphemeralSnap | null;
      voiceNote?: SweetVoiceNote | null;
      doodle?: SharedDoodle | null;
    }) => void
  ): () => void {
    if (!isInitialized || !db || !inviteCode) return () => {};
    try {
      const code = inviteCode.trim().toUpperCase();
      const coupleRef = doc(db, 'couples', code);

      return onSnapshot(coupleRef, (snapshot) => {
        if (snapshot.exists()) {
          const d = snapshot.data() as FirestoreCoupleRoom;
          const isP1 = currentUserId && d.partner1?.uid === currentUserId;
          const user = isP1 ? d.partner1 : d.partner2 || d.partner1;
          const partner = isP1 ? d.partner2 : d.partner1;

          onUpdate({
            profile: {
              userName: user?.name || 'You',
              partnerName: partner?.name || 'Partner',
              userAvatar: user?.avatarUri || '',
              partnerAvatar: partner?.avatarUri || '',
              anniversaryDate: d.anniversaryDate || '2024-05-18',
              inviteCode: code,
              isPaired: !!d.isPaired,
              partnerOnline: !!partner?.online,
            },
          });
        }
      });
    } catch {
      return () => {};
    }
  },
};

export default FirestoreService;
