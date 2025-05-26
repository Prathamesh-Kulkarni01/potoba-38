// src/app/waiter/layout.tsx
'use client';

import { type ReactNode, useEffect } from 'react';
import { useAuth } from '@/lib/auth/context';
import { useRouter } from 'next/navigation';
import AppLoadingScreen from '@/components/shared/app-loading-screen';
import Link from 'next/link';
import Image from 'next/image';
import UserNav from '@/components/dashboard/user-nav';

export default function WaiterLayout({ children }: { children: ReactNode }) {
  const { user, role, staffRole, initialLoading, loading: authContextLoading } = useAuth();
  const router = useRouter();
console.log(user, role, staffRole)
  useEffect(() => {
    if (!initialLoading && !authContextLoading) {
      if (!user) {
        router.replace('/login');
      } else if (role !== 'Waiter' || staffRole !== 'Waiter') {
        // If user is not a staff waiter, redirect them to the main dashboard or login
        console.warn(`WaiterLayout: User with role '${role}' and staffRole '${staffRole}' accessed waiter layout. Redirecting.`);
        router.replace('/dashboard'); // Or appropriate default page
      }
    }
  }, [user, role, staffRole, initialLoading, authContextLoading, router]);

  if (initialLoading || authContextLoading || !user || (role === 'Waiter' && staffRole !== 'Waiter')) {
    return <AppLoadingScreen message="Loading Waiter Interface..." />;
  }

  return (
    <div className="flex min-h-screen flex-col bg-muted/30 theme-transition">
      <header className="sticky top-0 z-40 flex h-16 items-center justify-between border-b bg-background px-4 shadow-sm sm:px-6">
        <Link href="/waiter" className="flex items-center gap-2">
          <Image src="/images/logo.png" alt="Potoba Logo" width={32} height={32} className="rounded-md" />
          <h1 className="text-xl font-semibold text-primary">Potoba Waiter</h1>
        </Link>
        {user && <UserNav />}
      </header>
      <main className="flex-1 p-4 sm:p-6">{children}</main>
      <footer className="border-t bg-background p-3 text-center text-xs text-muted-foreground">
        Potoba Waiter Interface - &copy; {new Date().getFullYear()}
      </footer>
    </div>
  );
}
