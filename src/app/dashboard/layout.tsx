
// src/app/dashboard/layout.tsx
"use client";

import { useEffect, type ReactNode, useState, useCallback } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { useAuth, type UserRole } from "@/lib/auth/context";
import AppLoadingScreen from '@/components/shared/app-loading-screen'; 
import UserNav from "@/components/dashboard/user-nav";
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
  SidebarMenuBadge,
  SidebarMenuSubContent,
  SidebarSeparator,
  SidebarInset,
} from '@/components/ui/sidebar';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import BottomNavigationBar, {
  type BottomNavItem,
} from "@/components/dashboard/bottom-navigation-bar";
import { useIsMobile as useIsMobileDirect } from "@/hooks/use-mobile";
import {
  LayoutDashboard,
  Users,
  Utensils,
  ChefHat,
  Settings,
  ShieldCheck,
  Store,
  PlusCircle,
  BookCopy,
  ListOrdered,
  Briefcase,
  ExternalLink,
  Table,
  List,
  Settings2,
  CookingPot,
  ChevronDown,
  LogOut,
  ChevronsLeftRight,
  Archive, // Already here
  BarChart3, // Already here
  ScanText,
  PackagePlus, // Added
  PackageMinus, // Added
  Trash2, // Added
} from "lucide-react"; 
import type { RestaurantProfile } from "@/types";
import {
  getRestaurantsByOwner,
  updateUserProfile,
} from "@/lib/firebase/firestore";
import { useToast } from "@/hooks/use-toast";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";
import PWAInstaller from "@/components/pwa/PWAInstaller";

