'use client';

import { useEffect, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth/context';
import LoadingSpinner from '@/components/shared/loading-spinner';

const FullScreenLoader = () => (
  <div className="flex h-screen items-center justify-center bg-background">
    <LoadingSpinner className="h-12 w-12 text-primary" />
  </div>
);

export default function AuthLayout({ children }: { children: ReactNode }) {
  const { user, initialLoading, loading: authContextLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // Only redirect if all loading is complete and user exists
    if (!initialLoading && !authContextLoading && user) {
      // User is logged in, and auth context (role, etc.) is stable.
      // They should not be on /login or /signup.
      if (user.role === 'owner' && user.onboardingComplete === false) {
        router.replace('/onboarding/restaurant-setup');
      } else if (user.role) { // Role is determined
        router.replace('/dashboard');
      } else {
        // Role is null even after loading. This is an unexpected state for a logged-in user.
        console.warn("AuthLayout: Logged-in user has null role after all loading. Redirecting to dashboard as fallback.");
        router.replace('/dashboard');
      }
    }
    // If !user (and loading is complete), they should be on /login or /signup, so no action needed by this effect.
  }, [user, initialLoading, authContextLoading, router]);

  // Show loader during initial auth check or subsequent context processing
  if (initialLoading || authContextLoading) {
    return <FullScreenLoader />;
  }

  // If loading is complete and user exists, useEffect will redirect. Show loader during this.
  if (user) {
    return <FullScreenLoader />;
  }

  // Not initial loading, not auth context loading, and no user: show children (login/signup form)
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
      {children}
    </div>
  );
}