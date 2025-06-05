
import type { User as FirebaseUser } from 'firebase/auth';
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
  canAccessSettings?: boolean; // General restaurant settings
  canManageStaff?: boolean;
  canViewFinancialReports?: boolean;
  canViewKitchenOrders?: boolean; // For KOT display
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

// Base default permissions, typically minimal
export const defaultStaffPermissions: StaffPermissions = {
  ...DEFAULT_PERMISSIONS_BY_ROLE.Custom, // Start with the most restrictive
};


export interface AuthUser extends FirebaseUser {
  role: UserRole | null;
  staffRole?: StaffRole | null; 
  restaurantId: string | null;
  onboardingComplete: boolean;
  staffPermissions?: StaffPermissions;
}

export interface UserProfile {
  uid: string;
  email: string | null;
  role: UserRole; 
  staffRole?: StaffRole | null; 
  restaurantId: string | null;
  onboardingComplete: boolean;
  createdAt: Timestamp;
  phoneNumber: string | null;
  isAnonymous?: boolean;
  staffPermissions?: StaffPermissions;
  displayName?: string | null;
  photoURL?: string | null;
  lastLoginAt?: Timestamp;
  lastActiveAt?: Timestamp;
  status?: 'active' | 'inactive' | 'suspended';
  preferences?: Record<string, any>;
  metadata?: Record<string, any>;
}

export type OutletType =
  | 'restaurant'
  | 'cafe'
  | 'bar'
  | 'restobar'
  | 'qsr'
  | 'bakery'
  | 'food_truck'
  | 'other';

export const outletTypes: { value: OutletType; label: string }[] = [
  { value: 'restaurant', label: 'Restaurant (General)' },
  { value: 'cafe', label: 'Cafe / Coffee Shop' },
  { value: 'bar', label: 'Bar / Pub' },
  { value: 'restobar', label: 'Restobar (Restaurant & Bar)' },
  { value: 'qsr', label: 'Quick Service (QSR) / Fast Food' },
  { value: 'bakery', label: 'Bakery' },
  { value: 'food_truck', label: 'Food Truck' },
  { value: 'other', label: 'Other' },
];

export interface TaxConfig {
  id: string;
  name: string;
  rate: number;
  type: 'percentage' | 'fixed';
  isDefault?: boolean;
  isInclusive?: boolean;
}

export interface RestaurantProfile {
  id: string;
  ownerId: string;
  name: string;
  outletType: OutletType;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  subscriptionPlan?: string;
  stripeCustomerId?: string;
  subscriptionStatus?: 'active' | 'inactive' | 'trialing';
  taxRate?: number;
  settings?: {
    onlineOrderingEnabled?: boolean;
    tableReservationsEnabled?: boolean;
    notificationEmail?: string;
    customDomain?: string | null;
  };
  taxes?: TaxConfig[];
}

export interface MenuCategory {
  id: string;
  restaurantId: string;
  name: string;
  order: number;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  taxOverrides?: TaxConfig[];
}

