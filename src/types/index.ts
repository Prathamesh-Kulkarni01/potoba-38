
import type { User as FirebaseUser } from 'firebase/auth';
import type { Timestamp } from 'firebase/firestore';

export type UserRole = 'admin' | 'user' | 'owner' | 'staff' | 'kitchen';

// Define more granular staff roles
export type StaffRole = 'Manager' | 'Waiter' | 'KitchenStaff' | 'Biller' | 'Custom';

export const STAFF_ROLES_ARRAY: StaffRole[] = ['Manager', 'Waiter', 'KitchenStaff', 'Biller', 'Custom'];

export interface StaffPermissions {
  canViewDashboardInsights?: boolean; // General dashboard access
  canManageAllOrders?: boolean;      // Full order management (edit, cancel any)
  canTakeTableOrders?: boolean;    // Waiter specific: create/modify orders for assigned tables
  canSettleBills?: boolean;        // Biller/Manager: mark orders as paid
  canManageMenu?: boolean;         // Add/edit/delete menu items, categories
  canManageTables?: boolean;       // Configure table layout, status
  canManageInventoryItems?: boolean; // Add/edit inventory items
  canRecordStockIn?: boolean;      // Record purchases/stock received
  canRecordStockOut?: boolean;     // Record wastage/adjustments out
  canViewInventoryReports?: boolean;
  canAccessSettings?: boolean;     // Access general restaurant settings
  canManageStaff?: boolean;        // Invite, edit roles/permissions of other staff (Manager only)
  canViewFinancialReports?: boolean;
  canViewKitchenOrders?: boolean;  // For KOT display
}

export const DEFAULT_PERMISSIONS_BY_ROLE: Record<StaffRole, StaffPermissions> = {
  Manager: {
    canViewDashboardInsights: true,
    canManageAllOrders: true,
    canTakeTableOrders: true,
    canSettleBills: true,
    canManageMenu: true,
    canManageTables: true,
    canManageInventoryItems: true,
    canRecordStockIn: true,
    canRecordStockOut: true,
    canViewInventoryReports: true,
    canAccessSettings: true,
    canManageStaff: true,
    canViewFinancialReports: true,
    canViewKitchenOrders: true,
  },
  Waiter: {
    canViewDashboardInsights: false,
    canManageAllOrders: false, // They manage their orders, not all.
    canTakeTableOrders: true,
    canSettleBills: false, // Typically manager or biller
    canManageMenu: false,
    canManageTables: false, // Usually view, not manage layout
    canManageInventoryItems: false,
    canRecordStockIn: false,
    canRecordStockOut: false,
    canViewInventoryReports: false,
    canAccessSettings: false,
    canManageStaff: false,
    canViewFinancialReports: false,
    canViewKitchenOrders: true, // May need to see status of their orders
  },
  KitchenStaff: {
    canViewDashboardInsights: false,
    canManageAllOrders: false,
    canTakeTableOrders: false,
    canSettleBills: false,
    canManageMenu: false,
    canManageTables: false,
    canManageInventoryItems: true, // Might update stock for used items if granular
    canRecordStockIn: false, // Usually not
    canRecordStockOut: true, // For wastage directly from kitchen
    canViewInventoryReports: false,
    canAccessSettings: false,
    canManageStaff: false,
    canViewFinancialReports: false,
    canViewKitchenOrders: true,
  },
  Biller: {
    canViewDashboardInsights: true,
    canManageAllOrders: true, // To view and settle
    canTakeTableOrders: false,
    canSettleBills: true,
    canManageMenu: false,
    canManageTables: false,
    canManageInventoryItems: false,
    canRecordStockIn: false,
    canRecordStockOut: false,
    canViewInventoryReports: true, // For end of day reconciliation
    canAccessSettings: false,
    canManageStaff: false,
    canViewFinancialReports: true,
    canViewKitchenOrders: false,
  },
  Custom: { // Default custom role starts with minimal permissions
    canViewDashboardInsights: false,
    canManageAllOrders: false,
    canTakeTableOrders: false,
    canSettleBills: false,
    canManageMenu: false,
    canManageTables: false,
    canManageInventoryItems: false,
    canRecordStockIn: false,
    canRecordStockOut: false,
    canViewInventoryReports: false,
    canAccessSettings: false,
    canManageStaff: false,
    canViewFinancialReports: false,
    canViewKitchenOrders: false,
  },
};

