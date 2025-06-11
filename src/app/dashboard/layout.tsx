
// src/app/dashboard/layout.tsx
"use client";

import { useEffect, type ReactNode, useState, useCallback, useMemo } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { useAuth, type StaffPermissions, type StaffRole } from "@/lib/auth/context";
import { isStaffRole, STAFF_ROLES_ARRAY, UserRole } from '@/types'; // Import isStaffRole
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
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
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
import { OrderProvider } from "@/contexts/waiter/OrderContext";

interface NavItem {
  href?: string;
  label: string;
  icon: LucideIcon;
  roles: UserRole[]; // Now includes specific StaffRole types
  staffRoles?: StaffRole[]; // Which specific staff roles can see this? (More restrictive)
  staffPermissionKey?: keyof StaffPermissions;
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
    role: authContextRole, // This will be the specific role like 'Waiter', 'Manager' for staff
    staffRole: authContextUserStaffRole, // This is user.staffRole from context, redundant if role is specific
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
  
  useEffect(() => {
    if (!initialLoading && !authContextLoading) {
      if (!user) {
        router.replace("/login");
      } else if (authContextRole === 'Waiter') { // Direct check against specific staff role
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
    } else if (isStaffRole(authContextRole) && user?.restaurantId) { // Check if role is a staff role
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
      roles: ["owner", ...STAFF_ROLES_ARRAY, "admin", "user"], 
      isTopLevel: true,
    },
  ], []);

  const getRestaurantOperationNavItems = useCallback((currentRestaurantId: string | null, currentRole: UserRole | null, permissions?: StaffPermissions | null): NavItem[] => {
    if (!currentRestaurantId || currentRestaurantId.trim() === "" || currentRole === 'Waiter') {
      return [];
    }
    const items: NavItem[] = [
      {
        href: `/dashboard/menu-management/${currentRestaurantId}`,
        label: "Menu Management",
        icon: BookCopy,
        roles: ["owner", ...STAFF_ROLES_ARRAY],
        staffPermissionKey: "canManageMenu",
        staffRoles: ["Manager", "Custom"], 
        hint: "manage menu",
        isTopLevel: true,
      },
      {
        href: `/dashboard/orders/${currentRestaurantId}`,
        label: "Order Management",
        icon: ListOrdered,
        roles: ["owner", ...STAFF_ROLES_ARRAY],
        staffPermissionKey: "canManageAllOrders",
        staffRoles: ["Manager", "Biller", "Custom"],
        hint: "view orders",
        isTopLevel: true,
      },
      {
        href: `/dashboard/restaurant/${currentRestaurantId}/kitchen`,
        label: "KOT",
        icon: CookingPot,
        roles: ["owner", ...STAFF_ROLES_ARRAY], 
        staffPermissionKey: "canViewKitchenOrders",
        staffRoles: ["Manager", "KitchenStaff", "Custom"],
        hint: "kitchen order tickets",
        isTopLevel: true,
      },
    ];
    if (currentRole === 'owner' || (isStaffRole(currentRole) && permissions?.canManageTables && currentRole !== 'Waiter')) {
      items.push({ 
        href: `/dashboard/table-management/${currentRestaurantId}`,
        label: "Table Management",
        icon: TableIconLucide,
        roles: ["owner", ...STAFF_ROLES_ARRAY],
        staffPermissionKey: "canManageTables",
        staffRoles: ["Manager", "Custom"], // Waiter gets this via /waiter route
        hint: "manage tables",
        isTopLevel: true,
      });
    }
    return items;
  }, []);

  const getInventoryNavItemsGroup = useCallback((currentRestaurantId: string | null, currentRole: UserRole | null, permissions?: StaffPermissions | null): NavItem | null => {
    if (!currentRestaurantId || currentRestaurantId.trim() === "" || currentRole === 'Waiter') {
      return null;
    }
    const canAccessAnyInventory = currentRole === 'owner' || 
      (isStaffRole(currentRole) && permissions && 
        (permissions.canManageInventoryItems || permissions.canViewInventoryReports || permissions.canRecordStockIn || permissions.canRecordStockOut)
      );
    if (!canAccessAnyInventory) return null;

    return {
        label: "Inventory",
        icon: Archive,
        roles: ["owner", ...STAFF_ROLES_ARRAY],
        staffRoles: ["Manager", "KitchenStaff", "Biller", "Custom"],
        hint: "Manage restaurant inventory",
        isGroup: true,
        isTopLevel: true,
        children: [
          {
            href: `/dashboard/inventory/${currentRestaurantId}/dashboard`,
            label: "Overview",
            icon: BarChart3,
            roles: ["owner", ...STAFF_ROLES_ARRAY],
            staffPermissionKey: "canViewInventoryReports",
            staffRoles: ["Manager", "KitchenStaff", "Biller", "Custom"],
            hint: "Inventory overview and KPIs",
          },
          {
            href: `/dashboard/inventory/${currentRestaurantId}`,
            label: "Stock List",
            icon: List,
            roles: ["owner", ...STAFF_ROLES_ARRAY],
            staffPermissionKey: "canManageInventoryItems",
            staffRoles: ["Manager", "KitchenStaff", "Custom"],
            hint: "View and manage all stock items",
          },
          {
            href: `/dashboard/inventory/${currentRestaurantId}/stock-in`,
            label: "Stock In",
            icon: PackagePlus,
            roles: ["owner", ...STAFF_ROLES_ARRAY],
            staffPermissionKey: "canRecordStockIn",
            staffRoles: ["Manager", "KitchenStaff", "Custom"],
            hint: "Record incoming stock",
          },
          {
            href: `/dashboard/inventory/${currentRestaurantId}/stock-out`,
            label: "Stock Out",
            icon: PackageMinus,
            roles: ["owner", ...STAFF_ROLES_ARRAY],
            staffPermissionKey: "canRecordStockOut",
            staffRoles: ["Manager", "KitchenStaff", "Custom"],
            hint: "Record stock outflow",
          },
          {
             href: `/dashboard/inventory/${currentRestaurantId}/wastage`,
            label: "Wastage",
            icon: Trash2,
            roles: ["owner", ...STAFF_ROLES_ARRAY],
            staffPermissionKey: "canRecordStockOut", 
            staffRoles: ["Manager", "KitchenStaff", "Custom"],
            hint: "Log wasted or spoiled items",
          },
        ]
      };
  }, []);

  const getRestaurantManagementNavItemsGroup = useCallback((currentRestaurantId: string | null, currentRole: UserRole | null): NavItem | null => {
    if (!currentRestaurantId || currentRestaurantId.trim() === "" || currentRole !== 'owner') { 
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
          staffPermissionKey: "canManageStaff", // Only owner or manager with this perm should see
          hint: "manage staff",
        },
        {
          href: `/dashboard/restaurant/${currentRestaurantId}/settings`,
          label: "Restaurant Settings",
          icon: Settings,
          roles: ["owner"],
          staffPermissionKey: "canEditRestaurantSettings", // Only owner or manager with this perm
          hint: "specific settings",
        },
      ]
    };
  }, []);

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
    roles: ["owner", ...STAFF_ROLES_ARRAY, "admin", "user"],
    staffRoles: ["Manager", "Biller", "Custom"], 
    hint: "App and Profile Settings",
    isGroup: true,
    isTopLevel: true,
    children: [
      { href: "/dashboard/profile", label: "My Profile", icon: ChefHat, roles: ["owner", ...STAFF_ROLES_ARRAY, "user", "admin"], hint: "user profile", },
      { 
        href: "/dashboard/settings/theme", 
        label: "Theme & Branding", 
        icon: Settings, 
        roles: ["owner", "admin"], 
        staffPermissionKey: "canEditRestaurantSettings", // Also allow managers with this perm
        staffRoles: ["Manager", "Custom"],
        hint: "theme settings", 
      },
    ],
  }), []);

  const desktopNavItems = useMemo((): NavItem[] => {
    if (authContextRole === 'Waiter') return []; 

    let items: NavItem[] = [...baseNavItems];
    
    const restaurantOpsItems = getRestaurantOperationNavItems(selectedRestaurantId, authContextRole, user?.staffPermissions);
    items = [...items, ...restaurantOpsItems];
    
    const inventoryGroup = getInventoryNavItemsGroup(selectedRestaurantId, authContextRole, user?.staffPermissions);
    if (inventoryGroup && inventoryGroup.children && inventoryGroup.children.length > 0) items.push(inventoryGroup);
    
    const restaurantMgmtGroup = getRestaurantManagementNavItemsGroup(selectedRestaurantId, authContextRole);
    if (restaurantMgmtGroup && restaurantMgmtGroup.children && restaurantMgmtGroup.children.length > 0) items.push(restaurantMgmtGroup);
    
    if (platformAdminNavItemsGroup && platformAdminNavItemsGroup.children && platformAdminNavItemsGroup.children.length > 0) items.push(platformAdminNavItemsGroup);

    if (generalSettingsNavItemsGroup.children && generalSettingsNavItemsGroup.children.length > 0) {
        items.push(generalSettingsNavItemsGroup);
    }
    
    return items;
  }, [authContextRole, selectedRestaurantId, user?.staffPermissions, baseNavItems, getRestaurantOperationNavItems, getInventoryNavItemsGroup, getRestaurantManagementNavItemsGroup, platformAdminNavItemsGroup, generalSettingsNavItemsGroup]);


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
    (authContextRole === 'Waiter') 
  ) {
    return <AppLoadingScreen message="Preparing your space..." />;
  }


  const bottomNavLinks: BottomNavItem[] = [
    { href: "/dashboard", label: "Home", icon: LayoutDashboard, hint: "dashboard home", },
    ...(selectedRestaurantId ? [
        ...( (authContextRole === "owner" || (isStaffRole(authContextRole) && user?.staffPermissions?.canManageMenu && authContextRole !== 'Waiter')) ? [{ href: `/dashboard/menu-management/${selectedRestaurantId}`, label: "Menu", icon: BookCopy, hint: "manage menu", }] : []),
        ...( (authContextRole === "owner" || (isStaffRole(authContextRole) && user?.staffPermissions?.canManageAllOrders && authContextRole !== 'Waiter')) ? [{ href: `/dashboard/orders/${selectedRestaurantId}`, label: "Orders", icon: ListOrdered, hint: "view orders", }] : []),
        ...( (authContextRole === "owner" || (isStaffRole(authContextRole) && (user?.staffPermissions?.canManageInventoryItems || user?.staffPermissions?.canViewInventoryReports) && authContextRole !== 'Waiter')) ? [{ href: `/dashboard/inventory/${selectedRestaurantId}/dashboard`, label: "Inventory", icon: Archive, hint: "inventory", }] : []),
        ...( (authContextRole === "owner" || (isStaffRole(authContextRole) && user?.staffPermissions?.canEditRestaurantSettings && authContextRole !== 'Waiter')) ? [{ href: `/dashboard/restaurant/${selectedRestaurantId}/settings`, label: "Settings", icon: Settings, hint: "specific settings", }] : []),
      ] : []),
    ...(authContextRole === "admin" ? [{ href: "/dashboard/admin/users", label: "Users", icon: Users, hint: "all users", }] : []),
  ];

  const selectedRestaurantName = currentRestaurantDetails?.name || "Select Restaurant";

  const getFilteredNavItems = (
    items: NavItem[],
    currentRole: UserRole | null,
    currentStaffSpecificRole: StaffRole | null, 
    permissions?: StaffPermissions | null
  ): NavItem[] => {
    if (!currentRole) return [];

    return items
      .filter((item): item is NavItem => {
        if (!item || !item.roles || !Array.isArray(item.roles)) {
          console.warn("Sidebar: NavItem missing or has invalid 'roles' array:", item?.label || 'Unknown Item');
          return false;
        }
        
        const isGenerallyVisibleForRole = item.roles.includes(currentRole);
        
        if (!isGenerallyVisibleForRole) return false; // If not for this general role, hide.

        // If the user is a staff member (e.g. 'Manager', 'Waiter'), apply staff-specific checks
        if (isStaffRole(currentRole)) {
          // Check 1: Is the item restricted to specific staffRoles?
          if (item.staffRoles && Array.isArray(item.staffRoles) && item.staffRoles.length > 0) {
            if (!currentStaffSpecificRole || !item.staffRoles.includes(currentStaffSpecificRole)) {
              // console.log(`Hiding (staffRole mismatch): ${item.label} for ${currentStaffSpecificRole}. Required: ${item.staffRoles.join(', ')}`);
              return false; // User's specific staff role is not in the allowed list for this item
            }
          }
          // Check 2: Does the item require a specific permission?
          if (item.staffPermissionKey) {
            if (!permissions || !permissions[item.staffPermissionKey]) {
              // console.log(`Hiding (permission_denied): ${item.label} for ${currentStaffSpecificRole}. Required perm: ${item.staffPermissionKey}`);
              return false; // Staff member does not have the required permission
            }
          }
          // If neither staffRoles nor staffPermissionKey is defined, but item.roles includes 'staff', it's a general staff item.
          // Or, if checks passed, it's visible.
          // console.log(`Showing (passed staff checks): ${item.label} for ${currentStaffSpecificRole}`);
          return true; 
        }
        // If not staff (e.g. owner, admin, user), and general role match was true, show it.
        // console.log(`Showing (non-staff role match): ${item.label} for ${currentRole}`);
        return true; 
      })
      .map((item) => {
        const filteredChildren = item.children
          ? getFilteredNavItems(item.children, currentRole, currentStaffSpecificRole, permissions)
          : undefined;
        
        // If it's a group and all its children are filtered out, don't render the group header
        if (item.isGroup && (!filteredChildren || filteredChildren.length === 0)) {
          return null; 
        }
        return { ...item, children: filteredChildren };
      })
      .filter(item => item !== null) as NavItem[]; 
  };
  
  let navItemsToRender: NavItem[] = [];
  if (user) {
    navItemsToRender = getFilteredNavItems(desktopNavItems, authContextRole, authContextUserStaffRole, user.staffPermissions);
  }


  const renderNavMenu = (items: NavItem[], isSubmenu = false) => {
    return (
      <SidebarMenu
        className={cn(isSubmenu && "pl-4 group-data-[collapsible=icon]:pl-0")}
      >
        {items.map((item) => {
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
                    variant="default" // Changed from ghost to default for better visibility
                    className="justify-between w-full bg-sidebar-background hover:bg-sidebar-accent focus:bg-sidebar-accent data-[state=open]:bg-sidebar-accent"
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
                variant="default" // Make top-level items also use default variant
                className="bg-sidebar-background hover:bg-sidebar-accent focus:bg-sidebar-accent data-[active=true]:bg-sidebar-primary data-[active=true]:text-sidebar-primary-foreground"
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
      <OrderProvider> {/* Moved OrderProvider here to wrap the entire layout content */}
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
                {(authContextRole === "owner" || (isStaffRole(authContextRole) && authContextRole !== 'Waiter' && selectedRestaurantId)) && (
                  <div className="p-2 space-y-2 group-data-[collapsible=icon]:hidden">
                    <div className="flex items-center space-x-2">
                      <Select
                        value={selectedRestaurantId || ""}
                        onValueChange={handleRestaurantChange}
                        disabled={restaurantsLoading || (authContextRole === "owner" && ownedRestaurants.length === 0) || isStaffRole(authContextRole)}
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
                         {isStaffRole(authContextRole) && currentRestaurantDetails && (
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
                {renderNavMenu(navItemsToRender)}
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
                  {(authContextRole === "owner" || (isStaffRole(authContextRole) && authContextRole !== 'Waiter')) && selectedRestaurantId && (
                    <div className="ml-4 text-sm font-medium text-foreground">
                      {selectedRestaurantName}
                      {isStaffRole(authContextRole) && authContextRole !== 'owner' && <span className="text-xs text-muted-foreground ml-2">({authContextRole} View)</span>}
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
                 {(isStaffRole(authContextRole) && authContextRole !== 'Waiter' && currentRestaurantDetails) && (
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
            <BottomNavigationBar navItems={getFilteredNavItems(bottomNavLinks, authContextRole, authContextUserStaffRole, user?.staffPermissions)} />
          </div>
        )}
      </OrderProvider>
      <PWAInstaller />
    </>
  );
}
