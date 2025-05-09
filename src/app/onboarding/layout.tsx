'use client';
import { useEffect, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth/context';
import LoadingSpinner from '@/components/shared/loading-spinner';
import Image from 'next/image'; // For logo

export default function OnboardingLayout({ children }: { children: ReactNode }) {
  const { user, initialLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!initialLoading) {
      if (!user) {
        router.replace('/login'); // Must be logged in
      } else if (user.role !== 'owner') {
        // Non-owners should not be in onboarding (e.g. staff, admin, regular user)
        router.replace('/dashboard'); // Or an error page like /unauthorized
      } else if (user.onboardingComplete === true) {
        // Owner is already onboarded
        router.replace('/dashboard');
      }
      // If user is an owner and user.onboardingComplete is false, they are in the right place.
    }
  }, [user, initialLoading, router]);

  // Determine if we should show loader or content
  let showLoader = initialLoading;
  if (!initialLoading) {
    // Conditions for redirection mean we should show loader while redirecting
    if (!user || user.role !== 'owner' || (user.role === 'owner' && user.onboardingComplete === true)) {
      showLoader = true;
    }
  }

  if (showLoader) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <LoadingSpinner className="h-12 w-12 text-primary" />
      </div>
    );
  }

  // User is an owner, and onboarding is not complete. Show onboarding content.
  return (
    <div className="flex min-h-screen flex-col items-center bg-gradient-to-br from-background to-muted/50 pt-8 sm:pt-16 px-4">
      <div className="mb-8 text-center">
        <Image 
            src="https://picsum.photos/seed/onboardlogo/80/80" // Replace with actual logo
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
      <div className="w-full max-w-lg"> {/* Consistent width for onboarding steps */}
        {children}
      </div>
    </div>
  );
}
