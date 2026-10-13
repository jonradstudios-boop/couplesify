import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Animated,
  Easing,
  Dimensions,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';

interface SpicyChiliTransitionProps {
  visible: boolean;
  onComplete: () => void;
}

const { width, height } = Dimensions.get('window');

export const SpicyChiliTransition: React.FC<SpicyChiliTransitionProps> = ({
  visible,
  onComplete,
}) => {
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const shockwaveScale = useRef(new Animated.Value(0.5)).current;
  const shockwaveOpacity = useRef(new Animated.Value(0.9)).current;
  const textOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!visible) {
      scaleAnim.setValue(0);
      opacityAnim.setValue(0);
      rotateAnim.setValue(0);
      shockwaveScale.setValue(0.5);
      shockwaveOpacity.setValue(0.9);
      textOpacity.setValue(0);
      return;
    }

    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    } catch {}

    // 1. Fade backdrop in rapidly
    Animated.timing(opacityAnim, {
      toValue: 1,
      duration: 200,
      useNativeDriver: true,
    }).start();

    // 2. Explode the chili into center
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 1.25,
        friction: 4,
        tension: 90,
        useNativeDriver: true,
      }),
      Animated.sequence([
        Animated.timing(rotateAnim, {
          toValue: -15,
          duration: 90,
          useNativeDriver: true,
        }),
        Animated.timing(rotateAnim, {
          toValue: 15,
          duration: 90,
          useNativeDriver: true,
        }),
        Animated.timing(rotateAnim, {
          toValue: -8,
          duration: 90,
          useNativeDriver: true,
        }),
        Animated.timing(rotateAnim, {
          toValue: 0,
          duration: 90,
          useNativeDriver: true,
        }),
      ]),
      // Shockwave expansion
      Animated.parallel([
        Animated.timing(shockwaveScale, {
          toValue: 2.8,
          duration: 650,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(shockwaveOpacity, {
          toValue: 0,
          duration: 650,
          useNativeDriver: true,
        }),
      ]),
      // Text reveal
      Animated.timing(textOpacity, {
        toValue: 1,
        duration: 350,
        delay: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      // Haptic confirmation
      try {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      } catch {}

      // Hold for 400ms then fade out to unveil lounge
      setTimeout(() => {
        Animated.parallel([
          Animated.timing(opacityAnim, {
            toValue: 0,
            duration: 250,
            useNativeDriver: true,
          }),
          Animated.timing(scaleAnim, {
            toValue: 1.6,
            duration: 250,
            useNativeDriver: true,
          }),
        ]).start(() => {
          onComplete();
        });
      }, 550);
    });
  }, [visible, onComplete, scaleAnim, opacityAnim, rotateAnim, shockwaveScale, shockwaveOpacity, textOpacity]);

  if (!visible) return null;

  const spin = rotateAnim.interpolate({
    inputRange: [-15, 15],
    outputRange: ['-15deg', '15deg'],
  });

  return (
    <Modal visible={visible} transparent animationType="none">
      <Animated.View style={[styles.backdrop, { opacity: opacityAnim }]}>
        <LinearGradient
          colors={['rgba(35, 3, 45, 0.96)', 'rgba(74, 5, 48, 0.98)', 'rgba(16, 2, 22, 0.99)']}
          style={StyleSheet.absoluteFill}
        />

        {/* Pulsing Shockwave Rings */}
        <Animated.View
          style={[
            styles.shockwaveRing,
            {
              transform: [{ scale: shockwaveScale }],
              opacity: shockwaveOpacity,
            },
          ]}
        />
        <Animated.View
          style={[
            styles.shockwaveRingInner,
            {
              transform: [{ scale: Animated.multiply(shockwaveScale, 0.8) }],
              opacity: shockwaveOpacity,
            },
          ]}
        />

        {/* Ambient Ember Sparks */}
        <View style={styles.embersContainer} pointerEvents="none">
          <Text style={[styles.emberText, { top: height * 0.32, left: width * 0.2 }]}>🔥</Text>
          <Text style={[styles.emberText, { top: height * 0.28, right: width * 0.22 }]}>✨</Text>
          <Text style={[styles.emberText, { bottom: height * 0.35, left: width * 0.25 }]}>🌶️</Text>
          <Text style={[styles.emberText, { bottom: height * 0.32, right: width * 0.2 }]}>🔥</Text>
        </View>

        {/* Central Exploding Chili */}
        <Animated.View
          style={[
            styles.chiliWrapper,
            {
              transform: [{ scale: scaleAnim }, { rotate: spin }],
            },
          ]}
        >
          <View style={styles.chiliGlowCircle}>
            <Text style={styles.chiliEmoji}>🌶️</Text>
          </View>
        </Animated.View>

        {/* Subtitle & Header */}
        <Animated.View style={[styles.textContainer, { opacity: textOpacity }]}>
          <View style={styles.badgePill}>
            <Text style={styles.badgeText}>🔞 18+ ADULTS ONLY</Text>
          </View>
          <Text style={styles.title}>SPICE LEVEL: MAXIMUM</Text>
          <Text style={styles.subtitle}>Unlocking Sensual & Daring Lounge 🔥</Text>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9999,
  },
  shockwaveRing: {
    position: 'absolute',
    width: 220,
    height: 220,
    borderRadius: 110,
    borderWidth: 3,
    borderColor: '#FF1E56',
    backgroundColor: 'rgba(255, 30, 86, 0.22)',
  },
  shockwaveRingInner: {
    position: 'absolute',
    width: 170,
    height: 170,
    borderRadius: 85,
    borderWidth: 2,
    borderColor: '#FF6584',
    backgroundColor: 'rgba(255, 101, 132, 0.15)',
  },
  embersContainer: {
    ...StyleSheet.absoluteFill,
  },
  emberText: {
    position: 'absolute',
    fontSize: 26,
    opacity: 0.85,
  },
  chiliWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  chiliGlowCircle: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: 'rgba(255, 30, 86, 0.28)',
    borderWidth: 3,
    borderColor: '#FF2A6D',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#FF1E56',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 30,
    elevation: 15,
  },
  chiliEmoji: {
    fontSize: 76,
  },
  textContainer: {
    alignItems: 'center',
    marginTop: 30,
  },
  badgePill: {
    backgroundColor: 'rgba(255, 30, 86, 0.3)',
    borderColor: '#FF1E56',
    borderWidth: 1.2,
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: 20,
    marginBottom: 10,
  },
  badgeText: {
    color: '#FF6584',
    fontWeight: '800',
    fontSize: 11,
    letterSpacing: 1,
  },
  title: {
    fontSize: 22,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 1.5,
    textAlign: 'center',
    textShadowColor: 'rgba(255, 30, 86, 0.8)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 15,
  },
  subtitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFBAC8',
    marginTop: 6,
    letterSpacing: 0.5,
    textAlign: 'center',
  },
});

export default SpicyChiliTransition;