export interface MenuSubcategory {
  id: string;
  restaurantId: string;
  categoryId: string;
  name: string;
  order: number;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface MenuItemVariantOption {
  name: string;
  price: number;
}

export interface MenuItemVariant {
  name: string;
  options: MenuItemVariantOption[];
}

export interface AvailabilityRule {
  dayOfWeek: 'Mon' | 'Tue' | 'Wed' | 'Thu' | 'Fri' | 'Sat' | 'Sun' | 'Everyday';
  startTime: string; // HH:mm
  endTime: string;   // HH:mm
}

export type UnitOfMeasure = 'kg' | 'g' | 'L' | 'ml' | 'pcs' | 'pack' | 'bottle' | 'can' | 'box' | 'dozen' | 'other';
export const unitsOfMeasure: { value: UnitOfMeasure; label: string }[] = [
  { value: 'kg', label: 'Kilogram (kg)' },
  { value: 'g', label: 'Gram (g)' },
  { value: 'L', label: 'Liter (L)' },
  { value: 'ml', label: 'Milliliter (ml)' },
  { value: 'pcs', label: 'Pieces (pcs)' },
  { value: 'pack', label: 'Pack' },
  { value: 'bottle', label: 'Bottle' },
  { value: 'can', label: 'Can' },
  { value: 'box', label: 'Box' },
  { value: 'dozen', label: 'Dozen' },
  { value: 'other', label: 'Other' },
];

export interface RecipeIngredientItem {
  inventoryItemId: string;
  inventoryItemName: string;
  quantityUsed: number;
  unitOfMeasureUsed: UnitOfMeasure;
}

export interface MenuItem {
  id: string;
  itemIdString: string; 
  restaurantId: string;
  categoryId: string;
  subcategoryId?: string | null;
  name:string;
  description?: string | null; 
  price: number;
  imageUrl?: string | null;
  videoUrl?: string | null;
  availability: boolean;
  dietaryTags?: string[];
  allergenInfo?: string[];
  order: number;
  calories?: number | null;
  crossSellItems?: string[];
  upsellItems?: string[];
  variants?: MenuItemVariant[];
  availabilitySchedule?: AvailabilityRule[];
  recipeIngredients?: RecipeIngredientItem[];
  isVegetarian?: boolean | null;
  currency?: string | null;
  portionSize?: string | null;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  taxOverrides?: TaxConfig[];
  isSpicy?: boolean;
  isGlutenFree?: boolean;
  tags?: string[];
  isAvailable?: boolean; 
}


export type TableStatus = 'available' | 'occupied' | 'reserved' | 'needs_cleaning' | 'paying';

export interface TableArea {
  id: string;
  restaurantId: string;
  name: string;
  order: number; 
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface Table {
  id: string;
  restaurantId: string;
  tableDocId: string; 
  tableNumber: string;
  capacity: number;
  status: TableStatus;
  qrCodeValue: string;
  areaId?: string | null;
  areaName?: string | null; 
  assignedWaiterId?: string | null;
  assignedWaiterName?: string | null;
  lastOrderId?: string | null;
  lastOrderTotal?: number | null;
  lastOrderAt?: Timestamp | string | null; 
  currentOrderIds?: string[];
  createdAt: string; 
  updatedAt: string; 
  name?: string; 
  shape?: 'square' | 'circle' | 'rectangle';
}

export type OrderStatus =
  | 'pending_customer_confirmation'
  | 'pending_kitchen'
  | 'confirmed_by_kitchen'
  | 'preparing'
  | 'ready_for_pickup'
  | 'served'
  | 'payment_pending'
  | 'completed'
  | 'cancelled_by_customer'
  | 'cancelled_by_restaurant';

export type OrderItemStatus = 'pending' | 'sent_to_kitchen' | 'confirmed_by_kitchen' | 'preparing' | 'ready_for_pickup' | 'served' | 'cancelled_by_kitchen' | 'cancelled_by_customer';

export interface OrderItem {
  uniqueId: string; // Client-generated unique ID for this specific instance of the item in the order
  menuItemId: string;
  menuItemName: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  status: OrderItemStatus; // Individual status for this item
  variantChoices?: { variantName: string; optionName: string; optionPrice: number }[] | null;
  instructions?: string | null; // Customer instructions for this item
  notes?: string | null; // Waiter/internal notes for this item
  createdAt: number; // Timestamp (client-generated initially, server-generated on save)
  updatedAt?: number; // Timestamp for last status update of this specific item
  groupId?: string | null;
  imageUrl?: string | null; 
  categoryId?: string | null; 
  taxOverrides?: TaxConfig[] | null; 
  menuItem?: MenuItem; // Reference to full MenuItem, optional, mostly for client-side rendering ease
}

export interface Order {
  id: string;
  restaurantId: string;
  userId?: string | null;
  tableId?: string | null;
  tableNumber?: string | null;
  items: OrderItem[];
  subtotal: number;
  taxAmount?: number;
  serviceCharge?: number;
  discountAmount?: number;
  totalAmount: number;
  status: OrderStatus; // Overall order status, should be derived from item statuses
  customerName?: string | null;
  customerPhoneNumber?: string | null;
  customerWhatsapp?: string | null;
  customerNotes?: string; // Overall order notes from customer
  kitchenNotes?: string; // Overall order notes for kitchen
  paymentMethod?: string;
  transactionId?: string;
  groupId?: string | null;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  taxBreakup?: { taxId: string; name: string; amount: number; rate: number; }[];
}

export interface ClientOrder extends Omit<Order, 'createdAt' | 'updatedAt'> {
  createdAt: string; // ISO string
  updatedAt: string; // ISO string
}


export interface GroupCartItem extends OrderItem {
  addedByUid: string;
  addedByName?: string;
}

export interface TableGroupMember {
  uid: string | null; 
  name: string;
  phone?: string | null; 
}

export interface TableGroup {
  id: string; 
  restaurantId: string;
  tableId: string; 
  tableNumber: string;
  creatorName: string; 
  creatorPhone: string; 
  creatorUid?: string | null; 
  members: TableGroupMember[];
  status: 'active' | 'ordering' | 'locked' | 'ordered' | 'closed'; 
  cartItems: GroupCartItem[];
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface ClientTableGroup extends Omit<TableGroup, 'createdAt' | 'updatedAt'> {
  createdAt: string;
  updatedAt: string;
}


export interface PopularItem {
  menuItemId: string;
  menuItemName: string;
  orderCount: number;
  totalRevenue: number;
}

export type InventoryItemCategory = 'raw_material' | 'semi_finished' | 'finished_good' | 'beverage_alcoholic' | 'beverage_nonalcoholic' | 'packaging' | 'cleaning_supply' | 'other';
export const inventoryItemCategories: { value: InventoryItemCategory; label: string }[] = [
  { value: 'raw_material', label: 'Raw Material (e.g., Flour, Tomato)' },
  { value: 'semi_finished', label: 'Semi-Finished Good (e.g., Pizza Base, Curry Paste)' },
  { value: 'finished_good', label: 'Finished Good (e.g., Canned Drink, Sauce Bottle)' },
  { value: 'beverage_alcoholic', label: 'Beverage - Alcoholic' },
  { value: 'beverage_nonalcoholic', label: 'Beverage - Non-Alcoholic' },
  { value: 'packaging', label: 'Packaging Material' },
  { value: 'cleaning_supply', label: 'Cleaning Supply' },
  { value: 'other', label: 'Other' },
];


export interface SupplierInfo {
  name?: string | null;
  contactPerson?: string | null;
  phone?: string | null;
  email?: string | null;
}

export interface InventoryItem {
  id: string;
  restaurantId: string;
  name: string;
  category: InventoryItemCategory;
  unitOfMeasure: UnitOfMeasure;
  currentStock: number;
  reorderLevel?: number | null;
  supplierInfo?: SupplierInfo | null;
  costPerUnit?: number | null;
  unitConversionNotes?: string | null;
  lastStockUpdatedAt: Timestamp;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export type StockTransactionType =
  | 'purchase'
  | 'sale_usage'
  | 'wastage'
  | 'adjustment_in'
  | 'adjustment_out'
  | 'initial_stock'
  | 'transfer_in'
  | 'transfer_out'
  | 'internal_consumption';


export interface StockTransaction {
  id: string;
  restaurantId: string;
  inventoryItemId: string;
  inventoryItemName: string;
  transactionType: StockTransactionType;
  quantity: number; 
  unitOfMeasure: UnitOfMeasure;
  transactionDate: Timestamp;
  costPerUnitAtTransaction?: number | null;
  notes?: string | null;
  supplierName?: string | null;
  invoiceNumber?: string | null;
  batchNumber?: string | null;
  expiryDate?: Timestamp | null;
  paymentMode?: string | null;
  relatedOrderId?: string | null;
  relatedPurchaseId?: string | null; 
  userId?: string | null; 
}


export interface DailyStockSummary {
  stockInQuantity: number;
  stockOutQuantity: number;
  wastageQuantity: number;
}

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

export interface TipEntry {
  id: string;
  amount: number;
  timestamp: number; 
  tableId?: string | null; 
  notes?: string | null; 
}

export interface HistoricalOrder {
  id: string;
  originalTableId?: string; 
  items: OrderItem[]; 
  completedAt: number; 
  totalAmount: number;
  paymentMethod?: 'cash' | 'card' | 'upi' | 'wallet' | 'other' | null;
  paymentNote?: string | null;
}

export interface ChatMessage {
  id: string;
  user: string;
  text: string;
  timestamp: number;
  avatar?: string; 
  isCurrentUser?: boolean; 
}

export interface SpecialOffer {
  id: string;
  title: string;
  description: string;
  specialPrice?: number;
  discountPercentage?: number;
  applicableItems?: string[]; 
  imageUrl?: string;
  tags?: string[];
  dataAiHint?: string; 
}
