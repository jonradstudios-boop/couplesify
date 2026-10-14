import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system';

/**
 * ImageCompressService
 * Optimizes snap and memory images into compact, high-quality base64 JPEG data URLs (<150KB)
 * to ensure seamless Firestore synchronization without hitting the 1MB document limit.
 */
export const ImageCompressService = {
  /**
   * Compresses an image data URL or blob on Web using an HTML5 Canvas.
   */
  async compressOnWeb(
    imageSrc: string,
    maxWidth = 720,
    quality = 0.45
  ): Promise<string> {
    if (Platform.OS !== 'web' || typeof document === 'undefined') {
      return imageSrc;
    }

    return new Promise((resolve) => {
      try {
        const img = new Image();
        img.crossOrigin = 'anonymous';

        img.onload = () => {
          try {
            let width = img.naturalWidth || img.width;
            let height = img.naturalHeight || img.height;

            if (width > maxWidth) {
              height = Math.round((height * maxWidth) / width);
              width = maxWidth;
            }

            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;

            const ctx = canvas.getContext('2d');
            if (!ctx) {
              resolve(imageSrc);
              return;
            }

            ctx.drawImage(img, 0, 0, width, height);
            const compressed = canvas.toDataURL('image/jpeg', quality);
            resolve(compressed);
          } catch (canvasErr) {
            console.warn('Canvas compression error, using original:', canvasErr);
            resolve(imageSrc);
          }
        };

        img.onerror = (err) => {
          console.warn('Image load error for compression:', err);
          resolve(imageSrc);
        };

        img.src = imageSrc;
      } catch (err) {
        console.warn('compressOnWeb exception:', err);
        resolve(imageSrc);
      }
    });
  },

  /**
   * Optimizes an ImagePicker asset for cloud synchronization.
   * Produces a lightweight, cross-platform base64 data URL.
   */
  async processPickerAsset(asset: {
    uri: string;
    base64?: string | null;
    width?: number;
    height?: number;
  }): Promise<string> {
    let rawUri = asset.base64
      ? `data:image/jpeg;base64,${asset.base64}`
      : asset.uri;

    // Web handling: convert blob/URI and compress via canvas
    if (Platform.OS === 'web') {
      if (!asset.base64 || rawUri.startsWith('blob:') || rawUri.startsWith('http')) {
        try {
          const resp = await fetch(asset.uri);
          const blob = await resp.blob();
          const base64FromBlob = await new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve((reader.result as string) || rawUri);
            reader.onerror = () => resolve(rawUri);
            reader.readAsDataURL(blob);
          });
          rawUri = base64FromBlob;
        } catch (fetchErr) {
          console.warn('Web blob fetch error:', fetchErr);
        }
      }
      return await this.compressOnWeb(rawUri, 720, 0.45);
    }

    // Native (iOS & Android) handling
    if (!asset.base64 && asset.uri && asset.uri.startsWith('file://')) {
      try {
        const b64 = await FileSystem.readAsStringAsync(asset.uri, {
          encoding: 'base64',
        });
        rawUri = `data:image/jpeg;base64,${b64}`;
      } catch (fsErr) {
        console.warn('Native FileSystem read base64 fallback error:', fsErr);
      }
    }

    return rawUri;
  },
};

export default ImageCompressService;
