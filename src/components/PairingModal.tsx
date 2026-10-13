import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import AppColors from '../theme/AppColors';
import { CoupleProfile } from '../services/StorageService';

interface PairingModalProps {
  visible: boolean;
  profile: CoupleProfile;
  onClose: () => void;
  onSaveProfile: (updated: CoupleProfile) => void;
}

export const PairingModal: React.FC<PairingModalProps> = ({
  visible,
  profile,
  onClose,
  onSaveProfile,
}) => {
  const [partnerCodeInput, setPartnerCodeInput] = useState('');
  const [userName, setUserName] = useState(profile.userName);
  const [partnerName, setPartnerName] = useState(profile.partnerName);
  const [anniversaryDate, setAnniversaryDate] = useState(profile.anniversaryDate);
  const [copied, setCopied] = useState(false);
  const [pairSuccess, setPairSuccess] = useState(false);

  const handleCopyCode = () => {
    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {}
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePairSubmit = () => {
    if (!partnerCodeInput.trim()) return;
    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {}
    setPairSuccess(true);
    setTimeout(() => {
      setPairSuccess(false);
      onSaveProfile({
        ...profile,
        userName,
        partnerName,
        anniversaryDate,
        isPaired: true,
      });
      onClose();
    }, 1500);
  };

  const handleSaveSettings = () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}
    onSaveProfile({
      ...profile,
      userName,
      partnerName,
      anniversaryDate,
    });
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.modalCard}>
          <View style={styles.headerRow}>
            <Text style={styles.title}>Couplesify Pairing & Settings</Text>
            <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
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
                  style={styles.linkBtn}
                  onPress={handlePairSubmit}
                  activeOpacity={0.8}
                >
                  <Text style={styles.linkBtnText}>Pair</Text>
                </TouchableOpacity>
              </View>

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
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    maxHeight: '85%',
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.15,
    shadowRadius: 18,
    elevation: 10,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: AppColors.textPrimary,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F5ECEF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    gap: 16,
    paddingBottom: 24,
  },
  sectionCard: {
    backgroundColor: '#FFF7F8',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1.5,
    borderColor: '#F8DCE2',
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
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
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#E297A5',
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
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 14,
    fontSize: 15,
    fontWeight: '700',
    color: AppColors.textPrimary,
    borderWidth: 1.5,
    borderColor: '#E8D2D6',
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
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 14,
    fontSize: 14,
    color: AppColors.textPrimary,
    fontWeight: '600',
    borderWidth: 1.5,
    borderColor: '#F0D4DC',
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
});

export default PairingModal;
