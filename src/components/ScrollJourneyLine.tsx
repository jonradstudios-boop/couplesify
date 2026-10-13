/**
 * ScrollJourneyLine Component
 * 
 * An animated SVG "Journey" connector line for the Memory Scrapbook.
 * Features:
 * - Dynamically draws itself forward based on the user's scroll percentage (0% to 100%)
 * - Elegant pastel rose & vibrant crimson gradient stroke
 * - Subtle background dashed guide track indicating the romantic path ahead
 * - Pulsing glowing leading traveler node (with heart motif) that rides the tip of the line
 * - Waypoint node highlights that illuminate as the user scrolls past each couple memory
 * - Smooth entrance interpolation for immediate visual satisfaction when photos are uploaded
 */

import React, { useEffect, useRef, useState } from 'react';
import { View, StyleSheet, Animated, Easing } from 'react-native';
import Svg, {
  Line,
  Circle,
  Path,
  Defs,
  LinearGradient as SvgLinearGradient,
  Stop,
} from 'react-native-svg';

interface ScrollJourneyLineProps {
  /** Total height of the timeline container */
  height: number;
  /** Scroll percentage from 0.0 to 1.0 */
  scrollProgress: number;
  /** Number of memory items in the timeline */
  nodeCount: number;
  /** Optional custom X position offset for centering */
  centerX?: number;
}

export const ScrollJourneyLine: React.FC<ScrollJourneyLineProps> = ({
  height,
  scrollProgress,
  nodeCount,
  centerX = 28,
}) => {
  // Animated value for smooth lerp transitions
  const animatedProgress = useRef(new Animated.Value(0)).current;
  const [currentProgress, setCurrentProgress] = useState(0);

  // Pulse animation for traveler tip
  const pulseAnim = useRef(new Animated.Value(0)).current;
  const [pulseScale, setPulseScale] = useState(1);

  // Drive continuous gentle pulse on the traveler heart
  useEffect(() => {
    const pulseLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1400,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: false,
        }),
        Animated.timing(pulseAnim, {
          toValue: 0,
          duration: 1400,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: false,
        }),
      ])
    );
    pulseLoop.start();

    const id = pulseAnim.addListener(({ value }) => {
      setPulseScale(1 + value * 0.3);
    });

    return () => {
      pulseLoop.stop();
      pulseAnim.removeListener(id);
    };
  }, [pulseAnim]);

  // Smoothly interpolate scroll progress
  useEffect(() => {
    const clamped = Math.max(0, Math.min(1, scrollProgress));
    Animated.timing(animatedProgress, {
      toValue: clamped,
      duration: 180,
      easing: Easing.out(Easing.quad),
      useNativeDriver: false,
    }).start();
  }, [scrollProgress, animatedProgress]);

  useEffect(() => {
    const listenerId = animatedProgress.addListener(({ value }) => {
      setCurrentProgress(value);
    });
    return () => {
      animatedProgress.removeListener(listenerId);
    };
  }, [animatedProgress]);

  // Safe fallback minimum height
  const safeHeight = Math.max(height, 220);
  const startY = 26;
  const endY = Math.max(startY + 40, safeHeight - 30);
  const totalLength = endY - startY;

  // Drawn line tip Y position
  const currentDrawnY = startY + totalLength * currentProgress;

  // Calculate milestone waypoint Y positions
  const waypoints = Array.from({ length: Math.max(nodeCount, 1) }, (_, i) => {
    if (nodeCount <= 1) return startY;
    const ratio = i / (nodeCount - 1);
    return startY + totalLength * ratio;
  });

  return (
    <View pointerEvents="none" style={[styles.container, { height: safeHeight }]}>
      <Svg width={centerX * 2} height={safeHeight} style={styles.svg}>
        <Defs>
          {/* Active Gradient for the Journey Stroke */}
          <SvgLinearGradient id="journeyGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <Stop offset="0%" stopColor="#FF6575" stopOpacity="0.95" />
            <Stop offset="50%" stopColor="#FF8A96" stopOpacity="1" />
            <Stop offset="100%" stopColor="#FF3366" stopOpacity="1" />
          </SvgLinearGradient>

          {/* Glow filter aura for traveler */}
          <SvgLinearGradient id="glowGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor="#FF6575" stopOpacity="0.6" />
            <Stop offset="100%" stopColor="#FFA4B0" stopOpacity="0.1" />
          </SvgLinearGradient>
        </Defs>

        {/* 1. Background dashed guide track (The romantic path ahead) */}
        <Line
          x1={centerX}
          y1={startY}
          x2={centerX}
          y2={endY}
          stroke="#FFD6DF"
          strokeWidth={3}
          strokeDasharray="6, 6"
          strokeLinecap="round"
          opacity={0.85}
        />

        {/* 2. Active SVG Journey Line (draws forward with scroll percentage) */}
        {currentDrawnY > startY && (
          <Line
            x1={centerX}
            y1={startY}
            x2={centerX}
            y2={currentDrawnY}
            stroke="url(#journeyGradient)"
            strokeWidth={4.5}
            strokeLinecap="round"
          />
        )}

        {/* 3. Milestone Waypoint Rings along the path */}
        {waypoints.map((wy, idx) => {
          const isReached = currentDrawnY >= wy - 4;
          return (
            <React.Fragment key={`wp-${idx}`}>
              {/* Outer halo when active */}
              {isReached && (
                <Circle
                  cx={centerX}
                  cy={wy}
                  r={10}
                  fill="#FF6575"
                  opacity={0.18}
                />
              )}
              {/* Waypoint ring */}
              <Circle
                cx={centerX}
                cy={wy}
                r={isReached ? 6 : 4.5}
                fill={isReached ? '#FF6575' : '#FFFFFF'}
                stroke={isReached ? '#FFFFFF' : '#FFCCD5'}
                strokeWidth={isReached ? 2 : 1.5}
              />
            </React.Fragment>
          );
        })}

        {/* 4. Glowing Traveler Node at the Tip (Rides the drawing line) */}
        {currentDrawnY >= startY && (
          <>
            {/* Outer pulsating glow ring */}
            <Circle
              cx={centerX}
              cy={currentDrawnY}
              r={14 * pulseScale}
              fill="url(#glowGradient)"
            />

            {/* Middle vibrant ring */}
            <Circle
              cx={centerX}
              cy={currentDrawnY}
              r={8}
              fill="#FF6575"
              stroke="#FFFFFF"
              strokeWidth={2}
            />

            {/* Inner sparkling heart core */}
            <Path
              d={`M ${centerX} ${currentDrawnY - 2} 
                  c -1.5 -2.2 -4.5 -0.5 -4 1.8 
                  c 0.4 1.8 4 4.2 4 4.2 
                  s 3.6 -2.4 4 -4.2 
                  c 0.5 -2.3 -2.5 -4 -4 -1.8 Z`}
              fill="#FFFFFF"
            />
          </>
        )}
      </Svg>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: 56,
    zIndex: 3,
  },
  svg: {
    position: 'absolute',
    top: 0,
    left: 0,
  },
});

export default ScrollJourneyLine;
