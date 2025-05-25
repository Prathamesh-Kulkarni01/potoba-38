
import type { User as FirebaseUser } from 'firebase/auth';
import type { Timestamp } from 'firebase/firestore';

export type UserRole = 'admin' | 'user' | 'owner' | 'staff' | 'kitchen';

export interface StaffPermissions {
  canManageMenu?: boolean;
  canManageOrders?: boolean;
  canManageTables?: boolean;
  canManageInventory?: boolean;
  canAccessSettings?: boolean; // e.g., restaurant-specific settings
}

export interface AuthUser extends FirebaseUser {
  role: UserRole | null;
  restaurantId: string | null;
  onboardingComplete: boolean;
  isAnonymous: boolean;
  phoneNumber: string | null;
  staffPermissions?: StaffPermissions; // Added for staff
}

export interface UserProfile {
  uid: string;
  email: string | null;
  role: UserRole;
  restaurantId: string | null;
  onboardingComplete: boolean;
  createdAt: Timestamp;
  phoneNumber: string | null;
  isAnonymous?: boolean;
  staffPermissions?: StaffPermissions; // Added for staff
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
  outletType?: OutletType;
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
  startTime: string;
  endTime: string;
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
  description: string;
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
}

export type TableStatus = 'available' | 'occupied' | 'reserved' | 'needs_cleaning';

export interface Table {
  id: string;
  restaurantId: string;
  tableDocId: string;
  tableNumber: string;
  capacity: number;
  status: TableStatus;
  qrCodeValue: string;
  currentOrderIds?: string[];
  createdAt: string; // Changed to string for client components
  updatedAt: string; // Changed to string for client components
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
  unitPrice: number;
  totalPrice: number;
  variantChoices?: { variantName: string; optionName: string; optionPrice: number }[];
  notes?: string;
  categoryId?: string;
  taxOverrides?: TaxConfig[];
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
  status: OrderStatus;
  customerName?: string | null;
  customerPhoneNumber?: string | null;
  customerWhatsapp?: string | null;
  customerNotes?: string;
  kitchenNotes?: string;
  paymentMethod?: string;
  transactionId?: string;
  groupId?: string | null;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  taxBreakup?: { taxId: string; name: string; amount: number; rate: number; }[];
}

export interface ClientOrder extends Omit<Order, 'createdAt' | 'updatedAt' | 'userId' | 'groupId'> {
  createdAt: string;
  updatedAt: string;
  userId?: string;
  groupId?: string;
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

export type InventoryItemCategory = 'raw_material' | 'semi_finished' | 'finished_good' | 'other';
export const inventoryItemCategories: { value: InventoryItemCategory; label: string }[] = [
  { value: 'raw_material', label: 'Raw Material' },
  { value: 'semi_finished', label: 'Semi-Finished Good' },
  { value: 'finished_good', label: 'Finished Good' },
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
  role: 'staff'; // Fixed for staff invitations
  status: 'pending' | 'accepted' | 'declined' | 'expired';
  invitedBy: string; // UID of the owner who sent the invitation
  createdAt: Timestamp;
  acceptedAt?: Timestamp;
  acceptedByUid?: string;
  permissions?: StaffPermissions; // Added
}
