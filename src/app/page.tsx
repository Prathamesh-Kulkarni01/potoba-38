'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth/context';
import LoadingSpinner from '@/components/shared/loading-spinner';

export default function HomePage() {
  const { user, initialLoading, loading: authContextLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // Wait until initial auth check AND any subsequent profile loading is done
    if (!initialLoading && !authContextLoading) {
      if (user) {
        // User is logged in, and auth context (role, etc.) is stable
        if (user.role === 'owner' && user.onboardingComplete === false) {
          router.replace('/onboarding/restaurant-setup');
        } else if (user.role) { // Role is determined and not 'owner' needing onboarding
          router.replace('/dashboard');
        } else {
          // Role is null even after loading. This implies a profile issue.
          console.warn("HomePage: User's role is null after all loading. Redirecting to dashboard as fallback. This might indicate an issue with profile creation or fetching.");
          router.replace('/dashboard'); // Fallback, consider /login or an error page if profile is critical
        }
      } else {
        // No user, redirect to login
        router.replace('/login');
      }
    }
    // If initialLoading or authContextLoading is true, the effect does nothing, allowing the loader below to be shown.
  }, [user, initialLoading, authContextLoading, router]);

  // Show loader if initial auth check is happening, or subsequent auth context processing (like profile fetch) is ongoing.
  if (initialLoading || authContextLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <LoadingSpinner className="h-12 w-12 text-primary" />
      </div>
    );
  }

  // Fallback loader for the brief period after loading is complete but before useEffect's redirect occurs.
  // This prevents a flicker of content if there were any.
  return (
    <div className="flex h-screen items-center justify-center bg-background">
      <LoadingSpinner className="h-12 w-12 text-primary" />
    </div>
  );
}