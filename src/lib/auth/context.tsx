// auth-context.tsx
'use client';

import React, { createContext, useContext, useEffect, useState, ReactNode, useRef, useCallback } from 'react';
import { onAuthStateChanged, User as FirebaseUser, signInAnonymously, PhoneAuthProvider, linkWithCredential, RecaptchaVerifier } from 'firebase/auth';
import { auth, db } from '@/lib/firebase/config'; 
import { doc, onSnapshot, setDoc } from 'firebase/firestore'; 
import type { AuthUser, UserRole, UserProfile as UserProfileType, StaffRole } from '@/types';
import { isStaffRole, STAFF_ROLES_ARRAY, defaultStaffPermissions, DEFAULT_PERMISSIONS_BY_ROLE } from '@/types';
import AppLoadingScreen from '@/components/shared/app-loading-screen'; 
import { updateUserProfile } from '../firebase/firestore';
import { ErrorBoundary } from '@/components/shared/error-boundary';
import { ConnectionStatus, useConnectionStatus } from '@/components/shared/connection-status';
import { prefetcher } from '../prefetch';

interface AuthContextType {
  user: AuthUser | null;
  role: UserRole | null; 
  staffRole: StaffRole | null;
  loading: boolean; // True when FirebaseUser exists but profile is loading or during auth operations
  initialLoading: boolean; // True only on very first app mount until onAuthStateChanged fires once
  signInAnonymouslyHandler: () => Promise<AuthUser | null>;
  linkAnonymousWithPhoneNumber: (phoneNumber: string, appVerifier: RecaptchaVerifier) => Promise<{ verificationId: string | null; error?: Error }>;
  confirmPhoneNumberVerification: (verificationId: string, verificationCode: string, phoneNumber: string) => Promise<{ success: boolean; error?: Error }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [role, setRole] = useState<UserRole | null>(null);
  const [staffRoleState, setStaffRoleState] = useState<StaffRole | null>(null);
  const [authOpLoading, setAuthOpLoading] = useState(false); 
  const [profileLoading, setProfileLoading] = useState(false); 
  const [initialAuthCheckDone, setInitialAuthCheckDone] = useState(false);
  const { isOnline } = useConnectionStatus();
  
  const combinedLoading = authOpLoading || profileLoading;

  // Prefetch user data
  useEffect(() => {
    if (user?.uid) {
      prefetcher.prefetchData({
        paths: [`users/${user.uid}`, `restaurants/${user.restaurantId}`],
        key: `user-data-${user.uid}`,
      }).catch(console.error);
    }
  }, [user?.uid, user?.restaurantId]);

  const signInAnonymouslyHandler = useCallback(async (): Promise<AuthUser | null> => {
    setAuthOpLoading(true);
    try {
      const userCredential = await signInAnonymously(auth);
      const firebaseUser = userCredential.user;
      const anonUser: AuthUser = {
        uid: firebaseUser.uid,
        displayName: firebaseUser.displayName || null,
        email: firebaseUser.email || null,
        photoURL: firebaseUser.photoURL || null,
        providerId: firebaseUser.providerId,
        emailVerified: firebaseUser.emailVerified,
        isAnonymous: true, 
        metadata: firebaseUser.metadata,
        providerData: firebaseUser.providerData,
        refreshToken: firebaseUser.refreshToken,
        tenantId: firebaseUser.tenantId,
        role: 'user', 
        staffRole: null,
        restaurantId: null,
        onboardingComplete: true, 
        phoneNumber: null,
        staffPermissions: { ...defaultStaffPermissions },
      };
      return anonUser;
    } catch (error) {
      console.error("Anonymous sign-in error:", error);
      return null;
    } finally {
      setAuthOpLoading(false);
    }
  }, []);
  
  const linkAnonymousWithPhoneNumber = useCallback(async (phoneNumber: string, appVerifier: RecaptchaVerifier): Promise<{ verificationId: string | null; error?: Error }> => {
    if (!auth.currentUser || !auth.currentUser.isAnonymous) {
      return { verificationId: null, error: new Error("No anonymous user to link or user is not anonymous.") };
    }
    setAuthOpLoading(true);
    try {
      const phoneProvider = new PhoneAuthProvider(auth);
      const verificationId = await phoneProvider.verifyPhoneNumber(phoneNumber, appVerifier);
      return { verificationId };
    } catch (error: any) {
      console.error("Error sending phone verification code:", error);
      return { verificationId: null, error };
    } finally {
      setAuthOpLoading(false);
    }
  }, []);

  const confirmPhoneNumberVerification = useCallback(async (verificationId: string, verificationCode: string, phoneNumber: string): Promise<{ success: boolean; error?: Error }> => {
    if (!auth.currentUser || !auth.currentUser.isAnonymous) {
       return { success: false, error: new Error("No anonymous user to link or user is not anonymous.") };
    }
    setAuthOpLoading(true);
    try {
      const credential = PhoneAuthProvider.credential(verificationId, verificationCode);
      await linkWithCredential(auth.currentUser, credential);
      
      if (auth.currentUser) { 
        await updateUserProfile(auth.currentUser.uid, { 
          phoneNumber: phoneNumber, 
          isAnonymous: false, 
        });
      }
      return { success: true };
    } catch (error: any) {
      console.error("Error confirming phone verification and linking:", error);
      return { success: false, error };
    } finally {
      setAuthOpLoading(false);
    }
  }, []);


  // Cache key for storing user data
  const USER_CACHE_KEY = 'cached_user_data';
  const CACHE_EXPIRY = 1000 * 60 * 30; // 30 minutes

