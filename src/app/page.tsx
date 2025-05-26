// src/app/page.tsx
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth/context';
import AppLoadingScreen from '@/components/shared/app-loading-screen';

export default function HomePage() {
  const { user, initialLoading, loading: authContextLoading, role, staffRole } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!initialLoading && !authContextLoading) {
      if (user) {
        if (role === 'Waiter' && staffRole === 'Waiter') {
          router.replace('/waiter');
        } else if (role === 'owner' && user.onboardingComplete === false) {
          router.replace('/onboarding/restaurant-setup');
        } else if (role) { 
          router.replace('/dashboard');
        } else {
          console.warn("HomePage: User's role is null after all loading. Redirecting to dashboard as fallback. This might indicate an issue with profile creation or fetching.");
          router.replace('/dashboard'); 
        }
      } else {
        router.replace('/login');
      }
    }
  }, [user, initialLoading, authContextLoading, role, staffRole, router]);

 
  if (initialLoading || authContextLoading) {
    return <AppLoadingScreen message="Loading your experience..." />;
  }

  return <AppLoadingScreen message="Finalizing..." />;
}
