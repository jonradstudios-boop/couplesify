import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Easing,
  Dimensions,
  Platform,
  TouchableOpacity,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import AppFonts from '../theme/AppFonts';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const isNative = Platform.OS !== 'web';

interface RedCurtainOpeningProps {
  onFinish: () => void;
  /** Optional start delay (ms) */
  startDelay?: number;
}

export const RedCurtainOpening: React.FC<RedCurtainOpeningProps> = ({
  onFinish,
}) => {
  // Overall overlay opacity for smooth exit
  const containerOpacity = useRef(new Animated.Value(1)).current;

  // Center golden seal scale & opacity
  const sealScale = useRef(new Animated.Value(1)).current;
  const sealOpacity = useRef(new Animated.Value(1)).current;

  // Romantic light flash behind curtains
  const lightFlash = useRef(new Animated.Value(0)).current;

  // Floating sparkle embers
  const sparklesAnim = useRef(new Animated.Value(0)).current;

  const hasFinished = useRef(false);

  const handleFinish = () => {
    if (hasFinished.current) return;
    hasFinished.current = true;
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}

    Animated.timing(containerOpacity, {
      toValue: 0,
      duration: 450,
      easing: Easing.out(Easing.quad),
      useNativeDriver: isNative,
    }).start(() => {
      onFinish();
    });
  };

  useEffect(() => {
    // Gentle initial haptic
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch {}

    // Timeline synchronized with the 6.1s fast-forwarded video:
    // 0.0s - 1.4s: Closed curtains hold + gleaming golden seal
    // 1.4s: Curtains start parting, seal pops & dissolves, embers drift
    // 5.7s - 6.2s: Curtains fully open at edges, overlay fades out smoothly

    const sealTimer = setTimeout(() => {
      try {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      } catch {}

      // Seal dissolves & sparkles float outward as curtains open
      Animated.parallel([
        Animated.sequence([
          Animated.timing(sealScale, {
            toValue: 1.25,
            duration: 250,
            easing: Easing.out(Easing.quad),
            useNativeDriver: isNative,
          }),
          Animated.parallel([
            Animated.timing(sealScale, {
              toValue: 0.1,
              duration: 450,
              useNativeDriver: isNative,
            }),
            Animated.timing(sealOpacity, {
              toValue: 0,
              duration: 400,
              useNativeDriver: isNative,
            }),
          ]),
        ]),
        // Light flash beam in parting center
        Animated.sequence([
          Animated.timing(lightFlash, {
            toValue: 0.8,
            duration: 400,
            useNativeDriver: isNative,
          }),
          Animated.timing(lightFlash, {
            toValue: 0,
            duration: 900,
            useNativeDriver: isNative,
          }),
        ]),
        // Floating sparkles
        Animated.timing(sparklesAnim, {
          toValue: 1,
          duration: 1500,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: isNative,
        }),
      ]).start();
    }, 1400);

    // Complete curtain reveal after ~6.1 seconds
    const completeTimer = setTimeout(() => {
      handleFinish();
    }, 6100);

    return () => {
      clearTimeout(sealTimer);
      clearTimeout(completeTimer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Animated.View
      style={[
        styles.fullscreenOverlay,
        {
          opacity: containerOpacity,
        },
      ]}
      pointerEvents="box-none"
    >
      {/* Real Green-Screen-Removed Fast-Forwarded Curtain Animation (WebP 6.1s) */}
      <Image
        source={require('../../assets/curtain_opening.webp')}
        style={styles.curtainMedia}
        resizeMode="cover"
      />

      {/* Center Golden Couple Seal (shown while curtains are closed, dissolves on open) */}
      <Animated.View
        style={[
          styles.centerSealContainer,
          {
            opacity: sealOpacity,
            transform: [{ scale: sealScale }],
          },
        ]}
      >
        <View style={styles.sealCircle}>
          <Ionicons name="heart" size={32} color="#FFFFFF" />
        </View>
        <Text style={styles.sealBrandTitle}>COUPLESIFY</Text>
        <Text style={styles.sealSubtitle}>A Private World for Two 💕</Text>
      </Animated.View>

      {/* Radiant Glow in Parting Center */}
      <Animated.View
        style={[
          styles.lightGlowBeam,
          {
            opacity: lightFlash,
          },
        ]}
      />

      {/* Romantic Embers drifting out */}
      <Animated.View
        style={[
          styles.sparklesOverlay,
          {
            opacity: sealOpacity.interpolate({
              inputRange: [0, 1],
              outputRange: [0.8, 0],
            }),
          },
        ]}
        pointerEvents="none"
      >
        <View style={styles.sparkle1}>
          <Ionicons name="sparkles" size={18} color="#FFD700" />
        </View>
        <View style={styles.sparkle2}>
          <Ionicons name="heart" size={16} color="#FF6575" />
        </View>
        <View style={styles.sparkle3}>
          <Ionicons name="sparkles" size={14} color="#FFF5F7" />
        </View>
      </Animated.View>

      {/* Quick Skip Button in Top Right */}
      <TouchableOpacity
        style={styles.skipButton}
        onPress={handleFinish}
        activeOpacity={0.8}
      >
        <Text style={styles.skipButtonText}>Skip</Text>
        <Ionicons name="arrow-forward" size={13} color="#FFFFFF" style={{ marginLeft: 3 }} />
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  fullscreenOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 99999,
    elevation: 99999,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  curtainMedia: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
    position: 'absolute',
    top: 0,
    left: 0,
  },
  centerSealContainer: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  sealCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: '#FF6575',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#FF2D55',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.45,
    shadowRadius: 14,
    elevation: 8,
    borderWidth: 2.5,
    borderColor: '#FFFFFF',
    marginBottom: 10,
  },
  sealBrandTitle: {
    fontFamily: AppFonts.title,
    fontSize: 22,
    letterSpacing: 3,
    color: '#FFFFFF',
    textShadowColor: 'rgba(0, 0, 0, 0.65)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 6,
  },
  sealSubtitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFE8EC',
    marginTop: 4,
    textShadowColor: 'rgba(0, 0, 0, 0.55)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  lightGlowBeam: {
    position: 'absolute',
    width: 120,
    height: '100%',
    backgroundColor: 'rgba(255, 245, 220, 0.35)',
    zIndex: 5,
  },
  sparklesOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 8,
  },
  sparkle1: {
    position: 'absolute',
    top: '42%',
    left: '32%',
  },
  sparkle2: {
    position: 'absolute',
    top: '46%',
    right: '32%',
  },
  sparkle3: {
    position: 'absolute',
    top: '52%',
    left: '48%',
  },
  skipButton: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 52 : 36,
    right: 20,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.35)',
    zIndex: 20,
  },
  skipButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
});

export default RedCurtainOpening;
