'use client';

import { useEffect, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth/context';
import LoadingSpinner from '@/components/shared/loading-spinner';

export default function AuthLayout({ children }: { children: ReactNode }) {
  const { user, initialLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!initialLoading && user) {
      // User is logged in, should not be on /login or /signup
      if (user.role === 'owner' && user.onboardingComplete === false) {
        router.replace('/onboarding/restaurant-setup');
      } else {
        router.replace('/dashboard');
      }
    }
    // If !user, they should be on /login or /signup, so no action needed.
  }, [user, initialLoading, router]);

  if (initialLoading) {
    // Show loader during initial auth check
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <LoadingSpinner className="h-12 w-12 text-primary" />
      </div>
    );
  }

  if (user) {
    // User is logged in, useEffect will redirect. Show spinner during this.
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <LoadingSpinner className="h-12 w-12 text-primary" />
      </div>
    );
  }

  // Not initial loading and no user, show children (login/signup form)
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
      {children}
    </div>
  );
}
