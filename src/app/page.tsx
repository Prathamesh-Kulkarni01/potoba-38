// src/app/page.tsx
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth/context';
import AppLoadingScreen from '@/components/shared/app-loading-screen'; // Changed import

export default function HomePage() {
  const { user, initialLoading, loading: authContextLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!initialLoading && !authContextLoading) {
      if (user) {
        if (user.role === 'owner' && user.onboardingComplete === false) {
          router.replace('/onboarding/restaurant-setup');
        } else if (user.role) { 
          router.replace('/dashboard');
        } else {
          console.warn("HomePage: User's role is null after all loading. Redirecting to dashboard as fallback. This might indicate an issue with profile creation or fetching.");
          router.replace('/dashboard'); 
        }
      } else {
        router.replace('/login');
      }
    }
  }, [user, initialLoading, authContextLoading, router]);

 
  // Show loader if initial auth check is happening, or subsequent auth context processing (like profile fetch) is ongoing.
  // The AuthProvider itself shows an AppLoadingScreen during initialLoadingState.
  // This one will show if AuthProvider is done with initial but this page's specific logic is waiting for authContextLoading.
  if (initialLoading || authContextLoading) {
    return <AppLoadingScreen message="Loading your experience..." />;
  }

  // Fallback loader for the brief period after loading is complete but before useEffect's redirect occurs.
  return <AppLoadingScreen message="Finalizing..." />;
}
