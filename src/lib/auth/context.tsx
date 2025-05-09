'use client';

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { auth } from '@/lib/firebase/config';
import { getUserRole } from '@/lib/firebase/firestore';
import type { AuthUser, UserRole } from '@/types';
import LoadingSpinner from '@/components/shared/loading-spinner';

interface AuthContextType {
  user: AuthUser | null;
  role: UserRole | null;
  loading: boolean;
  initialLoading: boolean; // For initial auth check
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
        const userRole = await getUserRole(firebaseUser.uid);
        setUser({ ...firebaseUser, role: userRole || undefined });
        setRole(userRole);
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
