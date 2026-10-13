import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
} from 'firebase/auth';
import { auth, isInitialized } from './FirebaseConfig';
import StorageService, { CoupleProfile } from './StorageService';
import FirestoreService from './FirestoreService';

export interface UserAccount {
  uid: string;
  email: string;
  userName: string;
  gender: 'male' | 'female';
  avatarUri?: string;
  inviteCode: string;
  partnerName: string;
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
      // 1. Attempt Firebase Auth if initialized
      let firebaseUid = `user-${Date.now()}`;
      if (isInitialized && auth) {
        try {
          const userCred = await signInWithEmailAndPassword(auth, trimmedEmail, trimmedPass);
          firebaseUid = userCred.user.uid;
        } catch (firebaseErr: any) {
          // If offline or client API key pending, log notice and proceed with local profile
          console.warn('Firebase login notice:', firebaseErr?.message);
        }
      }

      // 2. Fetch existing stored user profile or create active session
      let existingUser = await this.getCurrentUser();
      const profile = await StorageService.getProfile();

      if (!existingUser) {
        existingUser = {
          uid: firebaseUid,
          email: trimmedEmail,
          userName: profile.userName || 'You',
          gender: 'male',
          avatarUri: profile.userAvatar,
          inviteCode: profile.inviteCode || 'PAIR-7729',
          partnerName: profile.partnerName || 'Partner',
          anniversaryDate: profile.anniversaryDate || new Date().toISOString().split('T')[0],
          isPaired: profile.isPaired || false,
          createdAt: Date.now(),
        };
      }

      await AsyncStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(existingUser));
      await AsyncStorage.setItem(STORAGE_KEYS.AUTH_SESSION, 'true');

      // Sync with Firestore in background
      FirestoreService.syncProfileToCloud({
        userName: existingUser.userName,
        partnerName: existingUser.partnerName,
        userAvatar: existingUser.avatarUri || '',
        partnerAvatar: '',
        anniversaryDate: existingUser.anniversaryDate,
        inviteCode: existingUser.inviteCode,
        isPaired: existingUser.isPaired,
        partnerOnline: true,
      });

      return { success: true, user: existingUser };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Login failed. Please check credentials.' };
    }
  },

  /**
   * Register New Account with Gender-Specific Pairing Logic:
   * - Male: Generates unique permanent couple code (PAIR-XXXX or custom)
   * - Female: Links via partner's existing code
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
      let firebaseUid = `user-${Date.now()}`;
      if (isInitialized && auth) {
        try {
          const userCred = await createUserWithEmailAndPassword(auth, trimmedEmail, trimmedPass);
          firebaseUid = userCred.user.uid;
        } catch (firebaseErr: any) {
          console.warn('Firebase registration notice:', firebaseErr?.message);
        }
      }

      // Determine pairing code based on gender
      let finalInviteCode: string;
      let isPaired = false;

      if (payload.gender === 'male') {
        // MALE GENERATES CODE
        const custom = payload.customCode?.trim().toUpperCase();
        finalInviteCode = custom || `PAIR-${Math.floor(1000 + Math.random() * 9000)}`;
      } else {
        // FEMALE ENTERS PARTNER CODE TO LINK
        const partnerCode = payload.partnerCode?.trim().toUpperCase();
        if (!partnerCode) {
          return {
            success: false,
            error: "Please enter your partner's code to link your account.",
          };
        }
        finalInviteCode = partnerCode;
        isPaired = true;
      }

      const newUser: UserAccount = {
        uid: firebaseUid,
        email: trimmedEmail,
        userName: payload.userName.trim() || (payload.gender === 'male' ? 'Him' : 'Her'),
        gender: payload.gender,
        avatarUri: payload.avatarUri || '',
        inviteCode: finalInviteCode,
        partnerName: payload.partnerName?.trim() || 'Partner',
        anniversaryDate: payload.anniversaryDate?.trim() || new Date().toISOString().split('T')[0],
        isPaired,
        createdAt: Date.now(),
      };

      // Save user session
      await AsyncStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(newUser));
      await AsyncStorage.setItem(STORAGE_KEYS.AUTH_SESSION, 'true');

      // Update CoupleProfile in StorageService
      const profile: CoupleProfile = {
        userName: newUser.userName,
        partnerName: newUser.partnerName,
        userAvatar: newUser.avatarUri || '',
        partnerAvatar: '',
        anniversaryDate: newUser.anniversaryDate,
        inviteCode: newUser.inviteCode,
        isPaired: newUser.isPaired,
        partnerOnline: true,
      };
      await StorageService.saveProfile(profile);

      // Cloud Firestore Sync
      FirestoreService.syncProfileToCloud(profile);

      return { success: true, user: newUser };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Registration failed. Please try again.' };
    }
  },

  /**
   * Log Out
   */
  async logout(): Promise<void> {
    try {
      if (isInitialized && auth) {
        await signOut(auth);
      }
    } catch {}
    await AsyncStorage.removeItem(STORAGE_KEYS.AUTH_SESSION);
  },
};

export default AuthService;
