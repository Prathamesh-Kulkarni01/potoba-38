
import type { User as FirebaseUser } from 'firebase/auth';
import type { Timestamp } from 'firebase/firestore';

export type UserRole = 'admin' | 'user' | 'owner' | 'staff';

export interface AuthUser extends FirebaseUser {
  role: UserRole | null;
  restaurantId: string | null;
  onboardingComplete: boolean;
  isAnonymous: boolean; // Added for anonymous auth
  phoneNumber?: string | null; // Added for phone verified users
}

export interface UserProfile {
  uid: string;
  email: string | null; // Email might be null for phone-verified anonymous users initially
  role: UserRole;
  restaurantId: string | null; 
  onboardingComplete: boolean; 
  createdAt: Timestamp;
  phoneNumber?: string | null; // Added
  isAnonymous?: boolean; // Could be useful to track origin
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
  userId?: string; // ID of the authenticated user (anonymous or permanent)
  tableId?: string | null; 
  tableNumber?: string | null; 
  items: OrderItem[];
  subtotal: number; 
  taxAmount?: number;
  serviceCharge?: number;
  discountAmount?: number;
  totalAmount: number; 
  status: OrderStatus;
  customerName?: string; 
  customerPhoneNumber?: string; // Store verified phone number here
  customerWhatsapp?: string; 
  customerNotes?: string; 
  kitchenNotes?: string; 
  paymentMethod?: string;
  transactionId?: string;
  createdAt: Timestamp; 
  updatedAt: Timestamp; 
}

export interface ClientOrder extends Omit<Order, 'createdAt' | 'updatedAt'> {
  createdAt: string; 
  updatedAt: string; 
}
