import React, { useEffect, useRef, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Animated,
  Easing,
  Dimensions,
  Image,
  TouchableOpacity,
  Platform,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';

interface SpicyChiliTransitionProps {
  visible: boolean;
  onComplete: () => void;
}

const { width } = Dimensions.get('window');
const isNative = Platform.OS !== 'web';

// 18 Animated Ember Particles
interface EmberData {
  id: number;
  emoji: string;
  startX: number;
  startY: number;
  driftX: number;
  driftY: number;
  size: number;
  delay: number;
  duration: number;
  color?: string;
}

export const SpicyChiliTransition: React.FC<SpicyChiliTransitionProps> = ({
  visible,
  onComplete,
}) => {
  // Main animation values
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const floatAnim = useRef(new Animated.Value(0)).current;
  const auraRotate = useRef(new Animated.Value(0)).current;
  const auraPulse = useRef(new Animated.Value(0.8)).current;

  // Staggered shockwaves
  const shockwave1Scale = useRef(new Animated.Value(0.3)).current;
  const shockwave1Opacity = useRef(new Animated.Value(1)).current;
  const shockwave2Scale = useRef(new Animated.Value(0.3)).current;
  const shockwave2Opacity = useRef(new Animated.Value(1)).current;
  const shockwave3Scale = useRef(new Animated.Value(0.3)).current;
  const shockwave3Opacity = useRef(new Animated.Value(1)).current;

  // Screen shake
  const shakeX = useRef(new Animated.Value(0)).current;
  const shakeY = useRef(new Animated.Value(0)).current;

  // Flash flare on entry / exit
  const flashAnim = useRef(new Animated.Value(0)).current;

  // Content reveal & laser progress
  const textOpacity = useRef(new Animated.Value(0)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;

  // Ember particles animation progress (0 -> 1)
  const embersAnim = useRef(new Animated.Value(0)).current;

  // Static ember configurations
  const embers = useMemo<EmberData[]>(() => {
    const list: EmberData[] = [];
    const emojis = ['🔥', '✨', '⚡', '🌶️', '💥', '🔥', '✨'];
    for (let i = 0; i < 18; i++) {
      const angle = (i / 18) * 2 * Math.PI;
      const dist = 50 + Math.random() * 80;
      list.push({
        id: i,
        emoji: emojis[i % emojis.length],
        startX: Math.cos(angle) * dist,
        startY: Math.sin(angle) * dist,
        driftX: Math.cos(angle) * (dist + 90 + Math.random() * 70),
        driftY: Math.sin(angle) * (dist + 110 + Math.random() * 80) - 60, // slight upward bias
        size: 14 + Math.floor(Math.random() * 16),
        delay: (i % 6) * 70,
        duration: 1000 + Math.random() * 400,
      });
    }
    return list;
  }, []);

  // Finish and unveil lounge with flame burst
  const finishTransition = useCallback(() => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    } catch {}

    Animated.parallel([
      Animated.timing(flashAnim, {
        toValue: 0.95,
        duration: 140,
        useNativeDriver: isNative,
      }),
      Animated.timing(scaleAnim, {
        toValue: 2.8,
        duration: 260,
        easing: Easing.in(Easing.quad),
        useNativeDriver: isNative,
      }),
      Animated.timing(opacityAnim, {
        toValue: 0,
        duration: 280,
        delay: 80,
        useNativeDriver: isNative,
      }),
    ]).start(() => {
      onComplete();
    });
  }, [flashAnim, scaleAnim, opacityAnim, onComplete]);

  useEffect(() => {
    if (!visible) {
      scaleAnim.setValue(0);
      opacityAnim.setValue(0);
      rotateAnim.setValue(0);
      floatAnim.setValue(0);
      auraRotate.setValue(0);
      auraPulse.setValue(0.8);
      shockwave1Scale.setValue(0.3);
      shockwave1Opacity.setValue(1);
      shockwave2Scale.setValue(0.3);
      shockwave2Opacity.setValue(1);
      shockwave3Scale.setValue(0.3);
      shockwave3Opacity.setValue(1);
      shakeX.setValue(0);
      shakeY.setValue(0);
      flashAnim.setValue(0);
      textOpacity.setValue(0);
      progressAnim.setValue(0);
      embersAnim.setValue(0);
      return;
    }

    // Trigger initial haptic heartbeat
    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    } catch {}

    // Continuous Aura Rotation Loop
    const auraLoop = Animated.loop(
      Animated.timing(auraRotate, {
        toValue: 1,
        duration: 8000,
        easing: Easing.linear,
        useNativeDriver: isNative,
      })
    );
    auraLoop.start();

    // Continuous Aura Pulsing
    const pulseLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(auraPulse, {
          toValue: 1.15,
          duration: 900,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: isNative,
        }),
        Animated.timing(auraPulse, {
          toValue: 0.85,
          duration: 900,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: isNative,
        }),
      ])
    );
    pulseLoop.start();

    // Continuous Floating Breath
    const floatLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim, {
          toValue: -12,
          duration: 750,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: isNative,
        }),
        Animated.timing(floatAnim, {
          toValue: 6,
          duration: 750,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: isNative,
        }),
      ])
    );
    floatLoop.start();

    // Screen Shake Sequence upon explosive landing
    const triggerRumble = () => {
      Animated.sequence([
        Animated.timing(shakeX, { toValue: 8, duration: 40, useNativeDriver: isNative }),
        Animated.timing(shakeX, { toValue: -8, duration: 40, useNativeDriver: isNative }),
        Animated.timing(shakeY, { toValue: 6, duration: 40, useNativeDriver: isNative }),
        Animated.timing(shakeX, { toValue: 4, duration: 40, useNativeDriver: isNative }),
        Animated.timing(shakeY, { toValue: -4, duration: 40, useNativeDriver: isNative }),
        Animated.timing(shakeX, { toValue: 0, duration: 40, useNativeDriver: isNative }),
        Animated.timing(shakeY, { toValue: 0, duration: 40, useNativeDriver: isNative }),
      ]).start();
    };

    // 1. Initial Backdrop Fade-in
    Animated.timing(opacityAnim, {
      toValue: 1,
      duration: 180,
      useNativeDriver: isNative,
    }).start();

    // 2. Initial Flash
    Animated.sequence([
      Animated.timing(flashAnim, {
        toValue: 0.8,
        duration: 90,
        useNativeDriver: isNative,
      }),
      Animated.timing(flashAnim, {
        toValue: 0,
        duration: 180,
        useNativeDriver: isNative,
      }),
    ]).start();

    // 3. EXPLODE CHILI WITH SLAM & ROTATION BOUNCE
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 1.15,
        friction: 4,
        tension: 110,
        useNativeDriver: isNative,
      }),
      Animated.sequence([
        Animated.timing(rotateAnim, {
          toValue: -25,
          duration: 110,
          useNativeDriver: isNative,
        }),
        Animated.timing(rotateAnim, {
          toValue: 18,
          duration: 100,
          useNativeDriver: isNative,
        }),
        Animated.timing(rotateAnim, {
          toValue: -8,
          duration: 90,
          useNativeDriver: isNative,
        }),
        Animated.timing(rotateAnim, {
          toValue: 0,
          duration: 80,
          useNativeDriver: isNative,
        }),
      ]),
      // Staggered Shockwaves
      Animated.parallel([
        Animated.timing(shockwave1Scale, {
          toValue: 3.2,
          duration: 800,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: isNative,
        }),
        Animated.timing(shockwave1Opacity, {
          toValue: 0,
          duration: 800,
          useNativeDriver: isNative,
        }),
      ]),
      Animated.sequence([
        Animated.delay(120),
        Animated.parallel([
          Animated.timing(shockwave2Scale, {
            toValue: 3.8,
            duration: 850,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: isNative,
          }),
          Animated.timing(shockwave2Opacity, {
            toValue: 0,
            duration: 850,
            useNativeDriver: isNative,
          }),
        ]),
      ]),
      Animated.sequence([
        Animated.delay(240),
        Animated.parallel([
          Animated.timing(shockwave3Scale, {
            toValue: 4.4,
            duration: 900,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: isNative,
          }),
          Animated.timing(shockwave3Opacity, {
            toValue: 0,
            duration: 900,
            useNativeDriver: isNative,
          }),
        ]),
      ]),
      // Embers bloom outward
      Animated.timing(embersAnim, {
        toValue: 1,
        duration: 1100,
        easing: Easing.out(Easing.quad),
        useNativeDriver: isNative,
      }),
      // Text and progress bar reveal
      Animated.timing(textOpacity, {
        toValue: 1,
        duration: 350,
        delay: 150,
        useNativeDriver: isNative,
      }),
      Animated.timing(progressAnim, {
        toValue: 1,
        duration: 1400,
        easing: Easing.linear,
        useNativeDriver: false, // for width interpolation
      }),
    ]).start(() => {
      triggerRumble();
      try {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      } catch {}
    });

    // 4. Climax and Exit Transition (Auto after 1.6s)
    const exitTimer = setTimeout(() => {
      finishTransition();
    }, 1650);

    return () => {
      clearTimeout(exitTimer);
      auraLoop.stop();
      pulseLoop.stop();
      floatLoop.stop();
    };
  }, [
    visible,
    finishTransition,
    auraPulse,
    auraRotate,
    embersAnim,
    flashAnim,
    floatAnim,
    opacityAnim,
    progressAnim,
    rotateAnim,
    scaleAnim,
    shakeX,
    shakeY,
    shockwave1Opacity,
    shockwave1Scale,
    shockwave2Opacity,
    shockwave2Scale,
    shockwave3Opacity,
    shockwave3Scale,
    textOpacity,
  ]);

  if (!visible) return null;

  const spin = rotateAnim.interpolate({
    inputRange: [-25, 25],
    outputRange: ['-25deg', '25deg'],
  });

  const auraSpin = auraRotate.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  return (
    <Modal visible={visible} transparent animationType="none" statusBarTranslucent>
      <Animated.View
        style={[
          styles.backdrop,
          {
            opacity: opacityAnim,
            transform: [{ translateX: shakeX }, { translateY: shakeY }],
          },
        ]}
      >
        {/* Deep Mystical Seductive Gradient */}
        <LinearGradient
          colors={[
            '#0D0112',
            '#24021F',
            '#42002E',
            '#60042A',
            '#21011A',
            '#0A000E',
          ]}
          locations={[0, 0.2, 0.45, 0.68, 0.88, 1]}
          style={StyleSheet.absoluteFill}
        />

        {/* Ambient Nebula Radial Orbs */}
        <View style={styles.nebulaOrbTop} pointerEvents="none" />
        <View style={styles.nebulaOrbBottom} pointerEvents="none" />

        {/* Shockwave Wave 1 (Neon Ruby Glow) */}
        <Animated.View
          style={[
            styles.shockwaveRing,
            {
              borderColor: '#FF1E56',
              backgroundColor: 'rgba(255, 30, 86, 0.16)',
              transform: [{ scale: shockwave1Scale }],
              opacity: shockwave1Opacity,
            },
          ]}
        />

        {/* Shockwave Wave 2 (Bright Saffron / Coral) */}
        <Animated.View
          style={[
            styles.shockwaveRing,
            {
              width: 250,
              height: 250,
              borderRadius: 125,
              borderColor: '#FF758C',
              backgroundColor: 'rgba(255, 117, 140, 0.12)',
              borderWidth: 3,
              transform: [{ scale: shockwave2Scale }],
              opacity: shockwave2Opacity,
            },
          ]}
        />

        {/* Shockwave Wave 3 (Golden Amber Heatwave) */}
        <Animated.View
          style={[
            styles.shockwaveRing,
            {
              width: 300,
              height: 300,
              borderRadius: 150,
              borderColor: '#FFA07A',
              borderWidth: 2,
              borderStyle: 'dashed',
              backgroundColor: 'rgba(255, 160, 122, 0.08)',
              transform: [{ scale: shockwave3Scale }],
              opacity: shockwave3Opacity,
            },
          ]}
        />

        {/* Rotating Sunburst / Light Rays behind Chili */}
        <Animated.View
          style={[
            styles.auraRaysContainer,
            {
              transform: [{ rotate: auraSpin }, { scale: auraPulse }],
            },
          ]}
          pointerEvents="none"
        >
          {[0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330].map((deg) => (
            <View
              key={deg}
              style={[
                styles.auraRayBeam,
                {
                  transform: [{ rotate: `${deg}deg` }],
                },
              ]}
            />
          ))}
        </Animated.View>

        {/* Floating Sparks & Embers Dynamic Particle Field */}
        <View style={styles.embersContainer} pointerEvents="none">
          {embers.map((item) => {
            const translateX = embersAnim.interpolate({
              inputRange: [0, 1],
              outputRange: [item.startX, item.driftX],
            });
            const translateY = embersAnim.interpolate({
              inputRange: [0, 1],
              outputRange: [item.startY, item.driftY],
            });
            const particleOpacity = embersAnim.interpolate({
              inputRange: [0, 0.15, 0.75, 1],
              outputRange: [0, 1, 0.85, 0],
            });
            const particleScale = embersAnim.interpolate({
              inputRange: [0, 0.3, 1],
              outputRange: [0.4, 1.25, 0.7],
            });

            return (
              <Animated.View
                key={item.id}
                style={[
                  styles.emberParticle,
                  {
                    transform: [
                      { translateX },
                      { translateY },
                      { scale: particleScale },
                    ],
                    opacity: particleOpacity,
                  },
                ]}
              >
                <Text style={{ fontSize: item.size }}>{item.emoji}</Text>
              </Animated.View>
            );
          })}
        </View>

        {/* Central Exploding Chili Stage */}
        <TouchableOpacity
          activeOpacity={0.9}
          onPress={finishTransition}
          style={styles.centerStageTouch}
        >
          <Animated.View
            style={[
              styles.chiliWrapper,
              {
                transform: [
                  { scale: scaleAnim },
                  { translateY: floatAnim },
                  { rotate: spin },
                ],
              },
            ]}
          >
            {/* Multi-layered fiery magma glow aura */}
            <Animated.View
              style={[
                styles.chiliBackGlowCircle,
                { transform: [{ scale: auraPulse }] },
              ]}
            >
              <LinearGradient
                colors={['#FF0055', '#FF3838', '#FF9F1C', 'transparent']}
                style={StyleSheet.absoluteFill}
                start={{ x: 0.5, y: 0.5 }}
                end={{ x: 1, y: 1 }}
              />
            </Animated.View>

            {/* Glowing Chili Display Frame */}
            <View style={styles.chiliGlassCircle}>
              {/* THE REAL HIGH-DEFINITION SPICY CHILI IMAGE */}
              <Image
                source={require('../../assets/spicy_chili.png')}
                style={styles.chiliImage}
                resizeMode="contain"
              />

              {/* Shimmer Hot Spot Ring */}
              <View style={styles.chiliReflectRim} />
            </View>

            {/* Micro Flame Sparks on Chili Base */}
            <View style={styles.chiliFlameSparksRow}>
              <Text style={styles.microSpark}>🔥</Text>
              <Text style={styles.microSpark}>✨</Text>
              <Text style={styles.microSpark}>🔥</Text>
            </View>
          </Animated.View>
        </TouchableOpacity>

        {/* Dynamic HUD Title, Spice Meter & Progress */}
        <Animated.View style={[styles.textContainer, { opacity: textOpacity }]}>
          {/* Sizzling Adult Badge */}
          <View style={styles.badgePill}>
            <LinearGradient
              colors={['#FF1E56', '#D60046']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.badgePillGradient}
            >
              <Text style={styles.badgeText}>🔥 MAXIMUM SPICE UNLOCKED 🔞</Text>
            </LinearGradient>
          </View>

          {/* Hero Headline */}
          <Text style={styles.title}>SENSUAL & DARING</Text>
          <Text style={styles.subtitle}>Igniting Passionate Couple Games</Text>

          {/* Glowing Heat Meter Bar */}
          <View style={styles.progressTrack}>
            <Animated.View style={[styles.progressBar, { width: progressWidth }]}>
              <LinearGradient
                colors={['#FF758C', '#FF1E56', '#FFA07A', '#FFD166']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={StyleSheet.absoluteFill}
              />
            </Animated.View>
          </View>

          {/* Interactive Tap Hint */}
          <TouchableOpacity onPress={finishTransition} activeOpacity={0.7}>
            <View style={styles.tapToEnterButton}>
              <Text style={styles.tapToEnterText}>TAP TO IGNITE NOW ⚡</Text>
            </View>
          </TouchableOpacity>
        </Animated.View>

        {/* Exit & Entry Flash Flare Overlay */}
        <Animated.View
          style={[
            styles.flashOverlay,
            {
              opacity: flashAnim,
            },
          ]}
          pointerEvents="none"
        />
      </Animated.View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 99999,
  },
  nebulaOrbTop: {
    position: 'absolute',
    top: -80,
    width: width * 1.2,
    height: width * 1.2,
    borderRadius: (width * 1.2) / 2,
    backgroundColor: 'rgba(255, 30, 86, 0.12)',
  },
  nebulaOrbBottom: {
    position: 'absolute',
    bottom: -100,
    width: width * 1.3,
    height: width * 1.3,
    borderRadius: (width * 1.3) / 2,
    backgroundColor: 'rgba(128, 0, 80, 0.15)',
  },
  shockwaveRing: {
    position: 'absolute',
    width: 220,
    height: 220,
    borderRadius: 110,
    borderWidth: 4,
  },
  auraRaysContainer: {
    position: 'absolute',
    width: 380,
    height: 380,
    alignItems: 'center',
    justifyContent: 'center',
  },
  auraRayBeam: {
    position: 'absolute',
    width: 4,
    height: 360,
    backgroundColor: 'rgba(255, 60, 100, 0.22)',
    borderRadius: 2,
  },
  embersContainer: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emberParticle: {
    position: 'absolute',
  },
  centerStageTouch: {
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  chiliWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  chiliBackGlowCircle: {
    position: 'absolute',
    width: 210,
    height: 210,
    borderRadius: 105,
    opacity: 0.85,
    overflow: 'hidden',
  },
  chiliGlassCircle: {
    width: 176,
    height: 176,
    borderRadius: 88,
    backgroundColor: 'rgba(40, 5, 35, 0.85)',
    borderWidth: 3.5,
    borderColor: '#FF2A6D',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#FF1E56',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.95,
    shadowRadius: 36,
    elevation: 25,
    position: 'relative',
    overflow: 'hidden',
  },
  chiliImage: {
    width: 145,
    height: 145,
    transform: [{ rotate: '-12deg' }],
  },
  chiliReflectRim: {
    position: 'absolute',
    top: 6,
    left: 20,
    right: 20,
    height: 30,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
  },
  chiliFlameSparksRow: {
    flexDirection: 'row',
    position: 'absolute',
    bottom: -14,
    gap: 8,
  },
  microSpark: {
    fontSize: 20,
    textShadowColor: '#FF1E56',
    textShadowRadius: 8,
  },
  textContainer: {
    alignItems: 'center',
    marginTop: 38,
    paddingHorizontal: 24,
    zIndex: 10,
  },
  badgePill: {
    borderRadius: 22,
    overflow: 'hidden',
    marginBottom: 12,
    shadowColor: '#FF1E56',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.7,
    shadowRadius: 10,
    elevation: 6,
  },
  badgePillGradient: {
    paddingVertical: 6,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    color: '#FFFFFF',
    fontWeight: '900',
    fontSize: 11.5,
    letterSpacing: 1.4,
  },
  title: {
    fontSize: 26,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 2,
    textAlign: 'center',
    textShadowColor: 'rgba(255, 30, 86, 0.9)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 20,
  },
  subtitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFBAC8',
    marginTop: 6,
    letterSpacing: 0.6,
    textAlign: 'center',
  },
  progressTrack: {
    width: width * 0.65,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    marginTop: 20,
    overflow: 'hidden',
    borderWidth: 0.5,
    borderColor: 'rgba(255, 30, 86, 0.3)',
  },
  progressBar: {
    height: '100%',
    borderRadius: 3,
  },
  tapToEnterButton: {
    marginTop: 18,
    paddingVertical: 7,
    paddingHorizontal: 18,
    backgroundColor: 'rgba(255, 30, 86, 0.22)',
    borderRadius: 18,
    borderWidth: 1.2,
    borderColor: 'rgba(255, 75, 120, 0.6)',
  },
  tapToEnterText: {
    color: '#FFBAC8',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1.1,
  },
  flashOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: '#FFE5EC',
  },
});

export default SpicyChiliTransition;

