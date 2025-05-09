'use client';
import { useEffect, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth/context';
import LoadingSpinner from '@/components/shared/loading-spinner';
import Image from 'next/image'; 

const FullScreenLoader = () => (
  <div className="flex h-screen items-center justify-center bg-background">
    <LoadingSpinner className="h-12 w-12 text-primary" />
  </div>
);

export default function OnboardingLayout({ children }: { children: ReactNode }) {
  const { user, initialLoading, loading: authContextLoading, role: authContextRole } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // Wait for initial auth data and any subsequent profile loading to complete
    if (!initialLoading && !authContextLoading) {
      if (!user) {
        router.replace('/login'); // Must be logged in
      } else if (authContextRole && authContextRole !== 'owner') {
        // Non-owners (staff, admin, general user) should not be in onboarding
        console.log(`OnboardingLayout: User with role '${authContextRole}' redirected from onboarding to dashboard.`);
        router.replace('/dashboard');
      } else if (authContextRole === 'owner' && user.onboardingComplete === true) {
        // Owner is already onboarded
        console.log("OnboardingLayout: Onboarded owner redirected from onboarding to dashboard.");
        router.replace('/dashboard');
      } else if (!authContextRole && user) {
         // User exists, loading finished, but role is null. This is an error state for onboarding.
         console.error("OnboardingLayout: User has a null role after all loading. Redirecting to dashboard. This indicates a profile issue.");
         router.replace('/dashboard'); // Or perhaps '/login' or an error page
      }
      // If user.role is 'owner' and user.onboardingComplete is false, they are in the right place.
      // If user.role is null (profile still loading, covered by authContextLoading), effect defers.
    }
  }, [user, initialLoading, authContextLoading, authContextRole, router]);


  // Determine if we should show loader or content
  if (initialLoading || authContextLoading) {
    return <FullScreenLoader />;
  }

  // All auth context loading is complete at this point.
  // Now, check conditions for showing content vs. loader (while redirecting).
  if (!user) {
    // Should have been caught by useEffect and redirected. Showing loader in interim.
    return <FullScreenLoader />;
  }

  if (authContextRole === null) {
    // This is a problematic state: auth fully loaded, user exists, but role is null.
    // useEffect should redirect. Show loader while that happens.
    console.warn("OnboardingLayout: Rendering loader because user role is null post-loading. Expecting redirect.");
    return <FullScreenLoader />;
  }

  if (authContextRole !== 'owner' || (authContextRole === 'owner' && user.onboardingComplete)) {
    // These users should be redirected by useEffect. Show loader in the meantime.
    return <FullScreenLoader />;
  }
  
  // If we reach here:
  // - initialLoading is false
  // - authContextLoading is false
  // - user exists
  // - authContextRole is 'owner'
  // - user.onboardingComplete is false
  // This user should see the onboarding content.

  return (
    <div className="flex min-h-screen flex-col items-center bg-gradient-to-br from-background to-muted/50 pt-8 sm:pt-16 px-4">
      <div className="mb-8 text-center">
        <Image 
            src="https://picsum.photos/seed/onboardlogo/80/80"
            alt="Resto SaaS Logo" 
            width={80} 
            height={80} 
            className="mx-auto rounded-lg shadow-md"
            data-ai-hint="modern app logo" 
        />
        <h1 className="mt-4 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
          Welcome to Resto SaaS!
        </h1>
        <p className="mt-2 text-lg text-muted-foreground">
          Let&apos;s get your restaurant set up.
        </p>
      </div>
      <div className="w-full max-w-lg">
        {children}
      </div>
    </div>
  );
}