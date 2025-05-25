// src/app/dashboard/layout.tsx
"use client";

import { useEffect, type ReactNode, useState, useCallback, useMemo } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { useAuth, type UserRole, type StaffPermissions, type StaffRole } from "@/lib/auth/context";
import AppLoadingScreen from '@/components/shared/app-loading-screen'; 
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
  SidebarMenuSubContent,
  SidebarMenuBadge,
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
import { useIsMobile } from "@/hooks/use-mobile";
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
  Table as TableIconLucide,
  List,
  Settings2,
  CookingPot,
  ChevronDown,
  LogOut,
  ChevronsLeftRight,
  Archive,
  BarChart3,
  ScanText,
  PackagePlus,
  PackageMinus,
  Trash2,
  Layers 
} from "lucide-react";
import type { RestaurantProfile } from "@/types";
import {
  getRestaurantsByOwner,
  updateUserProfile,
  getRestaurant,
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
  staffPermissionKey?: keyof StaffPermissions;
  staffRoles?: StaffRole[]; // Which specific staff roles can see this?
  hint?: string;
  target?: string;
  rel?: string;
  children?: NavItem[];
  isHeader?: boolean;
  badgeCount?: number;
  isGroup?: boolean; 
  isTopLevel?: boolean; 
}

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const {
    user,
    role: authContextRole,
    staffRole: authContextStaffRole,
    initialLoading,
    loading: authContextLoading,
  } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const isMobile = useIsMobile();
  const { toast } = useToast();

  const [ownedRestaurants, setOwnedRestaurants] = useState<RestaurantProfile[]>(
    []
  );
  const [selectedRestaurantId, setSelectedRestaurantId] = useState<
    string | null
  >(null);
  const [currentRestaurantDetails, setCurrentRestaurantDetails] = useState<RestaurantProfile | null>(null);
  const [restaurantsLoading, setRestaurantsLoading] = useState(false);

  const [openCollapsibles, setOpenCollapsibles] = useState<
    Record<string, boolean>
  >({});

  const toggleCollapsible = (label: string) => {
    setOpenCollapsibles((prev) => ({ ...prev, [label]: !prev[label] }));
  };
  
  // Initial redirect logic
  useEffect(() => {
    if (!initialLoading && !authContextLoading) {
      if (!user) {
        router.replace("/login");
      } else if (authContextRole === 'staff' && authContextStaffRole === 'Waiter') {
        router.replace('/waiter');
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
  }, [user, authContextRole, authContextStaffRole, initialLoading, authContextLoading, router]);


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
    } else if (authContextRole === 'staff' && user?.restaurantId) {
        setSelectedRestaurantId(user.restaurantId);
    }
  }, [authContextRole, user?.uid, user?.restaurantId, toast]);

  useEffect(() => {
    if (selectedRestaurantId && user?.uid) {
      localStorage.setItem(
        `selectedRestaurant_${user.uid}`,
        selectedRestaurantId
      );
      if (user.restaurantId !== selectedRestaurantId && authContextRole === 'owner') {
        updateUserProfile(user.uid, {
          restaurantId: selectedRestaurantId,
        }).catch((err) =>
          console.error(
            "Failed to update last selected restaurant for user:",
            err
          )
        );
      }
      // Fetch details for the selected restaurant
      getRestaurant(selectedRestaurantId).then(setCurrentRestaurantDetails);
    } else {
      setCurrentRestaurantDetails(null);
    }
  }, [selectedRestaurantId, user?.uid, user?.restaurantId, authContextRole]);


  const handleRestaurantChange = (restaurantId: string) => {
    if (restaurantId === "create_new_restaurant_redirect_target") {
      router.push("/dashboard/create-restaurant");
      return;
    }
    setSelectedRestaurantId(restaurantId);
  };

  const baseNavItems: NavItem[] = useMemo(() => [
    {
      href: "/dashboard",
      label: "Dashboard",
      icon: LayoutDashboard,
      roles: ["owner", "staff", "admin", "user"], // All roles can see the main dashboard link
      isTopLevel: true,
    },
  ], []);

  const getRestaurantOperationNavItems = useCallback((currentRestaurantId: string | null, permissions?: StaffPermissions | null, currentStaffRole?: StaffRole | null): NavItem[] => {
    if (!currentRestaurantId || currentRestaurantId.trim() === "" || currentStaffRole === 'Waiter') {
      return [];
    }
    const items: NavItem[] = [
      {
        href: `/dashboard/menu-management/${currentRestaurantId}`,
        label: "Menu Management",
        icon: BookCopy,
        roles: ["owner", "staff"],
        staffPermissionKey: "canManageMenu",
        staffRoles: ["Manager", "Custom"],
        hint: "manage menu",
        isTopLevel: true,
      },
      {
        href: `/dashboard/orders/${currentRestaurantId}`,
        label: "Order Management",
        icon: ListOrdered,
        roles: ["owner", "staff"],
        staffPermissionKey: "canManageAllOrders",
        staffRoles: ["Manager", "Biller", "Custom"],
        hint: "view orders",
        isTopLevel: true,
      },
      {
        href: `/dashboard/restaurant/${currentRestaurantId}/kitchen`,
        label: "KOT",
        icon: CookingPot,
        roles: ["owner", "staff"], 
        staffPermissionKey: "canViewKitchenOrders",
        staffRoles: ["Manager", "KitchenStaff", "Custom"],
        hint: "kitchen order tickets",
        isTopLevel: true,
      },
    ];
    if (authContextRole === 'owner' || (authContextRole === 'staff' && permissions?.canManageTables && currentStaffRole !== 'Waiter')) {
      items.push({ 
        href: `/dashboard/table-management/${currentRestaurantId}`,
        label: "Table Management",
        icon: TableIconLucide,
        roles: ["owner", "staff"],
        staffPermissionKey: "canManageTables",
        staffRoles: ["Manager", "Waiter", "Custom"], // Waiter needs this, but they are on /waiter
        hint: "manage tables",
        isTopLevel: true,
      });
    }
    return items;
  }, [authContextRole]);

  const getInventoryNavItemsGroup = useCallback((currentRestaurantId: string | null, permissions?: StaffPermissions | null, currentStaffRole?: StaffRole | null): NavItem | null => {
    if (!currentRestaurantId || currentRestaurantId.trim() === "" || currentStaffRole === 'Waiter') {
      return null;
    }
    const canAccessInventory = authContextRole === 'owner' || (authContextRole === 'staff' && (permissions?.canManageInventoryItems || permissions?.canViewInventoryReports));
    if (!canAccessInventory) return null;

    return {
        label: "Inventory",
        icon: Archive,
        roles: ["owner", "staff"],
        staffRoles: ["Manager", "KitchenStaff", "Custom"],
        hint: "Manage restaurant inventory",
        isGroup: true,
        isTopLevel: true,
        children: [
          {
            href: `/dashboard/inventory/${currentRestaurantId}/dashboard`,
            label: "Overview",
            icon: BarChart3,
            roles: ["owner", "staff"],
            staffPermissionKey: "canViewInventoryReports",
            staffRoles: ["Manager", "KitchenStaff", "Custom"],
            hint: "Inventory overview and KPIs",
          },
          {
            href: `/dashboard/inventory/${currentRestaurantId}`,
            label: "Stock List",
            icon: List,
            roles: ["owner", "staff"],
            staffPermissionKey: "canManageInventoryItems",
            staffRoles: ["Manager", "KitchenStaff", "Custom"],
            hint: "View and manage all stock items",
          },
          {
            href: `/dashboard/inventory/${currentRestaurantId}/stock-in`,
            label: "Stock In",
            icon: PackagePlus,
            roles: ["owner", "staff"],
            staffPermissionKey: "canRecordStockIn",
            staffRoles: ["Manager", "KitchenStaff", "Custom"],
            hint: "Record incoming stock",
          },
          {
            href: `/dashboard/inventory/${currentRestaurantId}/stock-out`,
            label: "Stock Out",
            icon: PackageMinus,
            roles: ["owner", "staff"],
            staffPermissionKey: "canRecordStockOut",
            staffRoles: ["Manager", "KitchenStaff", "Custom"],
            hint: "Record stock outflow",
          },
          {
             href: `/dashboard/inventory/${currentRestaurantId}/wastage`,
            label: "Wastage",
            icon: Trash2,
            roles: ["owner", "staff"],
            staffPermissionKey: "canRecordStockOut", 
            staffRoles: ["Manager", "KitchenStaff", "Custom"],
            hint: "Log wasted or spoiled items",
          },
        ].filter(item => { 
            if(authContextRole === 'staff' && currentStaffRole && item.staffRoles && !item.staffRoles.includes(currentStaffRole)) return false;
            if(authContextRole === 'staff' && item.staffPermissionKey && permissions) {
                return permissions[item.staffPermissionKey];
            }
            return true;
        }),
      };
  }, [authContextRole]);

  const getRestaurantManagementNavItemsGroup = useCallback((currentRestaurantId: string | null): NavItem | null => {
    if (!currentRestaurantId || currentRestaurantId.trim() === "" || authContextRole !== 'owner') { 
      return null;
    }
    return {
      label: "Manage Restaurant",
      icon: Store, 
      roles: ["owner"],
      hint: "Restaurant-specific settings and management",
      isGroup: true,
      isTopLevel: true,
      children: [
        {
          href: `/dashboard/restaurant/${currentRestaurantId}`,
          label: "Restaurant Overview",
          icon: Briefcase, 
          roles: ["owner"],
          hint: "restaurant details",
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
      ]
    };
  }, [authContextRole]);

  const platformAdminNavItemsGroup: NavItem | null = useMemo(() => {
    if (authContextRole !== 'admin') return null;
    return {
      label: "Platform Admin",
      icon: ShieldCheck,
      roles: ["admin"],
      hint: "admin section",
      isGroup: true,
      isTopLevel: true,
      children: [
        { href: "/dashboard/admin/users", label: "All Users", icon: Users, roles: ["admin"], hint: "users list", },
        { href: "/dashboard/admin/restaurants", label: "All Restaurants", icon: Store, roles: ["admin"], hint: "platform restaurants", },
        { href: "/dashboard/admin/analytics", label: "Platform Analytics", icon: BarChart3, roles: ["admin"], hint: "admin analytics", },
        { href: "/dashboard/admin/content", label: "Content Moderation", icon: ScanText, roles: ["admin"], hint: "admin content", },
        { href: "/dashboard/admin/settings", label: "Platform Settings", icon: Settings, roles: ["admin"], hint: "admin settings", },
      ],
    };
  }, [authContextRole]);

  const generalSettingsNavItemsGroup: NavItem = useMemo(() => ({
    label: "General Settings",
    icon: Settings2,
    roles: ["owner", "staff", "admin", "user"],
    staffRoles: ["Manager", "Biller", "Custom"], // Staff who can see general settings
    hint: "App and Profile Settings",
    isGroup: true,
    isTopLevel: true,
    children: [
      { href: "/dashboard/profile", label: "My Profile", icon: ChefHat, roles: ["owner", "staff", "user", "admin"], hint: "user profile", },
      { 
        href: "/dashboard/settings/theme", 
        label: "Theme & Branding", 
        icon: Settings, 
        roles: ["owner", "admin"],
        hint: "theme settings", 
      },
    ],
  }), []);

  const desktopNavItems = useMemo((): NavItem[] => {
    if (authContextRole === 'staff' && authContextStaffRole === 'Waiter') return []; // Waiters have no dashboard sidebar

    let items: NavItem[] = [...baseNavItems];
    
    const restaurantOpsItems = getRestaurantOperationNavItems(selectedRestaurantId, user?.staffPermissions, authContextStaffRole);
    items = [...items, ...restaurantOpsItems];
    
    const inventoryGroup = getInventoryNavItemsGroup(selectedRestaurantId, user?.staffPermissions, authContextStaffRole);
    if (inventoryGroup && inventoryGroup.children && inventoryGroup.children.length > 0) items.push(inventoryGroup);
    
    const restaurantMgmtGroup = getRestaurantManagementNavItemsGroup(selectedRestaurantId);
    if (restaurantMgmtGroup && restaurantMgmtGroup.children && restaurantMgmtGroup.children.length > 0) items.push(restaurantMgmtGroup);
    
    if (platformAdminNavItemsGroup && platformAdminNavItemsGroup.children && platformAdminNavItemsGroup.children.length > 0) items.push(platformAdminNavItemsGroup);

    const filteredGeneralSettingsChildren = generalSettingsNavItemsGroup.children?.filter(child => {
        if (!authContextRole || !child.roles.includes(authContextRole)) return false;
        if (authContextRole === 'staff' && authContextStaffRole && child.staffRoles && !child.staffRoles.includes(authContextStaffRole)) return false;
        if (authContextRole === 'staff' && child.staffPermissionKey && user?.staffPermissions) {
            return user.staffPermissions[child.staffPermissionKey];
        }
        return true;
    });
    
    if(filteredGeneralSettingsChildren && filteredGeneralSettingsChildren.length > 0) {
        const generalGroupToAdd = {...generalSettingsNavItemsGroup, children: filteredGeneralSettingsChildren};
        if (authContextRole === 'staff' && authContextStaffRole && generalGroupToAdd.staffRoles && !generalGroupToAdd.staffRoles.includes(authContextStaffRole)){
           // Don't add general settings group if staff role doesn't permit
        } else {
            items.push(generalGroupToAdd);
        }
    }
    
    return items.filter(item => { // Final top-level filter
        if(!item) return false;
        if (!authContextRole || !item.roles.includes(authContextRole)) return false;
        if (authContextRole === 'staff' && authContextStaffRole && item.staffRoles && !item.staffRoles.includes(authContextStaffRole)) return false;
        if (authContextRole === 'staff' && item.staffPermissionKey && user?.staffPermissions) {
            return user.staffPermissions[item.staffPermissionKey];
        }
        return true;
    });
  }, [authContextRole, authContextStaffRole, selectedRestaurantId, user?.staffPermissions, baseNavItems, getRestaurantOperationNavItems, getInventoryNavItemsGroup, getRestaurantManagementNavItemsGroup, platformAdminNavItemsGroup, generalSettingsNavItemsGroup]);


  if (
    initialLoading ||
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
    (authContextRole === "owner" && user.onboardingComplete === false) ||
    (authContextRole === 'staff' && authContextStaffRole === 'Waiter') // Waiters are redirected, show loading until then
  ) {
    return <AppLoadingScreen message="Preparing your space..." />;
  }


  const bottomNavLinks: BottomNavItem[] = [
    { href: "/dashboard", label: "Home", icon: LayoutDashboard, hint: "dashboard home", },
    ...(selectedRestaurantId ? [
        ...( (authContextRole === "owner" || (authContextRole === 'staff' && user?.staffPermissions?.canManageMenu && authContextStaffRole !== 'Waiter')) ? [{ href: `/dashboard/menu-management/${selectedRestaurantId}`, label: "Menu", icon: BookCopy, hint: "manage menu", }] : []),
        ...( (authContextRole === "owner" || (authContextRole === 'staff' && user?.staffPermissions?.canManageAllOrders && authContextStaffRole !== 'Waiter')) ? [{ href: `/dashboard/orders/${selectedRestaurantId}`, label: "Orders", icon: ListOrdered, hint: "view orders", }] : []),
        ...( (authContextRole === "owner" || (authContextRole === 'staff' && (user?.staffPermissions?.canManageInventoryItems || user?.staffPermissions?.canViewInventoryReports) && authContextStaffRole !== 'Waiter')) ? [{ href: `/dashboard/inventory/${selectedRestaurantId}/dashboard`, label: "Inventory", icon: Archive, hint: "inventory", }] : []),
        ...( (authContextRole === "owner" || (authContextRole === 'staff' && user?.staffPermissions?.canAccessSettings && authContextStaffRole !== 'Waiter')) ? [{ href: `/dashboard/restaurant/${selectedRestaurantId}/settings`, label: "Settings", icon: Settings, hint: "specific settings", }] : []),
      ] : []),
    ...(authContextRole === "admin" ? [{ href: "/dashboard/admin/users", label: "Users", icon: Users, hint: "all users", }] : []),
  ];

  const selectedRestaurantName = currentRestaurantDetails?.name || "Select Restaurant";

  const getFilteredNavItems = (
    items: NavItem[],
    currentRole: UserRole | null,
    currentStaffRoleP?: StaffRole | null,
    permissions?: StaffPermissions | null
  ): NavItem[] => {
    if (!currentRole) return [];
    return items
      .filter((item): item is NavItem => { 
        if (!item || !item.roles || !Array.isArray(item.roles)) { 
          console.warn("Sidebar: NavItem missing or has invalid 'roles' array:", item?.label || 'Unknown Item');
          return false;
        }
        if (!item.roles.includes(currentRole)) {
          return false;
        }
        if (currentRole === 'staff') {
            if (item.staffRoles && currentStaffRoleP && !item.staffRoles.includes(currentStaffRoleP)){
                return false;
            }
            if (item.staffPermissionKey && permissions && !permissions[item.staffPermissionKey]) {
                return false;
            }
        }
        return true;
      })
      .map((item) => ({ 
        ...item,
        children: item.children
          ? getFilteredNavItems(item.children, currentRole, currentStaffRoleP, permissions) 
          : undefined,
      }));
  };

  const renderNavMenu = (items: NavItem[], isSubmenu = false) => {
    const filteredNavItems = getFilteredNavItems(items, authContextRole, authContextStaffRole, user?.staffPermissions);
    if (filteredNavItems.length === 0 && !isSubmenu) { 
        return null;
    }
    return (
      <SidebarMenu
        className={cn(isSubmenu && "pl-4 group-data-[collapsible=icon]:pl-0")}
      >
        {filteredNavItems.map((item) => {
           // Filter out empty groups before rendering
           if (item.isGroup && (!item.children || item.children.length === 0)) {
             return null;
           }
          return (
          <SidebarMenuItem key={item.label + (item.href || "")}>
            {item.isGroup && item.children && item.children.length > 0 ? (
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
                asChild={!!item.href}
                isActive={
                  item.href ? (pathname === item.href ||
                  (item.href &&
                    item.href !== "/dashboard" && 
                    pathname.startsWith(
                      item.href.split("[")[0].replace(/\/(undefined|null)$/, "")
                    ))) : false
                }
                tooltip={{
                  children: item.label,
                  "data-ai-hint": item.hint,
                  side: "right",
                  align: "center",
                }}
                size={isSubmenu ? "sm" : "default"}
                disabled={!item.href && !item.isHeader}
              >
                {item.href ? (
                  <Link
                    href={item.href}
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
                          isSubmenu && "text-sm",
                          item.isHeader && "font-semibold text-muted-foreground"
                        )}
                      >
                        {item.label}
                      </span>
                    </div>
                    {item.badgeCount && item.badgeCount > 0 && (
                      <SidebarMenuBadge>{item.badgeCount}</SidebarMenuBadge>
                    )}
                  </Link>
                ) : (
                  <div className="flex items-center justify-between w-full">
                     <div className="flex items-center gap-2">
                      <item.icon
                        className={cn("h-5 w-5", isSubmenu && "h-4 w-4")}
                      />
                      <span
                        className={cn(
                          "ml-1 group-data-[collapsible=icon]:hidden truncate",
                          isSubmenu && "text-sm",
                          item.isHeader && "font-semibold text-muted-foreground"
                        )}
                      >
                        {item.label}
                      </span>
                    </div>
                     {item.badgeCount && item.badgeCount > 0 && (
                      <SidebarMenuBadge>{item.badgeCount}</SidebarMenuBadge>
                    )}
                  </div>
                )}
              </SidebarMenuButton>
            )}
          </SidebarMenuItem>
          );
        })}
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
                />
                <h1 className="text-2xl font-bold text-sidebar-foreground group-data-[collapsible=icon]:hidden">
                  Potoba
                </h1>
              </Link>
            </SidebarHeader>
            <SidebarContent>
              {(authContextRole === "owner" || (authContextRole === "staff" && authContextStaffRole !== 'Waiter' && selectedRestaurantId)) && (
                <div className="p-2 space-y-2 group-data-[collapsible=icon]:hidden">
                  <div className="flex items-center space-x-2">
                    <Select
                      value={selectedRestaurantId || ""}
                      onValueChange={handleRestaurantChange}
                      disabled={restaurantsLoading || (authContextRole === "owner" && ownedRestaurants.length === 0) || authContextRole === "staff"}
                    >
                      <SelectTrigger className="w-full flex-grow text-xs h-9">
                        <SelectValue placeholder={restaurantsLoading ? "Loading..." : "Select Restaurant..."} />
                      </SelectTrigger>
                      {authContextRole === "owner" && (
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
                      )}
                       {authContextRole === "staff" && currentRestaurantDetails && (
                          <SelectContent>
                            <SelectItem value={currentRestaurantDetails.id} className="text-xs">
                                {currentRestaurantDetails.name}
                            </SelectItem>
                           </SelectContent>
                       )}
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
                  {authContextRole === "owner" && (
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
                  )}
                  <SidebarSeparator className="my-2" />
                </div>
              )}
              {renderNavMenu(desktopNavItems)}
            </SidebarContent>
            <SidebarFooter className="flex p-2 border-t border-sidebar-border">
              <SidebarTrigger className="self-end hidden md:flex mt-2 h-8 w-8 p-0 group-data-[collapsible=icon]:mt-auto">
                <ChevronsLeftRight className="h-4 w-4" />
              </SidebarTrigger>
            </SidebarFooter>
          </Sidebar>
          <SidebarInset>
            <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b bg-background/80 px-4 backdrop-blur-md sm:px-6">
              <div className="flex items-center">
                <SidebarTrigger className="md:hidden" />
                {(authContextRole === "owner" || (authContextRole === "staff" && authContextStaffRole !== 'Waiter')) && selectedRestaurantId && (
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
              />
              <h1 className="text-xl font-bold text-primary">Potoba</h1>
            </Link>
            <div className="flex items-center gap-2">
              {authContextRole === "owner" && (
                <>
                  <Select
                    value={selectedRestaurantId || ""}
                    onValueChange={handleRestaurantChange}
                    disabled={restaurantsLoading || ownedRestaurants.length === 0}
                  >
                    <SelectTrigger className="w-auto h-8 text-xs px-2 py-1 max-w-[110px] truncate">
                      <SelectValue placeholder={restaurantsLoading ? "..." : "Restaurant"} />
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
               {(authContextRole === "staff" && authContextStaffRole !== 'Waiter' && currentRestaurantDetails) && (
                <div className="text-sm font-medium text-foreground truncate max-w-[120px]">
                    {currentRestaurantDetails.name}
                </div>
              )}
              <UserNav />
            </div>
          </header>
          <main className="flex-1 bg-background max-h-[calc(100dvh-theme(spacing.16)-theme(spacing.16))] overflow-y-auto p-4 pt-6 ">
            {children}
          </main>
          <BottomNavigationBar navItems={getFilteredNavItems(bottomNavLinks, authContextRole, authContextStaffRole, user?.staffPermissions)} />
        </div>
      )}
      <PWAInstaller />
    </>
  );
}
