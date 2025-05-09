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
      router.replace('/dashboard');
    }
  }, [user, initialLoading, router]);

  if (initialLoading || user) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <LoadingSpinner className="h-12 w-12 text-primary" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
      {children}
    </div>
  );
}
