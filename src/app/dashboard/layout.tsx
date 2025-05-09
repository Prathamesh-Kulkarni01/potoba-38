
'use client';

import { useEffect, type ReactNode } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { useAuth, type UserRole } from '@/lib/auth/context'; // Ensure UserRole is exported or accessible
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
import BottomNavigationBar, { type BottomNavItem } from '@/components/dashboard/bottom-navigation-bar';
import { useIsMobile as useIsMobileDirect } from '@/hooks/use-mobile';
import { LayoutDashboard, Users, Utensils, ChefHat, SquareMenu, Settings, ShieldCheck, Store } from 'lucide-react';

const FullScreenLoader = () => (
  <div className="flex h-screen items-center justify-center bg-background">
    <LoadingSpinner className="h-12 w-12 text-primary" />
  </div>
);

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const { user, role: authContextRole, initialLoading, loading: authContextLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const isMobile = useIsMobileDirect();

  useEffect(() => {
    if (!initialLoading && !authContextLoading) {
      if (!user) {
        router.replace('/login');
      } else if (authContextRole === 'owner' && user.onboardingComplete === false) {
        router.replace('/onboarding/restaurant-setup');
      } else if (!authContextRole && user) {
        console.error("DashboardLayout: User has a null role after all loading. Redirecting to login.");
        router.replace('/login');
      }
    }
  }, [user, authContextRole, initialLoading, authContextLoading, router]);

  if (initialLoading || authContextLoading) {
    return <FullScreenLoader />;
  }

  if (!user || !authContextRole || (authContextRole === 'owner' && user.onboardingComplete === false)) {
    return <FullScreenLoader />;
  }
  
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

  let desktopNavItems: typeof commonNavItems = [...commonNavItems];
  if (authContextRole === 'owner') {
    desktopNavItems = [...desktopNavItems, ...ownerNavItems];
  } else if (authContextRole === 'staff') {
    desktopNavItems = [
      ...desktopNavItems,
      ...ownerNavItems.filter(item => ['/dashboard/recipes', '/dashboard/meal-planner'].includes(item.href)),
    ];
  }

  const getFilteredNavItems = (items: typeof commonNavItems, currentRole: UserRole | null) => {
    if (!currentRole) return [];
    return items.filter(item => item.roles.includes(currentRole));
  };

  let dynamicBottomNavItem: BottomNavItem;
  if (authContextRole === 'owner') {
    dynamicBottomNavItem = { href: '/dashboard/restaurant', label: 'Restaurant', icon: Store, hint: "my restaurant" };
  } else if (authContextRole === 'admin') {
    dynamicBottomNavItem = { href: '/dashboard/admin/users', label: 'Users', icon: Users, hint: "all users" };
  } else { // staff or user
    dynamicBottomNavItem = { href: '/dashboard/recipes', label: 'Recipes', icon: Utensils, hint: "food recipes" };
  }

  const bottomNavLinks: BottomNavItem[] = [
    { href: '/dashboard', label: 'Home', icon: LayoutDashboard, hint: "dashboard home" },
    dynamicBottomNavItem,
    { href: '/dashboard/profile', label: 'Profile', icon: ChefHat, hint: "user profile" },
  ];

  return (
    <>
      {!isMobile ? (
        <SidebarProvider defaultOpen>
          <Sidebar>
            <SidebarHeader className="p-4">
              <Link href="/dashboard" className="flex items-center gap-2">
                <Image src="https://picsum.photos/seed/restoapplogo/40/40" alt="App Logo" width={40} height={40} className="rounded-md" data-ai-hint="modern logo" />
                <h1 className="text-2xl font-bold text-sidebar-primary group-data-[collapsible=icon]:hidden">AuthZen</h1>
              </Link>
            </SidebarHeader>
            <SidebarContent>
              <SidebarMenu>
                {getFilteredNavItems(desktopNavItems, authContextRole).map((item) => (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton
                      asChild
                      isActive={pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href))}
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
                <SidebarTrigger className="md:hidden" /> {/* This is for opening the sheet sidebar on mobile, which we are replacing */}
              </div>
              <UserNav />
            </header>
            <main className="flex-1 p-6 bg-background">
              {children}
            </main>
          </SidebarInset>
        </SidebarProvider>
      ) : (
        <div className="flex min-h-screen flex-col">
          <header className="sticky top-0 z-10 flex h-16 items-center justify-between border-b bg-background/80 px-4 backdrop-blur-md sm:px-6">
            <Link href="/dashboard" className="flex items-center gap-2">
              <Image src="https://picsum.photos/seed/restoapplogo/32/32" alt="App Logo" width={32} height={32} className="rounded-md" data-ai-hint="modern logo" />
              <h1 className="text-xl font-bold text-primary">AuthZen</h1>
            </Link>
            <UserNav />
          </header>
          <main className="flex-1 bg-background p-4 pt-6 pb-20"> {/* Added pb-20 for bottom nav */}
            {children}
          </main>
          <BottomNavigationBar navItems={bottomNavLinks} />
        </div>
      )}
    </>
  );
}