interface NavItem {
  href?: string;
  label: string;
  icon: LucideIcon;
  roles: UserRole[];
  hint?: string;
  target?: string;
  rel?: string;
  children?: NavItem[];
  isHeader?: boolean;
  badgeCount?: number;
  isGroup?: boolean;
}

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const {
    user,
    role: authContextRole,
    initialLoading,
    loading: authContextLoading,
  } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const isMobile = useIsMobileDirect();
  const { toast } = useToast();

  const [ownedRestaurants, setOwnedRestaurants] = useState<RestaurantProfile[]>(
    []
  );
  const [selectedRestaurantId, setSelectedRestaurantId] = useState<
    string | null
  >(null);
  const [restaurantsLoading, setRestaurantsLoading] = useState(false);

  const [openCollapsibles, setOpenCollapsibles] = useState<
    Record<string, boolean>
  >({});

  const toggleCollapsible = (label: string) => {
    setOpenCollapsibles((prev) => ({ ...prev, [label]: !prev[label] }));
  };

  useEffect(() => {
    if (!initialLoading && !authContextLoading) {
      if (!user) {
        router.replace("/login");
      } else if (
        authContextRole === "owner" &&
        user.onboardingComplete === false
      ) {
        router.replace("/onboarding/restaurant-setup");
      } else if (!authContextRole && user) {
        console.error(
          "DashboardLayout: User has a null role after all loading. Redirecting to login."
        );
        router.replace("/login");
      }
    }
  }, [user, authContextRole, initialLoading, authContextLoading, router]);

  useEffect(() => {
    if (authContextRole === "owner" && user?.uid) {
      setRestaurantsLoading(true);
      getRestaurantsByOwner(user.uid)
        .then((restaurants) => {
          setOwnedRestaurants(restaurants);
          if (restaurants.length > 0) {
            const lastSelected = localStorage.getItem(
              `selectedRestaurant_${user.uid}`
            );
            if (
              lastSelected &&
              restaurants.some((r) => r.id === lastSelected)
            ) {
              setSelectedRestaurantId(lastSelected);
            } else if (
              user.restaurantId &&
              restaurants.some((r) => r.id === user.restaurantId)
            ) {
              setSelectedRestaurantId(user.restaurantId);
            } else {
              setSelectedRestaurantId(restaurants[0].id);
            }
          } else {
            setSelectedRestaurantId(null);
          }
        })
        .catch((error) => {
          console.error("Failed to fetch restaurants:", error);
          toast({
            variant: "destructive",
            title: "Error",
            description: "Could not load your restaurants.",
          });
        })
        .finally(() => {
          setRestaurantsLoading(false);
        });
    }
  }, [authContextRole, user?.uid, user?.restaurantId, toast]);

  useEffect(() => {
    if (selectedRestaurantId && user?.uid) {
      localStorage.setItem(
        `selectedRestaurant_${user.uid}`,
        selectedRestaurantId
      );
      if (user.restaurantId !== selectedRestaurantId) {
        updateUserProfile(user.uid, {
          restaurantId: selectedRestaurantId,
        }).catch((err) =>
          console.error(
            "Failed to update last selected restaurant for user:",
            err
          )
        );
      }
    }
  }, [selectedRestaurantId, user?.uid, user?.restaurantId]);

  const handleRestaurantChange = (restaurantId: string) => {
    if (restaurantId === "create_new_restaurant_redirect_target") {
      router.push("/dashboard/create-restaurant");
      return;
    }
    setSelectedRestaurantId(restaurantId);
  };

  if (
    authContextLoading ||
    (authContextRole === "owner" &&
      restaurantsLoading &&
      ownedRestaurants.length === 0 &&
      !pathname.endsWith("/create-restaurant") &&
      !pathname.endsWith("/subscription") &&
      !pathname.endsWith("/restaurant-setup"))
  ) {
    return <AppLoadingScreen message="Loading dashboard..." />;
  }

  if (
    !user ||
    !authContextRole ||
    (authContextRole === "owner" && user.onboardingComplete === false)
  ) {
    return <AppLoadingScreen message="Preparing your space..." />;
  }

  const commonNavItems: NavItem[] = [
    {
      href: "/dashboard",
      label: "Dashboard",
      icon: LayoutDashboard,
      roles: ["owner", "staff", "admin", "user"],
    },
  ];

  const getOwnerNavItems = (currentRestaurantId: string | null): NavItem[] => {
    if (!currentRestaurantId) {
      return [
        {
          href: `/dashboard/create-restaurant`,
          label: "Create Restaurant",
          icon: PlusCircle,
          roles: ["owner"],
          hint: "add new restaurant",
        },
      ];
    }
    return [
      {
        label: "Manage Restaurant",
        icon: Store,
        roles: ["owner"],
        hint: "manage specific restaurant settings and operations",
        isGroup: true,
        children: [
          {
            href: `/dashboard/restaurant/${currentRestaurantId}`,
            label: "Overview",
            icon: Store,
            roles: ["owner"],
            hint: "restaurant details",
          },
          {
            href: `/dashboard/menu-management/${currentRestaurantId}`,
            label: "Menu Management",
            icon: BookCopy,
            roles: ["owner"],
            hint: "manage menu",
          },
          {
            href: `/dashboard/table-management/${currentRestaurantId}`,
            label: "Table Management",
            icon: Briefcase, // Using Briefcase as Table wasn't imported, consider Table icon
            roles: ["owner"],
            hint: "manage tables",
          },
          {
            href: `/dashboard/orders/${currentRestaurantId}`,
            label: "Order Management",
            icon: ListOrdered,
            roles: ["owner", "staff"],
            hint: "view orders",
          },
          {
            href: `/dashboard/restaurant/${currentRestaurantId}/kitchen`,
            label: "KOT",
            icon: CookingPot,
            roles: ["owner", "kitchen"],
            hint: "kitchen order tickets",
          },
          {
            href: `/dashboard/staff/${currentRestaurantId}`,
            label: "Staff Management",
            icon: Users,
            roles: ["owner"],
            hint: "manage staff",
          },
          {
            href: `/dashboard/restaurant/${currentRestaurantId}/settings`,
            label: "Restaurant Settings",
            icon: Settings,
            roles: ["owner"],
            hint: "specific settings",
          },
        ],
      },
    ];
  };
  
  const getInventoryNavItems = (currentRestaurantId: string | null): NavItem[] => {
    if (!currentRestaurantId) {
      return []; // No inventory items if no restaurant selected
    }
    return [
      {
        label: "Inventory Management",
        icon: Archive,
        roles: ["owner", "staff"],
        hint: "Manage restaurant inventory",
        isGroup: true,
        children: [
          {
            href: `/dashboard/inventory/${currentRestaurantId}/dashboard`,
            label: "Overview",
            icon: BarChart3,
            roles: ["owner", "staff"],
            hint: "Inventory overview and KPIs",
          },
          {
            href: `/dashboard/inventory/${currentRestaurantId}`,
            label: "Stock List",
            icon: List,
            roles: ["owner", "staff"],
            hint: "View and manage all stock items",
          },
          {
            // href: `/dashboard/inventory/${currentRestaurantId}/stock-in`, // Placeholder
            label: "Stock In (Soon)",
            icon: PackagePlus,
            roles: ["owner", "staff"],
            hint: "Record incoming stock",
          },
          {
            // href: `/dashboard/inventory/${currentRestaurantId}/stock-out`, // Placeholder
            label: "Stock Out (Soon)",
            icon: PackageMinus,
            roles: ["owner", "staff"],
            hint: "Record stock outflow",
          },
          {
            // href: `/dashboard/inventory/${currentRestaurantId}/wastage`, // Placeholder
            label: "Wastage (Soon)",
            icon: Trash2,
            roles: ["owner", "staff"],
            hint: "Log wasted or spoiled items",
          },
        ],
      },
    ];
  };


  const platformAdminNavItems: NavItem[] = [
    {
      label: "Platform Admin",
      icon: ShieldCheck,
      roles: ["admin"],
      hint: "admin section",
      isGroup: true,
      children: [
        {
          href: "/dashboard/admin/users",
          label: "All Users",
          icon: Users,
          roles: ["admin"],
          hint: "users list",
        },
        {
          href: "/dashboard/admin/restaurants",
          label: "All Restaurants",
          icon: Store,
          roles: ["admin"],
          hint: "platform restaurants",
        },
        {
          href: "/dashboard/admin/analytics",
          label: "Platform Analytics",
          icon: BarChart3, 
          roles: ["admin"],
          hint: "admin analytics",
        },
        {
          href: "/dashboard/admin/content",
          label: "Content Moderation",
          icon: ScanText, 
          roles: ["admin"],
          hint: "admin content",
        },
        {
          href: "/dashboard/admin/settings",
          label: "Platform Settings",
          icon: Settings,
          roles: ["admin"],
          hint: "admin settings",
        },
      ],
    },
  ];

  const settingsNavItems: NavItem[] = [
    {
      label: "General Settings",
      icon: Settings2,
      roles: ["owner", "staff", "admin", "user"],
      hint: "App and Profile Settings",
      isGroup: true,
      children: [
        {
          href: "/dashboard/profile",
          label: "My Profile",
          icon: ChefHat,
          roles: ["owner", "staff", "user", "admin"],
          hint: "user profile",
        },
        {
          href: "/dashboard/settings/theme",
          label: "Theme & Branding",
          icon: Settings,
          roles: ["owner", "admin"],
          hint: "theme settings",
        },
      ],
    },
  ];

  let desktopNavItems: NavItem[] = [...commonNavItems];
  if (authContextRole === "owner") {
    desktopNavItems = [
      ...desktopNavItems,
      ...getOwnerNavItems(selectedRestaurantId),
      ...getInventoryNavItems(selectedRestaurantId), // Add Inventory Module for Owner
    ];
  } else if (authContextRole === "staff") {
    const staffRestaurantId = user?.restaurantId;
    if (staffRestaurantId) {
      const staffOwnerNavs = getOwnerNavItems(staffRestaurantId);
      const staffAccessibleTopLevel = staffOwnerNavs.find(item => item.label === "Manage Restaurant");
      if (staffAccessibleTopLevel && staffAccessibleTopLevel.children) {
        const staffSpecificItems = staffAccessibleTopLevel.children.filter(child => 
            child.label === "Order Management" || 
            child.label === "KOT"
            // Removed "Inventory" from here as it will be a top-level group
        );
        if (staffSpecificItems.length > 0) {
          desktopNavItems.push({
            ...staffAccessibleTopLevel,
            children: staffSpecificItems
          });
        }
      }
      desktopNavItems = [...desktopNavItems, ...getInventoryNavItems(staffRestaurantId)]; // Add Inventory Module for Staff
    }
  }

  if (authContextRole === "admin") {
    desktopNavItems = [...desktopNavItems, ...platformAdminNavItems];
  }
  desktopNavItems = [...desktopNavItems, ...settingsNavItems];


  const getFilteredNavItems = (
    items: NavItem[],
    currentRole: UserRole | null
  ) => {
    if (!currentRole) return [];
    return items
      .filter((item) => item.roles.includes(currentRole))
      .map((item) => ({
        ...item,
        children: item.children
          ? getFilteredNavItems(item.children, currentRole)
          : undefined,
      }));
  };

  const bottomNavLinks: BottomNavItem[] = [
    {
      href: "/dashboard",
      label: "Home",
      icon: LayoutDashboard,
      hint: "dashboard home",
    },
    ...(authContextRole === "owner" && selectedRestaurantId
      ? [
          {
            href: `/dashboard/menu-management/${selectedRestaurantId}`,
            label: "Menu",
            icon: BookCopy,
            hint: "manage menu",
          },
          {
            href: `/dashboard/orders/${selectedRestaurantId}`,
            label: "Orders",
            icon: ListOrdered,
            hint: "view orders",
          },
           {
            href: `/dashboard/inventory/${selectedRestaurantId}/dashboard`,
            label: "Inventory",
            icon: Archive,
            hint: "inventory",
          },
          {
            href: `/dashboard/restaurant/${selectedRestaurantId}/settings`,
            label: "Settings",
            icon: Settings,
            hint: "specific settings",
          },
        ]
      : []),
    ...(authContextRole === "staff" && user?.restaurantId
      ? [
          {
            href: `/dashboard/orders/${user.restaurantId}`,
            label: "Orders",
            icon: ListOrdered,
            hint: "view orders",
          },
          {
            href: `/dashboard/inventory/${user.restaurantId}/dashboard`,
            label: "Inventory",
            icon: Archive,
            hint: "inventory",
          },
        ]
      : []),
    ...(authContextRole === "admin"
      ? [
          {
            href: "/dashboard/admin/users",
            label: "Users",
            icon: Users,
            hint: "all users",
          },
        ]
      : []),
  ];

  const selectedRestaurantName =
    ownedRestaurants.find((r) => r.id === selectedRestaurantId)?.name ||
    "Select Restaurant";

  const renderNavMenu = (items: NavItem[], isSubmenu = false) => {
    return (
      <SidebarMenu
        className={cn(isSubmenu && "pl-4 group-data-[collapsible=icon]:pl-0")}
      >
        {getFilteredNavItems(items, authContextRole).map((item) => (
          <SidebarMenuItem key={item.label + (item.href || "")}>
            {item.children && item.children.length > 0 ? (
              <Collapsible
                open={openCollapsibles[item.label] || false}
                onOpenChange={() => toggleCollapsible(item.label)}
              >
                <CollapsibleTrigger asChild>
                  <SidebarMenuButton
                    isActive={item.children.some(
                      (child) =>
                        child.href &&
                        pathname.startsWith(
                          child.href
                            .split("[")[0]
                            .replace(/\/(undefined|null)$/, "")
                        )
                    )}
                    variant="ghost"
                    className="justify-between w-full"
                    tooltip={{
                      children: item.label,
                      "data-ai-hint": item.hint,
                      side: "right",
                      align: "center",
                    }}
                    size={isSubmenu ? "sm" : "default"}
                  >
                    <div className="flex items-center gap-2">
                      <item.icon
                        className={cn("h-5 w-5", isSubmenu && "h-4 w-4")}
                      />
                      <span
                        className={cn(
                          "ml-1 group-data-[collapsible=icon]:hidden truncate",
                          isSubmenu && "text-sm"
                        )}
                      >
                        {item.label}
                      </span>
                    </div>
                    <ChevronDown
                      className={cn(
                        "h-4 w-4 transition-transform group-data-[collapsible=icon]:hidden",
                        openCollapsibles[item.label] && "rotate-180"
                      )}
                    />
                    {item.badgeCount && item.badgeCount > 0 && (
                      <SidebarMenuBadge>{item.badgeCount}</SidebarMenuBadge>
                    )}
                  </SidebarMenuButton>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <SidebarMenuSubContent> 
                    {renderNavMenu(item.children, true)}
                  </SidebarMenuSubContent>
                </CollapsibleContent>
              </Collapsible>
            ) : (
              <SidebarMenuButton
                asChild
                isActive={
                  pathname === item.href ||
                  (item.href &&
                    item.href !== "/dashboard" &&
                    pathname.startsWith(
                      item.href.split("[")[0].replace(/\/(undefined|null)$/, "")
                    ))
                }
                tooltip={{
                  children: item.label,
                  "data-ai-hint": item.hint,
                  side: "right",
                  align: "center",
                }}
                size={isSubmenu ? "sm" : "default"}
              >
                <Link
                  href={item.href!}
                  target={item.target}
                  rel={item.rel}
                  className="flex items-center justify-between w-full"
                >
                  <div className="flex items-center gap-2">
                    <item.icon
                      className={cn("h-5 w-5", isSubmenu && "h-4 w-4")}
                    />
                    <span
                      className={cn(
                        "ml-1 group-data-[collapsible=icon]:hidden truncate",
                        isSubmenu && "text-sm"
                      )}
                    >
                      {item.label}
                    </span>
                  </div>
                  {item.badgeCount && item.badgeCount > 0 && (
                    <SidebarMenuBadge>{item.badgeCount}</SidebarMenuBadge>
                  )}
                </Link>
              </SidebarMenuButton>
            )}
          </SidebarMenuItem>
        ))}
      </SidebarMenu>
    );
  };

  return (
    <>
      {!isMobile ? (
        <SidebarProvider defaultOpen>
          <Sidebar>
            <SidebarHeader className="p-4">
              <Link href="/dashboard" className="flex items-center gap-2">
                <Image
                  src="/images/logo.png"
                  alt="Potoba Logo"
                  width={40}
                  height={40}
                  className="rounded-md"
                  data-ai-hint="modern app logo"
                />
                <h1 className="text-2xl font-bold text-sidebar-primary group-data-[collapsible=icon]:hidden">
                  Potoba
                </h1>
              </Link>
            </SidebarHeader>
            <SidebarContent>
              {authContextRole === "owner" && (
                <div className="p-2 space-y-2 group-data-[collapsible=icon]:hidden">
                  <div className="flex items-center space-x-2">
                    <Select
                      value={selectedRestaurantId || ""}
                      onValueChange={handleRestaurantChange}
                    >
                      <SelectTrigger className="w-full flex-grow text-xs h-9">
                        <SelectValue placeholder="Select Restaurant..." />
                      </SelectTrigger>
                      <SelectContent>
                        {ownedRestaurants.length > 0 ? (
                          ownedRestaurants.map((restaurant) => (
                            <SelectItem
                              key={restaurant.id}
                              value={restaurant.id}
                              className="text-xs"
                            >
                              {restaurant.name}
                            </SelectItem>
                          ))
                        ) : (
                          <SelectItem value="no-restaurants" disabled>
                            No restaurants found
                          </SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                    {selectedRestaurantId && (
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="outline"
                              size="icon"
                              asChild
                              className="h-9 w-9 flex-shrink-0"
                            >
                              <Link
                                href={`/site/${selectedRestaurantId}`}
                                target="_blank"
                                rel="noopener noreferrer"
                              >
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
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full text-xs"
                    asChild
                  >
                    <Link href="/dashboard/create-restaurant">
                      <PlusCircle className="mr-2 h-3 w-3" /> Create New
                    </Link>
                  </Button>
                  <SidebarSeparator className="my-2" />
                </div>
              )}
              {renderNavMenu(desktopNavItems)}
            </SidebarContent>
            <SidebarFooter className="flex p-2 border-t border-sidebar-border">
              <SidebarTrigger className="self-end hidden md:flex self-center mt-2 h-8 w-8 p-0 group-data-[collapsible=icon]:mt-auto">
                <ChevronsLeftRight className="h-4 w-4" />
              </SidebarTrigger>
            </SidebarFooter>
          </Sidebar>
          <SidebarInset>
            <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b bg-background/80 px-4 backdrop-blur-md sm:px-6">
              <div className="flex items-center">
                <SidebarTrigger className="md:hidden" />
                {authContextRole === "owner" && (
                  <div className="ml-4 text-sm font-medium text-foreground">
                    {selectedRestaurantName}
                  </div>
                )}
              </div>
              <UserNav />
            </header>
            <main className="flex-1 p-6 bg-background overflow-y-auto">
              {children}
            </main>
          </SidebarInset>
        </SidebarProvider>
      ) : (
        <div className="flex min-h-screen flex-col">
          <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b bg-background/80 px-4 backdrop-blur-md sm:px-6">
            <Link href="/dashboard" className="flex items-center gap-2">
              <Image
                src="/images/logo.png"
                alt="Potoba Logo"
                width={32}
                height={32}
                className="rounded-md"
                data-ai-hint="modern app logo"
              />
              <h1 className="text-xl font-bold text-primary">Potoba</h1>
            </Link>
            <div className="flex items-center gap-2">
              {authContextRole === "owner" && (
                <>
                  <Select
                    value={selectedRestaurantId || ""}
                    onValueChange={handleRestaurantChange}
                  >
                    <SelectTrigger className="w-auto h-8 text-xs px-2 py-1 max-w-[110px] truncate">
                      <SelectValue placeholder="Restaurant" />
                    </SelectTrigger>
                    <SelectContent>
                      {ownedRestaurants.map((restaurant) => (
                        <SelectItem
                          key={restaurant.id}
                          value={restaurant.id}
                          className="text-xs"
                        >
                          {restaurant.name}
                        </SelectItem>
                      ))}
                      <SelectItem
                        value="create_new_restaurant_redirect_target"
                        className="text-xs text-primary"
                      >
                        Create New
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  {selectedRestaurantId && (
                    <Button
                      variant="ghost"
                      size="icon"
                      asChild
                      className="h-8 w-8 text-primary p-0"
                    >
                      <Link
                        href={`/site/${selectedRestaurantId}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        title="Open Public Page"
                      >
                        <ExternalLink className="h-4 w-4" />
                      </Link>
                    </Button>
                  )}
                </>
              )}
              <UserNav />
            </div>
          </header>
          <main className="flex-1 bg-background max-h-[calc(100dvh-theme(spacing.16)-theme(spacing.16))] overflow-y-auto p-4 pt-6 ">
            {children}
          </main>
          <BottomNavigationBar navItems={bottomNavLinks} />
        </div>
      )}
      <PWAInstaller />
    </>
  );
}

