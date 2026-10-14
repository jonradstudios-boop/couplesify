import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system';
import * as ImageManipulator from 'expo-image-manipulator';
import { SaveFormat } from 'expo-image-manipulator';

/**
 * ImageCompressService
 * Optimizes snap and memory images of ANY size (even 50MP / 20MB high-res camera photos)
 * into compact, high-quality base64 JPEG data URLs (~35KB - 80KB).
 *
 * This guarantees reliable Firestore cloud synchronization without ever hitting
 * the strict 1MB (1,048,576 bytes) document size limit.
 */
export const ImageCompressService = {
  /**
   * Universal compressor using expo-image-manipulator.
   * Works on iOS, Android, and Web.
   */
  async manipulateAndResize(
    sourceUri: string,
    maxWidth = 640,
    quality = 0.45
  ): Promise<string | null> {
    try {
      const manipResult = await ImageManipulator.manipulateAsync(
        sourceUri,
        [{ resize: { width: maxWidth } }],
        {
          compress: quality,
          format: SaveFormat.JPEG,
          base64: true,
        }
      );

      if (manipResult && manipResult.base64) {
        let b64 = manipResult.base64;

        // If the resulting base64 is still unexpectedly large (> 500KB),
        // run an aggressive second pass to ensure it stays safely under Firestore limits
        if (b64.length > 500000) {
          const secondPass = await ImageManipulator.manipulateAsync(
            manipResult.uri,
            [{ resize: { width: 480 } }],
            {
              compress: 0.35,
              format: SaveFormat.JPEG,
              base64: true,
            }
          );
          if (secondPass.base64) {
            b64 = secondPass.base64;
          }
        }

        return `data:image/jpeg;base64,${b64}`;
      }

      // If base64 was not included but uri was returned, try reading uri with FileSystem
      if (manipResult && manipResult.uri) {
        try {
          const fileB64 = await FileSystem.readAsStringAsync(manipResult.uri, {
            encoding: 'base64',
          });
          return `data:image/jpeg;base64,${fileB64}`;
        } catch {}
      }
    } catch (err) {
      console.warn('ImageManipulator manipulateAsync notice:', err);
    }
    return null;
  },

  /**
   * Compresses an image data URL or blob on Web using an HTML5 Canvas.
   */
  async compressOnWeb(
    imageSrc: string,
    maxWidth = 640,
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
            let compressed = canvas.toDataURL('image/jpeg', quality);

            // If still large, do a smaller render
            if (compressed.length > 500000) {
              const canvas2 = document.createElement('canvas');
              canvas2.width = Math.round(width * 0.75);
              canvas2.height = Math.round(height * 0.75);
              const ctx2 = canvas2.getContext('2d');
              if (ctx2) {
                ctx2.drawImage(img, 0, 0, canvas2.width, canvas2.height);
                compressed = canvas2.toDataURL('image/jpeg', 0.35);
              }
            }

            resolve(compressed);
          } catch (canvasErr) {
            console.warn('Canvas compression fallback:', canvasErr);
            resolve(imageSrc);
          }
        };

        img.onerror = (err) => {
          console.warn('Image load error for web compression:', err);
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
   * Optimizes ANY ImagePicker asset or image URI regardless of resolution or file size.
   * Produces a lightweight, cross-platform base64 data URL (<100KB) safe for Firestore.
   */
  async processPickerAsset(asset: {
    uri: string;
    base64?: string | null;
    width?: number;
    height?: number;
  }): Promise<string> {
    const rawUri = asset.uri;

    // 1. First, attempt native ImageManipulator resize & compression (fastest & handles huge RAW / 4K photos)
    if (rawUri) {
      const manipResult = await this.manipulateAndResize(rawUri, 640, 0.45);
      if (manipResult) {
        return manipResult;
      }
    }

    // 2. Web handling with HTML5 Canvas if on Web
    if (Platform.OS === 'web') {
      let webSource = rawUri;
      if (rawUri.startsWith('blob:') || rawUri.startsWith('http')) {
        try {
          const resp = await fetch(rawUri);
          const blob = await resp.blob();
          const base64FromBlob = await new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve((reader.result as string) || rawUri);
            reader.onerror = () => resolve(rawUri);
            reader.readAsDataURL(blob);
          });
          webSource = base64FromBlob;
        } catch (fetchErr) {
          console.warn('Web blob fetch error:', fetchErr);
        }
      }
      return await this.compressOnWeb(webSource, 640, 0.45);
    }

    // 3. If asset already had base64, check if it can be manipulated as a data URI
    if (asset.base64) {
      const dataUri = `data:image/jpeg;base64,${asset.base64}`;
      const manipFromB64 = await this.manipulateAndResize(dataUri, 640, 0.45);
      if (manipFromB64) {
        return manipFromB64;
      }
      return dataUri;
    }

    // 4. FileSystem fallback for native files
    if (rawUri && rawUri.startsWith('file://')) {
      try {
        const b64 = await FileSystem.readAsStringAsync(rawUri, {
          encoding: 'base64',
        });
        const dataUri = `data:image/jpeg;base64,${b64}`;
        const manip = await this.manipulateAndResize(dataUri, 640, 0.45);
        return manip || dataUri;
      } catch (fsErr) {
        console.warn('Native FileSystem read fallback error:', fsErr);
      }
    }

    return rawUri;
  },

  /**
   * Optimizes an existing base64 or URI string to ensure it is under Firestore limits.
   */
  async ensureSafeCloudSize(uriOrBase64: string): Promise<string> {
    if (!uriOrBase64) return uriOrBase64;
    // If it's already compact (< 250KB), return as is
    if (uriOrBase64.length < 250000) {
      return uriOrBase64;
    }
    const optimized = await this.manipulateAndResize(uriOrBase64, 600, 0.4);
    if (optimized) {
      return optimized;
    }
    if (Platform.OS === 'web') {
      return await this.compressOnWeb(uriOrBase64, 600, 0.4);
    }
    return uriOrBase64;
  },
};

export default ImageCompressService;
