import React, { useEffect, useRef, useMemo } from 'react';
import {
  View,
  StyleSheet,
  Dimensions,
  Animated,
  Easing,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface HeartConfig {
  id: number;
  leftPercent: number; // 0 to 100
  size: number;
  duration: number;
  initialProgress: number;
  swayDistance: number;
  color: string;
  glowColor: string;
  maxOpacity: number;
  rotation: number;
}

// Curated romantic glowing heart particles
const PARTICLES: HeartConfig[] = [
  { id: 1, leftPercent: 6, size: 10, duration: 7500, initialProgress: 0.15, swayDistance: 14, color: '#FF8A96', glowColor: '#FF6575', maxOpacity: 0.65, rotation: -12 },
  { id: 2, leftPercent: 14, size: 16, duration: 9200, initialProgress: 0.65, swayDistance: 22, color: '#FF6575', glowColor: '#FF6575', maxOpacity: 0.75, rotation: 8 },
  { id: 3, leftPercent: 22, size: 9, duration: 6800, initialProgress: 0.35, swayDistance: 12, color: '#FFA4B0', glowColor: '#FF8A96', maxOpacity: 0.55, rotation: -6 },
  { id: 4, leftPercent: 30, size: 20, duration: 10500, initialProgress: 0.85, swayDistance: 26, color: '#FF6575', glowColor: '#FF4757', maxOpacity: 0.8, rotation: 15 },
  { id: 5, leftPercent: 38, size: 12, duration: 8100, initialProgress: 0.05, swayDistance: 16, color: '#FFB3BA', glowColor: '#FF8A96', maxOpacity: 0.6, rotation: -15 },
  { id: 6, leftPercent: 46, size: 15, duration: 9500, initialProgress: 0.45, swayDistance: 20, color: '#E3D9F8', glowColor: '#8F78D2', maxOpacity: 0.7, rotation: 10 },
  { id: 7, leftPercent: 54, size: 11, duration: 7200, initialProgress: 0.25, swayDistance: 15, color: '#FF8A96', glowColor: '#FF6575', maxOpacity: 0.65, rotation: -8 },
  { id: 8, leftPercent: 62, size: 18, duration: 10200, initialProgress: 0.75, swayDistance: 24, color: '#FF6575', glowColor: '#FF4757', maxOpacity: 0.75, rotation: 12 },
  { id: 9, leftPercent: 70, size: 9, duration: 6900, initialProgress: 0.5, swayDistance: 12, color: '#FFAAA6', glowColor: '#FF8A96', maxOpacity: 0.55, rotation: -10 },
  { id: 10, leftPercent: 78, size: 14, duration: 8800, initialProgress: 0.1, swayDistance: 18, color: '#FF8A96', glowColor: '#FF6575', maxOpacity: 0.7, rotation: 6 },
  { id: 11, leftPercent: 86, size: 21, duration: 11000, initialProgress: 0.9, swayDistance: 28, color: '#FF6575', glowColor: '#FF4757', maxOpacity: 0.85, rotation: -14 },
  { id: 12, leftPercent: 93, size: 10, duration: 7800, initialProgress: 0.4, swayDistance: 14, color: '#FFB3BA', glowColor: '#FF8A96', maxOpacity: 0.6, rotation: 9 },
  { id: 13, leftPercent: 18, size: 13, duration: 8400, initialProgress: 0.8, swayDistance: 16, color: '#FF708F', glowColor: '#FF6575', maxOpacity: 0.7, rotation: -5 },
  { id: 14, leftPercent: 42, size: 8, duration: 6400, initialProgress: 0.6, swayDistance: 10, color: '#FFA4B0', glowColor: '#FF8A96', maxOpacity: 0.5, rotation: 14 },
  { id: 15, leftPercent: 66, size: 15, duration: 9100, initialProgress: 0.3, swayDistance: 20, color: '#E3D9F8', glowColor: '#8F78D2', maxOpacity: 0.65, rotation: -11 },
  { id: 16, leftPercent: 82, size: 12, duration: 8600, initialProgress: 0.7, swayDistance: 15, color: '#FF8A96', glowColor: '#FF6575', maxOpacity: 0.65, rotation: 7 },
];

interface SingleFallingHeartProps {
  particle: HeartConfig;
  screenHeight: number;
}

const SingleFallingHeart: React.FC<SingleFallingHeartProps> = React.memo(({ particle, screenHeight }) => {
  const anim = useRef(new Animated.Value(particle.initialProgress)).current;

  useEffect(() => {
    let active = true;

    // Phase 1: Animate from initialProgress to 1 so particles already populate the screen on boot
    const remainingTime = Math.max(1200, particle.duration * (1 - particle.initialProgress));
    Animated.timing(anim, {
      toValue: 1,
      duration: remainingTime,
      easing: Easing.linear,
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (!finished || !active) return;

      // Phase 2: Infinite nonstop loop from 0 to 1
      anim.setValue(0);
      const loop = Animated.loop(
        Animated.timing(anim, {
          toValue: 1,
          duration: particle.duration,
          easing: Easing.linear,
          useNativeDriver: true,
        })
      );
      loop.start();
    });

    return () => {
      active = false;
      anim.stopAnimation();
    };
  }, [anim, particle.duration, particle.initialProgress]);

  // Falling down the screen smoothly
  const translateY = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [-45, screenHeight + 45],
  });

  // Soft horizontal sway (drift back and forth)
  const translateX = anim.interpolate({
    inputRange: [0, 0.25, 0.5, 0.75, 1],
    outputRange: [0, particle.swayDistance, 0, -particle.swayDistance, 0],
  });

  // Subtle flutter rotation
  const rotate = anim.interpolate({
    inputRange: [0, 0.25, 0.5, 0.75, 1],
    outputRange: [
      `${particle.rotation - 8}deg`,
      `${particle.rotation + 8}deg`,
      `${particle.rotation - 6}deg`,
      `${particle.rotation + 10}deg`,
      `${particle.rotation - 8}deg`,
    ],
  });

  // Fade in at top, pulse gently, fade out at bottom
  const opacity = anim.interpolate({
    inputRange: [0, 0.1, 0.82, 1],
    outputRange: [0, particle.maxOpacity, particle.maxOpacity, 0],
  });

  // Breathing pulse scale
  const scale = anim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0.92, 1.08, 0.94],
  });

  const haloSize = particle.size * 2.2;

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.heartParticleWrapper,
        {
          left: `${particle.leftPercent}%`,
          transform: [{ translateY }, { translateX }, { rotate }, { scale }],
          opacity,
        },
      ]}
    >
      {/* Soft Ambient Glow Halo */}
      <View
        style={[
          styles.glowHalo,
          {
            width: haloSize,
            height: haloSize,
            borderRadius: haloSize / 2,
            backgroundColor: `${particle.color}24`,
          },
        ]}
      />

      {/* Radiant Glowing Heart Glyph */}
      <Ionicons
        name="heart"
        size={particle.size}
        color={particle.color}
        style={{
          shadowColor: particle.glowColor,
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: 0.85,
          shadowRadius: particle.size * 0.7,
          elevation: 3,
          ...(Platform.OS === 'web'
            ? ({
                filter: `drop-shadow(0px 0px ${Math.round(particle.size * 0.55)}px ${particle.glowColor})`,
              } as any)
            : {}),
        }}
      />
    </Animated.View>
  );
});

SingleFallingHeart.displayName = 'SingleFallingHeart';

export const FallingHeartsBackground: React.FC = () => {
  const windowHeight = useMemo(() => Dimensions.get('window').height || 850, []);

  return (
    <View style={styles.absoluteContainer} pointerEvents="none">
      {PARTICLES.map((particle) => (
        <SingleFallingHeart
          key={particle.id}
          particle={particle}
          screenHeight={windowHeight}
        />
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  absoluteContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 0,
    overflow: 'hidden',
  },
  heartParticleWrapper: {
    position: 'absolute',
    top: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  glowHalo: {
    position: 'absolute',
    zIndex: -1,
  },
});

export default FallingHeartsBackground;
