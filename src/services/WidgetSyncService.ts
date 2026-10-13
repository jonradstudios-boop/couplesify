import StorageService, { SharedDoodle } from './StorageService';
import RealtimeService from './RealtimeService';

export const WidgetSyncService = {
  /**
   * Pushes the canvas doodle to the shared partner widget
   */
  async syncDoodleToWidget(doodle: SharedDoodle): Promise<{ success: boolean; message: string }> {
    try {
      // 1. Cache to local storage
      await StorageService.saveSharedDoodle(doodle);

      // 2. Broadcast to Realtime WebSocket channel for instant partner screen update
      await RealtimeService.broadcastDoodle(doodle);

      return {
        success: true,
        message: 'Doodle successfully synced to partner widget! 💕',
      };
    } catch (err: any) {
      return {
        success: false,
        message: err.message || 'Failed to sync widget doodle',
      };
    }
  },

  /**
   * Generates sample doodle points for initial preview
   */
  getDefaultHeartDoodle(): SharedDoodle {
    return {
      id: 'default-heart',
      strokes: [
        {
          color: '#FF6575',
          width: 5,
          points: [
            { x: 140, y: 100 },
            { x: 120, y: 70 },
            { x: 90, y: 70 },
            { x: 70, y: 95 },
            { x: 70, y: 125 },
            { x: 140, y: 190 },
            { x: 210, y: 125 },
            { x: 210, y: 95 },
            { x: 190, y: 70 },
            { x: 160, y: 70 },
            { x: 140, y: 100 },
          ],
        },
        {
          color: '#8F78D2',
          width: 3,
          points: [
            { x: 110, y: 110 },
            { x: 120, y: 120 },
            { x: 160, y: 120 },
            { x: 170, y: 110 },
          ],
        },
      ],
      updatedAt: Date.now(),
      author: 'You',
      previewEmoji: '💖',
    };
  },
};

export default WidgetSyncService;
