
// auth-context.tsx
'use client';

import React, { createContext, useContext, useEffect, useState, ReactNode, useRef, useCallback } from 'react';
import { onAuthStateChanged, User as FirebaseUser, signInAnonymously, PhoneAuthProvider, linkWithCredential, RecaptchaVerifier } from 'firebase/auth';
import { auth, db } from '@/lib/firebase/config'; 
import { doc, onSnapshot, setDoc } from 'firebase/firestore'; 
import type { AuthUser, UserRole, UserProfile as UserProfileType, StaffRole } from '@/types';
import { isStaffRole, STAFF_ROLES_ARRAY, defaultStaffPermissions } from '@/types';
import AppLoadingScreen from '@/components/shared/app-loading-screen'; 
import { updateUserProfile } from '../firebase/firestore'; 

interface AuthContextType {
  user: AuthUser | null;
  role: UserRole | null; // This will now hold 'Waiter', 'Manager', etc. for staff
  staffRole: StaffRole | null; // Specific staff duty, redundant if role holds it but kept for clarity
  loading: boolean; 
  initialLoading: boolean; 
  signInAnonymouslyHandler: () => Promise<AuthUser | null>;
  linkAnonymousWithPhoneNumber: (phoneNumber: string, appVerifier: RecaptchaVerifier) => Promise<{ verificationId: string | null; error?: Error }>;
  confirmPhoneNumberVerification: (verificationId: string, verificationCode: string, phoneNumber: string) => Promise<{ success: boolean; error?: Error }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [role, setRole] = useState<UserRole | null>(null); // Will be 'Waiter', 'Manager' etc.
  const [staffRoleState, setStaffRoleState] = useState<StaffRole | null>(null); // Store specific staff role
  const [loading, setLoading] = useState(true); 
  const [initialLoadingState, setInitialLoadingState] = useState(true); 
  const initialLoadingStateRef = useRef(true); 

  const signInAnonymouslyHandler = useCallback(async (): Promise<AuthUser | null> => {
    setLoading(true);
    try {
      const userCredential = await signInAnonymously(auth);
      const firebaseUser = userCredential.user;
      const anonUser: AuthUser = {
        ...firebaseUser,
        role: 'user', 
        staffRole: null, // Anonymous users don't have a specific staff role
        restaurantId: null,
        onboardingComplete: true, 
        isAnonymous: true,
        phoneNumber: null,
        staffPermissions: { ...defaultStaffPermissions }, // Give minimal permissions
      };
      setUser(anonUser);
      setRole('user'); 
      setStaffRoleState(null);
      return anonUser;
    } catch (error) {
      console.error("Anonymous sign-in error:", error);
      setUser(null);
      setRole(null);
      setStaffRoleState(null);
      return null;
    } finally {
      setLoading(false);
      if (initialLoadingStateRef.current) {
        setInitialLoadingState(false);
        initialLoadingStateRef.current = false;
      }
    }
  }, []);
  
  const linkAnonymousWithPhoneNumber = useCallback(async (phoneNumber: string, appVerifier: RecaptchaVerifier): Promise<{ verificationId: string | null; error?: Error }> => {
    if (!auth.currentUser || !auth.currentUser.isAnonymous) {
      return { verificationId: null, error: new Error("No anonymous user to link or user is not anonymous.") };
    }
    setLoading(true);
    try {
      const phoneProvider = new PhoneAuthProvider(auth);
      const verificationId = await phoneProvider.verifyPhoneNumber(phoneNumber, appVerifier);
      setLoading(false);
      return { verificationId };
    } catch (error: any) {
      console.error("Error sending phone verification code:", error);
      setLoading(false);
      return { verificationId: null, error };
    }
  }, []);

  const confirmPhoneNumberVerification = useCallback(async (verificationId: string, verificationCode: string, phoneNumber: string): Promise<{ success: boolean; error?: Error }> => {
    if (!auth.currentUser || !auth.currentUser.isAnonymous) {
       return { success: false, error: new Error("No anonymous user to link or user is not anonymous.") };
    }
    setLoading(true);
    try {
      const credential = PhoneAuthProvider.credential(verificationId, verificationCode);
      await linkWithCredential(auth.currentUser, credential);
      
      if (auth.currentUser) { 
        await updateUserProfile(auth.currentUser.uid, { 
          phoneNumber: phoneNumber, 
          email: auth.currentUser.email, // Email would be null for anon linked to phone
          role: 'user', // Linked anonymous users become regular users
          onboardingComplete: true, 
          isAnonymous: false, 
        });
      }
      setLoading(false);
      return { success: true };
    } catch (error: any) {
      console.error("Error confirming phone verification and linking:", error);
      setLoading(false);
      return { success: false, error };
    }
  }, []);


