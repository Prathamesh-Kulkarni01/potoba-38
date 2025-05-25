// src/app/(auth)/layout.tsx
'use client';

import { useEffect, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth/context';
import AppLoadingScreen from '@/components/shared/app-loading-screen';

export default function AuthLayout({ children }: { children: ReactNode }) {
  const { user, initialLoading, loading: authContextLoading, role, staffRole } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!initialLoading && !authContextLoading && user) {
      if (role === 'staff' && staffRole === 'Waiter') {
        router.replace('/waiter');
      } else if (role === 'owner' && user.onboardingComplete === false) {
        router.replace('/onboarding/restaurant-setup');
      } else if (role) { 
        router.replace('/dashboard');
      } else {
        console.warn("AuthLayout: Logged-in user has null role after all loading. Redirecting to dashboard as fallback.");
        router.replace('/dashboard');
      }
    }
  }, [user, initialLoading, authContextLoading, role, staffRole, router]);

  if (authContextLoading) {
    return <AppLoadingScreen message="Verifying credentials..." />;
  }

  if (user && !initialLoading && !authContextLoading) { 
    return <AppLoadingScreen message="Redirecting..." />;
  }

  if (!user && !initialLoading && !authContextLoading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
        {children}
      </div>
    );
  }
  
  return <AppLoadingScreen message="Setting up login..." />;
}
