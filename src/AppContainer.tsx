import React, { useState, useEffect } from 'react';
import { View, StyleSheet, StatusBar } from 'react-native';
import CustomBottomBar, { TabKey } from './components/CustomBottomBar';
import HomeScreen from './screens/HomeScreen';
import GamesScreen from './screens/GamesScreen';
import MemoryScreen from './screens/MemoryScreen';
import ChatScreen from './screens/ChatScreen';
import DoodleScreen from './screens/DoodleScreen';
import AuthScreen from './screens/AuthScreen';
import AppOpeningSplash from './components/AppOpeningSplash';
import LoveNudgeModal from './components/LoveNudgeModal';
import PairingModal from './components/PairingModal';
import StorageService, { CoupleProfile } from './services/StorageService';
import AuthService from './services/AuthService';
import FirestoreService from './services/FirestoreService';
import AppColors from './theme/AppColors';

export const AppContainer: React.FC = () => {
  const [showSplash, setShowSplash] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [activeTab, setActiveTab] = useState<TabKey>('home');
  const [isDoodleFullscreen, setIsDoodleFullscreen] = useState(false);
  const [isSpicyActive, setIsSpicyActive] = useState(false);
  const [isNudgeModalOpen, setIsNudgeModalOpen] = useState(false);
  const [isPairingModalOpen, setIsPairingModalOpen] = useState(false);
  const [profile, setProfile] = useState<CoupleProfile | null>(null);

  useEffect(() => {
    let unsubCouple: (() => void) | undefined;

    const setupAuthAndListener = async () => {
      const loggedIn = await AuthService.isUserLoggedIn();
      setIsAuthenticated(loggedIn);
      const prof = await StorageService.getProfile();
      setProfile(prof);

      const currentUser = await AuthService.getCurrentUser();
      if (prof?.inviteCode) {
        unsubCouple = FirestoreService.subscribeToCoupleLiveUpdates(
          prof.inviteCode,
          currentUser?.uid,
          (liveData) => {
            if (liveData.profile) {
              setProfile(liveData.profile);
              StorageService.saveProfile(liveData.profile);
            }
          }
        );
      }
    };

    setupAuthAndListener();

    return () => {
      if (unsubCouple) unsubCouple();
    };
  }, [isAuthenticated]);

  const loadProfile = async () => {
    const prof = await StorageService.getProfile();
    setProfile(prof);
  };

  const handleSaveProfile = async (updated: CoupleProfile) => {
    setProfile(updated);
    await StorageService.saveProfile(updated);
    const currentUser = await AuthService.getCurrentUser();
    await FirestoreService.syncProfileToCloud(updated, currentUser?.uid);
  };

  const handleLogout = async () => {
    await AuthService.logout();
    setIsAuthenticated(false);
    setIsPairingModalOpen(false);
    // Reset local profile so next sign in doesn't show old cached profile
    const defaultProfile = await StorageService.getProfile();
    setProfile(defaultProfile);
  };

  // 1. Show Uber/Ola-style luxury app opening animation on startup
  if (showSplash) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor="#FFE6EC" />
        <AppOpeningSplash onFinish={() => setShowSplash(false)} />
      </View>
    );
  }

  // 2. If not authenticated, present the Login & Registration screen
  if (!isAuthenticated) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor="#FFEBF0" />
        <AuthScreen
          onAuthSuccess={async () => {
            await loadProfile();
            setIsAuthenticated(true);
          }}
          onSkip={() => {
            setIsAuthenticated(true);
          }}
        />
      </View>
    );
  }

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
              onOpenHeartHub={() => setIsNudgeModalOpen(true)}
            />
          )}

          {activeTab === 'games' && (
            <GamesScreen onSpicyModeChange={setIsSpicyActive} />
          )}

          {activeTab === 'memories' && <MemoryScreen />}

          {activeTab === 'chat' && (
            <ChatScreen
              onOpenPairing={() => setIsPairingModalOpen(true)}
              onOpenDoodle={() => setIsDoodleFullscreen(true)}
            />
          )}
        </View>
      )}

      {/* Persistent Floating Bottom Bar (hidden inside full-screen immersive views like Spicy Games & Doodling) */}
      {!isDoodleFullscreen && !(activeTab === 'games' && isSpicyActive) && (
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
          unreadCount={0}
        />
      )}

      {/* Center Love Nudge & Heart Hub Modal */}
      <LoveNudgeModal
        visible={isNudgeModalOpen}
        partnerName={profile?.partnerName || 'Partner'}
        userName={profile?.userName}
        profile={profile}
        onSaveProfile={handleSaveProfile}
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
          onLogout={handleLogout}
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
