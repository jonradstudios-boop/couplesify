import supabase from './SupabaseClient';
import { ChatMessage, SharedDoodle } from './StorageService';

type EventCallback<T = any> = (data: T) => void;

class RealtimeServiceManager {
  private listeners: { [event: string]: EventCallback[] } = {};
  private activeChannel: any = null;
  private pairingCode: string = 'LOVE-77';

  constructor() {
    this.initSupabaseChannel();
  }

  public setPairingCode(code: string) {
    this.pairingCode = code;
    this.initSupabaseChannel();
  }

  private initSupabaseChannel() {
    try {
      if (this.activeChannel) {
        supabase.removeChannel(this.activeChannel);
      }

      this.activeChannel = supabase.channel(`couple_${this.pairingCode}`)
        .on('broadcast', { event: 'mood' }, (payload) => {
          this.emit('mood', payload.payload);
        })
        .on('broadcast', { event: 'doodle' }, (payload) => {
          this.emit('doodle', payload.payload);
        })
        .on('broadcast', { event: 'message' }, (payload) => {
          this.emit('message', payload.payload);
        })
        .on('broadcast', { event: 'nudge' }, (payload) => {
          this.emit('nudge', payload.payload);
        })
        .on('broadcast', { event: 'game' }, (payload) => {
          this.emit('game', payload.payload);
        })
        .subscribe();
    } catch {
      // In offline / fallback mode, channel listeners remain active locally
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
      cbs.forEach((cb) => cb(data));
    }
  }

  public async broadcastMood(mood: string) {
    this.emit('mood', { mood, timestamp: Date.now() });
    try {
      if (this.activeChannel) {
        await this.activeChannel.send({
          type: 'broadcast',
          event: 'mood',
          payload: { mood, timestamp: Date.now() },
        });
      }
    } catch {
      // Offline fallback
    }
  }

  public async broadcastDoodle(doodle: SharedDoodle) {
    this.emit('doodle', doodle);
    try {
      if (this.activeChannel) {
        await this.activeChannel.send({
          type: 'broadcast',
          event: 'doodle',
          payload: doodle,
        });
      }
    } catch {
      // Offline fallback
    }
  }

  public async broadcastMessage(message: ChatMessage) {
    this.emit('message', message);
    try {
      if (this.activeChannel) {
        await this.activeChannel.send({
          type: 'broadcast',
          event: 'message',
          payload: message,
        });
      }
    } catch {
      // Offline fallback
    }
  }

  public async broadcastLoveNudge(sender: string = 'You') {
    const payload = {
      sender,
      timestamp: Date.now(),
      text: `${sender} sent a warm romantic squeeze! 💕`,
    };
    this.emit('nudge', payload);

    try {
      if (this.activeChannel) {
        await this.activeChannel.send({
          type: 'broadcast',
          event: 'nudge',
          payload,
        });
      }
    } catch {
      // Offline fallback
    }
  }

  public async broadcastGameMove(gameId: string, moveData: any) {
    const payload = { gameId, ...moveData };
    this.emit('game', payload);
    try {
      if (this.activeChannel) {
        await this.activeChannel.send({
          type: 'broadcast',
          event: 'game',
          payload,
        });
      }
    } catch {
      // Offline fallback
    }
  }
}

export const RealtimeService = new RealtimeServiceManager();
export default RealtimeService;
