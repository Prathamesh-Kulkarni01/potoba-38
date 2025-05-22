
import type { User as FirebaseUser } from 'firebase/auth';
import type { Timestamp } from 'firebase/firestore';

export type UserRole = 'admin' | 'user' | 'owner' | 'staff';

export interface AuthUser extends FirebaseUser {
  role: UserRole | null;
  restaurantId: string | null;
  onboardingComplete: boolean;
  isAnonymous: boolean; 
  phoneNumber: string | null; 
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
  outletType?: OutletType; // Changed from 'type' to 'outletType'
  createdAt: Timestamp; 
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
  createdAt: string; 
  updatedAt: string; 
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
  categoryId?: string; // Added for tax calculation
  taxOverrides?: TaxConfig[]; // Added for tax calculation
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
