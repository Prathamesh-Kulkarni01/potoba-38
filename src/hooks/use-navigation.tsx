import { useMemo, useCallback } from 'react';
import {
  LayoutDashboard,
  BookCopy,
  ListOrdered,
  CookingPot,
  Archive,
  Store,
  Users,
  Settings,
  Settings2,
  ChefHat,
  ShieldCheck,
  BarChart3,
  List,
  PackagePlus,
  PackageMinus,
  Trash2,
  Briefcase,
  ScanText,
  Table,

} from 'lucide-react';
import { UserRole, StaffRole, isStaffRole, StaffPermissions, STAFF_ROLES_ARRAY } from '@/types';
import { NavItem } from '@/types/navigation';

export const useNavigation = (
  role: UserRole | null,
  staffPermissions: StaffPermissions | null,
  selectedRestaurantId: string | null,
  authContextUserStaffRole: StaffRole | null,
) => {
  const baseNavItems: NavItem[] = useMemo(() => [
    {
      href: "/dashboard",
      label: "Dashboard",
      icon: LayoutDashboard,
      roles: ["owner", ...STAFF_ROLES_ARRAY, "admin", "user"],
      isTopLevel: true,
    },
  ], []);

  const getRestaurantOperationNavItems = useCallback((currentRestaurantId: string | null): NavItem[] => {
    if (!currentRestaurantId || currentRestaurantId?.trim() === "" || role === 'Waiter') {
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
    if (role === 'owner' || (isStaffRole(role) && staffPermissions?.canManageTables )) {
      items.push({
        href: `/dashboard/table-management/${currentRestaurantId}`,
        label: "Table Management",
        icon: Table,
        roles: ["owner", ...STAFF_ROLES_ARRAY],
        staffPermissionKey: "canManageTables",
        staffRoles: ["Manager", "Custom"],
        hint: "manage tables",
        isTopLevel: true,
      });
    }
    return items;
  }, [role, staffPermissions?.canManageTables]);

  const getInventoryNavItemsGroup = useCallback((currentRestaurantId: string | null): NavItem | null => {
    if (!currentRestaurantId || currentRestaurantId?.trim() === "" || role === 'Waiter') {
      return null;
    }
    const canAccessAnyInventory = role === 'owner' ||
      (isStaffRole(role) && staffPermissions &&
        (staffPermissions.canManageInventoryItems || staffPermissions.canViewInventoryReports || staffPermissions.canRecordStockIn || staffPermissions.canRecordStockOut)
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
  }, [role, staffPermissions]);

  const getRestaurantManagementNavItemsGroup = useCallback((currentRestaurantId: string | null): NavItem | null => {
    if (!currentRestaurantId || currentRestaurantId?.trim() === "" || role !== 'owner') {
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
          staffPermissionKey: "canManageStaff",
          hint: "manage staff",
        },
        {
          href: `/dashboard/restaurant/${currentRestaurantId}/settings`,
          label: "Restaurant Settings",
          icon: Settings,
          roles: ["owner"],
          staffPermissionKey: "canEditRestaurantSettings",
          hint: "specific settings",
        },
      ]
    };
  }, [role]);

  const platformAdminNavItemsGroup: NavItem | null = useMemo(() => {
    if (role !== 'admin') return null;
    return {
      label: "Platform Admin",
      icon: ShieldCheck,
      roles: ["admin"],
      hint: "admin section",
      isGroup: true,
      isTopLevel: true,
      children: [
        { href: "/dashboard/admin/users", label: "All Users", icon: Users, roles: ["admin"], hint: "users list" },
        { href: "/dashboard/admin/restaurants", label: "All Restaurants", icon: Store, roles: ["admin"], hint: "platform restaurants" },
        { href: "/dashboard/admin/analytics", label: "Platform Analytics", icon: BarChart3, roles: ["admin"], hint: "admin analytics" },
        { href: "/dashboard/admin/content", label: "Content Moderation", icon: ScanText, roles: ["admin"], hint: "admin content" },
        { href: "/dashboard/admin/settings", label: "Platform Settings", icon: Settings, roles: ["admin"], hint: "admin settings" },
      ],
    };
  }, [role]);

  const generalSettingsNavItemsGroup: NavItem = useMemo(() => ({
    label: "General Settings",
    icon: Settings2,
    roles: ["owner", ...STAFF_ROLES_ARRAY, "admin", "user"],
    staffRoles: ["Manager", "Biller", "Custom"],
    hint: "App and Profile Settings",
    isGroup: true,
    isTopLevel: true,
    children: [
      {
        href: "/dashboard/profile",
        label: "My Profile",
        icon: ChefHat,
        roles: ["owner", ...STAFF_ROLES_ARRAY, "user", "admin"],
        hint: "user profile"
      },
      {
        href: "/dashboard/settings/theme",
        label: "Theme & Branding",
        icon: Settings,
        roles: ["owner", "admin"],
        staffPermissionKey: "canEditRestaurantSettings",
        staffRoles: ["Manager", "Custom"],
        hint: "theme settings"
      },
    ],
  }), []);

  const getFilteredNavItems = useCallback((
    items: NavItem[],
    currentRole: UserRole | null,
    currentStaffSpecificRole: StaffRole | null,
    permissions?: StaffPermissions | null
  ): NavItem[] => {
    if (!currentRole) return [];

    return items
      .filter((item): item is NavItem => {
        if (!item?.roles?.length) {
          console.warn("Sidebar: NavItem missing or has invalid 'roles' array:", item?.label || 'Unknown Item');
          return false;
        }

        const isGenerallyVisibleForRole = item.roles.includes(currentRole);
        if (!isGenerallyVisibleForRole) return false;

        if (isStaffRole(currentRole)) {
          if (item.staffRoles?.length && (!currentStaffSpecificRole || !item.staffRoles.includes(currentStaffSpecificRole))) {
            return false;
          }
          if (item.staffPermissionKey && (!permissions || !permissions[item.staffPermissionKey])) {
            return false;
          }
          return true;
        }
        return true;
      })
      .map((item) => {
        const filteredChildren = item.children
          ? getFilteredNavItems(item.children, currentRole, currentStaffSpecificRole, permissions)
          : undefined;

        if (item.isGroup && (!filteredChildren || filteredChildren.length === 0)) {
          return null;
        }
        return { ...item, children: filteredChildren };
      })
      .filter(Boolean);
  }, []);

  const desktopNavItems = useMemo(() => {
    if (role === 'Waiter') return [];

    let items = [...baseNavItems];
    const restaurantOpsItems = getRestaurantOperationNavItems(selectedRestaurantId);
    items = [...items, ...restaurantOpsItems];

    const inventoryGroup = getInventoryNavItemsGroup(selectedRestaurantId);
    if (inventoryGroup?.children?.length) items.push(inventoryGroup);

    const restaurantMgmtGroup = getRestaurantManagementNavItemsGroup(selectedRestaurantId);
    if (restaurantMgmtGroup?.children?.length) items.push(restaurantMgmtGroup);

    if (platformAdminNavItemsGroup?.children?.length) items.push(platformAdminNavItemsGroup);
    if (generalSettingsNavItemsGroup.children?.length) items.push(generalSettingsNavItemsGroup);

    return items;
  }, [
    role,
    selectedRestaurantId,
    baseNavItems,
    getRestaurantOperationNavItems,
    getInventoryNavItemsGroup,
    getRestaurantManagementNavItemsGroup,
    platformAdminNavItemsGroup,
    generalSettingsNavItemsGroup,
  ]);

  const bottomNavItems = useMemo(() => {
    const items = [
      { href: "/dashboard", label: "Home", icon: LayoutDashboard, hint: "dashboard home" },
      ...(selectedRestaurantId ? [
        ...((role === "owner" || (isStaffRole(role) && staffPermissions?.canManageMenu && role !== 'Waiter')) ? [
          { href: `/dashboard/menu-management/${selectedRestaurantId}`, label: "Menu", icon: BookCopy, hint: "manage menu" }
        ] : []),
        ...((role === "owner" || (isStaffRole(role) && staffPermissions?.canManageAllOrders && role !== 'Waiter')) ? [
          { href: `/dashboard/orders/${selectedRestaurantId}`, label: "Orders", icon: ListOrdered, hint: "view orders" }
        ] : []),
        ...((role === "owner" || (isStaffRole(role) && (staffPermissions?.canManageInventoryItems || staffPermissions?.canViewInventoryReports) && role !== 'Waiter')) ? [
          { href: `/dashboard/inventory/${selectedRestaurantId}/dashboard`, label: "Inventory", icon: Archive, hint: "inventory" }
        ] : []),
        ...((role === "owner" || (isStaffRole(role) && staffPermissions?.canEditRestaurantSettings && role !== 'Waiter')) ? [
          { href: `/dashboard/restaurant/${selectedRestaurantId}/settings`, label: "Settings", icon: Settings, hint: "specific settings" }
        ] : []),
      ] : []),
      ...(role === "admin" ? [{ href: "/dashboard/admin/users", label: "Users", icon: Users, hint: "all users" }] : []),
    ];

    return items;
  }, [role, selectedRestaurantId, staffPermissions]);

  return {
    desktopNavItems,
    bottomNavItems,
    getFilteredNavItems,
  };
};
