import AsyncStorage from '@react-native-async-storage/async-storage';
import StorageService, { CoupleProfile } from './StorageService';

export interface CustomPromptItem {
  id: string;
  gameType: string; // 'tod' | 'dirty_nhie' | 'quiz' | 'hot_trivia'
  category?: 'truth' | 'dare' | 'nhie' | 'quiz';
  prompt: string;
  createdBy: 'user' | 'partner';
  createdAt: number;
}

export interface PromptAnswerItem {
  promptId: string;
  userAnswer?: string;
  partnerAnswer?: string;
  updatedAt: number;
}

export interface InGameInvite {
  id: string;
  fromName: string;
  toName: string;
  gameTitle: string;
  gameRoomCode: string;
  timestamp: number;
}

export interface DuoRoomState {
  roomId: string;
  gameRoomCode: string; // Separate match room code for gaming area e.g. 'GAME-7824'
  inviteCode: string; // Permanent account linking code e.g. 'PAIR-7729'
  userName: string;
  partnerName: string;
  isPartnerConnected: boolean;
  currentTurn: 'user' | 'partner';
  scores: { user: number; partner: number };
}

const STORAGE_KEYS = {
  DUO_ROOM: '@couplesify_duo_room_state',
  CUSTOM_PROMPTS: '@couplesify_custom_game_prompts',
  PROMPT_ANSWERS: '@couplesify_game_prompt_answers',
  PENDING_GAME_INVITE: '@couplesify_pending_game_invite',
};

/**
 * GameSyncService manages duo two-player room state, game-specific match codes,
 * in-game invites (COD Mobile / Free Fire style), turn shuffling, custom prompts, and answers.
 * 
 * ARCHITECTURE FOR FIRESTORE:
 * When adding Firebase Firestore, replace the local AsyncStorage getters/setters
 * with onSnapshot() listeners and setDoc() / updateDoc() calls to:
 * `couples/{coupleId}/game_sessions/active`
 */
