'use client';

import { useEffect, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { useAuth } from '@/lib/auth/context';
import LoadingSpinner from '@/components/shared/loading-spinner';
import UserNav from '@/components/dashboard/user-nav';
import { Button } from '@/components/ui/button';
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
} from '@/components/ui/sidebar'; // Using the provided Sidebar component
import { LayoutDashboard, Users, Utensils, ChefHat, SquareMenu, Settings } from 'lucide-react';

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const { user, role, initialLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!initialLoading && !user) {
      router.replace('/login');
    }
  }, [user, initialLoading, router]);

  if (initialLoading || !user) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <LoadingSpinner className="h-12 w-12 text-primary" />
      </div>
    );
  }

  const navItems = [
    { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: ['admin', 'user'] },
    { href: '/dashboard/recipes', label: 'Recipes', icon: Utensils, roles: ['admin', 'user'], hint: "food recipes" },
    { href: '/dashboard/meal-planner', label: 'Meal Planner', icon: SquareMenu, roles: ['admin', 'user'], hint: "meal plan" },
    { href: '/dashboard/profile', label: 'Profile', icon: ChefHat, roles: ['admin', 'user'], hint: "user profile" },
  ];

  const adminNavItems = [
     { href: '/dashboard/admin/users', label: 'User Management', icon: Users, roles: ['admin'], hint: "users list" },
     { href: '/dashboard/admin/settings', label: 'Settings', icon: Settings, roles: ['admin'], hint: "admin settings" },
  ];

  const getFilteredNavItems = (items: typeof navItems) => {
    return items.filter(item => item.roles.includes(role || 'user'));
  }

  return (
    <SidebarProvider defaultOpen>
      <Sidebar>
        <SidebarHeader className="p-4">
          <Link href="/dashboard" className="flex items-center gap-2">
            {/* Replace with a proper logo if available */}
            <Image src="https://picsum.photos/seed/authzenlogo/40/40" alt="AuthZen Logo" width={40} height={40} className="rounded-md" data-ai-hint="modern logo" />
            <h1 className="text-2xl font-bold text-sidebar-primary group-data-[collapsible=icon]:hidden">AuthZen</h1>
          </Link>
        </SidebarHeader>
        <SidebarContent>
          <SidebarMenu>
            {getFilteredNavItems(navItems).map((item) => (
              <SidebarMenuItem key={item.href}>
                <SidebarMenuButton 
                  asChild 
                  isActive={router.pathname === item.href} 
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
                {getFilteredNavItems(adminNavItems).map((item) => (
                  <SidebarMenuItem key={item.href}>
                     <SidebarMenuButton 
                       asChild 
                       isActive={router.pathname === item.href} 
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
           {/* Can add user info here or keep it simple */}
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
