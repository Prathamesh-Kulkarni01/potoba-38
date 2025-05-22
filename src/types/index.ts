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

export interface TaxConfig {
  id: string; // unique id for the tax (e.g. 'cgst', 'sgst', 'igst', 'service_charge')
  name: string; // e.g. 'CGST', 'SGST', 'IGST', 'Service Charge'
  rate: number; // percentage (e.g. 2.5 for 2.5%)
  type: 'percentage' | 'fixed'; // type of tax
  isDefault?: boolean; // is this a default tax for the restaurant
  isInclusive?: boolean; // is this tax included in price
}

export interface RestaurantProfile {
  id: string;
  ownerId: string;
  name: string;
  type?: string; 
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
  taxes?: TaxConfig[]; // List of taxes for the restaurant
}

export interface MenuCategory {
  id: string;
  restaurantId: string;
  name: string;
  order: number; 
  createdAt: Timestamp;
  updatedAt: Timestamp;
  taxOverrides?: TaxConfig[]; // Category-specific tax overrides
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
  taxOverrides?: TaxConfig[]; // Item-specific tax overrides
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
}

export interface Order {
  id: string; 
  restaurantId: string;
  userId?: string | null; // Allow null for userId
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
  groupId?: string | null; // Allow null for groupId
  createdAt: Timestamp; 
  updatedAt: Timestamp; 
  taxBreakup?: { taxId: string; name: string; amount: number; rate: number; }[]; // Detailed tax breakup
}

export interface ClientOrder extends Omit<Order, 'createdAt' | 'updatedAt' | 'userId' | 'groupId'> {
  createdAt: string; 
  updatedAt: string; 
  userId?: string; // Keep userId optional in ClientOrder
  groupId?: string; // Keep groupId optional in ClientOrder
}

export interface GroupCartItem extends OrderItem {
  addedByUid: string;
  addedByName?: string; 
}

export interface TableGroupMember {
  uid: string | null; 
  name: string;
  phone?: string | null; // Phone is optional for members
}

export interface TableGroup {
  id: string; 
  restaurantId: string;
  tableId: string;
  tableNumber: string; 
  creatorName: string;
  creatorPhone: string; // Creator phone is required
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

export interface PopularItem { // Type for popular items on dashboard
  menuItemId: string;
  menuItemName: string;
  orderCount: number;
  totalRevenue: number;
}