  useEffect(() => {
    let unsubscribeProfile: (() => void) | null = null;

    const unsubscribeAuth = onAuthStateChanged(auth, (firebaseUser: FirebaseUser | null) => {
      if (unsubscribeProfile) {
        unsubscribeProfile();
        unsubscribeProfile = null;
      }

      if (firebaseUser) {
        setLoading(true); 
        const userDocRef = doc(db, 'users', firebaseUser.uid);
        
        unsubscribeProfile = onSnapshot(userDocRef, (docSnap) => {
          setLoading(true); 
          let authUser: AuthUser;
          if (docSnap.exists()) {
            const userProfileData = docSnap.data() as UserProfileType;
            authUser = {
              uid: firebaseUser.uid,
              displayName: firebaseUser.displayName || userProfileData.displayName || null,
              email: firebaseUser.email || userProfileData.email || null,
              photoURL: firebaseUser.photoURL || userProfileData.photoURL || null,
              providerId: firebaseUser.providerId,
              emailVerified: firebaseUser.emailVerified,
              isAnonymous: firebaseUser.isAnonymous,
              metadata: firebaseUser.metadata,
              providerData: firebaseUser.providerData,
              refreshToken: firebaseUser.refreshToken,
              tenantId: firebaseUser.tenantId,

              role: userProfileData.role, // This will now be 'Waiter', 'Manager', etc. for staff
              staffRole: userProfileData.staffRole || null, // This will be the specific staff role
              restaurantId: userProfileData.restaurantId || null, 
              onboardingComplete: typeof userProfileData.onboardingComplete === 'boolean' ? userProfileData.onboardingComplete : false,
              phoneNumber: firebaseUser.phoneNumber || userProfileData.phoneNumber || null,
              staffPermissions: userProfileData.staffPermissions || (isStaffRole(userProfileData.role) ? DEFAULT_PERMISSIONS_BY_ROLE[userProfileData.role as StaffRole] : defaultStaffPermissions)
            };
            setRole(userProfileData.role);
            setStaffRoleState(userProfileData.staffRole || null);
          } else {
            console.warn(`User profile not found for UID: ${firebaseUser.uid}. This is expected for newly signed up users or anonymous users before profile creation.`);
            const defaultRole = firebaseUser.isAnonymous ? 'user' : null;
            authUser = {
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
              
              role: defaultRole,
              staffRole: null,
              restaurantId: null,
              onboardingComplete: firebaseUser.isAnonymous ? true : false, 
              phoneNumber: firebaseUser.phoneNumber || null,
              staffPermissions: firebaseUser.isAnonymous ? { ...defaultStaffPermissions } : undefined,
            };
            setRole(authUser.role);
            setStaffRoleState(null);
          }
          setUser(authUser);
          setLoading(false);
          if (initialLoadingStateRef.current) {
            setInitialLoadingState(false);
            initialLoadingStateRef.current = false;
          }
        }, (error) => {
          console.error("Error listening to user profile:", error);
          const defaultRole = firebaseUser.isAnonymous ? 'user' : null;
          const fbUserWithDefaults: AuthUser = {
            ...firebaseUser, 
            role: defaultRole, 
            staffRole: null,
            restaurantId: null,
            onboardingComplete: firebaseUser.isAnonymous ? true : false,
            isAnonymous: firebaseUser.isAnonymous, 
            phoneNumber: firebaseUser.phoneNumber || null,
            staffPermissions: firebaseUser.isAnonymous ? { ...defaultStaffPermissions } : undefined,
          };
          setUser(fbUserWithDefaults);
          setRole(defaultRole);
          setStaffRoleState(null);
          setLoading(false);
          if (initialLoadingStateRef.current) {
            setInitialLoadingState(false);
            initialLoadingStateRef.current = false;
          }
        });
      } else { 
        setUser(null);
        setRole(null);
        setStaffRoleState(null);
        setLoading(false); 
        if (initialLoadingStateRef.current) {
          setInitialLoadingState(false); 
          initialLoadingStateRef.current = false;
        }
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeProfile) {
        unsubscribeProfile();
      }
    };
  }, []);

  return (
    <AuthContext.Provider value={{ user, role, staffRole: staffRoleState, loading, initialLoading: initialLoadingState, signInAnonymouslyHandler, linkAnonymousWithPhoneNumber, confirmPhoneNumberVerification }}>
      {initialLoadingState ? <AppLoadingScreen message="Initializing Potoba..." /> : children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
