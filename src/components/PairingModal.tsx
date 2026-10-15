import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import * as Clipboard from 'expo-clipboard';
import AppColors from '../theme/AppColors';
import AppFonts from '../theme/AppFonts';
import FallingHeartsBackground from './FallingHeartsBackground';
import StorageService, { CoupleProfile } from '../services/StorageService';
import FirestoreService from '../services/FirestoreService';
import AuthService from '../services/AuthService';

interface PairingModalProps {
  visible: boolean;
  profile: CoupleProfile;
  onClose: () => void;
  onSaveProfile: (updated: CoupleProfile) => void;
  onLogout?: () => void;
}

export const PairingModal: React.FC<PairingModalProps> = ({
  visible,
  profile,
  onClose,
  onSaveProfile,
  onLogout,
}) => {
  const [partnerCodeInput, setPartnerCodeInput] = useState('');
  const [userName, setUserName] = useState(profile.userName);
  const [partnerName, setPartnerName] = useState(profile.partnerName);
  const [anniversaryDate, setAnniversaryDate] = useState(profile.anniversaryDate);
  const [copied, setCopied] = useState(false);
  const [pairSuccess, setPairSuccess] = useState(false);
  const [pairError, setPairError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleCopyCode = async () => {
    try {
      await Clipboard.setStringAsync(profile.inviteCode);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {}
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePasteCode = async () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      const str = await Clipboard.getStringAsync();
      if (str) {
        setPartnerCodeInput(str.trim().toUpperCase());
        setPairError(null);
      }
    } catch {}
  };

  const handlePairSubmit = async () => {
    const cleanCode = partnerCodeInput.trim().toUpperCase();
    if (!cleanCode) return;
    setIsLoading(true);
    setPairError(null);

    try {
      const currentUser = await AuthService.getCurrentUser();
      const res = await FirestoreService.joinCoupleRoom(cleanCode, {
        uid: currentUser?.uid || `user-${Date.now()}`,
        name: userName || currentUser?.userName || 'You',
        gender: currentUser?.gender || 'female',
        email: currentUser?.email || '',
        avatarUri: profile.userAvatar,
        online: true,
        lastActive: Date.now(),
      });

      setIsLoading(false);
      if (!res.success) {
        setPairError(res.error || `Code "${cleanCode}" was not found.`);
        return;
      }

      try {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } catch {}
      setPairSuccess(true);

      const updated: CoupleProfile = {
        ...profile,
        userName,
        partnerName: res.partner1?.name || partnerName,
        partnerAvatar: res.partner1?.avatarUri || profile.partnerAvatar,
        inviteCode: cleanCode,
        anniversaryDate: res.partner1 ? anniversaryDate : anniversaryDate,
        isPaired: true,
        partnerOnline: true,
      };

      onSaveProfile(updated);
      await StorageService.saveProfile(updated);
      await FirestoreService.syncProfileToCloud(updated, currentUser?.uid);

      setTimeout(() => {
        setPairSuccess(false);
        onClose();
      }, 1500);
    } catch (err: any) {
      setIsLoading(false);
      setPairError(err?.message || 'Failed to link partner code.');
    }
  };

  const handleSaveSettings = async () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}
    const updated: CoupleProfile = {
      ...profile,
      userName,
      partnerName,
      anniversaryDate,
    };
    onSaveProfile(updated);
    await StorageService.saveProfile(updated);
    const currentUser = await AuthService.getCurrentUser();
    await FirestoreService.syncProfileToCloud(updated, currentUser?.uid);
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <FallingHeartsBackground />
        <View style={styles.modalCard}>
          <View style={styles.headerRow}>
            <Text style={styles.title} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>
              Couplesify Pairing & Settings
            </Text>
            <TouchableOpacity style={styles.closeBtn} onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }} activeOpacity={0.7}>
              <Ionicons name="close" size={20} color={AppColors.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
            {/* Invite Code Box */}
            <View style={styles.sectionCard}>
              <Text style={styles.sectionTitle}>Your 6-Digit Pairing Code</Text>
              <Text style={styles.sectionSubtitle}>
                Share this with your partner so they can link their app
              </Text>

              <View style={styles.codeRow}>
                <View style={styles.codeBox}>
                  <Text style={styles.codeText}>{profile.inviteCode}</Text>
                </View>
                <TouchableOpacity
                  style={[styles.copyBtn, copied && styles.copyBtnSuccess]}
                  onPress={handleCopyCode}
                  activeOpacity={0.8}
                >
                  <Ionicons
                    name={copied ? 'checkmark' : 'copy-outline'}
                    size={16}
                    color="#FFFFFF"
                  />
                  <Text style={styles.copyBtnText}>{copied ? 'Copied!' : 'Copy'}</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Enter Partner Code */}
            <View style={styles.sectionCard}>
              <Text style={styles.sectionTitle}>Link Partner's Code</Text>
              <Text style={styles.sectionSubtitle}>
                Enter the 6-character code from your partner's phone
              </Text>

              <View style={styles.inputRow}>
                <TextInput
                  style={styles.textInput}
                  placeholder="e.g. LOVE-77"
                  placeholderTextColor="#C4B4BA"
                  value={partnerCodeInput}
                  onChangeText={setPartnerCodeInput}
                  autoCapitalize="characters"
                />
                <TouchableOpacity
                  style={styles.pasteBtn}
                  onPress={handlePasteCode}
                  activeOpacity={0.8}
                >
                  <Ionicons name="clipboard-outline" size={15} color={AppColors.primary} />
                  <Text style={styles.pasteBtnText}>Paste</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.linkBtn, isLoading && { opacity: 0.8 }]}
                  onPress={handlePairSubmit}
                  disabled={isLoading}
                  activeOpacity={0.8}
                >
                  {isLoading ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Text style={styles.linkBtnText}>Pair</Text>
                  )}
                </TouchableOpacity>
              </View>

              {pairError && (
                <View style={[styles.pairedBanner, { backgroundColor: '#FEE2E2' }]}>
                  <Ionicons name="alert-circle" size={16} color="#DC2626" />
                  <Text style={[styles.pairedBannerText, { color: '#DC2626' }]}>{pairError}</Text>
                </View>
              )}

              {pairSuccess && (
                <View style={styles.pairedBanner}>
                  <Ionicons name="checkmark-circle" size={16} color={AppColors.mintDark} />
                  <Text style={styles.pairedBannerText}>Successfully paired with partner!</Text>
                </View>
              )}
            </View>

            {/* Couple Profile & Anniversary */}
            <View style={styles.sectionCard}>
              <Text style={styles.sectionTitle}>Couple Profiles & Anniversary</Text>

              <Text style={styles.fieldLabel}>Your Name</Text>
              <TextInput
                style={styles.fieldInput}
                value={userName}
                onChangeText={setUserName}
              />

              <Text style={styles.fieldLabel}>Partner's Name</Text>
              <TextInput
                style={styles.fieldInput}
                value={partnerName}
                onChangeText={setPartnerName}
              />

              <Text style={styles.fieldLabel}>Anniversary Date (YYYY-MM-DD)</Text>
              <TextInput
                style={styles.fieldInput}
                value={anniversaryDate}
                onChangeText={setAnniversaryDate}
              />

              <TouchableOpacity
                style={styles.saveBtn}
                onPress={handleSaveSettings}
                activeOpacity={0.85}
              >
                <Text style={styles.saveBtnText}>Save Preferences</Text>
              </TouchableOpacity>

              {onLogout && (
                <TouchableOpacity
                  style={styles.logoutBtn}
                  onPress={() => {
                    onClose();
                    onLogout();
                  }}
                  activeOpacity={0.8}
                >
                  <Ionicons name="log-out-outline" size={16} color="#E05275" />
                  <Text style={styles.logoutBtnText}>Sign Out / Switch Account</Text>
                </TouchableOpacity>
              )}
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(45, 36, 43, 0.45)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.88)',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    maxHeight: '85%',
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.12,
    shadowRadius: 18,
    elevation: 8,
    borderTopWidth: 1.5,
    borderLeftWidth: 1.5,
    borderRightWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.95)',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  title: {
    fontFamily: AppFonts.title,
    fontSize: 18,
    color: AppColors.textPrimary,
    flex: 1,
    marginRight: 8,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(245, 236, 239, 0.8)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.92)',
  },
  scrollContent: {
    gap: 16,
    paddingBottom: 24,
  },
  sectionCard: {
    backgroundColor: 'rgba(255, 247, 248, 0.65)',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.92)',
  },
  sectionTitle: {
    fontFamily: AppFonts.title,
    fontSize: 17,
    color: AppColors.textPrimary,
  },
  sectionSubtitle: {
    fontSize: 12,
    color: AppColors.textSecondary,
    marginTop: 2,
    marginBottom: 12,
  },
  codeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  codeBox: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.95)',
  },
  codeText: {
    fontSize: 20,
    fontWeight: '900',
    color: AppColors.primary,
    letterSpacing: 2,
  },
  copyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: AppColors.primary,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 14,
    gap: 6,
  },
  copyBtnSuccess: {
    backgroundColor: AppColors.mintDark,
  },
  copyBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  textInput: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 14,
    fontSize: 15,
    fontWeight: '700',
    color: AppColors.textPrimary,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.95)',
  },
  pasteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 232, 236, 0.9)',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 14,
    gap: 4,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.95)',
  },
  pasteBtnText: {
    color: AppColors.primary,
    fontWeight: '700',
    fontSize: 13,
  },
  linkBtn: {
    backgroundColor: AppColors.lavenderDark,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 14,
  },
  linkBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
  pairedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: AppColors.mintGreen,
    borderRadius: 12,
    padding: 10,
    marginTop: 10,
    gap: 8,
  },
  pairedBannerText: {
    color: AppColors.mintDark,
    fontSize: 12,
    fontWeight: '700',
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: AppColors.textSecondary,
    marginTop: 8,
    marginBottom: 4,
  },
  fieldInput: {
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 14,
    fontSize: 14,
    color: AppColors.textPrimary,
    fontWeight: '600',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.95)',
  },
  saveBtn: {
    backgroundColor: AppColors.primary,
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 14,
  },
  saveBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(224, 82, 117, 0.08)',
    borderRadius: 14,
    paddingVertical: 12,
    marginTop: 10,
    gap: 6,
    borderWidth: 1,
    borderColor: 'rgba(224, 82, 117, 0.25)',
  },
  logoutBtnText: {
    color: '#E05275',
    fontWeight: '700',
    fontSize: 13,
  },
});

export default PairingModal;
