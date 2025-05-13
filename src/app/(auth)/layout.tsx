// src/app/(auth)/layout.tsx
'use client';

import { useEffect, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth/context';
import AppLoadingScreen from '@/components/shared/app-loading-screen'; // Changed import

export default function AuthLayout({ children }: { children: ReactNode }) {
  const { user, initialLoading, loading: authContextLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!initialLoading && !authContextLoading && user) {
      if (user.role === 'owner' && user.onboardingComplete === false) {
        router.replace('/onboarding/restaurant-setup');
      } else if (user.role) { 
        router.replace('/dashboard');
      } else {
        console.warn("AuthLayout: Logged-in user has null role after all loading. Redirecting to dashboard as fallback.");
        router.replace('/dashboard');
      }
    }
  }, [user, initialLoading, authContextLoading, router]);

  // Show loader during initial auth check or subsequent context processing.
  // AuthProvider already shows a screen for `initialLoading`.
  // This loader is for `authContextLoading` or when user exists and is about to be redirected.
  if (authContextLoading) {
    return <AppLoadingScreen message="Verifying credentials..." />;
  }

  if (user && !initialLoading && !authContextLoading) { // User exists and is about to be redirected
    return <AppLoadingScreen message="Redirecting..." />;
  }

  // Not initial loading, not auth context loading, and no user: show children (login/signup form)
  if (!user && !initialLoading && !authContextLoading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
        {children}
      </div>
    );
  }
  
  // Default to loading screen if none of the above conditions are met (e.g. initialLoading is true)
  return <AppLoadingScreen message="Setting up login..." />;
}
