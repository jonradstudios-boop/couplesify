import React from 'react';
import { View, StyleSheet, TouchableOpacity, Text, Platform } from 'react-native';
import { Ionicons, Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import AppColors from '../theme/AppColors';
import AppFonts from '../theme/AppFonts';

export type TabKey = 'home' | 'games' | 'center' | 'memories' | 'chat';

interface CustomBottomBarProps {
  activeTab: TabKey;
  onTabPress: (tab: TabKey) => void;
  onCenterPress: () => void;
  unreadCount?: number;
  visible?: boolean;
}

export const CustomBottomBar: React.FC<CustomBottomBarProps> = ({
  activeTab,
  onTabPress,
  onCenterPress,
  unreadCount = 1,
  visible = true,
}) => {
  if (!visible) return null;
  const triggerHaptic = () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {
      // safe fallback
    }
  };

  const handlePress = (tab: TabKey) => {
    triggerHaptic();
    onTabPress(tab);
  };

  const handleCenter = () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch {
      // safe fallback
    }
    onCenterPress();
  };

  return (
    <View style={styles.floatingContainer}>
      <View style={styles.bar}>
        {/* Tab 1: Home / Today (Tree / Branch Icon) */}
        <TouchableOpacity
          style={styles.tabButton}
          onPress={() => handlePress('home')}
          activeOpacity={0.7}
        >
          <View style={[styles.iconWrapper, activeTab === 'home' && styles.activeIconWrapper]}>
            <MaterialCommunityIcons
              name={activeTab === 'home' ? 'tree' : 'tree-outline'}
              size={22}
              color={activeTab === 'home' ? AppColors.primary : AppColors.textSecondary}
            />
          </View>
          <Text
            style={[styles.tabLabel, activeTab === 'home' && styles.activeTabLabel]}
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.75}
          >
            Today
          </Text>
        </TouchableOpacity>

        {/* Tab 2: Games & Activities (Compass / Explore Icon) */}
        <TouchableOpacity
          style={styles.tabButton}
          onPress={() => handlePress('games')}
          activeOpacity={0.7}
        >
          <View style={[styles.iconWrapper, activeTab === 'games' && styles.activeIconWrapper]}>
            <Feather
              name="compass"
              size={21}
              color={activeTab === 'games' ? AppColors.primary : AppColors.textSecondary}
            />
          </View>
          <Text
            style={[styles.tabLabel, activeTab === 'games' && styles.activeTabLabel]}
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.75}
          >
            Play
          </Text>
        </TouchableOpacity>

        {/* Central Interactive Action: Floating Coral Heart */}
        <View style={styles.centerButtonContainer}>
          <TouchableOpacity
            style={styles.centerButton}
            onPress={handleCenter}
            activeOpacity={0.85}
          >
            <Ionicons name="heart" size={25} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        {/* Tab 4: Memories & Scrapbook (Photo/Notes Icon) */}
        <TouchableOpacity
          style={styles.tabButton}
          onPress={() => handlePress('memories')}
          activeOpacity={0.7}
        >
          <View style={[styles.iconWrapper, activeTab === 'memories' && styles.activeIconWrapper]}>
            <Ionicons
              name={activeTab === 'memories' ? 'images' : 'images-outline'}
              size={21}
              color={activeTab === 'memories' ? AppColors.primary : AppColors.textSecondary}
            />
          </View>
          <Text
            style={[styles.tabLabel, activeTab === 'memories' && styles.activeTabLabel]}
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.7}
          >
            Memories
          </Text>
        </TouchableOpacity>

        {/* Tab 5: Direct Chat & Messages (Message Bubble Icon) */}
        <TouchableOpacity
          style={styles.tabButton}
          onPress={() => handlePress('chat')}
          activeOpacity={0.7}
        >
          <View style={[styles.iconWrapper, activeTab === 'chat' && styles.activeIconWrapper]}>
            <Ionicons
              name={activeTab === 'chat' ? 'chatbubble-ellipses' : 'chatbubble-ellipses-outline'}
              size={21}
              color={activeTab === 'chat' ? AppColors.primary : AppColors.textSecondary}
            />
            {unreadCount > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{unreadCount}</Text>
              </View>
            )}
          </View>
          <Text
            style={[styles.tabLabel, activeTab === 'chat' && styles.activeTabLabel]}
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.75}
          >
            Chat
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  floatingContainer: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 20 : 12,
    left: 14,
    right: 14,
    alignItems: 'center',
    zIndex: 999,
  },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    backgroundColor: 'rgba(255, 255, 255, 0.76)',
    borderRadius: 28,
    paddingVertical: 7,
    paddingHorizontal: 8,
    width: '100%',
    shadowColor: '#E297A5',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.16,
    shadowRadius: 16,
    elevation: 6,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.95)',
  },
  tabButton: {
    flex: 1,
    minWidth: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWrapper: {
    width: 34,
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 15,
  },
  activeIconWrapper: {
    backgroundColor: 'rgba(255, 101, 117, 0.14)',
    borderWidth: 1,
    borderColor: 'rgba(255, 101, 117, 0.25)',
  },
  tabLabel: {
    fontFamily: AppFonts.title,
    fontSize: 10,
    color: AppColors.textSecondary,
    marginTop: 1,
    textAlign: 'center',
  },
  activeTabLabel: {
    color: AppColors.primary,
  },
  centerButtonContainer: {
    top: -12,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  centerButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: AppColors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: AppColors.primary,
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.45,
    shadowRadius: 10,
    elevation: 8,
    borderWidth: 2.5,
    borderColor: '#FFFFFF',
  },
  badge: {
    position: 'absolute',
    top: -2,
    right: -2,
    backgroundColor: AppColors.primary,
    borderRadius: 8,
    minWidth: 15,
    height: 15,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 8.5,
    fontWeight: '800',
  },
});

export default CustomBottomBar;
