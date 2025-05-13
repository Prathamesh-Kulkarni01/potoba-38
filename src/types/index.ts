
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
}

export interface MenuCategory {
  id: string;
  restaurantId: string;
  name: string;
  order: number; 
  createdAt: Timestamp;
  updatedAt: Timestamp;
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
  itemIdString: string; // New field: Stores the document ID for easier collection group queries
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
  calories?: number; 
  crossSellItems?: string[]; 
  upsellItems?: string[]; 
  variants?: MenuItemVariant[]; 
  availabilitySchedule?: AvailabilityRule[]; 
  createdAt: Timestamp;
  updatedAt: Timestamp;
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
  userId?: string; 
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
  groupId?: string; // Added for group orders
  createdAt: Timestamp; 
  updatedAt: Timestamp; 
}

export interface ClientOrder extends Omit<Order, 'createdAt' | 'updatedAt'> {
  createdAt: string; 
  updatedAt: string; 
}

// For Group Orders
export interface GroupCartItem extends OrderItem {
  addedByUid: string;
  addedByName?: string; // Optional: display name of user who added
}

export interface TableGroupMember {
  uid: string | null; // Can be null if user is not fully authenticated yet (e.g. just name/phone)
  name: string;
  phone?: string | null; // Optional for anonymous, might be required later
  // Add any other relevant member details
}

export interface TableGroup {
  id: string; // This will be the 4-digit code
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
