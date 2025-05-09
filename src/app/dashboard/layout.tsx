'use client';

import { useEffect, type ReactNode } from 'react';
import { usePathname, useRouter } from 'next/navigation'; // usePathname
import Link from 'next/link';
import Image from 'next/image';
import { useAuth } from '@/lib/auth/context';
import LoadingSpinner from '@/components/shared/loading-spinner';
import UserNav from '@/components/dashboard/user-nav';
// import { Button } from '@/components/ui/button'; // Not used directly, remove if SidebarTrigger handles it
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
import { LayoutDashboard, Users, Utensils, ChefHat, SquareMenu, Settings, ShieldCheck, Store } from 'lucide-react';

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const { user, role, initialLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname(); // Get current pathname

  useEffect(() => {
    if (!initialLoading) {
      if (!user) {
        router.replace('/login');
      } else if (user.role === 'owner' && user.onboardingComplete === false) {
        router.replace('/onboarding/restaurant-setup');
      }
    }
  }, [user, initialLoading, router]);

  // Conditions for showing the loader screen
  let showLoader = initialLoading;
  if (!initialLoading) {
    if (!user || (user && user.role === 'owner' && user.onboardingComplete === false)) {
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
  
  // If user is null here, it means initialLoading is false but user is still null (should have been caught by redirect)
  // However, to prevent runtime errors if redirects are slow or useAuth() state updates with a delay:
  if (!user) {
     return ( // Fallback loader, though ideally redirect logic handles this
      <div className="flex h-screen items-center justify-center bg-background">
        <LoadingSpinner className="h-12 w-12 text-primary" />
      </div>
    );
  }


  // Define navigation items based on roles (owner, staff, admin)
  const commonNavItems = [
    { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: ['owner', 'staff', 'admin', 'user'] },
    { href: '/dashboard/profile', label: 'Profile', icon: ChefHat, roles: ['owner', 'staff', 'admin', 'user'], hint: "user profile" },
  ];

  const ownerNavItems = [
    { href: '/dashboard/restaurant', label: 'My Restaurant', icon: Store, roles: ['owner'], hint: "restaurant details" },
    { href: '/dashboard/recipes', label: 'Recipes', icon: Utensils, roles: ['owner', 'staff'], hint: "food recipes" },
    { href: '/dashboard/meal-planner', label: 'Meal Planner', icon: SquareMenu, roles: ['owner', 'staff'], hint: "meal plan" },
    { href: '/dashboard/staff', label: 'Staff Management', icon: Users, roles: ['owner'], hint: "manage staff" },
    // Add more owner-specific items like Menu Management, Inventory, Settings (Restaurant)
  ];

  const superAdminNavItems = [
     { href: '/dashboard/admin/users', label: 'All Users', icon: Users, roles: ['admin'], hint: "users list" },
     { href: '/dashboard/admin/restaurants', label: 'All Restaurants', icon: ShieldCheck, roles: ['admin'], hint: "platform restaurants" },
     { href: '/dashboard/admin/settings', label: 'Platform Settings', icon: Settings, roles: ['admin'], hint: "admin settings" },
  ];

  let navItemsToDisplay: typeof commonNavItems = [...commonNavItems];

  if (role === 'owner') {
    navItemsToDisplay = [...navItemsToDisplay, ...ownerNavItems];
  } else if (role === 'staff') {
    // Staff might see a subset of owner items, or specific staff tools
    // For now, let's give them recipes and meal planner from ownerNavItems
    navItemsToDisplay = [
      ...navItemsToDisplay,
      ...ownerNavItems.filter(item => ['/dashboard/recipes', '/dashboard/meal-planner'].includes(item.href)),
    ];
  }
  // 'user' role currently has only common items.

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
            {getFilteredNavItems(navItemsToDisplay, role).map((item) => (
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
            {role === 'admin' && (
              <>
                <SidebarSeparator className="my-4" />
                <SidebarMenuItem>
                  <div className="px-2 py-1 text-xs font-semibold text-sidebar-foreground/70 group-data-[collapsible=icon]:hidden">Platform Admin</div>
                </SidebarMenuItem>
                {getFilteredNavItems(superAdminNavItems, role).map((item) => (
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
           {/* User info or quick actions can go here */}
        </SidebarFooter>
      </Sidebar>
      <SidebarInset>
        <header className="sticky top-0 z-10 flex h-16 items-center justify-between border-b bg-background/80 px-4 backdrop-blur-md sm:px-6">
          <div className="flex items-center">
            <SidebarTrigger className="md:hidden" />
            {/* Breadcrumbs or page title can go here */}
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
