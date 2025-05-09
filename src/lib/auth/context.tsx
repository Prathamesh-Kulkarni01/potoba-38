// auth-context.tsx
'use client';

import React, { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { auth } from '@/lib/firebase/config';
import { getUserProfile } from '@/lib/firebase/firestore';
import type { AuthUser, UserRole } from '@/types';
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
  const [initialLoadingState, setInitialLoadingState] = useState(true); // Renamed to avoid conflict in useCallback

  const fetchProfileAndSetUser = useCallback(async (
    firebaseUser: FirebaseUser,
    attempt = 1
  ): Promise<void> => {
    setLoading(true); // Ensure loading is true during fetch attempts
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
        setLoading(false);
        if (initialLoadingState) setInitialLoadingState(false);
      } else {
        const creationTime = new Date(firebaseUser.metadata.creationTime!).getTime();
        const isLikelyNewUser = Date.now() - creationTime < 10000; // User created in the last 10 seconds

        if (isLikelyNewUser && attempt < 4) {
          console.warn(`Profile for new user ${firebaseUser.uid} not found on attempt ${attempt}. Retrying...`);
          setTimeout(() => fetchProfileAndSetUser(firebaseUser, attempt + 1), attempt * 1500); // Adjusted retry delay
          // setLoading remains true, initialLoadingState remains true
          return; 
        } else {
          console.warn(`User profile not found for UID: ${firebaseUser.uid} (new: ${isLikelyNewUser}, attempt: ${attempt}). Defaulting role to null.`);
          const authUser: AuthUser = { ...firebaseUser, role: null, restaurantId: null, onboardingComplete: false };
          setUser(authUser);
          setRole(null);
          setLoading(false);
          if (initialLoadingState) setInitialLoadingState(false);
        }
      }
    } catch (error) {
      console.error("Error fetching user profile:", error);
      const authUser: AuthUser = { ...firebaseUser, role: null, restaurantId: null, onboardingComplete: false };
      setUser(authUser);
      setRole(null);
      setLoading(false);
      if (initialLoadingState) setInitialLoadingState(false);
    }
  }, [initialLoadingState]); // Dependency on initialLoadingState to correctly manage its first set to false

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentFirebaseUser: FirebaseUser | null) => {
      setLoading(true); // Set loading at the start of any auth change
      
      if (currentFirebaseUser) {
        await fetchProfileAndSetUser(currentFirebaseUser, 1);
      } else {
        setUser(null);
        setRole(null);
        setLoading(false);
        if (initialLoadingState) setInitialLoadingState(false);
      }
    });

    return () => unsubscribe();
  }, [fetchProfileAndSetUser, initialLoadingState]); // Added fetchProfileAndSetUser and initialLoadingState

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
