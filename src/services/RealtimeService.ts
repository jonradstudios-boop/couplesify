import { doc, setDoc, onSnapshot, Unsubscribe } from 'firebase/firestore';
import { db, isInitialized } from './FirebaseConfig';
import StorageService, { ChatMessage, SharedDoodle, EphemeralSnap, SweetVoiceNote } from './StorageService';

type EventCallback<T = any> = (data: T) => void;

export interface LiveSyncPayload {
  mood?: { mood: string; senderId?: string; senderUid?: string; timestamp: number };
  doodle?: SharedDoodle;
  message?: ChatMessage;
  nudge?: { sender: string; senderUid?: string; timestamp: number; text: string };
  snap?: EphemeralSnap;
  voice?: SweetVoiceNote;
  game?: any;
  lastUpdated?: number;
}

class RealtimeServiceManager {
  private listeners: { [event: string]: EventCallback[] } = {};
  private unsubSnapshot: Unsubscribe | null = null;
  private pairingCode: string = '8444';
  private lastProcessedTimes: { [event: string]: number } = {};

  constructor() {
    this.initFromStorage();
  }

  private async initFromStorage() {
    try {
      const profile = await StorageService.getProfile();
      if (profile?.inviteCode) {
        this.setPairingCode(profile.inviteCode);
      }
    } catch {
      // Default to initial room
      this.initFirestoreListener();
    }
  }

  public setPairingCode(code: string) {
    const clean = code.trim().toUpperCase();
    if (this.pairingCode === clean && this.unsubSnapshot) {
      return;
    }
    this.pairingCode = clean;
    this.initFirestoreListener();
  }

  public getPairingCode(): string {
    return this.pairingCode;
  }

  private initFirestoreListener() {
    try {
      if (this.unsubSnapshot) {
        this.unsubSnapshot();
        this.unsubSnapshot = null;
      }

      if (!isInitialized || !db || !this.pairingCode) {
        return;
      }

      const syncDocRef = doc(db, 'couples', this.pairingCode, 'live', 'sync');

      this.unsubSnapshot = onSnapshot(
        syncDocRef,
        (snapshot) => {
          if (!snapshot.exists()) return;
          const data = snapshot.data() as LiveSyncPayload;

          // 1. Mood update
          if (data.mood && data.mood.timestamp && data.mood.timestamp > (this.lastProcessedTimes['mood'] || 0)) {
            this.lastProcessedTimes['mood'] = data.mood.timestamp;
            this.emit('mood', data.mood);
          }

          // 2. Shared Doodle (Widget drawing)
          if (data.doodle && data.doodle.updatedAt && data.doodle.updatedAt > (this.lastProcessedTimes['doodle'] || 0)) {
            this.lastProcessedTimes['doodle'] = data.doodle.updatedAt;
            this.emit('doodle', data.doodle);
          }

          // 3. Love Nudge
          if (data.nudge && data.nudge.timestamp && data.nudge.timestamp > (this.lastProcessedTimes['nudge'] || 0)) {
            this.lastProcessedTimes['nudge'] = data.nudge.timestamp;
            this.emit('nudge', data.nudge);
          }

          // 4. Ephemeral Snap
          if (data.snap && data.snap.timestamp && data.snap.timestamp > (this.lastProcessedTimes['snap'] || 0)) {
            this.lastProcessedTimes['snap'] = data.snap.timestamp;
            this.emit('snap', data.snap);
          }

          // 5. Sweet Voice Note
          if (data.voice && data.voice.timestamp && data.voice.timestamp > (this.lastProcessedTimes['voice'] || 0)) {
            this.lastProcessedTimes['voice'] = data.voice.timestamp;
            this.emit('voice', data.voice);
          }

          // 6. Mini-Game Events (invites, host start, truth or dare)
          if (data.game && data.game.timestamp && data.game.timestamp > (this.lastProcessedTimes['game'] || 0)) {
            this.lastProcessedTimes['game'] = data.game.timestamp;
            this.emit('game', data.game);
          }

          // 7. Chat Message
          if (data.message && data.message.timestamp && data.message.timestamp > (this.lastProcessedTimes['message'] || 0)) {
            this.lastProcessedTimes['message'] = data.message.timestamp;
            this.emit('message', data.message);
          }
        },
        (error) => {
          console.warn('RealtimeService Firestore snapshot error:', error);
        }
      );
    } catch (err) {
      console.warn('RealtimeService listener init failed:', err);
    }
  }