export const GameSyncService = {
  async getDuoRoomState(): Promise<DuoRoomState> {
    try {
      const profile: CoupleProfile = await StorageService.getProfile();
      const raw = await AsyncStorage.getItem(STORAGE_KEYS.DUO_ROOM);
      
      const defaultGameCode = `GAME-${Math.floor(1000 + Math.random() * 9000)}`;
      const defaultState: DuoRoomState = {
        roomId: `ROOM-${profile.inviteCode || 'LOVE77'}`,
        gameRoomCode: defaultGameCode,
        inviteCode: profile.inviteCode || 'PAIR-7729',
        userName: profile.userName || 'You',
        partnerName: profile.partnerName || 'Partner',
        // By default, if paired or simulated, partner is connected
        isPartnerConnected: profile.isPaired || true,
        currentTurn: 'user',
        scores: { user: 0, partner: 0 },
      };

      if (!raw) {
        await AsyncStorage.setItem(STORAGE_KEYS.DUO_ROOM, JSON.stringify(defaultState));
        return defaultState;
      }

      const parsed: DuoRoomState = JSON.parse(raw);
      // Keep names synced with profile
      parsed.userName = profile.userName || 'You';
      parsed.partnerName = profile.partnerName || 'Partner';
      parsed.inviteCode = profile.inviteCode || 'PAIR-7729';
      if (!parsed.gameRoomCode) {
        parsed.gameRoomCode = defaultGameCode;
      }
      return parsed;
    } catch {
      return {
        roomId: 'ROOM-LOVE77',
        gameRoomCode: 'GAME-7824',
        inviteCode: 'PAIR-7729',
        userName: 'You',
        partnerName: 'Partner',
        isPartnerConnected: true,
        currentTurn: 'user',
        scores: { user: 0, partner: 0 },
      };
    }
  },

  async saveDuoRoomState(state: DuoRoomState): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.DUO_ROOM, JSON.stringify(state));
      // FIRESTORE SYNC HOOK:
      // await setDoc(doc(db, 'couples', state.roomId, 'games', 'room'), state, { merge: true });
    } catch (err) {
      console.warn('Failed to save duo room state:', err);
    }
  },

  async generateNewGameCode(): Promise<string> {
    const state = await this.getDuoRoomState();
    const newCode = `GAME-${Math.floor(1000 + Math.random() * 9000)}`;
    state.gameRoomCode = newCode;
    await this.saveDuoRoomState(state);
    return newCode;
  },

  async joinRoomByCode(enteredCode: string): Promise<{ success: boolean; message: string }> {
    const trimmed = enteredCode.trim().toUpperCase();
    if (!trimmed) {
      return { success: false, message: 'Please enter a game room code.' };
    }
    const state = await this.getDuoRoomState();
    state.gameRoomCode = trimmed;
    state.isPartnerConnected = true;
    await this.saveDuoRoomState(state);
    return { success: true, message: `Successfully joined game room ${trimmed}! 🎮` };
  },

  async sendInGameInvite(gameTitle: string = 'Mini Games'): Promise<InGameInvite> {
    const state = await this.getDuoRoomState();
    const invite: InGameInvite = {
      id: `invite-${Date.now()}`,
      fromName: state.userName,
      toName: state.partnerName,
      gameTitle,
      gameRoomCode: state.gameRoomCode,
      timestamp: Date.now(),
    };
    await AsyncStorage.setItem(STORAGE_KEYS.PENDING_GAME_INVITE, JSON.stringify(invite));
    return invite;
  },

  async getPendingGameInvite(): Promise<InGameInvite | null> {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEYS.PENDING_GAME_INVITE);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  },

  async clearPendingGameInvite(): Promise<void> {
    try {
      await AsyncStorage.removeItem(STORAGE_KEYS.PENDING_GAME_INVITE);
    } catch {}
  },

  async togglePartnerConnection(): Promise<DuoRoomState> {
    const state = await this.getDuoRoomState();
    state.isPartnerConnected = !state.isPartnerConnected;
    await this.saveDuoRoomState(state);
    return state;
  },

  async setPartnerConnected(connected: boolean): Promise<DuoRoomState> {
    const state = await this.getDuoRoomState();
    state.isPartnerConnected = connected;
    await this.saveDuoRoomState(state);
    return state;
  },

  async shuffleTurn(): Promise<'user' | 'partner'> {
    const state = await this.getDuoRoomState();
    const nextTurn = Math.random() > 0.5 ? 'user' : 'partner';
    state.currentTurn = nextTurn;
    await this.saveDuoRoomState(state);
    return nextTurn;
  },

  // -------------------------------------------------------------
  // CUSTOM PROMPTS (Truth, Dare, Never Have I Ever, Quiz)
  // -------------------------------------------------------------
  async getCustomPrompts(gameType?: string): Promise<CustomPromptItem[]> {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEYS.CUSTOM_PROMPTS);
      const all: CustomPromptItem[] = raw ? JSON.parse(raw) : [];
      if (!gameType) return all;
      return all.filter((p) => p.gameType === gameType);
    } catch {
      return [];
    }
  },

  async addCustomPrompt(
    gameType: string,
    prompt: string,
    category?: 'truth' | 'dare' | 'nhie' | 'quiz',
    createdBy: 'user' | 'partner' = 'user'
  ): Promise<CustomPromptItem> {
    const newItem: CustomPromptItem = {
      id: `custom-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      gameType,
      category,
      prompt: prompt.trim(),
      createdBy,
      createdAt: Date.now(),
    };

    try {
      const all = await this.getCustomPrompts();
      const updated = [newItem, ...all];
      await AsyncStorage.setItem(STORAGE_KEYS.CUSTOM_PROMPTS, JSON.stringify(updated));
      // FIRESTORE SYNC HOOK:
      // await addDoc(collection(db, 'couples', roomId, 'custom_prompts'), newItem);
    } catch (err) {
      console.warn('Failed to save custom prompt:', err);
    }

    return newItem;
  },

  async deleteCustomPrompt(id: string): Promise<void> {
    try {
      const all = await this.getCustomPrompts();
      const filtered = all.filter((p) => p.id !== id);
      await AsyncStorage.setItem(STORAGE_KEYS.CUSTOM_PROMPTS, JSON.stringify(filtered));
    } catch {}
  },

  // -------------------------------------------------------------
  // PROMPT ANSWERS / TEXT RESPONSES
  // -------------------------------------------------------------
  async getPromptAnswer(promptId: string): Promise<PromptAnswerItem | null> {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEYS.PROMPT_ANSWERS);
      const all: Record<string, PromptAnswerItem> = raw ? JSON.parse(raw) : {};
      return all[promptId] || null;
    } catch {
      return null;
    }
  },

  async savePromptAnswer(
    promptId: string,
    answer: string,
    author: 'user' | 'partner'
  ): Promise<PromptAnswerItem> {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEYS.PROMPT_ANSWERS);
      const all: Record<string, PromptAnswerItem> = raw ? JSON.parse(raw) : {};
      const current = all[promptId] || { promptId, updatedAt: Date.now() };

      if (author === 'user') {
        current.userAnswer = answer;
      } else {
        current.partnerAnswer = answer;
      }
      current.updatedAt = Date.now();
      all[promptId] = current;

      await AsyncStorage.setItem(STORAGE_KEYS.PROMPT_ANSWERS, JSON.stringify(all));
      // FIRESTORE SYNC HOOK:
      // await setDoc(doc(db, 'couples', roomId, 'answers', promptId), current, { merge: true });
      return current;
    } catch {
      return { promptId, updatedAt: Date.now(), [author === 'user' ? 'userAnswer' : 'partnerAnswer']: answer };
    }
  },
};

export default GameSyncService;
