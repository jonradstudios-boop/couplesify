import AsyncStorage from '@react-native-async-storage/async-storage';

export interface CoupleProfile {
  userName: string;
  partnerName: string;
  userAvatar: string;
  partnerAvatar: string;
  anniversaryDate: string; // ISO string '2026-10-13'
  inviteCode: string; // e.g. 'LOVE-77'
  isPaired: boolean;
  partnerOnline: boolean;
}

export interface MoodItem {
  id: string;
  label: string;
  emoji: string;
  color: string;
}

export interface DoodleStroke {
  points: { x: number; y: number }[];
  color: string;
  width: number;
}

export interface SharedDoodle {
  id: string;
  strokes: DoodleStroke[];
  updatedAt: number;
  author: string;
  previewEmoji?: string;
}

export interface CoupleGoal {
  id: string;
  title: string;
  category: string;
  completed: boolean;
  progress: number;
  total: number;
  color: string;
}

export interface MemoryItem {
  id: string;
  imageUri: string;
  caption: string;
  date: string;
  tag: string;
  likes: number;
  isLiked: boolean;
}

export interface LetterItem {
  id: string;
  senderName: string;
  body: string;
  date: string;
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'partner';
  type: 'text' | 'image' | 'voice' | 'nudge' | 'doodle';
  text?: string;
  imageUri?: string;
  voiceSeconds?: number;
  timestamp: number;
  status: 'sent' | 'delivered' | 'read';
}

export interface EphemeralSnap {
  id: string;
  imageUri: string;
  caption?: string;
  timestamp: number;
  author: string;
}

export interface SweetVoiceNote {
  id: string;
  audioUri?: string;
  duration: number; // in seconds
  timestamp: number;
  senderName: string;
}

export interface ScrapbookPageData {
  id: string;
  templateType:
    | 'milestone_cover'
    | 'polaroid_collage'
    | 'handwritten_letter'
    | 'adventure_ticket'
    | 'butterfly_pressed'
    | 'midnight_whispers';
  title: string;
  subtitle?: string;
  bodyText?: string;
  photoUri1?: string;
  photoUri2?: string;
  caption1?: string;
  caption2?: string;
  dateStr?: string;
  paperTheme?: 'craft' | 'blush' | 'midnight' | 'ivory' | 'matcha';
  sealIcon?: 'heart' | 'star' | 'butterfly' | 'sparkle' | 'rose';
  salutation?: string;
  signature?: string;
}

const STORAGE_KEYS = {
  CLEAN_V4: '@couplesify_clean_v4',
  PROFILE: '@couplesify_profile',
  USER_MOOD: '@couplesify_user_mood',
  PARTNER_MOOD: '@couplesify_partner_mood',
  SHARED_DOODLE: '@couplesify_shared_doodle',
  GOALS: '@couplesify_goals',
  MEMORIES: '@couplesify_memories',
  LETTERS: '@couplesify_letters',
  MESSAGES: '@couplesify_messages',
  EPHEMERAL_SNAP: '@couplesify_ephemeral_snap',
  SWEET_VOICE_NOTE: '@couplesify_sweet_voice_note',
  SCRAPBOOK_PAGES: '@couplesify_scrapbook_pages',
};

// Clean initial empty defaults with NO fake / dummy records
const DEFAULT_PROFILE: CoupleProfile = {
  userName: 'You',
  partnerName: 'Partner',
  userAvatar: '',
  partnerAvatar: '',
  anniversaryDate: new Date().toISOString().split('T')[0],
  inviteCode: 'LOVE-77',
  isPaired: false,
  partnerOnline: false,
};

const DEFAULT_GOALS: CoupleGoal[] = [];
const DEFAULT_MEMORIES: MemoryItem[] = [];
const DEFAULT_LETTERS: LetterItem[] = [];
const DEFAULT_MESSAGES: ChatMessage[] = [];

