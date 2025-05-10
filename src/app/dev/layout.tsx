
// src/app/dev/layout.tsx
'use client';

import { useEffect, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import LoadingSpinner from '@/components/shared/loading-spinner';
import Link from 'next/link';

export default function DevLayout({ children }: { children: ReactNode }) {
  const router = useRouter();

  useEffect(() => {
    if (process.env.NODE_ENV !== 'development') {
      router.replace('/'); // Or a 404 page
    }
  }, [router]);

  if (process.env.NODE_ENV !== 'development') {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-destructive">Access Denied</h1>
          <p className="text-muted-foreground">This page is only available in development mode.</p>
          <Link href="/" className="mt-4 inline-block text-primary hover:underline">
            Go to Homepage
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/20 p-4">
       <header className="mb-6 border-b pb-4">
        <h1 className="text-3xl font-bold text-primary">AuthZen Developer Tools</h1>
        <p className="text-muted-foreground">Utilities for development and testing.</p>
      </header>
      <main>{children}</main>
       <footer className="mt-8 border-t pt-4 text-center text-sm text-muted-foreground">
        Development Mode Active
      </footer>
    </div>
  );
}