  public on(event: string, callback: EventCallback) {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }
    this.listeners[event].push(callback);

    return () => {
      this.off(event, callback);
    };
  }

  public off(event: string, callback: EventCallback) {
    if (!this.listeners[event]) return;
    this.listeners[event] = this.listeners[event].filter((cb) => cb !== callback);
  }

  public emit(event: string, data: any) {
    const cbs = this.listeners[event];
    if (cbs) {
      cbs.forEach((cb) => {
        try {
          cb(data);
        } catch (e) {
          console.warn(`RealtimeService error invoking '${event}' callback:`, e);
        }
      });
    }
  }

  private async writeSync(payload: Partial<LiveSyncPayload>) {
    if (!isInitialized || !db || !this.pairingCode) return;
    try {
      const syncDocRef = doc(db, 'couples', this.pairingCode, 'live', 'sync');
      await setDoc(
        syncDocRef,
        {
          ...payload,
          lastUpdated: Date.now(),
        },
        { merge: true }
      );
    } catch (err) {
      console.warn('RealtimeService writeSync error:', err);
    }
  }

  /**
   * Broadcast partner mood
   */
  public async broadcastMood(mood: string, senderId?: string, senderUid?: string) {
    const timestamp = Date.now();
    this.lastProcessedTimes['mood'] = timestamp;

    await this.writeSync({
      mood: {
        mood,
        senderId,
        senderUid,
        timestamp,
      },
    });

    // Also update parent couple document so it persists across sessions
    try {
      if (isInitialized && db && this.pairingCode) {
        const coupleDocRef = doc(db, 'couples', this.pairingCode);
        const moodUpdate: any = { lastUpdated: timestamp };
        if (senderId) {
          moodUpdate[`mood_${senderId.replace(/[^a-zA-Z0-9]/g, '_')}`] = mood;
        }
        await setDoc(coupleDocRef, moodUpdate, { merge: true });
      }
    } catch {}
  }

  /**
   * Broadcast shared doodle (drawing widget)
   */
  public async broadcastDoodle(doodle: SharedDoodle) {
    const timestamp = doodle.updatedAt || Date.now();
    this.lastProcessedTimes['doodle'] = timestamp;
    this.emit('doodle', doodle);

    await this.writeSync({
      doodle: {
        ...doodle,
        updatedAt: timestamp,
      },
    });
  }

  /**
   * Broadcast real-time message
   */
  public async broadcastMessage(message: ChatMessage) {
    const timestamp = message.timestamp || Date.now();
    this.lastProcessedTimes['message'] = timestamp;
    this.emit('message', message);

    await this.writeSync({
      message: {
        ...message,
        timestamp,
      },
    });
  }

  /**
   * Broadcast love nudge
   */
  public async broadcastLoveNudge(sender: string = 'You', senderUid?: string) {
    const timestamp = Date.now();
    const payload = {
      sender,
      senderUid,
      timestamp,
      text: `${sender} sent a warm romantic squeeze! 💕`,
    };
    this.lastProcessedTimes['nudge'] = timestamp;
    this.emit('nudge', payload);

    await this.writeSync({
      nudge: payload,
    });
  }

  /**
   * Broadcast ephemeral snap
   */
  public async broadcastSnap(snap: EphemeralSnap) {
    const timestamp = snap.timestamp || Date.now();
    this.lastProcessedTimes['snap'] = timestamp;
    this.emit('snap', snap);

    await this.writeSync({
      snap: {
        ...snap,
        timestamp,
      },
    });
  }

  /**
   * Broadcast sweet voice whisper
   */
  public async broadcastVoice(voice: SweetVoiceNote) {
    const timestamp = voice.timestamp || Date.now();
    this.lastProcessedTimes['voice'] = timestamp;
    this.emit('voice', voice);

    await this.writeSync({
      voice: {
        ...voice,
        timestamp,
      },
    });
  }

  /**
   * Broadcast mini game events (turn, invite, start, answer)
   */
  public async broadcastGameMove(gameId: string, moveData: any) {
    const timestamp = Date.now();
    const payload = { gameId, ...moveData, timestamp };
    this.lastProcessedTimes['game'] = timestamp;
    this.emit('game', payload);

    await this.writeSync({
      game: payload,
    });
  }
}

export const RealtimeService = new RealtimeServiceManager();
export default RealtimeService;
