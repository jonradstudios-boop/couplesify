import React, { useState, useEffect, useRef } from 'react';
import {
  Text,
  Image,
  StyleSheet,
  Animated,
  StyleProp,
  ViewStyle,
  ImageStyle,
} from 'react-native';

// Google Noto Animated Emoji CDN base URL
const NOTO_CDN = 'https://fonts.gstatic.com/s/e/notoemoji/latest';

// Comprehensive dictionary mapping Unicode emojis to official Google Noto animated GIF endpoints
export const EMOJI_GIF_MAP: Record<string, string> = {
  // Mood Emojis
  '🥰': `${NOTO_CDN}/1f970/512.gif`, // Loving (Smiling face with hearts)
  '🥺': `${NOTO_CDN}/1f97a/512.gif`, // Needy (Pleading face)
  '🧸': `${NOTO_CDN}/1f43b/512.gif`, // Cuddly (Cute animated bear face)
  '🐻': `${NOTO_CDN}/1f43b/512.gif`, // Bear
  '😴': `${NOTO_CDN}/1f634/512.gif`, // Sleepy (Sleeping face)
  '🥳': `${NOTO_CDN}/1f973/512.gif`, // Excited (Partying face)
  '😤': `${NOTO_CDN}/1f624/512.gif`, // Grumpy (Face with steam)
  '😍': `${NOTO_CDN}/1f60d/512.gif`, // Heart eyes
  '😜': `${NOTO_CDN}/1f61c/512.gif`, // Playful
  '🫂': `${NOTO_CDN}/1fac2/512.gif`, // People hugging

  // Love Nudges
  '🤗': `${NOTO_CDN}/1f917/512.gif`, // Warm Squeeze (Hugging face)
  '💌': `${NOTO_CDN}/1f48c/512.gif`, // Miss You Ping (Love letter)
  '💋': `${NOTO_CDN}/1f48b/512.gif`, // Kiss Alert (Kiss mark)

  // Romantic & Couple Icons
  '❤️': `${NOTO_CDN}/2764_fe0f/512.gif`, // Beating Red Heart
  '💖': `${NOTO_CDN}/1f496/512.gif`, // Sparkling Heart
  '💕': `${NOTO_CDN}/1f495/512.gif`, // Two Hearts
  '✨': `${NOTO_CDN}/2728/512.gif`, // Sparkles
  '🔥': `${NOTO_CDN}/1f525/512.gif`, // Fire
  '🌹': `${NOTO_CDN}/1f339/512.gif`, // Rose
  '💍': `${NOTO_CDN}/1f48d/512.gif`, // Ring

  // Games & Activities
  '🎡': `${NOTO_CDN}/1f3a1/512.gif`, // Roulette / Ferris wheel
  '🎲': `${NOTO_CDN}/1f3b2/512.gif`, // Dice
  '🙈': `${NOTO_CDN}/1f648/512.gif`, // See-no-evil monkey
  '🎯': `${NOTO_CDN}/1f3af/512.gif`, // Bullseye / Dart
  '🃏': `${NOTO_CDN}/1f48c/512.gif`, // Card / Love note
};

/**
 * Helper to resolve the best animated GIF URL for any emoji character or label.
 */
export function getEmojiGifUrl(emojiOrLabel?: string): string | null {
  if (!emojiOrLabel) return null;

  // Direct match in map
  for (const [key, url] of Object.entries(EMOJI_GIF_MAP)) {
    if (emojiOrLabel.includes(key)) {
      return url;
    }
  }

  // Label heuristics
  const lower = emojiOrLabel.toLowerCase();
  if (lower.includes('loving') || lower.includes('love')) return EMOJI_GIF_MAP['🥰'];
  if (lower.includes('needy') || lower.includes('pleading')) return EMOJI_GIF_MAP['🥺'];
  if (lower.includes('cuddly') || lower.includes('cuddle')) return EMOJI_GIF_MAP['🧸'];
  if (lower.includes('sleepy') || lower.includes('sleep')) return EMOJI_GIF_MAP['😴'];
  if (lower.includes('excited') || lower.includes('party')) return EMOJI_GIF_MAP['🥳'];
  if (lower.includes('grumpy') || lower.includes('mad')) return EMOJI_GIF_MAP['😤'];
  if (lower.includes('squeeze') || lower.includes('hug')) return EMOJI_GIF_MAP['🤗'];
  if (lower.includes('miss') || lower.includes('letter')) return EMOJI_GIF_MAP['💌'];
  if (lower.includes('kiss')) return EMOJI_GIF_MAP['💋'];
  if (lower.includes('heart')) return EMOJI_GIF_MAP['❤️'];

  return null;
}

interface AnimatedGifEmojiProps {
  emoji?: string;
  gifUrl?: string;
  size?: number;
  style?: StyleProp<ViewStyle>;
  imageStyle?: StyleProp<ImageStyle>;
  autoFloat?: boolean;
  isSelected?: boolean;
}

function extractFirstEmoji(str?: string): string {
  if (!str) return '💕';
  const match = str.match(/[\p{Extended_Pictographic}\uD83C-\uDBFF\uDC00-\uDFFF]/u);
  return match ? match[0] : (str.length <= 2 ? str : '💕');
}

export const AnimatedGifEmoji: React.FC<AnimatedGifEmojiProps> = ({
  emoji,
  gifUrl,
  size = 32,
  style,
  imageStyle,
  autoFloat = true,
  isSelected = false,
}) => {
  const [hasError, setHasError] = useState(false);
  const floatAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  const resolvedUrl = gifUrl || (emoji ? getEmojiGifUrl(emoji) : null);

  useEffect(() => {
    if (!autoFloat) return;

    // Organic gentle floating / breathing loop
    const floatLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim, {
          toValue: -2.5,
          duration: 1100,
          useNativeDriver: true,
        }),
        Animated.timing(floatAnim, {
          toValue: 2.5,
          duration: 1200,
          useNativeDriver: true,
        }),
        Animated.timing(floatAnim, {
          toValue: 0,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    );

    floatLoop.start();
    return () => floatLoop.stop();
  }, [autoFloat, floatAnim]);

  useEffect(() => {
    if (isSelected) {
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.18,
          duration: 180,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1.08,
          duration: 160,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.timing(pulseAnim, {
        toValue: 1,
        duration: 160,
        useNativeDriver: true,
      }).start();
    }
  }, [isSelected, pulseAnim]);

  const animatedTransform = [
    { translateY: autoFloat ? floatAnim : 0 },
    { scale: pulseAnim },
  ];

  return (
    <Animated.View
      style={[
        styles.container,
        { width: size, height: size },
        { transform: animatedTransform },
        style,
      ]}
    >
      {resolvedUrl && !hasError ? (
        <Image
          source={{ uri: resolvedUrl }}
          style={[styles.gifImage, { width: size, height: size }, imageStyle]}
          resizeMode="contain"
          onError={() => setHasError(true)}
        />
      ) : (
        <Text
          style={[styles.fallbackEmoji, { fontSize: size * 0.72 }]}
          numberOfLines={1}
        >
          {extractFirstEmoji(emoji)}
        </Text>
      )}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  gifImage: {
    backgroundColor: 'transparent',
  },
  fallbackEmoji: {
    textAlign: 'center',
  },
});

export default AnimatedGifEmoji;
