
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
      return; 
    }

    if (!user) {
      router.replace('/login'); 
      return;
    }

    if (user.role === 'owner') {
      if (user.onboardingComplete === false) {
        console.log("OnboardingLayout: Owner proceeding with onboarding.");
      } else {
        console.log("OnboardingLayout: Onboarded owner redirected to dashboard.");
        router.replace('/dashboard');
      }
    } else if (user.role && user.role !== 'owner') {
      console.log(`OnboardingLayout: User with role '${user.role}' redirected to dashboard from onboarding.`);
      router.replace('/dashboard');
    } else if (!user.role) {
      console.error("OnboardingLayout: Authenticated user has a null role after all loading. This may indicate a profile data issue. Redirecting to login as a fallback.");
      router.replace('/login'); 
    }
  }, [user, initialLoading, authContextLoading, router]);


  if (initialLoading || authContextLoading) {
    return <FullScreenLoader />; 
  }

  if (!user) {
    return <FullScreenLoader />;
  }

  if (user.role === 'owner' && user.onboardingComplete === false) {
    return (
      <div className="flex min-h-screen flex-col items-center bg-gradient-to-br from-background to-muted/50 pt-8 sm:pt-16 px-4">
        <div className="mb-8 text-center">
          <Image 
              src="https://picsum.photos/seed/authzenlogo/80/80"
              alt="AuthZen Logo" 
              width={80} 
              height={80} 
              className="mx-auto rounded-lg shadow-md"
              data-ai-hint="modern app logo" 
          />
          <h1 className="mt-4 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Welcome to AuthZen!
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
  
  return <FullScreenLoader />;
}