// Base minimal permissions if no role/custom setup is explicitly defined yet
export const defaultStaffPermissions: StaffPermissions = {
  ...DEFAULT_PERMISSIONS_BY_ROLE.Custom, // Start with the most restrictive
};


export interface AuthUser extends FirebaseUser {
  role: UserRole | null;
  staffRole?: StaffRole | null; // Added staffRole
  restaurantId: string | null;
  onboardingComplete: boolean;
  isAnonymous: boolean;
  phoneNumber: string | null;
  staffPermissions?: StaffPermissions;
}

export interface UserProfile {
  uid: string;
  email: string | null;
  role: UserRole;
  staffRole?: StaffRole | null; // Added staffRole
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
  outletType: OutletType; // Made mandatory
  createdAt: Timestamp;
  updatedAt: Timestamp;
  subscriptionPlan?: string;
  stripeCustomerId?: string;
  subscriptionStatus?: 'active' | 'inactive' | 'trialing';
  taxRate?: number; // This might become less relevant if using flexible TaxConfig
  settings?: {
    onlineOrderingEnabled?: boolean;
    tableReservationsEnabled?: boolean;
    notificationEmail?: string;
    customDomain?: string | null;
  };
  taxes?: TaxConfig[]; // For flexible tax configurations
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
  price: number; // This is the price FOR this specific option of this variant.
                // E.g., Small=$5, Medium=$7. NOT a price *adjustment*.
}

export interface MenuItemVariant {
  name: string; // e.g., "Size", "Spice Level"
  options: MenuItemVariantOption[]; // e.g., [{name: "Small", price: 5}, {name: "Medium", price: 7}]
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
  inventoryItemName: string; // Denormalized for easier display in forms
  quantityUsed: number;
  unitOfMeasureUsed: UnitOfMeasure;
}

export interface MenuItem {
  id: string; // Document ID
  itemIdString: string; // This is the actual unique string ID for the item, often same as id.
  restaurantId: string;
  categoryId: string;
  subcategoryId?: string | null; // Keep optional
  name:string;
  description: string;
  price: number; // Base price if no variants, or price of default variant
  imageUrl?: string | null;
  videoUrl?: string | null;
  availability: boolean;
  dietaryTags?: string[];
  allergenInfo?: string[];
  order: number;
  calories?: number | null;
  crossSellItems?: string[]; // Array of MenuItem IDs
  upsellItems?: string[];   // Array of MenuItem IDs
  variants?: MenuItemVariant[];
  availabilitySchedule?: AvailabilityRule[];
  recipeIngredients?: RecipeIngredientItem[];
  isVegetarian?: boolean | null;
  currency?: string | null;
  portionSize?: string | null;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  taxOverrides?: TaxConfig[]; // Item-specific tax overrides
}


export type TableStatus = 'available' | 'occupied' | 'reserved' | 'needs_cleaning';

