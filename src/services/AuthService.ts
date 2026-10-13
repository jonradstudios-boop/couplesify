import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
} from 'firebase/auth';
import { auth, isInitialized } from './FirebaseConfig';
import StorageService, { CoupleProfile } from './StorageService';
import FirestoreService, { FirestorePartnerData } from './FirestoreService';

export interface UserAccount {
  uid: string;
  email: string;
  userName: string;
  gender: 'male' | 'female';
  avatarUri?: string;
  inviteCode: string;
  partnerName: string;
  partnerAvatar?: string;
  anniversaryDate: string;
  isPaired: boolean;
  createdAt: number;
}

export interface RegisterPayload {
  email: string;
  password: string;
  userName: string;
  gender: 'male' | 'female';
  avatarUri?: string;
  customCode?: string; // For male partner
  partnerCode?: string; // For female partner
  partnerName?: string;
  anniversaryDate?: string;
}

const STORAGE_KEYS = {
  CURRENT_USER: '@couplesify_auth_user',
  AUTH_SESSION: '@couplesify_auth_session_active',
};

export const AuthService = {
  /**
   * Get Current Authenticated User Session
   */
  async getCurrentUser(): Promise<UserAccount | null> {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEYS.CURRENT_USER);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  },

  /**
   * Check if user is logged in
   */
  async isUserLoggedIn(): Promise<boolean> {
    try {
      const status = await AsyncStorage.getItem(STORAGE_KEYS.AUTH_SESSION);
      return status === 'true';
    } catch {
      return false;
    }
  },

  /**
   * Log in with Email and Password
   * Automatically restores couple data, messages, and memories from Firestore!
   */
  async login(
    email: string,
    pass: string
  ): Promise<{ success: boolean; user?: UserAccount; error?: string }> {
    const trimmedEmail = email.trim().toLowerCase();
    const trimmedPass = pass.trim();

    if (!trimmedEmail || !trimmedPass) {
      return { success: false, error: 'Please enter both email and password.' };
    }

    try {
      if (!isInitialized || !auth) {
        return {
          success: false,
          error: 'Firebase service is initializing. Please try again.',
        };
      }

      // 1. Firebase Auth Sign In
      let firebaseUid: string;
      try {
        const userCred = await signInWithEmailAndPassword(auth, trimmedEmail, trimmedPass);
        firebaseUid = userCred.user.uid;
      } catch (authErr: any) {
        const code = authErr?.code || '';
        if (code === 'auth/invalid-credential' || code === 'auth/wrong-password') {
          return { success: false, error: 'Incorrect email or password. Please verify.' };
        } else if (code === 'auth/user-not-found') {
          return { success: false, error: 'No account found with this email. Please register.' };
        } else if (code === 'auth/invalid-email') {
          return { success: false, error: 'Please enter a valid email address.' };
        }
        return { success: false, error: authErr?.message || 'Login failed.' };
      }

      // 2. Fetch User Profile from Firestore: `users/{firebaseUid}`
      let userDoc = await FirestoreService.getUserDoc(firebaseUid);
      let inviteCode = userDoc?.inviteCode || `PAIR-${Math.floor(1000 + Math.random() * 9000)}`;

      // 3. Sync from Couple Room: `couples/{inviteCode}`
      let cloudProfile = await FirestoreService.fetchCloudProfile(inviteCode, firebaseUid);

      const resolvedUserName = userDoc?.userName || cloudProfile?.userName || trimmedEmail.split('@')[0];
      const resolvedPartnerName = userDoc?.partnerName || cloudProfile?.partnerName || 'Partner';
      const resolvedUserAvatar = userDoc?.avatarUri || cloudProfile?.userAvatar || '';
      const resolvedPartnerAvatar = userDoc?.partnerAvatar || cloudProfile?.partnerAvatar || '';
      const resolvedAnniversary = userDoc?.anniversaryDate || cloudProfile?.anniversaryDate || new Date().toISOString().split('T')[0];
      const resolvedIsPaired = !!(userDoc?.isPaired || cloudProfile?.isPaired);

      const activeUser: UserAccount = {
        uid: firebaseUid,
        email: trimmedEmail,
        userName: resolvedUserName,
        gender: userDoc?.gender || 'male',
        avatarUri: resolvedUserAvatar,
        inviteCode,
        partnerName: resolvedPartnerName,
        partnerAvatar: resolvedPartnerAvatar,
        anniversaryDate: resolvedAnniversary,
        isPaired: resolvedIsPaired,
        createdAt: userDoc?.createdAt || Date.now(),
      };

      // 4. Update Local Profile Storage
      const localProfile: CoupleProfile = {
        userName: activeUser.userName,
        partnerName: activeUser.partnerName,
        userAvatar: activeUser.avatarUri || '',
        partnerAvatar: activeUser.partnerAvatar || '',
        anniversaryDate: activeUser.anniversaryDate,
        inviteCode: activeUser.inviteCode,
        isPaired: activeUser.isPaired,
        partnerOnline: true,
      };
      await StorageService.saveProfile(localProfile);

      // 5. Restore Persistent Messages, Memories, and Letters from Firestore
      try {
        const cloudMessages = await FirestoreService.fetchChatMessages(inviteCode, firebaseUid);
        if (cloudMessages && cloudMessages.length > 0) {
          await StorageService.saveMessages(cloudMessages);
        }

        const cloudMemories = await FirestoreService.fetchMemories(inviteCode);
        if (cloudMemories && cloudMemories.length > 0) {
          await StorageService.saveMemories(cloudMemories);
        }

        const cloudLetters = await FirestoreService.fetchLetters(inviteCode);
        if (cloudLetters && cloudLetters.length > 0) {
          await StorageService.saveLetters(cloudLetters);
        }

        const cloudPages = await FirestoreService.fetchScrapbookPages(inviteCode);
        if (cloudPages && cloudPages.length > 0) {
          await StorageService.saveScrapbookPages(cloudPages);
        }
      } catch (syncErr) {
        console.warn('Sync on login warning:', syncErr);
      }

      // 6. Save active session
      await AsyncStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(activeUser));
      await AsyncStorage.setItem(STORAGE_KEYS.AUTH_SESSION, 'true');

      return { success: true, user: activeUser };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Login failed. Please check credentials.' };
    }
  },

  /**
   * Register New Account with Full Firestore Synchronization:
   * - Male: Generates unique couple code & initializes couple room in Firestore
   * - Female: Links via partner's existing code in Firestore
   */
  async register(
    payload: RegisterPayload
  ): Promise<{ success: boolean; user?: UserAccount; error?: string }> {
    const trimmedEmail = payload.email.trim().toLowerCase();
    const trimmedPass = payload.password.trim();

    if (!trimmedEmail || !trimmedPass) {
      return { success: false, error: 'Please enter a valid email and password.' };
    }
    if (trimmedPass.length < 6) {
      return { success: false, error: 'Password must be at least 6 characters.' };
    }

    try {
      if (!isInitialized || !auth) {
        return {
          success: false,
          error: 'Firebase service is initializing. Please try again.',
        };
      }

      // 1. Create Firebase Auth User
      let firebaseUid: string;
      try {
        const userCred = await createUserWithEmailAndPassword(auth, trimmedEmail, trimmedPass);
        firebaseUid = userCred.user.uid;
      } catch (authErr: any) {
        const code = authErr?.code || '';
        if (code === 'auth/email-already-in-use') {
          return { success: false, error: 'This email is already registered. Please log in.' };
        } else if (code === 'auth/weak-password') {
          return { success: false, error: 'Password is too weak. Please use at least 6 characters.' };
        } else if (code === 'auth/invalid-email') {
          return { success: false, error: 'Please provide a valid email address.' };
        }
        return { success: false, error: authErr?.message || 'Registration failed.' };
      }

      // 2. Gender-Specific Pairing Logic
      let finalInviteCode: string;
      let isPaired = false;
      let partnerName = payload.partnerName?.trim() || 'Partner';
      let partnerAvatar = '';

      const partnerData: FirestorePartnerData = {
        uid: firebaseUid,
        name: payload.userName.trim() || (payload.gender === 'male' ? 'Him' : 'Her'),
        gender: payload.gender,
        email: trimmedEmail,
        avatarUri: payload.avatarUri || '',
        online: true,
        lastActive: Date.now(),
      };

      if (payload.gender === 'male') {
        // MALE GENERATES CODE
        const custom = payload.customCode?.trim().toUpperCase();
        finalInviteCode = custom || `PAIR-${Math.floor(1000 + Math.random() * 9000)}`;

        // Create the couple room in Firestore
        await FirestoreService.createCoupleRoom(
          finalInviteCode,
          partnerData,
          payload.anniversaryDate?.trim() || '2024-05-18'
        );
      } else {
        // FEMALE LINKS VIA PARTNER'S CODE
        const partnerCode = payload.partnerCode?.trim().toUpperCase();
        if (!partnerCode) {
          return {
            success: false,
            error: "Please enter your partner's code to link your account.",
          };
        }

        // Link with Firestore couple room
        const linkResult = await FirestoreService.joinCoupleRoom(partnerCode, partnerData);
        if (!linkResult.success) {
          return {
            success: false,
            error: linkResult.error || `Code "${partnerCode}" not found. Please verify with your partner.`,
          };
        }

        finalInviteCode = partnerCode;
        isPaired = true;
        if (linkResult.partner1) {
          partnerName = linkResult.partner1.name;
          partnerAvatar = linkResult.partner1.avatarUri || '';
        }
      }

      // 3. Save User Document in Firestore
      const newUser: UserAccount = {
        uid: firebaseUid,
        email: trimmedEmail,
        userName: partnerData.name,
        gender: payload.gender,
        avatarUri: partnerData.avatarUri || '',
        inviteCode: finalInviteCode,
        partnerName,
        partnerAvatar,
        anniversaryDate: payload.anniversaryDate?.trim() || '2024-05-18',
        isPaired,
        createdAt: Date.now(),
      };

      await FirestoreService.saveUserDoc(newUser);

      // 4. Update Local Storage & Couple Profile
      await AsyncStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(newUser));
      await AsyncStorage.setItem(STORAGE_KEYS.AUTH_SESSION, 'true');

      const profile: CoupleProfile = {
        userName: newUser.userName,
        partnerName: newUser.partnerName,
        userAvatar: newUser.avatarUri || '',
        partnerAvatar: newUser.partnerAvatar || '',
        anniversaryDate: newUser.anniversaryDate,
        inviteCode: newUser.inviteCode,
        isPaired: newUser.isPaired,
        partnerOnline: true,
      };
      await StorageService.saveProfile(profile);

      return { success: true, user: newUser };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Registration failed. Please try again.' };
    }
  },

  /**
   * Log Out and clear session
   */
  async logout(): Promise<void> {
    try {
      if (isInitialized && auth) {
        await signOut(auth);
      }
    } catch {}
    await AsyncStorage.removeItem(STORAGE_KEYS.AUTH_SESSION);
    await AsyncStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
  },
};

export default AuthService;
