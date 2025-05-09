// auth-context.tsx
'use client';

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { auth } from '@/lib/firebase/config';
import { getUserProfile } from '@/lib/firebase/firestore';
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
  const [loading, setLoading] = useState(true); // Tracks if current auth/profile fetch is in progress
  const [initialLoading, setInitialLoading] = useState(true); // Tracks if the *initial* auth check has completed

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser: FirebaseUser | null) => {
      setLoading(true); // Indicate active processing for this auth event

      if (firebaseUser) {
        try {
          const userProfileData = await getUserProfile(firebaseUser.uid);
          if (userProfileData) {
            const authUser: AuthUser = {
              ...firebaseUser,
              role: userProfileData.role,
              restaurantId: userProfileData.restaurantId || null,
              onboardingComplete: typeof userProfileData.onboardingComplete === 'boolean' ? userProfileData.onboardingComplete : false,
            };
            setUser(authUser);
            setRole(userProfileData.role);
          } else {
            // Profile not found. For a new user, this means profile write might be slow or failed.
            // This fallback (role: null, onboardingComplete: false) can cause misdirection if not handled carefully by consuming components.
            console.warn(`User profile not found for UID: ${firebaseUser.uid}. Defaulting to role=null, onboardingComplete=false. This can occur if profile creation is delayed or failed.`);
            const authUser: AuthUser = { 
              ...firebaseUser, 
              role: null, 
              restaurantId: null, 
              onboardingComplete: false 
            };
            setUser(authUser);
            setRole(null);
          }
        } catch (error) {
          console.error("Error fetching user profile:", error);
          const authUser: AuthUser = { ...firebaseUser, role: null, restaurantId: null, onboardingComplete: false };
          setUser(authUser);
          setRole(null);
        }
      } else {
        // No Firebase user
        setUser(null);
        setRole(null);
      }

      setLoading(false); // Finished processing this auth event
      if (initialLoading) {
        setInitialLoading(false); // Mark that the very first auth check and profile attempt is done
      }
    });

    return () => unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Effect runs once on mount to set up the listener

  // Render children only after the initial loading is complete.
  // Child components will use `loading` for subsequent updates.
  return (
    <AuthContext.Provider value={{ user, role, loading, initialLoading }}>
      {initialLoading ? <FullScreenLoader /> : children}
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