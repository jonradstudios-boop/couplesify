import AsyncStorage from '@react-native-async-storage/async-storage';

export interface CoupleProfile {
  userName: string;
  partnerName: string;
  userAvatar: string;
  partnerAvatar: string;
  anniversaryDate: string; // ISO string '2023-10-14'
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
  progress: number; // e.g. 3
  total: number; // e.g. 4
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

const STORAGE_KEYS = {
  PROFILE: '@couplesify_profile',
  USER_MOOD: '@couplesify_user_mood',
  PARTNER_MOOD: '@couplesify_partner_mood',
  SHARED_DOODLE: '@couplesify_shared_doodle',
  GOALS: '@couplesify_goals',
  MEMORIES: '@couplesify_memories',
  MESSAGES: '@couplesify_messages',
};

// Initial default couple profile
const DEFAULT_PROFILE: CoupleProfile = {
  userName: 'Alex',
  partnerName: 'Maya',
  userAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300&auto=format&fit=crop&q=80',
  partnerAvatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300&auto=format&fit=crop&q=80',
  anniversaryDate: '2024-02-14',
  inviteCode: 'LOVE-77',
  isPaired: true,
  partnerOnline: true,
};

const DEFAULT_GOALS: CoupleGoal[] = [
  { id: '1', title: 'Weekly Date Ideas', category: 'Romantic', completed: false, progress: 3, total: 4, color: '#FF6575' },
  { id: '2', title: 'Visit a New Café Together', category: 'Weekend', completed: true, progress: 1, total: 1, color: '#3DAA7A' },
  { id: '3', title: 'Sunset Stargazing Picnic', category: 'Adventure', completed: false, progress: 0, total: 1, color: '#8F78D2' },
  { id: '4', title: 'Cook Homemade Pasta', category: 'Home', completed: true, progress: 2, total: 2, color: '#E59740' },
  { id: '5', title: 'Plan Kyoto Cherry Blossom Trip', category: 'Dream Travel', completed: false, progress: 1, total: 3, color: '#4592D9' },
];

const DEFAULT_MEMORIES: MemoryItem[] = [
  {
    id: 'm1',
    imageUri: 'https://images.unsplash.com/photo-1516589178581-6cd7833ae3b2?w=800&auto=format&fit=crop&q=80',
    caption: 'Sunset walk by the pier holding warm matcha lattes. Time stops with you. ✨',
    date: 'Oct 10, 2026',
    tag: 'Date Night',
    likes: 24,
    isLiked: true,
  },
  {
    id: 'm2',
    imageUri: 'https://images.unsplash.com/photo-1529333166437-7750a6dd5a70?w=800&auto=format&fit=crop&q=80',
    caption: 'Our first camping trip under the pine trees. Burned marshmallows and endless giggles.',
    date: 'Aug 24, 2026',
    tag: 'Adventure',
    likes: 19,
    isLiked: false,
  },
  {
    id: 'm3',
    imageUri: 'https://images.unsplash.com/photo-1494774157365-9e04c6720e47?w=800&auto=format&fit=crop&q=80',
    caption: 'Surprise anniversary picnic in the park! The strawberries were as sweet as your smile.',
    date: 'Feb 14, 2026',
    tag: 'Anniversary',
    likes: 38,
    isLiked: true,
  },
];

const DEFAULT_MESSAGES: ChatMessage[] = [
  {
    id: 'msg-1',
    sender: 'partner',
    type: 'text',
    text: 'Good morning my sunshine! ☀️ Did you sleep well?',
    timestamp: Date.now() - 3600000 * 2,
    status: 'read',
  },
  {
    id: 'msg-2',
    sender: 'user',
    type: 'text',
    text: 'Morning sweetheart! Dreamt about our upcoming weekend getaway 🏖️',
    timestamp: Date.now() - 3600000 * 1.8,
    status: 'read',
  },
  {
    id: 'msg-3',
    sender: 'partner',
    type: 'voice',
    voiceSeconds: 8,
    timestamp: Date.now() - 3600000 * 1.2,
    status: 'read',
  },
  {
    id: 'msg-4',
    sender: 'partner',
    type: 'nudge',
    text: 'Maya sent you a warm squeeze! 💕',
    timestamp: Date.now() - 3600000 * 0.8,
    status: 'read',
  },
  {
    id: 'msg-5',
    sender: 'user',
    type: 'text',
    text: 'Just drew something cute for your phone widget! Check it out! 🥰',
    timestamp: Date.now() - 120000,
    status: 'delivered',
  },
];

export const StorageService = {
  async getProfile(): Promise<CoupleProfile> {
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
    return (await AsyncStorage.getItem(STORAGE_KEYS.USER_MOOD)) || 'Loving 🥰';
  },

  async setUserMood(mood: string): Promise<void> {
    await AsyncStorage.setItem(STORAGE_KEYS.USER_MOOD, mood);
  },

  async getPartnerMood(): Promise<string> {
    return (await AsyncStorage.getItem(STORAGE_KEYS.PARTNER_MOOD)) || 'Needy 🥺';
  },

  async setPartnerMood(mood: string): Promise<void> {
    await AsyncStorage.setItem(STORAGE_KEYS.PARTNER_MOOD, mood);
  },

  async getSharedDoodle(): Promise<SharedDoodle | null> {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEYS.SHARED_DOODLE);
      return data ? JSON.parse(data) : null;
    } catch {
      return null;
    }
  },

  async saveSharedDoodle(doodle: SharedDoodle): Promise<void> {
    await AsyncStorage.setItem(STORAGE_KEYS.SHARED_DOODLE, JSON.stringify(doodle));
  },

  async getGoals(): Promise<CoupleGoal[]> {
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

  async getMessages(): Promise<ChatMessage[]> {
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
};

export default StorageService;
