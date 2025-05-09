'use client';

import { useEffect, type ReactNode } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { useAuth } from '@/lib/auth/context';
import LoadingSpinner from '@/components/shared/loading-spinner';
import UserNav from '@/components/dashboard/user-nav';
import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarFooter,
  SidebarTrigger,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarInset,
  SidebarSeparator,
} from '@/components/ui/sidebar';
import { LayoutDashboard, Users, Utensils, ChefHat, SquareMenu, Settings, ShieldCheck, Store, UserRole } from 'lucide-react'; // Added UserRole, though not used directly as icon

const FullScreenLoader = () => (
  <div className="flex h-screen items-center justify-center bg-background">
    <LoadingSpinner className="h-12 w-12 text-primary" />
  </div>
);

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const { user, role: authContextRole, initialLoading, loading: authContextLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    // Wait for all auth loading to complete before making redirection decisions
    if (!initialLoading && !authContextLoading) {
      if (!user) {
        router.replace('/login');
      } else if (authContextRole === 'owner' && user.onboardingComplete === false) {
        router.replace('/onboarding/restaurant-setup');
      } else if (!authContextRole && user) {
        // User exists, loading finished, but role is null. This is an error state for dashboard.
        console.error("DashboardLayout: User has a null role after all loading. Redirecting to login. This indicates a profile issue.");
        router.replace('/login'); // Or an error page
      }
      // If user is present, role is determined, and (if owner) onboarding is complete, they stay.
    }
  }, [user, authContextRole, initialLoading, authContextLoading, router]);

  // Determine if we should show the loader screen
  if (initialLoading || authContextLoading) {
    return <FullScreenLoader />;
  }

  // If loading is done, but conditions for redirection are met (handled by useEffect)
  // or user/role is unexpectedly null, show loader.
  if (!user || !authContextRole) {
    // This case should ideally be handled by the useEffect redirecting to /login or onboarding.
    // Showing loader as a fallback during the brief period before redirect.
    return <FullScreenLoader />;
  }
  if (authContextRole === 'owner' && user.onboardingComplete === false) {
     // Also should be handled by useEffect. Loader while redirecting.
    return <FullScreenLoader />;
  }
  
  // At this point, user is authenticated, role is known, and (if owner) onboarding is complete.

  const commonNavItems = [
    { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: ['owner', 'staff', 'admin', 'user'] },
    { href: '/dashboard/profile', label: 'Profile', icon: ChefHat, roles: ['owner', 'staff', 'admin', 'user'], hint: "user profile" },
  ];

  const ownerNavItems = [
    { href: '/dashboard/restaurant', label: 'My Restaurant', icon: Store, roles: ['owner'], hint: "restaurant details" },
    { href: '/dashboard/recipes', label: 'Recipes', icon: Utensils, roles: ['owner', 'staff'], hint: "food recipes" },
    { href: '/dashboard/meal-planner', label: 'Meal Planner', icon: SquareMenu, roles: ['owner', 'staff'], hint: "meal plan" },
    { href: '/dashboard/staff', label: 'Staff Management', icon: Users, roles: ['owner'], hint: "manage staff" },
  ];

  const superAdminNavItems = [
     { href: '/dashboard/admin/users', label: 'All Users', icon: Users, roles: ['admin'], hint: "users list" },
     { href: '/dashboard/admin/restaurants', label: 'All Restaurants', icon: ShieldCheck, roles: ['admin'], hint: "platform restaurants" },
     { href: '/dashboard/admin/settings', label: 'Platform Settings', icon: Settings, roles: ['admin'], hint: "admin settings" },
  ];

  let navItemsToDisplay: typeof commonNavItems = [...commonNavItems];

  if (authContextRole === 'owner') {
    navItemsToDisplay = [...navItemsToDisplay, ...ownerNavItems];
  } else if (authContextRole === 'staff') {
    navItemsToDisplay = [
      ...navItemsToDisplay,
      ...ownerNavItems.filter(item => ['/dashboard/recipes', '/dashboard/meal-planner'].includes(item.href)),
    ];
  }

  const getFilteredNavItems = (items: typeof commonNavItems, currentRole: UserRole | null) => {
    if (!currentRole) return [];
    return items.filter(item => item.roles.includes(currentRole));
  };

  return (
    <SidebarProvider defaultOpen>
      <Sidebar>
        <SidebarHeader className="p-4">
          <Link href="/dashboard" className="flex items-center gap-2">
            <Image src="https://picsum.photos/seed/restoapplogo/40/40" alt="App Logo" width={40} height={40} className="rounded-md" data-ai-hint="modern logo" />
            <h1 className="text-2xl font-bold text-sidebar-primary group-data-[collapsible=icon]:hidden">Resto SaaS</h1>
          </Link>
        </SidebarHeader>
        <SidebarContent>
          <SidebarMenu>
            {getFilteredNavItems(navItemsToDisplay, authContextRole).map((item) => (
              <SidebarMenuItem key={item.href}>
                <SidebarMenuButton
                  asChild
                  isActive={pathname === item.href}
                  tooltip={{ children: item.label, "data-ai-hint": item.hint }}
                >
                  <Link href={item.href} className="flex items-center">
                    <item.icon className="h-5 w-5" />
                    <span className="ml-3 group-data-[collapsible=icon]:hidden">{item.label}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
            {authContextRole === 'admin' && (
              <>
                <SidebarSeparator className="my-4" />
                <SidebarMenuItem>
                  <div className="px-2 py-1 text-xs font-semibold text-sidebar-foreground/70 group-data-[collapsible=icon]:hidden">Platform Admin</div>
                </SidebarMenuItem>
                {getFilteredNavItems(superAdminNavItems, authContextRole).map((item) => (
                  <SidebarMenuItem key={item.href}>
                     <SidebarMenuButton
                       asChild
                       isActive={pathname === item.href}
                       tooltip={{ children: item.label, "data-ai-hint": item.hint }}
                     >
                      <Link href={item.href} className="flex items-center">
                        <item.icon className="h-5 w-5" />
                        <span className="ml-3 group-data-[collapsible=icon]:hidden">{item.label}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </>
            )}
          </SidebarMenu>
        </SidebarContent>
        <SidebarFooter className="p-2 border-t border-sidebar-border">
        </SidebarFooter>
      </Sidebar>
      <SidebarInset>
        <header className="sticky top-0 z-10 flex h-16 items-center justify-between border-b bg-background/80 px-4 backdrop-blur-md sm:px-6">
          <div className="flex items-center">
            <SidebarTrigger className="md:hidden" />
          </div>
          <UserNav />
        </header>
        <main className="flex-1 p-6 bg-background">
          {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}