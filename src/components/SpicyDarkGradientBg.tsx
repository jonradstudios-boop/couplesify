import React, { useEffect, useRef } from 'react';
import {
  View,
  StyleSheet,
  Dimensions,
  Animated,
  Platform,
  ViewStyle,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Defs, Pattern, Rect, Circle } from 'react-native-svg';

const { width } = Dimensions.get('window');
const isNative = Platform.OS !== 'web';

interface SpicyDarkGradientBgProps {
  children?: React.ReactNode;
  style?: ViewStyle;
}

/**
 * SpicyDarkGradientBg
 * 
 * Adapts the "elegant-dark-pattern" design into React Native with a deep purple
 * & sensual wine red blend, skewed radiant streaks, glowing nebulae, and subtle
 * micro-dot textures.
 */
export const SpicyDarkGradientBg: React.FC<SpicyDarkGradientBgProps> = ({
  children,
  style,
}) => {
  // Gentle breathing pulse for the ambient red & purple nebulae
  const pulseAnim = useRef(new Animated.Value(0.85)).current;

  useEffect(() => {
    const pulseLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.15,
          duration: 3500,
          useNativeDriver: isNative,
        }),
        Animated.timing(pulseAnim, {
          toValue: 0.85,
          duration: 3500,
          useNativeDriver: isNative,
        }),
      ])
    );
    pulseLoop.start();

    return () => pulseLoop.stop();
  }, [pulseAnim]);

  return (
    <View style={[styles.container, style]}>
      {/* 1. Base Layer: Multi-stop Deep Obsidian, Royal Purple & Wine Red Blend */}
      <LinearGradient
        colors={[
          '#0A000F', // Midnight obsidian
          '#18011F', // Velvet deep purple
          '#280126', // Rich sensual plum
          '#3C0125', // Deep crimson-purple blend
          '#4E0320', // Warm wine red
          '#250117', // Dark ruby ember
          '#08000A', // Pure abyss shadow
        ]}
        locations={[0, 0.16, 0.35, 0.55, 0.76, 0.9, 1]}
        start={{ x: 0.1, y: 0 }}
        end={{ x: 0.9, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      {/* 2. Pulsing Radial Nebulae / Color Orbs */}
      <Animated.View
        pointerEvents="none"
        style={[
          styles.nebulaOrbTopLeft,
          {
            transform: [{ scale: pulseAnim }],
          },
        ]}
      />
      <Animated.View
        pointerEvents="none"
        style={[
          styles.nebulaOrbCenterRight,
          {
            transform: [{ scale: Animated.multiply(pulseAnim, 0.95) }],
          },
        ]}
      />
      <Animated.View
        pointerEvents="none"
        style={[
          styles.nebulaOrbBottomLeft,
          {
            transform: [{ scale: pulseAnim }],
          },
        ]}
      />

      {/* 3. Skewed Fading Streaks (The signature VFX of elegant-dark-pattern in Red & Purple) */}
      <View pointerEvents="none" style={styles.streaksContainer}>
        {/* Streak 1: Electric Ruby */}
        <View style={[styles.streak, styles.streak1]}>
          <LinearGradient
            colors={['rgba(255, 30, 86, 0.28)', 'rgba(180, 0, 70, 0.08)', 'transparent']}
            style={StyleSheet.absoluteFill}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          />
        </View>

        {/* Streak 2: Royal Velvet Magenta */}
        <View style={[styles.streak, styles.streak2]}>
          <LinearGradient
            colors={['rgba(214, 0, 110, 0.22)', 'rgba(120, 0, 90, 0.06)', 'transparent']}
            style={StyleSheet.absoluteFill}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          />
        </View>

        {/* Streak 3: Sizzling Crimson */}
        <View style={[styles.streak, styles.streak3]}>
          <LinearGradient
            colors={['rgba(255, 50, 75, 0.24)', 'rgba(140, 5, 45, 0.05)', 'transparent']}
            style={StyleSheet.absoluteFill}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          />
        </View>

        {/* Streak 4: Electric Orchid Purple */}
        <View style={[styles.streak, styles.streak4]}>
          <LinearGradient
            colors={['rgba(168, 15, 120, 0.2)', 'rgba(80, 0, 70, 0.04)', 'transparent']}
            style={StyleSheet.absoluteFill}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          />
        </View>

        {/* Streak 5: Coral Glow Highlight */}
        <View style={[styles.streak, styles.streak5]}>
          <LinearGradient
            colors={['rgba(255, 100, 130, 0.16)', 'rgba(255, 30, 86, 0.04)', 'transparent']}
            style={StyleSheet.absoluteFill}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          />
        </View>
      </View>

      {/* 4. Subtle Micro-Dot Texture Grid Overlay */}
      <View pointerEvents="none" style={StyleSheet.absoluteFill}>
        <Svg width="100%" height="100%">
          <Defs>
            <Pattern id="spicyDots" width="22" height="22" patternUnits="userSpaceOnUse">
              <Circle cx="2" cy="2" r="1.1" fill="rgba(255, 120, 160, 0.16)" />
            </Pattern>
          </Defs>
          <Rect width="100%" height="100%" fill="url(#spicyDots)" />
        </Svg>
      </View>

      {/* 5. Vignette Shadow Overlay (Keeps text ultra-readable) */}
      <LinearGradient
        pointerEvents="none"
        colors={['transparent', 'rgba(10, 0, 12, 0.45)', 'rgba(6, 0, 8, 0.75)']}
        style={StyleSheet.absoluteFill}
        locations={[0.5, 0.85, 1]}
      />

      {/* 6. Children Content */}
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    position: 'relative',
    backgroundColor: '#0A000F',
    overflow: 'hidden',
  },

  // Color Orbs / Radial Nebulae
  nebulaOrbTopLeft: {
    position: 'absolute',
    top: -width * 0.35,
    left: -width * 0.3,
    width: width * 1.1,
    height: width * 1.1,
    borderRadius: (width * 1.1) / 2,
    backgroundColor: 'rgba(255, 20, 80, 0.18)',
  },
  nebulaOrbCenterRight: {
    position: 'absolute',
    top: '35%',
    right: -width * 0.35,
    width: width * 1.05,
    height: width * 1.05,
    borderRadius: (width * 1.05) / 2,
    backgroundColor: 'rgba(140, 0, 110, 0.22)',
  },
  nebulaOrbBottomLeft: {
    position: 'absolute',
    bottom: -width * 0.25,
    left: -width * 0.2,
    width: width * 0.95,
    height: width * 0.95,
    borderRadius: (width * 0.95) / 2,
    backgroundColor: 'rgba(196, 0, 60, 0.16)',
  },

  // Skewed Beams / Streaks
  streaksContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    overflow: 'hidden',
  },
  streak: {
    position: 'absolute',
    height: '140%',
    top: '-20%',
    borderRadius: 8,
  },
  streak1: {
    left: '8%',
    width: width * 0.28,
    transform: [{ skewX: '-35deg' }],
  },
  streak2: {
    left: '32%',
    width: width * 0.18,
    transform: [{ skewX: '-35deg' }],
  },
  streak3: {
    left: '52%',
    width: width * 0.32,
    transform: [{ skewX: '-35deg' }],
  },
  streak4: {
    left: '78%',
    width: width * 0.22,
    transform: [{ skewX: '-35deg' }],
  },
  streak5: {
    left: '-12%',
    width: width * 0.24,
    transform: [{ skewX: '-35deg' }],
  },
});

export default SpicyDarkGradientBg;
