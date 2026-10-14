import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Easing,
  Dimensions,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const isNative = Platform.OS !== 'web';

interface RedCurtainOpeningProps {
  onFinish: () => void;
  /** Optional delay before curtains start parting (ms) */
  startDelay?: number;
}

// 8 Romantic Shimmer Embers drifting out as curtains part
const SPARKLE_CONFIGS = [
  { id: 1, xOffset: -40, yOffset: -80, driftX: -120, driftY: -100, size: 16, icon: 'sparkles' },
  { id: 2, xOffset: 30, yOffset: -60, driftX: 130, driftY: -90, size: 18, icon: 'heart' },
  { id: 3, xOffset: -20, yOffset: 20, driftX: -90, driftY: -140, size: 14, icon: 'sparkles' },
  { id: 4, xOffset: 25, yOffset: 40, driftX: 110, driftY: -130, size: 20, icon: 'heart' },
  { id: 5, xOffset: -50, yOffset: 100, driftX: -150, driftY: -80, size: 16, icon: 'heart' },
  { id: 6, xOffset: 45, yOffset: 120, driftX: 140, driftY: -70, size: 15, icon: 'sparkles' },
  { id: 7, xOffset: -10, yOffset: -140, driftX: -70, driftY: -160, size: 18, icon: 'sparkles' },
  { id: 8, xOffset: 15, yOffset: -120, driftX: 80, driftY: -150, size: 17, icon: 'heart' },
];

