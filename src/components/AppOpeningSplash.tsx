import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Easing,
  Dimensions,
  Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import AppColors from '../theme/AppColors';
import AppFonts from '../theme/AppFonts';

const { width, height } = Dimensions.get('window');

interface AppOpeningSplashProps {
  onFinish: () => void;
  brandTagline?: string;
}

export const AppOpeningSplash: React.FC<AppOpeningSplashProps> = ({
  onFinish,
  brandTagline = 'Private Space for Two • Connected Forever',
}) => {
  const logoScale = useRef(new Animated.Value(0.3)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const rippleScale1 = useRef(new Animated.Value(0.8)).current;
  const rippleOpacity1 = useRef(new Animated.Value(0.7)).current;
  const rippleScale2 = useRef(new Animated.Value(0.8)).current;
  const rippleOpacity2 = useRef(new Animated.Value(0.5)).current;
  const textOpacity = useRef(new Animated.Value(0)).current;
  const textTranslateY = useRef(new Animated.Value(20)).current;
  const screenFadeOut = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch {}

    // Ripple loops
    Animated.loop(
      Animated.parallel([
        Animated.sequence([
          Animated.timing(rippleScale1, {
            toValue: 2.2,
            duration: 1600,
            easing: Easing.out(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(rippleScale1, {
            toValue: 0.8,
            duration: 0,
            useNativeDriver: true,
          }),
        ]),
        Animated.sequence([
          Animated.timing(rippleOpacity1, {
            toValue: 0,
            duration: 1600,
            easing: Easing.out(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(rippleOpacity1, {
            toValue: 0.7,
            duration: 0,
            useNativeDriver: true,
          }),
        ]),
      ])
    ).start();

    // Second offset ripple
    setTimeout(() => {
      Animated.loop(
        Animated.parallel([
          Animated.sequence([
            Animated.timing(rippleScale2, {
              toValue: 2.4,
              duration: 1800,
              easing: Easing.out(Easing.ease),
              useNativeDriver: true,
            }),
            Animated.timing(rippleScale2, {
              toValue: 0.8,
              duration: 0,
              useNativeDriver: true,
            }),
          ]),
          Animated.sequence([
            Animated.timing(rippleOpacity2, {
              toValue: 0,
              duration: 1800,
              easing: Easing.out(Easing.ease),
              useNativeDriver: true,
            }),
            Animated.timing(rippleOpacity2, {
              toValue: 0.5,
              duration: 0,
              useNativeDriver: true,
            }),
          ]),
        ])
      ).start();
    }, 400);

    // Main entrance animation
    Animated.parallel([
      Animated.spring(logoScale, {
        toValue: 1,
        friction: 5,
        tension: 40,
        useNativeDriver: true,
      }),
      Animated.timing(logoOpacity, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
    ]).start();

    // Text reveal
    Animated.parallel([
      Animated.timing(textOpacity, {
        toValue: 1,
        duration: 600,
        delay: 350,
        useNativeDriver: true,
      }),
      Animated.timing(textTranslateY, {
        toValue: 0,
        duration: 600,
        delay: 350,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();

    // Exit transition (fade out to main screen) after 1.8 seconds
    const timer = setTimeout(() => {
      try {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      } catch {}
      Animated.timing(screenFadeOut, {
        toValue: 0,
        duration: 400,
        easing: Easing.inOut(Easing.ease),
        useNativeDriver: true,
      }).start(() => {
        onFinish();
      });
    }, 1800);

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Animated.View style={[styles.container, { opacity: screenFadeOut }]}>
      <LinearGradient
        colors={['#FFE6EC', '#FFF0F4', '#FFFDFE']}
        style={StyleSheet.absoluteFill}
      />

      <View style={styles.centerContent}>
        {/* Radar Pulse Ripples */}
        <Animated.View
          style={[
            styles.rippleRing,
            {
              transform: [{ scale: rippleScale1 }],
              opacity: rippleOpacity1,
            },
          ]}
        />
        <Animated.View
          style={[
            styles.rippleRing,
            {
              transform: [{ scale: rippleScale2 }],
              opacity: rippleOpacity2,
            },
          ]}
        />

        {/* Center Glowing Logo */}
        <Animated.View
          style={[
            styles.logoCircle,
            {
              transform: [{ scale: logoScale }],
              opacity: logoOpacity,
            },
          ]}
        >
          <Image
            source={require('../../assets/couplesify-logo.png')}
            style={styles.logoSplashImage}
            resizeMode="contain"
          />
        </Animated.View>

        {/* Brand Title & Tagline */}
        <Animated.View
          style={[
            styles.textContainer,
            {
              opacity: textOpacity,
              transform: [{ translateY: textTranslateY }],
            },
          ]}
        >
          <View style={styles.titleRow}>
            <Text style={styles.titleText}>COUPLESIFY</Text>
            <Ionicons name="heart" size={20} color="#FF6575" style={{ marginLeft: 6 }} />
          </View>
          <Text style={styles.taglineText}>{brandTagline}</Text>
        </Animated.View>

        {/* Bottom Shimmer Pill */}
        <View style={styles.bottomShimmerPill}>
          <View style={styles.shimmerDot} />
          <Text style={styles.shimmerText}>Connecting Your Hearts...</Text>
        </View>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFill,
    zIndex: 9999,
    justifyContent: 'center',
    alignItems: 'center',
  },
  centerContent: {
    alignItems: 'center',
    justifyContent: 'center',
    width,
    height,
  },
  rippleRing: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 2,
    borderColor: '#FF6575',
  },
  logoCircle: {
    width: 124,
    height: 124,
    borderRadius: 32,
    backgroundColor: '#070509',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    shadowColor: '#FF6575',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.45,
    shadowRadius: 24,
    elevation: 14,
    borderWidth: 2.5,
    borderColor: 'rgba(255, 101, 117, 0.45)',
  },
  logoSplashImage: {
    width: 118,
    height: 118,
    borderRadius: 28,
  },
  textContainer: {
    alignItems: 'center',
    marginTop: 24,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  titleText: {
    fontFamily: AppFonts.title,
    fontSize: 32,
    color: AppColors.textPrimary,
    letterSpacing: 1.5,
  },
  taglineText: {
    fontSize: 13,
    fontWeight: '600',
    color: AppColors.textSecondary,
    marginTop: 6,
    letterSpacing: 0.5,
  },
  bottomShimmerPill: {
    position: 'absolute',
    bottom: 50,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    gap: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.95)',
    shadowColor: '#E297A5',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 3,
  },
  shimmerDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: AppColors.primary,
  },
  shimmerText: {
    fontSize: 12,
    fontWeight: '700',
    color: AppColors.textPrimary,
  },
});

export default AppOpeningSplash;
