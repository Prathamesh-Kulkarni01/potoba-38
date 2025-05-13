// auth-context.tsx
'use client';

import React, { createContext, useContext, useEffect, useState, ReactNode, useRef, useCallback } from 'react';
import { onAuthStateChanged, User as FirebaseUser, signInAnonymously, PhoneAuthProvider, linkWithCredential, RecaptchaVerifier } from 'firebase/auth';
import { auth, db } from '@/lib/firebase/config'; 
import { doc, onSnapshot, setDoc } from 'firebase/firestore'; 
import type { AuthUser, UserRole, UserProfile as UserProfileType } from '@/types';
import AppLoadingScreen from '@/components/shared/app-loading-screen'; // Changed import
import { updateUserProfile } from '../firebase/firestore'; 

interface AuthContextType {
  user: AuthUser | null;
  role: UserRole | null;
  loading: boolean; 
  initialLoading: boolean; 
  signInAnonymouslyHandler: () => Promise<AuthUser | null>;
  linkAnonymousWithPhoneNumber: (phoneNumber: string, appVerifier: RecaptchaVerifier) => Promise<{ verificationId: string | null; error?: Error }>;
  confirmPhoneNumberVerification: (verificationId: string, verificationCode: string, phoneNumber: string) => Promise<{ success: boolean; error?: Error }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [role, setRole] = useState<UserRole | null>(null);
  const [loading, setLoading] = useState(true); // Represents ongoing profile/role loading after initial auth state
  const [initialLoadingState, setInitialLoadingState] = useState(true); // Represents the very first auth check
  const initialLoadingStateRef = useRef(true); // To ensure initialLoadingState is set to false only once

  const signInAnonymouslyHandler = useCallback(async (): Promise<AuthUser | null> => {
    setLoading(true);
    try {
      const userCredential = await signInAnonymously(auth);
      const firebaseUser = userCredential.user;
      const anonUser: AuthUser = {
        ...firebaseUser,
        role: 'user', 
        restaurantId: null,
        onboardingComplete: true, 
        isAnonymous: true,
        phoneNumber: null,
      };
      setUser(anonUser);
      setRole('user'); 
      return anonUser;
    } catch (error) {
      console.error("Anonymous sign-in error:", error);
      setUser(null);
      setRole(null);
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
          email: auth.currentUser.email, 
          role: 'user', 
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
    // setLoading(true); // This was causing loading to be true even after initialLoadingState was false
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
              uid: firebaseUser.uid, // ensure uid from firebaseUser is used
              displayName: firebaseUser.displayName || userProfileData.displayName || null, // Prefer firebaseUser's displayName if available
              email: firebaseUser.email || userProfileData.email || null, // Prefer firebaseUser's email
              photoURL: firebaseUser.photoURL || userProfileData.photoURL || null, // Prefer firebaseUser's photoURL
              providerId: firebaseUser.providerId, // from firebaseUser
              emailVerified: firebaseUser.emailVerified, // from firebaseUser
              isAnonymous: firebaseUser.isAnonymous, // from firebaseUser
              metadata: firebaseUser.metadata, // from firebaseUser
              providerData: firebaseUser.providerData, // from firebaseUser
              refreshToken: firebaseUser.refreshToken, // from firebaseUser
              tenantId: firebaseUser.tenantId, // from firebaseUser

              role: userProfileData.role,
              restaurantId: userProfileData.restaurantId || null, 
              onboardingComplete: typeof userProfileData.onboardingComplete === 'boolean' ? userProfileData.onboardingComplete : false,
              phoneNumber: firebaseUser.phoneNumber || userProfileData.phoneNumber || null,
            };
            setRole(userProfileData.role);
          } else {
            console.warn(`User profile not found for UID: ${firebaseUser.uid}. This is expected for newly signed up users or anonymous users before profile creation.`);
            authUser = {
              uid: firebaseUser.uid, // from firebaseUser
              displayName: firebaseUser.displayName || null, // from firebaseUser
              email: firebaseUser.email || null, // from firebaseUser
              photoURL: firebaseUser.photoURL || null, // from firebaseUser
              providerId: firebaseUser.providerId, // from firebaseUser
              emailVerified: firebaseUser.emailVerified, // from firebaseUser
              isAnonymous: firebaseUser.isAnonymous, // from firebaseUser
              metadata: firebaseUser.metadata, // from firebaseUser
              providerData: firebaseUser.providerData, // from firebaseUser
              refreshToken: firebaseUser.refreshToken, // from firebaseUser
              tenantId: firebaseUser.tenantId, // from firebaseUser
              
              role: firebaseUser.isAnonymous ? 'user' : null, // Anonymous users get 'user' role conceptually, others null until profile syncs
              restaurantId: null,
              onboardingComplete: firebaseUser.isAnonymous ? true : false, // Onboarding not applicable for pure anon
              phoneNumber: firebaseUser.phoneNumber || null,
            };
            setRole(authUser.role);
          }
          setUser(authUser);
          setLoading(false);
          if (initialLoadingStateRef.current) {
            setInitialLoadingState(false);
            initialLoadingStateRef.current = false;
          }
        }, (error) => {
          console.error("Error listening to user profile:", error);
          const fbUserWithDefaults: AuthUser = {
            ...firebaseUser, // Spread all properties of firebaseUser
            role: null, // Default/fallback role
            restaurantId: null,
            onboardingComplete: false,
            isAnonymous: firebaseUser.isAnonymous, 
            phoneNumber: firebaseUser.phoneNumber || null,
          };
          setUser(fbUserWithDefaults);
          setRole(null);
          setLoading(false);
          if (initialLoadingStateRef.current) {
            setInitialLoadingState(false);
            initialLoadingStateRef.current = false;
          }
        });
      } else { // No firebaseUser
        setUser(null);
        setRole(null);
        setLoading(false); // No user, so main loading sequence is done
        if (initialLoadingStateRef.current) {
          setInitialLoadingState(false); // Mark initial auth check as complete
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
    <AuthContext.Provider value={{ user, role, loading, initialLoading: initialLoadingState, signInAnonymouslyHandler, linkAnonymousWithPhoneNumber, confirmPhoneNumberVerification }}>
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
