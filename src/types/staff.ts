import type { Timestamp } from 'firebase/firestore';

// Define more granular staff roles
export type StaffRole = 'Manager' | 'Waiter' | 'KitchenStaff' | 'Biller' | 'Custom';
export const STAFF_ROLES_ARRAY: StaffRole[] = ['Manager', 'Waiter', 'KitchenStaff', 'Biller', 'Custom'];

// UserRole now includes specific StaffRoles
export type UserRole = 'admin' | 'user' | 'owner' | StaffRole;

export const isStaffRole = (role: UserRole | null): role is StaffRole => {
  if (!role) return false;
  return STAFF_ROLES_ARRAY.includes(role as StaffRole);
};

export interface StaffPermissions {
  canViewDashboardInsights?: boolean;
  canManageAllOrders?: boolean;
  canTakeTableOrders?: boolean;
  canSettleBills?: boolean;
  canManageMenu?: boolean;
  canManageTables?: boolean;
  canManageInventoryItems?: boolean;
  canRecordStockIn?: boolean;
  canRecordStockOut?: boolean;
  canViewInventoryReports?: boolean;
  canAccessSettings?: boolean;
  canManageStaff?: boolean;
  canViewFinancialReports?: boolean;
  canViewKitchenOrders?: boolean;
  canEditRestaurantSettings?: boolean;
}

export const DEFAULT_PERMISSIONS_BY_ROLE: Record<StaffRole, StaffPermissions> = {
  Manager: {
    canViewDashboardInsights: true, canManageAllOrders: true, canTakeTableOrders: true,
    canSettleBills: true, canManageMenu: true, canManageTables: true,
    canManageInventoryItems: true, canRecordStockIn: true, canRecordStockOut: true,
    canViewInventoryReports: true, canAccessSettings: true, canManageStaff: true,
    canViewFinancialReports: true, canViewKitchenOrders: true, canEditRestaurantSettings: true,
  },
  Waiter: {
    canViewDashboardInsights: false, canManageAllOrders: true, canTakeTableOrders: true,
    canSettleBills: true, canManageMenu: false, canManageTables: true,
    canManageInventoryItems: false, canRecordStockIn: false, canRecordStockOut: false,
    canViewInventoryReports: false, canAccessSettings: false, canManageStaff: false,
    canViewFinancialReports: false, canViewKitchenOrders: true, canEditRestaurantSettings: false,
  },
  KitchenStaff: {
    canViewDashboardInsights: false, canManageAllOrders: false, canTakeTableOrders: false,
    canSettleBills: false, canManageMenu: false, canManageTables: false,
    canManageInventoryItems: true, canRecordStockIn: true, canRecordStockOut: true,
    canViewInventoryReports: true, canAccessSettings: false, canManageStaff: false,
    canViewFinancialReports: false, canViewKitchenOrders: true, canEditRestaurantSettings: false,
  },
  Biller: {
    canViewDashboardInsights: true, canManageAllOrders: true, canTakeTableOrders: false,
    canSettleBills: true, canManageMenu: false, canManageTables: false,
    canManageInventoryItems: false, canRecordStockIn: false, canRecordStockOut: false,
    canViewInventoryReports: true, canAccessSettings: false, canManageStaff: false,
    canViewFinancialReports: true, canViewKitchenOrders: false, canEditRestaurantSettings: false,
  },
  Custom: { 
    canViewDashboardInsights: false, canManageAllOrders: false, canTakeTableOrders: false,
    canSettleBills: false, canManageMenu: false, canManageTables: false,
    canManageInventoryItems: false, canRecordStockIn: false, canRecordStockOut: false,
    canViewInventoryReports: false, canAccessSettings: false, canManageStaff: false,
    canViewFinancialReports: false, canViewKitchenOrders: false, canEditRestaurantSettings: false,
  },
};

export const defaultStaffPermissions: StaffPermissions = {
  ...DEFAULT_PERMISSIONS_BY_ROLE.Custom,
};

export interface StaffInvitation {
  id: string;
  restaurantId: string;
  email: string; 
  role: StaffRole; 
  staffRole: StaffRole; 
  status: 'pending' | 'accepted' | 'declined' | 'expired';
  invitedBy: string; 
  createdAt: Timestamp;
  acceptedAt?: Timestamp;
  acceptedByUid?: string;
  permissions?: StaffPermissions; 
}

export interface Waiter {
  id: string;
  name: string;
  avatar?: string;
}
