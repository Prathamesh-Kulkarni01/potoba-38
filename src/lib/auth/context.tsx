// auth-context.tsx
'use client';

import React, { createContext, useContext, useEffect, useState, ReactNode, useRef } from 'react';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { auth, db } from '@/lib/firebase/config'; // Added db
import { doc, onSnapshot } from 'firebase/firestore'; // Added doc, onSnapshot
import type { AuthUser, UserRole, UserProfile as UserProfileType } from '@/types';
import LoadingSpinner from '@/components/shared/loading-spinner';

interface AuthContextType {
  user: AuthUser | null;
  role: UserRole | null;
  loading: boolean; // True if AuthProvider is currently fetching/processing auth state or profile
  initialLoading: boolean; // True until the *first* auth state and profile check is complete
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
  const initialLoadingStateRef = useRef(true); // Ref to manage initial loading flag

  useEffect(() => {
    setLoading(true); // Start with loading true
    let unsubscribeProfile: (() => void) | null = null;

    const unsubscribeAuth = onAuthStateChanged(auth, (firebaseUser: FirebaseUser | null) => {
      // If there was a previous profile listener, unsubscribe from it
      if (unsubscribeProfile) {
        unsubscribeProfile();
        unsubscribeProfile = null;
      }

      if (firebaseUser) {
        setLoading(true); // Loading while fetching/listening to profile
        const userDocRef = doc(db, 'users', firebaseUser.uid);
        
        unsubscribeProfile = onSnapshot(userDocRef, (docSnap) => {
          setLoading(true); // Profile data might be updating
          if (docSnap.exists()) {
            const userProfileData = docSnap.data() as UserProfileType;
            const authUser: AuthUser = {
              ...(firebaseUser as FirebaseUser), // Ensures all FirebaseUser props are spread
              role: userProfileData.role,
              restaurantId: userProfileData.restaurantId || null,
              onboardingComplete: typeof userProfileData.onboardingComplete === 'boolean' ? userProfileData.onboardingComplete : false,
            };
            setUser(authUser);
            setRole(userProfileData.role);
          } else {
            // Profile doesn't exist yet, might be a new user whose profile creation is pending
            // This case should ideally be short-lived for new users.
            // If persistent, indicates an issue in profile creation.
            console.warn(`User profile not found for UID: ${firebaseUser.uid} during snapshot listening. Setting role to null.`);
            const authUser: AuthUser = {
              ...(firebaseUser as FirebaseUser),
              role: null,
              restaurantId: null,
              onboardingComplete: false,
            };
            setUser(authUser);
            setRole(null);
          }
          setLoading(false);
          if (initialLoadingStateRef.current) {
            setInitialLoadingState(false);
            initialLoadingStateRef.current = false;
          }
        }, (error) => {
          console.error("Error listening to user profile:", error);
          const authUser: AuthUser = {
            ...(firebaseUser as FirebaseUser),
            role: null,
            restaurantId: null,
            onboardingComplete: false,
          };
          setUser(authUser);
          setRole(null);
          setLoading(false);
          if (initialLoadingStateRef.current) {
            setInitialLoadingState(false);
            initialLoadingStateRef.current = false;
          }
        });
      } else {
        // No Firebase user (logged out)
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
  }, []); // Empty dependency array: listeners set up once and clean up on unmount.

  return (
    <AuthContext.Provider value={{ user, role, loading, initialLoading: initialLoadingState }}>
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