// auth-context.tsx
'use client';

import React, { createContext, useContext, useEffect, useState, ReactNode, useRef, useCallback } from 'react';
import { onAuthStateChanged, User as FirebaseUser, signInAnonymously, PhoneAuthProvider, linkWithCredential, RecaptchaVerifier } from 'firebase/auth';
import { auth, db } from '@/lib/firebase/config'; 
import { doc, onSnapshot, setDoc } from 'firebase/firestore'; 
import type { AuthUser, UserRole, UserProfile as UserProfileType } from '@/types';
import LoadingSpinner from '@/components/shared/loading-spinner';
import { updateUserProfile } from '../firebase/firestore'; // Ensure this function exists and works

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

const FullScreenLoader = () => (
  <div className="flex h-screen w-screen items-center justify-center bg-background">
    <LoadingSpinner className="h-12 w-12 text-primary" />
  </div>
);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [role, setRole] = useState<UserRole | null>(null);
  const [loading, setLoading] = useState(true);
  const [initialLoadingState, setInitialLoadingState] = useState(true);
  const initialLoadingStateRef = useRef(true);

  const signInAnonymouslyHandler = useCallback(async (): Promise<AuthUser | null> => {
    setLoading(true);
    try {
      const userCredential = await signInAnonymously(auth);
      const firebaseUser = userCredential.user;
      // For anonymous users, we don't create a full Firestore profile immediately,
      // but we can set basic AuthUser state.
      const anonUser: AuthUser = {
        ...firebaseUser,
        role: 'user', // Assign a default role for anonymous interaction context
        restaurantId: null,
        onboardingComplete: true, // Not applicable for anonymous
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
      // Store verificationId if needed (e.g., in local state of the component calling this)
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
      
      // User is now permanent. `onAuthStateChanged` will update the user state.
      // We should also update/create their Firestore profile.
      if (auth.currentUser) { // currentUser should be non-null and not anonymous here
        await updateUserProfile(auth.currentUser.uid, { 
          phoneNumber: phoneNumber, 
          email: auth.currentUser.email, // Might still be null if only phone
          role: 'user', // Or determine role based on context
          onboardingComplete: true, // Assuming phone verification implies basic onboarding for a 'user'
          isAnonymous: false, // Explicitly mark as not anonymous
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
    setLoading(true); 
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
              ...firebaseUser, 
              role: userProfileData.role,
              restaurantId: userProfileData.restaurantId || null,
              onboardingComplete: typeof userProfileData.onboardingComplete === 'boolean' ? userProfileData.onboardingComplete : false,
              isAnonymous: firebaseUser.isAnonymous,
              phoneNumber: firebaseUser.phoneNumber || userProfileData.phoneNumber || null,
            };
            setRole(userProfileData.role);
          } else {
            // Profile doesn't exist. This can happen for newly linked anonymous users before their profile is explicitly created/updated
            // OR if it's a brand new user (not anonymous) whose profile creation is pending.
            console.warn(`User profile not found for UID: ${firebaseUser.uid}. Setting role to null or default for anonymous.`);
            authUser = {
              ...firebaseUser,
              role: firebaseUser.isAnonymous ? 'user' : null, // Anonymous users get 'user' role conceptually
              restaurantId: null,
              onboardingComplete: firebaseUser.isAnonymous ? true : false,
              isAnonymous: firebaseUser.isAnonymous,
              phoneNumber: firebaseUser.phoneNumber || null,
            };
            setRole(firebaseUser.isAnonymous ? 'user' : null);
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
            ...firebaseUser,
            role: null,
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
      } else {
        setUser(null);
        setRole(null);
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
    <AuthContext.Provider value={{ user, role, loading, initialLoading: initialLoadingState, signInAnonymouslyHandler, linkAnonymousWithPhoneNumber, confirmPhoneNumberVerification }}>
      {initialLoadingState ? <FullScreenLoader /> : children}
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
