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
  const { user, initialLoading, loading: authContextLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (initialLoading || authContextLoading) {
      return; // Still loading, wait for auth context to stabilize
    }

    // At this point, initialLoading and authContextLoading are false. Auth context should be stable.
    if (!user) {
      router.replace('/login'); // Not authenticated, go to login
      return;
    }

    // User is authenticated. Now check role and onboarding status from the user object.
    if (user.role === 'owner') {
      if (user.onboardingComplete === false) {
        // Owner, onboarding not complete: This is the correct place. Do nothing.
        console.log("OnboardingLayout: Owner proceeding with onboarding.");
      } else {
        // Owner, onboarding complete: Redirect to dashboard.
        console.log("OnboardingLayout: Onboarded owner redirected to dashboard.");
        router.replace('/dashboard');
      }
    } else if (user.role && user.role !== 'owner') {
      // User has a defined role, and it's not 'owner' (e.g., staff, admin, general user): Redirect to dashboard.
      console.log(`OnboardingLayout: User with role '${user.role}' redirected to dashboard from onboarding.`);
      router.replace('/dashboard');
    } else if (!user.role) {
      // User is authenticated, but user.role is null. This is an unexpected state after all loading.
      // Profile might not have loaded correctly, or role is missing in profile.
      console.error("OnboardingLayout: Authenticated user has a null role after all loading. This may indicate a profile data issue. Redirecting to login as a fallback.");
      router.replace('/login'); // Fallback to login, as dashboard/onboarding pages require a role.
    }
  }, [user, initialLoading, authContextLoading, router]);


  // Determine if we should show loader or content
  if (initialLoading || authContextLoading) {
    return <FullScreenLoader />; // Still loading initial auth state or profile
  }

  if (!user) {
    // User is not authenticated, useEffect will redirect to login. Show loader.
    return <FullScreenLoader />;
  }

  // User is authenticated. Check if they are an owner needing onboarding.
  if (user.role === 'owner' && user.onboardingComplete === false) {
    // Correct state for showing onboarding content.
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
  
  // If user.role is null, or user is not an owner needing onboarding (e.g., owner already onboarded, or not an owner),
  // useEffect should handle redirection. Show loader in the interim.
  return <FullScreenLoader />;
}
