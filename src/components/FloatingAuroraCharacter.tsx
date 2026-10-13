/**
 * FloatingAuroraCharacter Component
 * 
 * An ethereal, minimalist 3D character floating gently on a clean off-white background.
 * Features:
 * - Diffused glowing sphere of flowing aurora light (cyan, violet, soft blue gradients)
 * - Geometric Notion-style minimalist face (curved eyebrows, dot eyes, "L" shaped nose line)
 * - Organic floating animation with vertical bobbing, breathing scale, and gentle tilt
 * - Multi-layer ethereal ambient aura glow with cyan/violet luminescence
 * - Interactive tap feedback with haptic response and playful float surge
 */

import React, { useEffect, useRef } from 'react';
import {
  View,
  Image,
  StyleSheet,
  Animated,
  Easing,
  TouchableOpacity,
  StyleProp,
  ViewStyle,
  Platform,
} from 'react-native';
import * as Haptics from 'expo-haptics';

interface FloatingAuroraCharacterProps {
  /** Diameter of the character in pixels (default: 110) */
  size?: number;
  /** Optional custom container style */
  style?: StyleProp<ViewStyle>;
  /** Optional tap callback */
  onPress?: () => void;
}

export const FloatingAuroraCharacter: React.FC<FloatingAuroraCharacterProps> = ({
  size = 110,
  style,
  onPress,
}) => {
  // Animation drivers
  const floatAnim = useRef(new Animated.Value(0)).current;
  const breathAnim = useRef(new Animated.Value(0)).current;
  const auraPulseAnim = useRef(new Animated.Value(0)).current;
  const tapScaleAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // 1. Continuous smooth vertical float loop (gentle bobbing)
    const floatLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim, {
          toValue: 1,
          duration: 3200,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(floatAnim, {
          toValue: 0,
          duration: 3200,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    );

    // 2. Subtle organic breathing / scaling loop
    const breathLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(breathAnim, {
          toValue: 1,
          duration: 4000,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(breathAnim, {
          toValue: 0,
          duration: 4000,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    );

    // 3. Ethereal aura glow pulse
    const auraLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(auraPulseAnim, {
          toValue: 1,
          duration: 2600,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(auraPulseAnim, {
          toValue: 0,
          duration: 2600,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ])
    );

    floatLoop.start();
    breathLoop.start();
    auraLoop.start();

    return () => {
      floatLoop.stop();
      breathLoop.stop();
      auraLoop.stop();
    };
  }, [floatAnim, breathAnim, auraPulseAnim]);

  const handlePress = () => {
    if (Platform.OS !== 'web') {
      try {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      } catch {
        // Ignore haptics failure if unsupported
      }
    }
    // Playful bounce on tap
    Animated.sequence([
      Animated.spring(tapScaleAnim, {
        toValue: 1.12,
        friction: 3,
        tension: 100,
        useNativeDriver: true,
      }),
      Animated.spring(tapScaleAnim, {
        toValue: 1,
        friction: 4,
        tension: 80,
        useNativeDriver: true,
      }),
    ]).start();

    onPress?.();
  };

  // Interpolated transforms
  const translateY = floatAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-7, 7],
  });

  const rotate = floatAnim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: ['-1.5deg', '0.5deg', '1.5deg'],
  });

  const breathScale = breathAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.97, 1.03],
  });

  const auraOpacity = auraPulseAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.35, 0.75],
  });

  const auraScale = auraPulseAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1.02, 1.18],
  });

  const combinedScale = Animated.multiply(breathScale, tapScaleAnim);

  return (
    <View style={[styles.rootContainer, { width: size + 36, height: size + 36 }, style]}>
      <TouchableOpacity
        activeOpacity={0.9}
        onPress={handlePress}
        style={styles.touchable}
      >
        {/* Outer Ethereal Aurora Halo Glow 1 (Cyan / Soft Blue) */}
        <Animated.View
          pointerEvents="none"
          style={[
            styles.haloGlow,
            styles.haloCyan,
            {
              width: size + 24,
              height: size + 24,
              borderRadius: (size + 24) / 2,
              opacity: auraOpacity,
              transform: [{ scale: auraScale }],
            },
          ]}
        />

        {/* Outer Ethereal Aurora Halo Glow 2 (Violet / Romantic Pink) */}
        <Animated.View
          pointerEvents="none"
          style={[
            styles.haloGlow,
            styles.haloViolet,
            {
              width: size + 16,
              height: size + 16,
              borderRadius: (size + 16) / 2,
              opacity: auraOpacity,
              transform: [
                {
                  scale: auraPulseAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [1.14, 1.02],
                  }),
                },
              ],
            },
          ]}
        />

        {/* Floating Animated Character Sphere */}
        <Animated.View
          style={[
            styles.sphereContainer,
            {
              width: size,
              height: size,
              borderRadius: size / 2,
              transform: [
                { translateY },
                { rotate },
                { scale: combinedScale },
              ],
            },
          ]}
        >
          <Image
            source={require('../../assets/aurora_avatar.jpg')}
            style={[
              styles.avatarImage,
              {
                width: size,
                height: size,
                borderRadius: size / 2,
              },
            ]}
            resizeMode="cover"
          />

          {/* Ethereal Soft Light Lens Overlay for Depth */}
          <View
            pointerEvents="none"
            style={[
              styles.lensHighlight,
              {
                width: size,
                height: size,
                borderRadius: size / 2,
              },
            ]}
          />
        </Animated.View>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  rootContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  touchable: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  haloGlow: {
    position: 'absolute',
  },
  haloCyan: {
    backgroundColor: '#7FE5F0',
    shadowColor: '#38BDF8',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 24,
    elevation: 8,
  },
  haloViolet: {
    backgroundColor: '#E0AAFF',
    shadowColor: '#C084FC',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 6,
  },
  sphereContainer: {
    backgroundColor: '#FAF9FB',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    borderWidth: 2.5,
    borderColor: 'rgba(255, 255, 255, 0.95)',
    shadowColor: '#818CF8',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.35,
    shadowRadius: 22,
    elevation: 10,
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  lensHighlight: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.4)',
  },
});

export default FloatingAuroraCharacter;
