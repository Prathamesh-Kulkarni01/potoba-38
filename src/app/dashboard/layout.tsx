'use client';

import { useEffect, type ReactNode, useState, useCallback } from 'react';
import { usePathname, useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { useAuth, type UserRole } from '@/lib/auth/context';
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import BottomNavigationBar, { type BottomNavItem } from '@/components/dashboard/bottom-navigation-bar';
import { useIsMobile as useIsMobileDirect } from '@/hooks/use-mobile';
import { LayoutDashboard, Users, Utensils, ChefHat, SquareMenu, Settings, ShieldCheck, Store, PlusCircle, BookCopy, ListOrdered, Briefcase, ExternalLink } from 'lucide-react'; // Added ExternalLink, ListOrdered for Orders, Briefcase for Table Management
import type { RestaurantProfile } from '@/types';
import { getRestaurantsByOwner } from '@/lib/firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

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
  const { toast } = useToast();

  const [ownedRestaurants, setOwnedRestaurants] = useState<RestaurantProfile[]>([]);
  const [selectedRestaurantId, setSelectedRestaurantId] = useState<string | null>(null);
  const [restaurantsLoading, setRestaurantsLoading] = useState(false);

  // Effect for initial auth and role checks, redirection
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
  
  // Effect for fetching owner's restaurants and setting selected restaurant
  useEffect(() => {
    if (authContextRole === 'owner' && user?.uid) {
      setRestaurantsLoading(true);
      getRestaurantsByOwner(user.uid)
        .then((restaurants) => {
          setOwnedRestaurants(restaurants);
          if (restaurants.length > 0) {
            // Try to get last selected from localStorage or default
            const lastSelected = localStorage.getItem(`selectedRestaurant_${user.uid}`);
            if (lastSelected && restaurants.some(r => r.id === lastSelected)) {
              setSelectedRestaurantId(lastSelected);
            } else if (user.restaurantId && restaurants.some(r => r.id === user.restaurantId)) { // user.restaurantId is primary
              setSelectedRestaurantId(user.restaurantId);
            } else {
              setSelectedRestaurantId(restaurants[0].id);
            }
          } else {
            setSelectedRestaurantId(null); // No restaurants found for owner
          }
        })
        .catch((error) => {
          console.error("Failed to fetch restaurants:", error);
          toast({ variant: "destructive", title: "Error", description: "Could not load your restaurants." });
        })
        .finally(() => {
          setRestaurantsLoading(false);
        });
    }
  }, [authContextRole, user?.uid, user?.restaurantId, toast]);

  // Persist selectedRestaurantId to localStorage
  useEffect(() => {
    if (selectedRestaurantId && user?.uid) {
      localStorage.setItem(`selectedRestaurant_${user.uid}`, selectedRestaurantId);
    }
  }, [selectedRestaurantId, user?.uid]);


  const handleRestaurantChange = (restaurantId: string) => {
    if (restaurantId === "create_new_restaurant_redirect_target") {
        router.push('/dashboard/create-restaurant');
        return;
    }
    setSelectedRestaurantId(restaurantId);
  };
  
  if (initialLoading || authContextLoading || (authContextRole === 'owner' && restaurantsLoading && ownedRestaurants.length === 0 && !pathname.endsWith('/create-restaurant'))) {
    return <FullScreenLoader />;
  }

  if (!user || !authContextRole || (authContextRole === 'owner' && user.onboardingComplete === false)) {
    return <FullScreenLoader />;
  }
  
  const commonNavItems = [
    { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: ['owner', 'staff', 'admin', 'user'] },
    { href: '/dashboard/profile', label: 'Profile', icon: ChefHat, roles: ['owner', 'staff', 'admin', 'user'], hint: "user profile" },
  ];

  const getOwnerNavItems = (currentRestaurantId: string | null) => {
    if (!currentRestaurantId) {
      return [
        { href: `/dashboard/create-restaurant`, label: 'Create Restaurant', icon: PlusCircle, roles: ['owner'], hint: "add new restaurant" },
      ];
    }
    return [
      { href: `/dashboard/restaurant/${currentRestaurantId}`, label: 'My Restaurant', icon: Store, roles: ['owner'], hint: "restaurant details" },
      { href: `/dashboard/menu-management/${currentRestaurantId}`, label: 'Menu Management', icon: BookCopy, roles: ['owner'], hint: "manage menu" },
      { href: `/dashboard/table-management/${currentRestaurantId}`, label: 'Table Management', icon: Briefcase, roles: ['owner'], hint: "manage tables" },
      { href: `/dashboard/orders/${currentRestaurantId}`, label: 'Orders', icon: ListOrdered, roles: ['owner', 'staff'], hint: "view orders" },
      { href: `/dashboard/recipes/${currentRestaurantId}`, label: 'Recipes (Old)', icon: Utensils, roles: ['owner', 'staff'], hint: "food recipes" },
      { href: `/dashboard/meal-planner/${currentRestaurantId}`, label: 'Meal Planner', icon: SquareMenu, roles: ['owner', 'staff'], hint: "meal plan" },
      { href: `/dashboard/staff/${currentRestaurantId}`, label: 'Staff Management', icon: Users, roles: ['owner'], hint: "manage staff" },
      { href: `/dashboard/restaurant/${currentRestaurantId}/settings`, label: 'Restaurant Settings', icon: Settings, roles: ['owner'], hint: "specific settings" },
    ];
  };
  
  const superAdminNavItems = [
     { href: '/dashboard/admin/users', label: 'All Users', icon: Users, roles: ['admin'], hint: "users list" },
     { href: '/dashboard/admin/restaurants', label: 'All Restaurants', icon: ShieldCheck, roles: ['admin'], hint: "platform restaurants" }, 
     { href: '/dashboard/admin/analytics', label: 'Platform Analytics', icon: LayoutDashboard, roles: ['admin'], hint: "admin analytics"},
     { href: '/dashboard/admin/content', label: 'Content Moderation', icon: SquareMenu, roles: ['admin'], hint: "admin content"},
     { href: '/dashboard/admin/settings', label: 'Platform Settings', icon: Settings, roles: ['admin'], hint: "admin settings" },
  ];

  let desktopNavItems: typeof commonNavItems = [...commonNavItems];
  if (authContextRole === 'owner') {
    desktopNavItems = [...desktopNavItems, ...getOwnerNavItems(selectedRestaurantId)];
  } else if (authContextRole === 'staff') {
    const staffRestaurantId = user?.restaurantId; 
     if (staffRestaurantId) {
        desktopNavItems = [
        ...desktopNavItems,
        // Filter staff items. Allow Orders, Recipes (Old), Meal Planner.
        ...getOwnerNavItems(staffRestaurantId).filter(item => ['Orders', 'Recipes (Old)', 'Meal Planner'].includes(item.label)), 
        ];
     }
  }

  const getFilteredNavItems = (items: any[], currentRole: UserRole | null) => {
    if (!currentRole) return [];
    return items.filter(item => item.roles.includes(currentRole));
  };

  let dynamicBottomNavItem: BottomNavItem;
  let dynamicBottomNavItem2: BottomNavItem | null = null;

  if (authContextRole === 'owner' && selectedRestaurantId) {
    dynamicBottomNavItem = { href: `/dashboard/menu-management/${selectedRestaurantId}`, label: 'Menu', icon: BookCopy, hint: "manage menu" };
    dynamicBottomNavItem2 = { href: `/dashboard/orders/${selectedRestaurantId}`, label: 'Orders', icon: ListOrdered, hint: "view orders" };
  } else if (authContextRole === 'admin') {
    dynamicBottomNavItem = { href: '/dashboard/admin/users', label: 'Users', icon: Users, hint: "all users" };
  } else if (authContextRole === 'staff' && user?.restaurantId) {
    dynamicBottomNavItem = { href: `/dashboard/orders/${user.restaurantId}`, label: 'Orders', icon: ListOrdered, hint: "view orders" };
    dynamicBottomNavItem2 = { href: `/dashboard/menu-management/${user.restaurantId}`, label: 'Menu', icon: BookCopy, hint: "view menu" };
  } else { 
     const relevantRestaurantId = user?.restaurantId || selectedRestaurantId;
     if (relevantRestaurantId) {
        dynamicBottomNavItem = { href: `/dashboard/menu-management/${relevantRestaurantId}`, label: 'Menu', icon: BookCopy, hint: "view menu" };
     } else {
        dynamicBottomNavItem = { href: `/dashboard/recipes`, label: 'Recipes', icon: Utensils, hint: "food recipes" }; // Fallback or generic recipes
     }
  }


  const bottomNavLinks: BottomNavItem[] = [
    { href: '/dashboard', label: 'Home', icon: LayoutDashboard, hint: "dashboard home" },
    dynamicBottomNavItem,
  ];
  if (dynamicBottomNavItem2) {
    bottomNavLinks.push(dynamicBottomNavItem2);
  }
  bottomNavLinks.push({ href: '/dashboard/profile', label: 'Profile', icon: ChefHat, hint: "user profile" });
  
  const selectedRestaurantName = ownedRestaurants.find(r => r.id === selectedRestaurantId)?.name || "Select Restaurant";

  return (
    <>
      {!isMobile ? (
        <SidebarProvider defaultOpen>
          <Sidebar>
            <SidebarHeader className="p-4">
              <Link href="/dashboard" className="flex items-center gap-2">
                <Image src="/public/images/logo.png" alt="App Logo" width={40} height={40} className="rounded-md" data-ai-hint="modern logo" />
                <h1 className="text-2xl font-bold text-sidebar-primary group-data-[collapsible=icon]:hidden">Potoba</h1>
              </Link>
            </SidebarHeader>
            <SidebarContent>
              {authContextRole === 'owner' && (
                <div className="p-2 space-y-2 group-data-[collapsible=icon]:hidden">
                  <div className="flex items-center space-x-2">
                    <Select value={selectedRestaurantId || ''} onValueChange={handleRestaurantChange}>
                      <SelectTrigger className="w-full flex-grow">
                        <SelectValue placeholder="Select Restaurant..." />
                      </SelectTrigger>
                      <SelectContent>
                        {ownedRestaurants.length > 0 ? (
                          ownedRestaurants.map(restaurant => (
                            <SelectItem key={restaurant.id} value={restaurant.id}>
                              {restaurant.name}
                            </SelectItem>
                          ))
                        ) : (
                          <SelectItem value="no-restaurants" disabled>No restaurants found</SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                    {selectedRestaurantId && (
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button variant="outline" size="icon" asChild className="h-9 w-9 flex-shrink-0">
                              <Link href={`/site/${selectedRestaurantId}`} target="_blank" rel="noopener noreferrer">
                                <ExternalLink className="h-4 w-4" />
                              </Link>
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Open Public Page</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    )}
                  </div>
                  <Button variant="outline" size="sm" className="w-full" asChild>
                    <Link href="/dashboard/create-restaurant">
                      <PlusCircle className="mr-2 h-4 w-4" /> Create New
                    </Link>
                  </Button>
                  <SidebarSeparator className="my-2" />
                </div>
              )}
              <SidebarMenu>
                {getFilteredNavItems(desktopNavItems, authContextRole).map((item) => (
                  <SidebarMenuItem key={item.href + (item.label === 'My Restaurant' && selectedRestaurantId ? selectedRestaurantId : '')}>
                    <SidebarMenuButton
                      asChild
                      isActive={pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href.split('[')[0].replace(/\/(undefined|null)$/, '')))} 
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
                 {authContextRole === 'owner' && (
                  <div className="ml-4 text-sm font-medium text-foreground">
                    Current: {selectedRestaurantName}
                  </div>
                )}
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
              <Image src="/public/images/logo.png" alt="App Logo" width={32} height={32} className="rounded-md" data-ai-hint="modern logo" />
              <h1 className="text-xl font-bold text-primary">Potoba</h1>
            </Link>
             <div className="flex items-center gap-2">
                {authContextRole === 'owner' && (
                  <>
                    <Select value={selectedRestaurantId || ''} onValueChange={handleRestaurantChange}>
                        <SelectTrigger className="w-auto h-8 text-xs px-2 py-1 max-w-[110px] truncate">
                        <SelectValue placeholder="Restaurant" />
                        </SelectTrigger>
                        <SelectContent>
                        {ownedRestaurants.map(restaurant => (
                            <SelectItem key={restaurant.id} value={restaurant.id} className="text-xs">
                            {restaurant.name}
                            </SelectItem>
                        ))}
                        <SelectItem value="create_new_restaurant_redirect_target" className="text-xs text-primary">
                            Create New
                        </SelectItem>
                        </SelectContent>
                    </Select>
                    {selectedRestaurantId && (
                        <Button variant="ghost" size="icon" asChild className="h-8 w-8 text-primary p-0">
                            <Link href={`/site/${selectedRestaurantId}`} target="_blank" rel="noopener noreferrer" title="Open Public Page">
                                <ExternalLink className="h-4 w-4" />
                            </Link>
                        </Button>
                    )}
                  </>
                )}
                <UserNav />
            </div>
          </header>
          <main className="flex-1 bg-background p-4 pt-6 pb-20">
            {children}
          </main>
          <BottomNavigationBar navItems={bottomNavLinks} />
        </div>
      )}
    </>
  );
}