export const RedCurtainOpening: React.FC<RedCurtainOpeningProps> = ({
  onFinish,
  startDelay = 180,
}) => {
  // Main curtain travel animators (0 = closed in center, 1 = fully drawn to sides)
  const curtainProgress = useRef(new Animated.Value(0)).current;

  // Center seal pop & fade
  const sealScale = useRef(new Animated.Value(1)).current;
  const sealOpacity = useRef(new Animated.Value(1)).current;

  // Top valance lift & fade
  const valanceLift = useRef(new Animated.Value(0)).current;
  const valanceOpacity = useRef(new Animated.Value(1)).current;

  // Reveal light glow
  const lightGlow = useRef(new Animated.Value(0)).current;

  // Floating sparkle particles
  const sparklesAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Initial gentle haptic as curtains get ready
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch {}

    const timer = setTimeout(() => {
      // Secondary haptic as curtain parting physically starts
      try {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      } catch {}

      // Play dramatic coordinated curtain opening
      Animated.parallel([
        // 1. Curtains pull apart with realistic velvet cloth acceleration & inertia
        Animated.timing(curtainProgress, {
          toValue: 1,
          duration: 1300,
          easing: Easing.bezier(0.22, 1, 0.36, 1),
          useNativeDriver: isNative,
        }),

        // 2. Center golden heart seal pops and dissolves
        Animated.sequence([
          Animated.timing(sealScale, {
            toValue: 1.25,
            duration: 220,
            easing: Easing.out(Easing.quad),
            useNativeDriver: isNative,
          }),
          Animated.parallel([
            Animated.timing(sealScale, {
              toValue: 0.1,
              duration: 400,
              useNativeDriver: isNative,
            }),
            Animated.timing(sealOpacity, {
              toValue: 0,
              duration: 350,
              useNativeDriver: isNative,
            }),
          ]),
        ]),

        // 3. Top valance lifts and dissolves to fully reveal top header/status bar
        Animated.sequence([
          Animated.delay(150),
          Animated.parallel([
            Animated.timing(valanceLift, {
              toValue: -110,
              duration: 900,
              easing: Easing.inOut(Easing.cubic),
              useNativeDriver: isNative,
            }),
            Animated.timing(valanceOpacity, {
              toValue: 0,
              duration: 850,
              useNativeDriver: isNative,
            }),
          ]),
        ]),

        // 4. Center radiant light beam flash
        Animated.sequence([
          Animated.timing(lightGlow, {
            toValue: 0.85,
            duration: 350,
            easing: Easing.out(Easing.ease),
            useNativeDriver: isNative,
          }),
          Animated.timing(lightGlow, {
            toValue: 0,
            duration: 700,
            easing: Easing.in(Easing.ease),
            useNativeDriver: isNative,
          }),
        ]),

        // 5. Floating romantic embers dispersing outward
        Animated.timing(sparklesAnim, {
          toValue: 1,
          duration: 1100,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: isNative,
        }),
      ]).start(() => {
        try {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        } catch {}
        onFinish();
      });
    }, startDelay);

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Left curtain translates from 0 to offscreen left (-SCREEN_WIDTH * 0.58)
  const leftCurtainX = curtainProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -SCREEN_WIDTH * 0.58],
  });

  // Right curtain translates from 0 to offscreen right (SCREEN_WIDTH * 0.58)
  const rightCurtainX = curtainProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [0, SCREEN_WIDTH * 0.58],
  });

  // Center vertical parting gap width for the golden reveal glow
  const centerGlowWidth = curtainProgress.interpolate({
    inputRange: [0, 0.4, 1],
    outputRange: [4, 80, 220],
  });

  return (
    <View style={styles.fullscreenOverlay} pointerEvents="none">
      {/* Center Radiant Light Beam (gleams behind curtains as they part) */}
      <Animated.View
        style={[
          styles.centerLightGlow,
          {
            opacity: lightGlow,
            width: centerGlowWidth,
          },
        ]}
      >
        <LinearGradient
          colors={[
            'rgba(255, 235, 200, 0)',
            'rgba(255, 245, 220, 0.75)',
            'rgba(255, 255, 255, 0.95)',
            'rgba(255, 245, 220, 0.75)',
            'rgba(255, 235, 200, 0)',
          ]}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>

      {/* LEFT RED VELVET CURTAIN PANEL */}
      <Animated.View
        style={[
          styles.curtainPanel,
          styles.leftCurtain,
          {
            transform: [{ translateX: leftCurtainX }],
          },
        ]}
      >
        {/* Base Deep Royal Velvet Gradient */}
        <LinearGradient
          colors={['#42000A', '#6E0013', '#94001B', '#7A0016', '#52000E']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={StyleSheet.absoluteFill}
        />

        {/* 5 Vertical Realistic 3D Velvet Folds / Pleats */}
        <View style={styles.pleatsRow}>
          {[0, 1, 2, 3, 4].map((i) => (
            <View key={i} style={styles.pleatFold}>
              <LinearGradient
                colors={[
                  'rgba(0, 0, 0, 0.52)',
                  'rgba(255, 80, 110, 0.28)',
                  'rgba(255, 140, 160, 0.18)',
                  'rgba(0, 0, 0, 0.45)',
                ]}
                start={{ x: 0, y: 0.5 }}
                end={{ x: 1, y: 0.5 }}
                style={StyleSheet.absoluteFill}
              />
            </View>
          ))}
        </View>

        {/* Golden Embroidered Hem / Bullion Fringe Trim at Bottom */}
        <View style={styles.bottomFringeBar}>
          <LinearGradient
            colors={['#FFE28A', '#D4AF37', '#996515', '#FFE28A']}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            style={styles.goldTrimGradient}
          />
          <View style={styles.tasselDotsRow}>
            {[...Array(12)].map((_, idx) => (
              <View key={idx} style={styles.goldTasselDrop} />
            ))}
          </View>
        </View>

        {/* Left Side Gather Tieback & Golden Cord */}
        <View style={styles.leftTiebackWrapper}>
          <LinearGradient
            colors={['#FFE79A', '#D4AF37', '#855913']}
            style={styles.goldTieCord}
          />
          <View style={styles.goldTasselKnot}>
            <Ionicons name="sparkles" size={10} color="#5C3B00" />
          </View>
        </View>

        {/* Right edge shadow for realistic overlap */}
        <LinearGradient
          colors={['transparent', 'rgba(20, 0, 0, 0.65)']}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={styles.edgeOverlapShadow}
        />
      </Animated.View>

      {/* RIGHT RED VELVET CURTAIN PANEL */}
      <Animated.View
        style={[
          styles.curtainPanel,
          styles.rightCurtain,
          {
            transform: [{ translateX: rightCurtainX }],
          },
        ]}
      >
        {/* Base Deep Royal Velvet Gradient (mirrored) */}
        <LinearGradient
          colors={['#52000E', '#7A0016', '#94001B', '#6E0013', '#42000A']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={StyleSheet.absoluteFill}
        />

        {/* 5 Vertical Realistic 3D Velvet Folds / Pleats */}
        <View style={styles.pleatsRow}>
          {[0, 1, 2, 3, 4].map((i) => (
            <View key={i} style={styles.pleatFold}>
              <LinearGradient
                colors={[
                  'rgba(0, 0, 0, 0.45)',
                  'rgba(255, 140, 160, 0.18)',
                  'rgba(255, 80, 110, 0.28)',
                  'rgba(0, 0, 0, 0.52)',
                ]}
                start={{ x: 0, y: 0.5 }}
                end={{ x: 1, y: 0.5 }}
                style={StyleSheet.absoluteFill}
              />
            </View>
          ))}
        </View>

        {/* Golden Embroidered Hem / Bullion Fringe Trim at Bottom */}
        <View style={styles.bottomFringeBar}>
          <LinearGradient
            colors={['#FFE28A', '#996515', '#D4AF37', '#FFE28A']}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            style={styles.goldTrimGradient}
          />
          <View style={styles.tasselDotsRow}>
            {[...Array(12)].map((_, idx) => (
              <View key={idx} style={styles.goldTasselDrop} />
            ))}
          </View>
        </View>

        {/* Right Side Gather Tieback & Golden Cord */}
        <View style={styles.rightTiebackWrapper}>
          <LinearGradient
            colors={['#855913', '#D4AF37', '#FFE79A']}
            style={styles.goldTieCord}
          />
          <View style={styles.goldTasselKnot}>
            <Ionicons name="sparkles" size={10} color="#5C3B00" />
          </View>
        </View>

        {/* Left edge shadow for realistic overlap */}
        <LinearGradient
          colors={['rgba(20, 0, 0, 0.65)', 'transparent']}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={[styles.edgeOverlapShadow, { left: 0, right: undefined }]}
        />
      </Animated.View>

      {/* TOP DECORATIVE VALANCE / SCALLOPED DRAPED PELMET */}
      <Animated.View
        style={[
          styles.topValanceContainer,
          {
            opacity: valanceOpacity,
            transform: [{ translateY: valanceLift }],
          },
        ]}
      >
        <LinearGradient
          colors={['#3B0007', '#730014', '#8C0019', '#57000F']}
          style={StyleSheet.absoluteFill}
        />

        {/* Scalloped Swags Across the Top */}
        <View style={styles.valanceSwagsRow}>
          {[0, 1, 2, 3].map((s) => (
            <View key={s} style={styles.valanceSwagArch}>
              <LinearGradient
                colors={['rgba(255, 100, 130, 0.22)', 'rgba(0, 0, 0, 0.45)']}
                style={StyleSheet.absoluteFill}
              />
            </View>
          ))}
        </View>

        {/* Golden Fringe Across Bottom of Valance */}
        <View style={styles.valanceGoldTrim}>
          <LinearGradient
            colors={['#FFE79A', '#D4AF37', '#FFE79A', '#B38728', '#FFE79A']}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            style={{ flex: 1, height: 3.5 }}
          />
        </View>
      </Animated.View>

      {/* CENTER GOLDEN HEART SEAL & EMBLEM */}
      <Animated.View
        style={[
          styles.centerSealContainer,
          {
            opacity: sealOpacity,
            transform: [{ scale: sealScale }],
          },
        ]}
      >
        <LinearGradient
          colors={['#FFE89E', '#E5BA43', '#B8860B', '#FAD961']}
          style={styles.sealCircle}
        >
          <View style={styles.sealInnerRing}>
            <Ionicons name="heart" size={32} color="#850014" />
          </View>
        </LinearGradient>
        <View style={styles.sealRibbon}>
          <Text style={styles.sealRibbonText}>LOVE PREMIERE</Text>
        </View>
      </Animated.View>

      {/* FLOATING ROMANTIC SPARKLES & HEART PARTICLES */}
      {SPARKLE_CONFIGS.map((sp) => {
        const pTranslateX = sparklesAnim.interpolate({
          inputRange: [0, 1],
          outputRange: [sp.xOffset, sp.xOffset + sp.driftX],
        });
        const pTranslateY = sparklesAnim.interpolate({
          inputRange: [0, 1],
          outputRange: [sp.yOffset, sp.yOffset + sp.driftY],
        });
        const pOpacity = sparklesAnim.interpolate({
          inputRange: [0, 0.2, 0.7, 1],
          outputRange: [0, 1, 0.8, 0],
        });
        const pScale = sparklesAnim.interpolate({
          inputRange: [0, 0.3, 1],
          outputRange: [0.3, 1.2, 0.5],
        });

        return (
          <Animated.View
            key={sp.id}
            style={[
              styles.floatingSparkle,
              {
                opacity: pOpacity,
                transform: [
                  { translateX: pTranslateX },
                  { translateY: pTranslateY },
                  { scale: pScale },
                ],
              },
            ]}
          >
            <Ionicons
              name={sp.icon as any}
              size={sp.size}
              color={sp.icon === 'heart' ? '#FF4D6D' : '#FFE680'}
            />
          </Animated.View>
        );
      })}
    </View>
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
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  curtainPanel: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: SCREEN_WIDTH * 0.54,
    height: SCREEN_HEIGHT,
    overflow: 'hidden',
  },
  leftCurtain: {
    left: 0,
    borderRightWidth: 1,
    borderRightColor: 'rgba(0, 0, 0, 0.4)',
    shadowColor: '#000000',
    shadowOffset: { width: 10, height: 0 },
    shadowOpacity: 0.55,
    shadowRadius: 18,
    elevation: 10,
  },
  rightCurtain: {
    right: 0,
    borderLeftWidth: 1,
    borderLeftColor: 'rgba(0, 0, 0, 0.4)',
    shadowColor: '#000000',
    shadowOffset: { width: -10, height: 0 },
    shadowOpacity: 0.55,
    shadowRadius: 18,
    elevation: 10,
  },
  pleatsRow: {
    flex: 1,
    flexDirection: 'row',
    height: '100%',
  },
  pleatFold: {
    flex: 1,
    height: '100%',
    position: 'relative',
  },
  edgeOverlapShadow: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    right: 0,
    width: 24,
  },
  bottomFringeBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 28,
    justifyContent: 'flex-start',
  },
  goldTrimGradient: {
    height: 4.5,
    width: '100%',
  },
  tasselDotsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: 3,
    paddingHorizontal: 4,
  },
  goldTasselDrop: {
    width: 5,
    height: 12,
    borderRadius: 2,
    backgroundColor: '#D4AF37',
    borderBottomWidth: 1,
    borderBottomColor: '#FFE79A',
    shadowColor: '#FFE79A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 4,
  },
  leftTiebackWrapper: {
    position: 'absolute',
    top: SCREEN_HEIGHT * 0.48,
    left: 12,
    alignItems: 'center',
  },
  rightTiebackWrapper: {
    position: 'absolute',
    top: SCREEN_HEIGHT * 0.48,
    right: 12,
    alignItems: 'center',
  },
  goldTieCord: {
    width: 14,
    height: 64,
    borderRadius: 7,
    borderWidth: 1,
    borderColor: 'rgba(255, 235, 170, 0.8)',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
  },
  goldTasselKnot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#D4AF37',
    marginTop: -8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#FFF1BA',
  },
  topValanceContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 78,
    overflow: 'hidden',
    zIndex: 10,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.45,
    shadowRadius: 10,
    elevation: 8,
  },
  valanceSwagsRow: {
    flexDirection: 'row',
    flex: 1,
  },
  valanceSwagArch: {
    flex: 1,
    borderBottomLeftRadius: 36,
    borderBottomRightRadius: 36,
    borderWidth: 1,
    borderColor: 'rgba(218, 165, 32, 0.4)',
    overflow: 'hidden',
  },
  valanceGoldTrim: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 4,
  },
  centerSealContainer: {
    position: 'absolute',
    top: SCREEN_HEIGHT * 0.44,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 20,
  },
  sealCircle: {
    width: 78,
    height: 78,
    borderRadius: 39,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2.5,
    borderColor: '#FFFFFF',
    shadowColor: '#FFDF73',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.6,
    shadowRadius: 16,
    elevation: 12,
  },
  sealInnerRing: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#D4AF37',
  },
  sealRibbon: {
    marginTop: 8,
    backgroundColor: '#8B001D',
    paddingVertical: 3,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FFE28A',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  sealRibbonText: {
    fontSize: 9.5,
    fontWeight: '900',
    color: '#FFEAA7',
    letterSpacing: 1.2,
  },
  centerLightGlow: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    height: SCREEN_HEIGHT,
    alignSelf: 'center',
    zIndex: 5,
  },
  floatingSparkle: {
    position: 'absolute',
    top: SCREEN_HEIGHT * 0.46,
    alignSelf: 'center',
    zIndex: 25,
  },
});

export default RedCurtainOpening;