export const StorageService = {
  async ensureCleanState(): Promise<void> {
    try {
      const isCleaned = await AsyncStorage.getItem(STORAGE_KEYS.CLEAN_V4);
      if (!isCleaned) {
        // Clear all previous dummy/mock data keys including legacy scrapbook pages
        await AsyncStorage.multiRemove([
          STORAGE_KEYS.PROFILE,
          STORAGE_KEYS.USER_MOOD,
          STORAGE_KEYS.PARTNER_MOOD,
          STORAGE_KEYS.SHARED_DOODLE,
          STORAGE_KEYS.GOALS,
          STORAGE_KEYS.MEMORIES,
          STORAGE_KEYS.LETTERS,
          STORAGE_KEYS.MESSAGES,
          STORAGE_KEYS.SCRAPBOOK_PAGES,
        ]);
        await AsyncStorage.setItem(STORAGE_KEYS.CLEAN_V4, 'true');
      }
    } catch {
      // safe fallback
    }
  },

  async getProfile(): Promise<CoupleProfile> {
    await this.ensureCleanState();
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEYS.PROFILE);
      return data ? JSON.parse(data) : DEFAULT_PROFILE;
    } catch {
      return DEFAULT_PROFILE;
    }
  },

  async saveProfile(profile: CoupleProfile): Promise<void> {
    await AsyncStorage.setItem(STORAGE_KEYS.PROFILE, JSON.stringify(profile));
  },

  async getUserMood(): Promise<string> {
    await this.ensureCleanState();
    return (await AsyncStorage.getItem(STORAGE_KEYS.USER_MOOD)) || 'Loving 🥰';
  },

  async setUserMood(mood: string): Promise<void> {
    await AsyncStorage.setItem(STORAGE_KEYS.USER_MOOD, mood);
  },

  async getPartnerMood(): Promise<string> {
    await this.ensureCleanState();
    return (await AsyncStorage.getItem(STORAGE_KEYS.PARTNER_MOOD)) || '';
  },

  async setPartnerMood(mood: string): Promise<void> {
    await AsyncStorage.setItem(STORAGE_KEYS.PARTNER_MOOD, mood);
  },

  async getSharedDoodle(): Promise<SharedDoodle | null> {
    await this.ensureCleanState();
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEYS.SHARED_DOODLE);
      return data ? JSON.parse(data) : null;
    } catch {
      return null;
    }
  },

  async saveSharedDoodle(doodle: SharedDoodle | null): Promise<void> {
    if (!doodle) {
      await AsyncStorage.removeItem(STORAGE_KEYS.SHARED_DOODLE);
    } else {
      await AsyncStorage.setItem(STORAGE_KEYS.SHARED_DOODLE, JSON.stringify(doodle));
    }
  },

  async getGoals(): Promise<CoupleGoal[]> {
    await this.ensureCleanState();
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEYS.GOALS);
      return data ? JSON.parse(data) : DEFAULT_GOALS;
    } catch {
      return DEFAULT_GOALS;
    }
  },

  async saveGoals(goals: CoupleGoal[]): Promise<void> {
    await AsyncStorage.setItem(STORAGE_KEYS.GOALS, JSON.stringify(goals));
  },

  async getMemories(): Promise<MemoryItem[]> {
    await this.ensureCleanState();
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEYS.MEMORIES);
      return data ? JSON.parse(data) : DEFAULT_MEMORIES;
    } catch {
      return DEFAULT_MEMORIES;
    }
  },

  async saveMemories(memories: MemoryItem[]): Promise<void> {
    await AsyncStorage.setItem(STORAGE_KEYS.MEMORIES, JSON.stringify(memories));
  },

  async getLetters(): Promise<LetterItem[]> {
    await this.ensureCleanState();
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEYS.LETTERS);
      return data ? JSON.parse(data) : DEFAULT_LETTERS;
    } catch {
      return DEFAULT_LETTERS;
    }
  },

  async saveLetters(letters: LetterItem[]): Promise<void> {
    await AsyncStorage.setItem(STORAGE_KEYS.LETTERS, JSON.stringify(letters));
  },

  async getMessages(): Promise<ChatMessage[]> {
    await this.ensureCleanState();
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEYS.MESSAGES);
      return data ? JSON.parse(data) : DEFAULT_MESSAGES;
    } catch {
      return DEFAULT_MESSAGES;
    }
  },

  async saveMessages(messages: ChatMessage[]): Promise<void> {
    await AsyncStorage.setItem(STORAGE_KEYS.MESSAGES, JSON.stringify(messages));
  },

  async getEphemeralSnap(): Promise<EphemeralSnap | null> {
    await this.ensureCleanState();
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEYS.EPHEMERAL_SNAP);
      if (!data) return null;
      const snap: EphemeralSnap = JSON.parse(data);
      // Auto-reset if older than 7 hours (7 * 60 * 60 * 1000 ms)
      const SEVEN_HOURS_MS = 7 * 60 * 60 * 1000;
      if (Date.now() - snap.timestamp >= SEVEN_HOURS_MS) {
        await AsyncStorage.removeItem(STORAGE_KEYS.EPHEMERAL_SNAP);
        return null;
      }
      return snap;
    } catch {
      return null;
    }
  },

  async saveEphemeralSnap(snap: EphemeralSnap | null): Promise<void> {
    if (!snap) {
      await AsyncStorage.removeItem(STORAGE_KEYS.EPHEMERAL_SNAP);
    } else {
      await AsyncStorage.setItem(STORAGE_KEYS.EPHEMERAL_SNAP, JSON.stringify(snap));
    }
  },

  async getSweetVoiceNote(): Promise<SweetVoiceNote | null> {
    await this.ensureCleanState();
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEYS.SWEET_VOICE_NOTE);
      return data ? JSON.parse(data) : null;
    } catch {
      return null;
    }
  },

  async saveSweetVoiceNote(note: SweetVoiceNote | null): Promise<void> {
    if (!note) {
      await AsyncStorage.removeItem(STORAGE_KEYS.SWEET_VOICE_NOTE);
    } else {
      await AsyncStorage.setItem(STORAGE_KEYS.SWEET_VOICE_NOTE, JSON.stringify(note));
    }
  },

  async getScrapbookPages(): Promise<ScrapbookPageData[]> {
    await this.ensureCleanState();
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEYS.SCRAPBOOK_PAGES);
      if (data) {
        const parsed: ScrapbookPageData[] = JSON.parse(data);
        // If stored pages contain legacy preset templates or unsplash images, purge them!
        const hasLegacyDummy = parsed.some(
          (p) =>
            (p.photoUri1 && p.photoUri1.includes('unsplash.com')) ||
            (p.photoUri2 && p.photoUri2.includes('unsplash.com')) ||
            p.title === 'Our Sweet Journey' ||
            p.title === 'Favorite Little Moments' ||
            p.title === 'A Letter from My Heart' ||
            p.title === 'Adventures with You' ||
            p.title === 'You Give Me Butterflies' ||
            p.title === 'Midnight Vows & Starlight'
        );
        if (hasLegacyDummy) {
          await AsyncStorage.setItem(
            STORAGE_KEYS.SCRAPBOOK_PAGES,
            JSON.stringify(DEFAULT_SCRAPBOOK_PAGES)
          );
          return DEFAULT_SCRAPBOOK_PAGES;
        }
        return parsed.length > 0 ? parsed : DEFAULT_SCRAPBOOK_PAGES;
      }
      return DEFAULT_SCRAPBOOK_PAGES;
    } catch {
      return DEFAULT_SCRAPBOOK_PAGES;
    }
  },

  async saveScrapbookPages(pages: ScrapbookPageData[]): Promise<void> {
    await AsyncStorage.setItem(STORAGE_KEYS.SCRAPBOOK_PAGES, JSON.stringify(pages));
  },

  async resetScrapbookPages(): Promise<ScrapbookPageData[]> {
    await AsyncStorage.setItem(
      STORAGE_KEYS.SCRAPBOOK_PAGES,
      JSON.stringify(DEFAULT_SCRAPBOOK_PAGES)
    );
    return DEFAULT_SCRAPBOOK_PAGES;
  },
};

// Completely clean blank initial state with NO pre-filled dummy titles, stories, or images
const DEFAULT_SCRAPBOOK_PAGES: ScrapbookPageData[] = [
  {
    id: 'page-1',
    templateType: 'milestone_cover',
    title: '',
    subtitle: '',
    bodyText: '',
    dateStr: '',
    photoUri1: undefined,
    photoUri2: undefined,
    caption1: '',
    caption2: '',
    paperTheme: 'craft',
    sealIcon: 'heart',
  },
];

export default StorageService;