  useEffect(() => {
    let unsubscribeProfile: (() => void) | null = null;

    const getCachedData = () => {
      const cachedData = localStorage.getItem(USER_CACHE_KEY);
      if (cachedData) {
        try {
          const { data, timestamp } = JSON.parse(cachedData);
          if (Date.now() - timestamp < CACHE_EXPIRY) {
            return data;
          }
        } catch (e) {
          console.warn('Error parsing cached user data:', e);
        }
      }
      return null;
    };

    const unsubscribeAuth = onAuthStateChanged(auth, async (firebaseUser: FirebaseUser | null) => {
      if (unsubscribeProfile) {
        unsubscribeProfile();
        unsubscribeProfile = null;
      }
      
      if (firebaseUser) {
        setProfileLoading(true);
        
        // Try to load from cache first
        const cachedData = getCachedData();
        if (cachedData && cachedData.uid === firebaseUser.uid) {
          setUser(cachedData);
          setRole(cachedData.role);
          setStaffRoleState(cachedData.staffRole);
          setInitialAuthCheckDone(true);
        }

        const baseAuthUser: AuthUser = { // Create a base user object immediately
          uid: firebaseUser.uid,
          displayName: firebaseUser.displayName || null,
          email: firebaseUser.email || null,
          photoURL: firebaseUser.photoURL || null,
          providerId: firebaseUser.providerId,
          emailVerified: firebaseUser.emailVerified,
          isAnonymous: firebaseUser.isAnonymous,
          metadata: firebaseUser.metadata,
          providerData: firebaseUser.providerData,
          refreshToken: firebaseUser.refreshToken,
          tenantId: firebaseUser.tenantId,
          role: null, // Role will be set by profile snapshot
          staffRole: null,
          restaurantId: null,
          onboardingComplete: false, // Default, updated by profile
          phoneNumber: firebaseUser.phoneNumber || null,
          staffPermissions: undefined,
        };
        setUser(baseAuthUser);
        setInitialAuthCheckDone(true); // First auth check complete

        const userDocRef = doc(db, 'users', firebaseUser.uid);
        unsubscribeProfile = onSnapshot(userDocRef, (docSnap) => {
          let finalUser: AuthUser;
          if (docSnap.exists()) {
            const userProfileData = docSnap.data() as UserProfileType;
            
            // Get cached data first
            const cachedData = getCachedData();
            const hasChanged = !cachedData || 
                             cachedData.role !== userProfileData.role ||
                             cachedData.staffRole !== userProfileData.staffRole ||
                             cachedData.restaurantId !== userProfileData.restaurantId;
            
            finalUser = {
              ...baseAuthUser,
              role: userProfileData.role,
              staffRole: userProfileData.staffRole || null,
              restaurantId: userProfileData.restaurantId || null,
              onboardingComplete: typeof userProfileData.onboardingComplete === 'boolean' ? userProfileData.onboardingComplete : false,
              displayName: userProfileData.displayName || baseAuthUser.displayName,
              photoURL: userProfileData.photoURL || baseAuthUser.photoURL,
              phoneNumber: userProfileData.phoneNumber || baseAuthUser.phoneNumber,
              staffPermissions: userProfileData.staffPermissions || (isStaffRole(userProfileData.role) ? DEFAULT_PERMISSIONS_BY_ROLE[userProfileData.role as StaffRole] : defaultStaffPermissions),
            };
            setRole(userProfileData.role);
            setStaffRoleState(userProfileData.staffRole || null);
          } else {
            console.warn(`User profile not found for UID: ${firebaseUser.uid}.`);
            const defaultRoleForNew = firebaseUser.isAnonymous ? 'user' : null;
            finalUser = {
              ...baseAuthUser,
              role: defaultRoleForNew,
              onboardingComplete: firebaseUser.isAnonymous,
              staffPermissions: firebaseUser.isAnonymous ? { ...defaultStaffPermissions } : undefined,
            };
            setRole(defaultRoleForNew);
            setStaffRoleState(null);
          }
          setUser(finalUser);
          setProfileLoading(false); 
        }, (error) => {
          console.error("Error listening to user profile:", error);
          setUser(baseAuthUser); // Fallback to base user data
          setRole(baseAuthUser.isAnonymous ? 'user' : null);
          setStaffRoleState(null);
          setProfileLoading(false);
        });
      } else { 
        setUser(null);
        setRole(null);
        setStaffRoleState(null);
        setProfileLoading(false); 
        setInitialAuthCheckDone(true); // Auth check done, no user
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeProfile) {
        unsubscribeProfile();
      }
    };
  }, []);
  
  const handleAuthError = useCallback((error: any) => {
    console.error('Auth error:', error);
    if (error.code === 'auth/network-request-failed' && !isOnline) {
      // Handle offline case
      return;
    }
    throw error;
  }, [isOnline]);

  const contextLoadingState = authOpLoading || profileLoading || !initialAuthCheckDone;

  return (
    <ErrorBoundary>
      <AuthContext.Provider value={{ 
        user, 
        role, 
        staffRole: staffRoleState, 
        loading: contextLoadingState, 
        initialLoading: !initialAuthCheckDone, 
        signInAnonymouslyHandler, 
        linkAnonymousWithPhoneNumber, 
        confirmPhoneNumberVerification 
      }}>
        {!initialAuthCheckDone ? (
          <AppLoadingScreen 
            message="Initializing Potoba..." 
            timeout={15000}
            progress={user ? 50 : 0} 
          />
        ) : (
          <>
            {children}
            <ConnectionStatus />
          </>
        )}
      </AuthContext.Provider>
    </ErrorBoundary>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