export interface Table {
  id: string; // Firestore document ID
  restaurantId: string;
  tableDocId: string; // Explicitly storing the doc ID here
  tableNumber: string;
  capacity: number;
  status: TableStatus;
  qrCodeValue: string;
  currentOrderIds?: string[]; // IDs of active orders associated with this table
  createdAt: string; // ISO string
  updatedAt: string; // ISO string
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

export interface OrderItem {
  menuItemId: string;
  menuItemName: string;
  quantity: number;
  unitPrice: number; // Price of the item *at the time of order* (could be variant price)
  totalPrice: number; // quantity * unitPrice
  variantChoices?: { variantName: string; optionName: string; optionPrice: number }[]; // Price here is the option's specific price
  notes?: string;
  categoryId?: string; // For tax calculation
  taxOverrides?: TaxConfig[]; // For tax calculation
}

export interface Order {
  id: string;
  restaurantId: string;
  userId?: string | null; // UID of the customer or staff who placed it
  tableId?: string | null;
  tableNumber?: string | null;
  items: OrderItem[];
  subtotal: number;
  taxAmount?: number;
  serviceCharge?: number; // Example additional charge
  discountAmount?: number;
  totalAmount: number;
  status: OrderStatus;
  customerName?: string | null; // If provided
  customerPhoneNumber?: string | null;
  customerWhatsapp?: string | null; // Optional for WA notifications
  customerNotes?: string;
  kitchenNotes?: string;
  paymentMethod?: string;
  transactionId?: string; // From payment gateway
  groupId?: string | null; // For group orders
  createdAt: Timestamp;
  updatedAt: Timestamp;
  taxBreakup?: { taxId: string; name: string; amount: number; rate: number; }[];
}

// For client-side usage where Timestamps are converted to strings for serializability
export interface ClientOrder extends Omit<Order, 'createdAt' | 'updatedAt' | 'userId' | 'groupId'> {
  createdAt: string;
  updatedAt: string;
  userId?: string;
  groupId?: string;
}


export interface GroupCartItem extends OrderItem {
  addedByUid: string; // UID of the user who added the item
  addedByName?: string; // Display name of the user
}

export interface TableGroupMember {
  uid: string | null; // UID for registered users, null/temp for guests
  name: string;
  phone?: string | null; // Optional phone for contact/identification
}

export interface TableGroup {
  id: string; // The 4-digit group code, also document ID
  restaurantId: string;
  tableId: string;
  tableNumber: string;
  creatorName: string;
  creatorPhone: string;
  creatorUid?: string | null; // UID if the creator is a registered user
  members: TableGroupMember[];
  status: 'active' | 'ordering' | 'locked' | 'ordered' | 'closed'; // 'ordering' could be a sub-state of active
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

// --- Inventory Types ---
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
  costPerUnit?: number | null; // Average or Last Purchase Cost
  unitConversionNotes?: string | null; // e.g., "1 case = 24 units"
  lastStockUpdatedAt: Timestamp;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export type StockTransactionType =
  | 'purchase'            // Stock in
  | 'sale_usage'          // Stock out (linked to an order)
  | 'wastage'             // Stock out
  | 'adjustment_in'       // Stock in (manual correction)
  | 'adjustment_out'      // Stock out (manual correction)
  | 'initial_stock'       // Stock in (when item is first created)
  | 'transfer_in'         // Stock in (from another location/outlet)
  | 'transfer_out'        // Stock out (to another location/outlet)
  | 'internal_consumption'; // Stock out (e.g., staff meals, samples)


export interface StockTransaction {
  id: string;
  restaurantId: string;
  inventoryItemId: string;
  inventoryItemName: string; // Denormalized for easier display
  transactionType: StockTransactionType;
  quantity: number; // Positive for stock-in, negative for stock-out
  unitOfMeasure: UnitOfMeasure;
  transactionDate: Timestamp;
  costPerUnitAtTransaction?: number | null; // Cost at the time of this transaction
  notes?: string | null;
  supplierName?: string | null; // For purchase transactions
  invoiceNumber?: string | null; // For purchase transactions
  batchNumber?: string | null; // For traceability
  expiryDate?: Timestamp | null; // For perishable items
  paymentMode?: string | null; // For purchase transactions
  relatedOrderId?: string | null; // If stock out due to a sale
  relatedPurchaseId?: string | null; // If this is linked to a larger purchase order (future use)
  userId?: string | null; // User who performed/authorized the transaction
}


export interface DailyStockSummary {
  stockInQuantity: number;
  stockOutQuantity: number;
  wastageQuantity: number;
}

export interface StaffInvitation {
  id: string;
  restaurantId: string;
  email: string; // Should be stored in lowercase for case-insensitive matching
  role: 'staff'; // Fixed for staff invitations
  staffRole?: StaffRole; // Specific role like Manager, Waiter
  status: 'pending' | 'accepted' | 'declined' | 'expired';
  invitedBy: string; // UID of the owner who sent the invitation
  createdAt: Timestamp;
  acceptedAt?: Timestamp;
  acceptedByUid?: string; // UID of the user who accepted
  permissions?: StaffPermissions; // Permissions assigned at invitation
}
