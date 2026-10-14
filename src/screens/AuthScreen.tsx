import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Image,
  Alert,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons, Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import * as Clipboard from 'expo-clipboard';
import * as ImagePicker from 'expo-image-picker';
import AppColors from '../theme/AppColors';
import AppFonts from '../theme/AppFonts';
import FallingHeartsBackground from '../components/FallingHeartsBackground';
import AuthService, { UserAccount } from '../services/AuthService';
import FirestoreService from '../services/FirestoreService';

interface AuthScreenProps {
  onAuthSuccess: (user: UserAccount) => void;
  onSkip?: () => void;
}

export const AuthScreen: React.FC<AuthScreenProps> = ({ onAuthSuccess, onSkip }) => {
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Form Fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Register Fields
  const [userName, setUserName] = useState('');
  const [gender, setGender] = useState<'male' | 'female'>('male');
  // Start with empty avatar - do not prefill with stored/cached pictures
  const [avatarUri, setAvatarUri] = useState<string>('');
  const [partnerName, setPartnerName] = useState('');
  const [anniversaryDate, setAnniversaryDate] = useState('2024-05-18');

  // Gender-Specific Pairing Fields
  // Male: Generates code (can customize)
  const [customMaleCode, setCustomMaleCode] = useState(
    `PAIR-${Math.floor(1000 + Math.random() * 9000)}`
  );
  const [codeCopied, setCodeCopied] = useState(false);

  // Female: Enters/pastes partner's code
  const [femalePartnerCodeInput, setFemalePartnerCodeInput] = useState('');
  const [isVerifyingCode, setIsVerifyingCode] = useState(false);
  const [codeVerificationMsg, setCodeVerificationMsg] = useState<{
    success: boolean;
    text: string;
  } | null>(null);

  const handlePickAvatarImage = async () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        Alert.alert('Permission Needed', 'Please allow gallery access to pick a profile photo.');
        return;
      }
      const res = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });
      if (!res.canceled && res.assets && res.assets.length > 0) {
        setAvatarUri(res.assets[0].uri);
      }
    } catch {}
  };

  const handleCopyMaleCode = async () => {
    await Clipboard.setStringAsync(customMaleCode);
    setCodeCopied(true);
    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {}
    setTimeout(() => setCodeCopied(false), 2000);
  };

  const handleVerifyFemaleCode = async (codeToVerify: string) => {
    const clean = codeToVerify.trim().toUpperCase();
    if (!clean) return;
    setIsVerifyingCode(true);
    setCodeVerificationMsg(null);
    try {
      const room = await FirestoreService.getCoupleRoom(clean);
      setIsVerifyingCode(false);
      if (room && room.partner1) {
        setPartnerName(room.partner1.name);
        if (room.anniversaryDate) {
          setAnniversaryDate(room.anniversaryDate);
        }
        setCodeVerificationMsg({
          success: true,
          text: `Found ${room.partner1.name}'s room! 💕 Ready to link.`,
        });
      } else {
        setCodeVerificationMsg({
          success: false,
          text: `Code "${clean}" not found. Please verify with your partner.`,
        });
      }
    } catch {
      setIsVerifyingCode(false);
      setCodeVerificationMsg({
        success: false,
        text: 'Network error checking code. Please try again.',
      });
    }
  };

  const handlePasteFemaleCode = async () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      const pasted = await Clipboard.getStringAsync();
      if (pasted) {
        const clean = pasted.trim().toUpperCase();
        setFemalePartnerCodeInput(clean);
        handleVerifyFemaleCode(clean);
      }
    } catch {}
  };

  const handleLoginSubmit = async () => {
    setErrorMessage(null);
    if (!email.trim() || !password.trim()) {
      setErrorMessage('Please enter your email and password.');
      return;
    }

    setIsLoading(true);
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch {}

    const res = await AuthService.login(email, password);
    setIsLoading(false);

    if (res.success && res.user) {
      try {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } catch {}
      onAuthSuccess(res.user);
    } else {
      setErrorMessage(res.error || 'Failed to sign in. Please verify credentials.');
    }
  };

  const handleRegisterSubmit = async () => {
    setErrorMessage(null);
    if (!email.trim() || !password.trim()) {
      setErrorMessage('Please enter an email and password.');
      return;
    }
    if (!userName.trim()) {
      setErrorMessage('Please enter your name.');
      return;
    }
    if (gender === 'female' && !femalePartnerCodeInput.trim()) {
      setErrorMessage("Please enter or paste your partner's pairing code to link!");
      return;
    }

    setIsLoading(true);
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch {}

    const res = await AuthService.register({
      email,
      password,
      userName,
      gender,
      avatarUri,
      customCode: gender === 'male' ? customMaleCode : undefined,
      partnerCode: gender === 'female' ? femalePartnerCodeInput : undefined,
      partnerName: partnerName.trim() || 'Partner',
      anniversaryDate: anniversaryDate.trim() || '2024-05-18',
    });
    setIsLoading(false);

    if (res.success && res.user) {
      try {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } catch {}
      onAuthSuccess(res.user);
    } else {
      setErrorMessage(res.error || 'Registration failed.');
    }
  };

  return (
    <LinearGradient colors={['#FCE8EC', '#FFF5F7', '#FFFDFE']} style={styles.gradientContainer}>
      <FallingHeartsBackground />
      <SafeAreaView style={styles.safeArea}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* Header Branding */}
          <View style={styles.brandHeader}>
            <View style={styles.logoBadgeCircle}>
              <Ionicons name="heart" size={28} color="#FF6575" />
            </View>
            <Text style={styles.brandTitle}>COUPLESIFY</Text>
            <Text style={styles.brandSubtitle}>
              {authMode === 'login'
                ? 'Welcome Back, Lovebirds 💕'
                : 'Begin Your Private Couple Journey 💍'}
            </Text>
          </View>

          {/* Mode Switcher Tabs */}
          <View style={styles.tabsContainer}>
            <TouchableOpacity
              style={[styles.tabButton, authMode === 'login' && styles.tabButtonActive]}
              onPress={() => {
                setAuthMode('login');
                setErrorMessage(null);
              }}
              activeOpacity={0.8}
            >
              <Ionicons
                name="log-in-outline"
                size={16}
                color={authMode === 'login' ? '#FFFFFF' : AppColors.textSecondary}
                style={{ marginRight: 6 }}
              />
              <Text
                style={[
                  styles.tabButtonText,
                  authMode === 'login' && styles.tabButtonTextActive,
                ]}
              >
                Log In
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.tabButton, authMode === 'register' && styles.tabButtonActive]}
              onPress={() => {
                setAuthMode('register');
                setErrorMessage(null);
              }}
              activeOpacity={0.8}
            >
              <Ionicons
                name="person-add-outline"
                size={16}
                color={authMode === 'register' ? '#FFFFFF' : AppColors.textSecondary}
                style={{ marginRight: 6 }}
              />
              <Text
                style={[
                  styles.tabButtonText,
                  authMode === 'register' && styles.tabButtonTextActive,
                ]}
              >
                Create Account
              </Text>
            </TouchableOpacity>
          </View>

          {/* Error Message Banner */}
          {errorMessage && (
            <View style={styles.errorBanner}>
              <Ionicons name="alert-circle" size={16} color="#DC2626" style={{ marginRight: 6 }} />
              <Text style={styles.errorText}>{errorMessage}</Text>
            </View>
          )}

          {/* ======================================================== */}
          {/* MODE A: LOGIN VIEW                                       */}
          {/* ======================================================== */}
          {authMode === 'login' ? (
            <View style={styles.formCard}>
              <Text style={styles.fieldLabel}>Email Address</Text>
              <View style={styles.inputRow}>
                <Ionicons name="mail-outline" size={18} color="#C4B4BA" style={{ marginRight: 8 }} />
                <TextInput
                  style={styles.textInput}
                  placeholder="e.g. sweetheart@love.com"
                  placeholderTextColor="#C4B4BA"
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>

              <Text style={[styles.fieldLabel, { marginTop: 14 }]}>Password</Text>
              <View style={styles.inputRow}>
                <Ionicons name="lock-closed-outline" size={18} color="#C4B4BA" style={{ marginRight: 8 }} />
                <TextInput
                  style={styles.textInput}
                  placeholder="Enter your password"
                  placeholderTextColor="#C4B4BA"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                />
                <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                  <Ionicons
                    name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                    size={18}
                    color="#A38897"
                  />
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                style={styles.submitBtn}
                onPress={handleLoginSubmit}
                disabled={isLoading}
                activeOpacity={0.85}
              >
                {isLoading ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <>
                    <Text style={styles.submitBtnText}>Log In to Couplesify</Text>
                    <Ionicons name="arrow-forward" size={16} color="#FFFFFF" style={{ marginLeft: 6 }} />
                  </>
                )}
              </TouchableOpacity>
            </View>
          ) : (
            /* ======================================================== */
            /* MODE B: REGISTER / ONBOARDING VIEW                       */
            /* ======================================================== */
            <View style={styles.formCard}>
              {/* Credentials */}
              <Text style={styles.sectionHeaderTitle}>1. Account Details</Text>

              <Text style={styles.fieldLabel}>Email Address</Text>
              <View style={styles.inputRow}>
                <Ionicons name="mail-outline" size={18} color="#C4B4BA" style={{ marginRight: 8 }} />
                <TextInput
                  style={styles.textInput}
                  placeholder="e.g. romantic@couple.com"
                  placeholderTextColor="#C4B4BA"
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>

              <Text style={[styles.fieldLabel, { marginTop: 12 }]}>Password</Text>
              <View style={styles.inputRow}>
                <Ionicons name="lock-closed-outline" size={18} color="#C4B4BA" style={{ marginRight: 8 }} />
                <TextInput
                  style={styles.textInput}
                  placeholder="Min 6 characters"
                  placeholderTextColor="#C4B4BA"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                />
                <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                  <Ionicons
                    name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                    size={18}
                    color="#A38897"
                  />
                </TouchableOpacity>
              </View>

              {/* Personal Profile & Avatar */}
              <Text style={[styles.sectionHeaderTitle, { marginTop: 18 }]}>2. You & Your Avatar</Text>

              <View style={styles.avatarSelectionRow}>
                <TouchableOpacity
                  style={[styles.avatarCircle, !avatarUri && styles.avatarCircleEmpty]}
                  onPress={handlePickAvatarImage}
                  activeOpacity={0.8}
                >
                  {avatarUri ? (
                    <Image source={{ uri: avatarUri }} style={styles.avatarImage} />
                  ) : (
                    <View style={styles.avatarPlaceholder}>
                      <Ionicons
                        name={gender === 'male' ? 'person' : 'person'}
                        size={28}
                        color="#FF6575"
                      />
                    </View>
                  )}
                  <View style={styles.avatarCameraBadge}>
                    <Feather name={avatarUri ? 'edit-2' : 'camera'} size={12} color="#FFFFFF" />
                  </View>
                </TouchableOpacity>

                <View style={{ flex: 1, marginLeft: 14 }}>
                  <Text style={styles.fieldLabel}>Your Name</Text>
                  <View style={styles.inputRow}>
                    <TextInput
                      style={styles.textInput}
                      placeholder="e.g. Alex / Mia"
                      placeholderTextColor="#C4B4BA"
                      value={userName}
                      onChangeText={setUserName}
                    />
                  </View>
                  {avatarUri ? (
                    <TouchableOpacity
                      onPress={() => setAvatarUri('')}
                      style={{ marginTop: 4 }}
                    >
                      <Text style={{ fontSize: 11, color: '#E04859', fontWeight: '600' }}>
                        ✕ Remove Photo
                      </Text>
                    </TouchableOpacity>
                  ) : (
                    <Text style={{ fontSize: 11, color: AppColors.textSecondary, marginTop: 4 }}>
                      Tap circle to pick photo (optional)
                    </Text>
                  )}
                </View>
              </View>

              {/* Gender Selection */}
              <Text style={[styles.fieldLabel, { marginTop: 14 }]}>Select Your Gender</Text>
              <View style={styles.genderRow}>
                <TouchableOpacity
                  style={[styles.genderCard, gender === 'male' && styles.genderCardActiveMale]}
                  onPress={() => setGender('male')}
                  activeOpacity={0.8}
                >
                  <Text style={styles.genderEmoji}>👦</Text>
                  <Text style={[styles.genderTitle, gender === 'male' && styles.genderTitleActiveMale]}>
                    Male (He/Him)
                  </Text>
                  <Text style={styles.genderSub}>Generates Pairing Code</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.genderCard, gender === 'female' && styles.genderCardActiveFemale]}
                  onPress={() => setGender('female')}
                  activeOpacity={0.8}
                >
                  <Text style={styles.genderEmoji}>👧</Text>
                  <Text style={[styles.genderTitle, gender === 'female' && styles.genderTitleActiveFemale]}>
                    Female (She/Her)
                  </Text>
                  <Text style={styles.genderSub}>Links Partner Code</Text>
                </TouchableOpacity>
              </View>

              {/* Gender Specific Pairing Code Logic */}
              <Text style={[styles.sectionHeaderTitle, { marginTop: 18 }]}>3. Couple Pairing Connection</Text>

              {gender === 'male' ? (
                /* MALE: CODE GENERATION */
                <View style={styles.maleCodeBox}>
                  <View style={styles.codeBadgeRow}>
                    <Ionicons name="key" size={15} color="#FF6575" />
                    <Text style={styles.maleCodeTitle}>MALE PARTNER: YOUR PERMANENT PAIRING CODE</Text>
                  </View>
                  <Text style={styles.maleCodeDescription}>
                    Share this code with your partner! She will enter or paste it to link your accounts.
                  </Text>

                  <View style={styles.maleCodeRow}>
                    <TextInput
                      style={styles.maleCodeInput}
                      value={customMaleCode}
                      onChangeText={setCustomMaleCode}
                      autoCapitalize="characters"
                    />
                    <TouchableOpacity
                      style={styles.copyCodeActionBtn}
                      onPress={handleCopyMaleCode}
                      activeOpacity={0.8}
                    >
                      <Ionicons
                        name={codeCopied ? 'checkmark' : 'copy'}
                        size={14}
                        color="#FFFFFF"
                        style={{ marginRight: 4 }}
                      />
                      <Text style={styles.copyCodeActionText}>
                        {codeCopied ? 'Copied!' : 'Copy Code'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ) : (
                /* FEMALE: LINKING CODE VIA PASTE (NO CODE GENERATED) */
                <View style={styles.femaleLinkBox}>
                  <View style={styles.codeBadgeRow}>
                    <Ionicons name="link" size={15} color="#8F78D2" />
                    <Text style={styles.femaleLinkTitle}>FEMALE PARTNER: LINK PARTNER'S CODE</Text>
                  </View>
                  <Text style={styles.femaleLinkDescription}>
                    Paste the pairing code created by your male partner to link together.
                  </Text>

                  <View style={styles.femaleInputRow}>
                    <TextInput
                      style={styles.femaleTextInput}
                      placeholder="e.g. PAIR-7729"
                      placeholderTextColor="#B9A8C2"
                      value={femalePartnerCodeInput}
                      onChangeText={(val) => {
                        const clean = val.toUpperCase();
                        setFemalePartnerCodeInput(clean);
                        if (codeVerificationMsg) setCodeVerificationMsg(null);
                      }}
                      autoCapitalize="characters"
                    />
                    <TouchableOpacity
                      style={styles.femalePasteBtn}
                      onPress={handlePasteFemaleCode}
                      activeOpacity={0.75}
                    >
                      <Ionicons name="clipboard-outline" size={14} color="#8F78D2" />
                      <Text style={styles.femalePasteBtnText}>Paste</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.femalePasteBtn, { backgroundColor: '#8F78D2', borderColor: '#8F78D2' }]}
                      onPress={() => handleVerifyFemaleCode(femalePartnerCodeInput)}
                      disabled={isVerifyingCode || !femalePartnerCodeInput.trim()}
                      activeOpacity={0.75}
                    >
                      {isVerifyingCode ? (
                        <ActivityIndicator size="small" color="#FFFFFF" />
                      ) : (
                        <Text style={[styles.femalePasteBtnText, { color: '#FFFFFF' }]}>Verify</Text>
                      )}
                    </TouchableOpacity>
                  </View>

                  {codeVerificationMsg && (
                    <View
                      style={[
                        styles.codeVerifyBadge,
                        codeVerificationMsg.success
                          ? styles.codeVerifyBadgeSuccess
                          : styles.codeVerifyBadgeError,
                      ]}
                    >
                      <Ionicons
                        name={codeVerificationMsg.success ? 'checkmark-circle' : 'alert-circle'}
                        size={14}
                        color={codeVerificationMsg.success ? '#16A34A' : '#DC2626'}
                      />
                      <Text
                        style={[
                          styles.codeVerifyText,
                          codeVerificationMsg.success
                            ? styles.codeVerifyTextSuccess
                            : styles.codeVerifyTextError,
                        ]}
                      >
                        {codeVerificationMsg.text}
                      </Text>
                    </View>
                  )}
                </View>
              )}

              {/* Partner Name & Anniversary Date */}
              <Text style={[styles.fieldLabel, { marginTop: 14 }]}>Partner's Name</Text>
              <View style={styles.inputRow}>
                <Ionicons name="heart-outline" size={18} color="#C4B4BA" style={{ marginRight: 8 }} />
                <TextInput
                  style={styles.textInput}
                  placeholder="e.g. My Darling"
                  placeholderTextColor="#C4B4BA"
                  value={partnerName}
                  onChangeText={setPartnerName}
                />
              </View>

              <Text style={[styles.fieldLabel, { marginTop: 12 }]}>Anniversary Date (YYYY-MM-DD)</Text>
              <View style={styles.inputRow}>
                <Ionicons name="calendar-outline" size={18} color="#C4B4BA" style={{ marginRight: 8 }} />
                <TextInput
                  style={styles.textInput}
                  placeholder="2024-05-18"
                  placeholderTextColor="#C4B4BA"
                  value={anniversaryDate}
                  onChangeText={setAnniversaryDate}
                />
              </View>

              <TouchableOpacity
                style={styles.submitBtn}
                onPress={handleRegisterSubmit}
                disabled={isLoading}
                activeOpacity={0.85}
              >
                {isLoading ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <>
                    <Text style={styles.submitBtnText}>Create Account & Connect 💕</Text>
                    <Ionicons name="heart" size={16} color="#FFFFFF" style={{ marginLeft: 6 }} />
                  </>
                )}
              </TouchableOpacity>
            </View>
          )}

          {/* Guest / Skip Option */}
          {onSkip && (
            <TouchableOpacity style={styles.skipBtn} onPress={onSkip} activeOpacity={0.7}>
              <Text style={styles.skipBtnText}>Continue as Guest / Preview App ➔</Text>
            </TouchableOpacity>
          )}

          <View style={{ height: 40 }} />
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  gradientContainer: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
    paddingTop: Platform.OS === 'android' ? 30 : 0,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'web' ? 24 : 14,
    paddingBottom: 40,
  },
  brandHeader: {
    alignItems: 'center',
    marginBottom: 20,
    paddingTop: 4,
  },
  logoBadgeCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#FFE8EC',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
    borderWidth: 2,
    borderColor: '#FFFFFF',
    shadowColor: '#FF6575',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 4,
  },
  brandTitle: {
    fontFamily: AppFonts.title,
    fontSize: 28,
    color: AppColors.textPrimary,
    letterSpacing: 1.5,
  },
  brandSubtitle: {
    fontSize: 13,
    color: AppColors.textSecondary,
    fontWeight: '600',
    marginTop: 4,
  },
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    borderRadius: 16,
    padding: 4,
    marginTop: 8,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.95)',
  },
  tabButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 12,
  },
  tabButtonActive: {
    backgroundColor: AppColors.primary,
    shadowColor: AppColors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  tabButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: AppColors.textSecondary,
  },
  tabButtonTextActive: {
    color: '#FFFFFF',
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEE2E2',
    borderRadius: 12,
    padding: 10,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#FCA5A5',
  },
  errorText: {
    fontSize: 12,
    color: '#DC2626',
    fontWeight: '600',
    flex: 1,
  },
  formCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.88)',
    borderRadius: 24,
    padding: 20,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.95)',
    shadowColor: '#E297A5',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.16,
    shadowRadius: 16,
    elevation: 6,
  },
  sectionHeaderTitle: {
    fontFamily: AppFonts.title,
    fontSize: 15,
    color: AppColors.primary,
    marginBottom: 10,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: AppColors.textPrimary,
    marginBottom: 6,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1.2,
    borderColor: '#F0D4DB',
  },
  textInput: {
    flex: 1,
    fontSize: 14,
    color: AppColors.textPrimary,
    fontWeight: '600',
  },
  avatarSelectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  avatarCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    position: 'relative',
    borderWidth: 2,
    borderColor: AppColors.primary,
  },
  avatarCircleEmpty: {
    backgroundColor: '#FFE8EC',
    borderStyle: 'dashed',
    borderColor: '#FF8A96',
  },
  avatarPlaceholder: {
    width: '100%',
    height: '100%',
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFF0F3',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
    borderRadius: 32,
  },
  avatarCameraBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: AppColors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
  genderRow: {
    flexDirection: 'row',
    gap: 10,
  },
  genderCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#F0D4DB',
  },
  genderCardActiveMale: {
    borderColor: '#3B82F6',
    backgroundColor: '#EFF6FF',
  },
  genderCardActiveFemale: {
    borderColor: '#EC4899',
    backgroundColor: '#FDF2F8',
  },
  genderEmoji: {
    fontSize: 26,
    marginBottom: 4,
  },
  genderTitle: {
    fontSize: 12.5,
    fontWeight: '800',
    color: AppColors.textPrimary,
  },
  genderTitleActiveMale: {
    color: '#2563EB',
  },
  genderTitleActiveFemale: {
    color: '#DB2777',
  },
  genderSub: {
    fontSize: 10,
    color: AppColors.textSecondary,
    marginTop: 2,
    textAlign: 'center',
  },
  maleCodeBox: {
    backgroundColor: '#FFF0F3',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1.2,
    borderColor: '#FFD1DC',
  },
  codeBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  maleCodeTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: AppColors.primary,
  },
  maleCodeDescription: {
    fontSize: 11,
    color: AppColors.textSecondary,
    marginBottom: 10,
    lineHeight: 15,
  },
  maleCodeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  maleCodeInput: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingVertical: 9,
    paddingHorizontal: 12,
    fontSize: 16,
    fontWeight: '900',
    color: AppColors.primary,
    letterSpacing: 2,
    borderWidth: 1,
    borderColor: '#FFCAD4',
  },
  copyCodeActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: AppColors.primary,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
  },
  copyCodeActionText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 12,
  },
  femaleLinkBox: {
    backgroundColor: '#F5F3FF',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1.2,
    borderColor: '#DDD6FE',
  },
  femaleLinkTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#7C3AED',
  },
  femaleLinkDescription: {
    fontSize: 11,
    color: AppColors.textSecondary,
    marginBottom: 10,
    lineHeight: 15,
  },
  femaleInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  femaleTextInput: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingVertical: 9,
    paddingHorizontal: 12,
    fontSize: 15,
    fontWeight: '800',
    color: '#7C3AED',
    letterSpacing: 1.5,
    borderWidth: 1,
    borderColor: '#DDD6FE',
  },
  femalePasteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EDE9FE',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
    gap: 4,
  },
  femalePasteBtnText: {
    color: '#7C3AED',
    fontWeight: '800',
    fontSize: 12.5,
  },
  codeVerifyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 7,
    marginTop: 8,
    gap: 6,
  },
  codeVerifyBadgeSuccess: {
    backgroundColor: '#DCFCE7',
    borderWidth: 1,
    borderColor: '#86EFAC',
  },
  codeVerifyBadgeError: {
    backgroundColor: '#FEE2E2',
    borderWidth: 1,
    borderColor: '#FCA5A5',
  },
  codeVerifyText: {
    fontSize: 11.5,
    fontWeight: '700',
    flex: 1,
  },
  codeVerifyTextSuccess: {
    color: '#15803D',
  },
  codeVerifyTextError: {
    color: '#B91C1C',
  },
  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: AppColors.primary,
    paddingVertical: 14,
    borderRadius: 16,
    marginTop: 20,
    shadowColor: AppColors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  submitBtnText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 14.5,
  },
  skipBtn: {
    alignItems: 'center',
    marginTop: 16,
    paddingVertical: 8,
  },
  skipBtnText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: AppColors.textSecondary,
  },
});

export default AuthScreen;
