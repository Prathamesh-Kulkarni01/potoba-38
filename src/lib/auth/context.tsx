'use client';

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { auth } from '@/lib/firebase/config';
import { getUserProfile } from '@/lib/firebase/firestore'; // Renamed from getUserRole
import type { AuthUser, UserRole, UserProfile as UserProfileType } from '@/types';
import LoadingSpinner from '@/components/shared/loading-spinner';

interface AuthContextType {
  user: AuthUser | null;
  role: UserRole | null; // Kept for convenience, though also on user object
  loading: boolean;
  initialLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [role, setRole] = useState<UserRole | null>(null);
  const [loading, setLoading] = useState(true);
  const [initialLoading, setInitialLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser: FirebaseUser | null) => {
      setLoading(true);
      if (firebaseUser) {
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
          // This case might occur if profile creation is delayed or for users without a profile yet.
          // Default values are critical here for redirect logic.
          const authUser: AuthUser = {
            ...firebaseUser,
            role: null, // Role is unknown
            restaurantId: null,
            onboardingComplete: false, // Assume not onboarded if profile is missing/incomplete
          };
          setUser(authUser);
          setRole(null);
        }
      } else {
        setUser(null);
        setRole(null);
      }
      setLoading(false);
      setInitialLoading(false);
    });

    return () => unsubscribe();
  }, []);

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

const FullScreenLoader = () => (
  <div className="flex h-screen w-screen items-center justify-center bg-background">
    <LoadingSpinner className="h-12 w-12 text-primary" />
  </div>
);
