'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth/context';
import LoadingSpinner from '@/components/shared/loading-spinner';

export default function HomePage() {
  const { user, initialLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!initialLoading) {
      if (user) {
        router.replace('/dashboard');
      } else {
        router.replace('/login');
      }
    }
  }, [user, initialLoading, router]);

  return (
    <div className="flex h-screen items-center justify-center bg-background">
      <LoadingSpinner className="h-12 w-12 text-primary" />
    </div>
  );
}
