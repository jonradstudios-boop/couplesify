import React, { useState, useEffect } from 'react';
import { View, StyleSheet, StatusBar } from 'react-native';
import CustomBottomBar, { TabKey } from './components/CustomBottomBar';
import HomeScreen from './screens/HomeScreen';
import GamesScreen from './screens/GamesScreen';
import MemoryScreen from './screens/MemoryScreen';
import ChatScreen from './screens/ChatScreen';
import DoodleScreen from './screens/DoodleScreen';
import LoveNudgeModal from './components/LoveNudgeModal';
import PairingModal from './components/PairingModal';
import StorageService, { CoupleProfile } from './services/StorageService';
import AppColors from './theme/AppColors';

export const AppContainer: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabKey>('home');
  const [isDoodleFullscreen, setIsDoodleFullscreen] = useState(false);
  const [isNudgeModalOpen, setIsNudgeModalOpen] = useState(false);
  const [isPairingModalOpen, setIsPairingModalOpen] = useState(false);
  const [profile, setProfile] = useState<CoupleProfile | null>(null);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    const prof = await StorageService.getProfile();
    setProfile(prof);
  };

  const handleSaveProfile = async (updated: CoupleProfile) => {
    setProfile(updated);
    await StorageService.saveProfile(updated);
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FCE8EC" />

      {/* Screen Views */}
      {isDoodleFullscreen ? (
        <DoodleScreen onBack={() => setIsDoodleFullscreen(false)} />
      ) : (
        <View style={styles.screenHost}>
          {activeTab === 'home' && (
            <HomeScreen
              onNavigateToDoodle={() => setIsDoodleFullscreen(true)}
              onNavigateToMemories={() => setActiveTab('memories')}
              onOpenSettings={() => setIsPairingModalOpen(true)}
            />
          )}

          {activeTab === 'games' && <GamesScreen />}

          {activeTab === 'memories' && <MemoryScreen />}

          {activeTab === 'chat' && (
            <ChatScreen
              onOpenPairing={() => setIsPairingModalOpen(true)}
              onOpenDoodle={() => setIsDoodleFullscreen(true)}
            />
          )}
        </View>
      )}

      {/* Persistent Floating Bottom Bar */}
      {!isDoodleFullscreen && (
        <CustomBottomBar
          activeTab={activeTab}
          onTabPress={(tab) => {
            if (tab === 'center') {
              setIsNudgeModalOpen(true);
            } else {
              setActiveTab(tab);
            }
          }}
          onCenterPress={() => setIsNudgeModalOpen(true)}
          unreadCount={activeTab === 'chat' ? 0 : 1}
        />
      )}

      {/* Center Love Nudge Modal */}
      <LoveNudgeModal
        visible={isNudgeModalOpen}
        partnerName={profile?.partnerName || 'Maya'}
        onClose={() => setIsNudgeModalOpen(false)}
        onOpenDoodle={() => {
          setIsNudgeModalOpen(false);
          setIsDoodleFullscreen(true);
        }}
      />

      {/* Pairing & Anniversary Settings Modal */}
      {profile && (
        <PairingModal
          visible={isPairingModalOpen}
          profile={profile}
          onClose={() => setIsPairingModalOpen(false)}
          onSaveProfile={handleSaveProfile}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: AppColors.backgroundTop,
  },
  screenHost: {
    flex: 1,
  },
});

export default AppContainer;
