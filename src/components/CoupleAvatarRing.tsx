import React from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Circle, Defs, LinearGradient as SvgLinearGradient, Stop } from 'react-native-svg';
import AppColors from '../theme/AppColors';

interface CoupleAvatarRingProps {
  userAvatar: string;
  partnerAvatar: string;
  userName: string;
  partnerName: string;
  anniversaryDate: string; // YYYY-MM-DD
}

export const CoupleAvatarRing: React.FC<CoupleAvatarRingProps> = ({
  userAvatar,
  partnerAvatar,
  userName,
  partnerName,
  anniversaryDate,
}) => {
  // Calculate days together
  const calculateDays = (): number => {
    try {
      const start = new Date(anniversaryDate).getTime();
      const now = new Date().getTime();
      const diffDays = Math.floor((now - start) / (1000 * 60 * 60 * 24));
      return Math.max(diffDays, 1);
    } catch {
      return 365;
    }
  };

  const daysTogether = calculateDays();
  const ringSize = 220;
  const strokeWidth = 8;
  const radius = (ringSize - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  // Progress towards 1000 days or 365 days milestone
  const progressPercent = ((daysTogether % 365) / 365);
  const strokeDashoffset = circumference - progressPercent * circumference;

  return (
    <View style={styles.container}>
      <View style={[styles.ringContainer, { width: ringSize, height: ringSize }]}>
        {/* SVG Progress Circle with Gradient */}
        <Svg width={ringSize} height={ringSize} style={styles.svgRing}>
          <Defs>
            <SvgLinearGradient id="ringGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <Stop offset="0%" stopColor="#FF6575" />
              <Stop offset="50%" stopColor="#E3D9F8" />
              <Stop offset="100%" stopColor="#FF8A96" />
            </SvgLinearGradient>
          </Defs>
          {/* Background Track */}
          <Circle
            cx={ringSize / 2}
            cy={ringSize / 2}
            r={radius}
            stroke="rgba(255, 101, 117, 0.14)"
            strokeWidth={strokeWidth}
            fill="transparent"
          />
          {/* Progress Stroke */}
          <Circle
            cx={ringSize / 2}
            cy={ringSize / 2}
            r={radius}
            stroke="url(#ringGrad)"
            strokeWidth={strokeWidth}
            strokeDasharray={`${circumference} ${circumference}`}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            fill="transparent"
            transform={`rotate(-90 ${ringSize / 2} ${ringSize / 2})`}
          />
        </Svg>

        {/* Center Avatars Container */}
        <View style={styles.innerContent}>
          <View style={styles.avatarsRow}>
            {/* User Avatar */}
            <View style={[styles.avatarWrapper, styles.userAvatar]}>
              <Image source={{ uri: userAvatar }} style={styles.avatarImage} />
            </View>

            {/* Pulsing Interlocking Heart Badge */}
            <View style={styles.heartCenterBadge}>
              <Ionicons name="heart" size={18} color="#FF6575" />
            </View>

            {/* Partner Avatar */}
            <View style={[styles.avatarWrapper, styles.partnerAvatar]}>
              <Image source={{ uri: partnerAvatar }} style={styles.avatarImage} />
            </View>
          </View>

          {/* Names */}
          <Text style={styles.namesLabel} numberOfLines={1}>
            {userName} & {partnerName}
          </Text>
        </View>
      </View>

      {/* Live Calculated Badge: "[X] Days Together" */}
      <View style={styles.daysBadge}>
        <Ionicons name="sparkles" size={14} color="#FF6575" style={{ marginRight: 6 }} />
        <Text style={styles.daysText}>
          <Text style={styles.daysHighlight}>{daysTogether}</Text> Days Together
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 12,
  },
  ringContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  svgRing: {
    position: 'absolute',
    top: 0,
    left: 0,
  },
  innerContent: {
    width: 190,
    height: 190,
    borderRadius: 95,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#F3CAD5',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 6,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.95)',
  },
  avatarsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  avatarWrapper: {
    width: 70,
    height: 70,
    borderRadius: 35,
    borderWidth: 3,
    borderColor: '#FFFFFF',
    overflow: 'hidden',
    shadowColor: '#E297A5',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  userAvatar: {
    marginRight: -10,
    zIndex: 1,
  },
  partnerAvatar: {
    marginLeft: -10,
    zIndex: 2,
  },
  avatarImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  heartCenterBadge: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'absolute',
    zIndex: 10,
    shadowColor: '#FF6575',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 6,
    elevation: 5,
    borderWidth: 1.5,
    borderColor: '#FFE8EC',
  },
  namesLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: AppColors.textPrimary,
    letterSpacing: 0.2,
  },
  daysBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingVertical: 9,
    paddingHorizontal: 22,
    borderRadius: 9999,
    marginTop: -16,
    zIndex: 20,
    shadowColor: '#E297A5',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 5,
    borderWidth: 1.5,
    borderColor: '#FFE8EC',
  },
  daysText: {
    fontSize: 15,
    fontWeight: '700',
    color: AppColors.textPrimary,
  },
  daysHighlight: {
    color: AppColors.primary,
    fontWeight: '900',
    fontSize: 17,
  },
});

export default CoupleAvatarRing;
