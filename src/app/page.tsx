'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth/context';
import LoadingSpinner from '@/components/shared/loading-spinner';

export default function HomePage() {
  const { user, initialLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!initialLoading) { // Only redirect after initial auth check is complete
      if (user) {
        // User is logged in
        if (user.role === 'owner' && user.onboardingComplete === false) {
          router.replace('/onboarding/restaurant-setup');
        } else {
          router.replace('/dashboard');
        }
      } else {
        // No user, redirect to login
        router.replace('/login');
      }
    }
  }, [user, initialLoading, router]);

  // Show loader while initial auth check is happening or during redirection
  return (
    <div className="flex h-screen items-center justify-center bg-background">
      <LoadingSpinner className="h-12 w-12 text-primary" />
    </div>
  );
}
