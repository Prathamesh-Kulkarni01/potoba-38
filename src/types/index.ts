
import type { User as FirebaseUser } from 'firebase/auth';
import type { Timestamp } from 'firebase/firestore';

export type UserRole = 'admin' | 'user' | 'owner' | 'staff';

export interface AuthUser extends FirebaseUser {
  role: UserRole | null;
  restaurantId: string | null;
  onboardingComplete: boolean;
}

export interface UserProfile {
  uid: string;
  email: string | null;
  role: UserRole;
  restaurantId: string | null; // ID of the restaurant this user belongs to
  onboardingComplete: boolean; // Specifically for 'owner' role
  createdAt: Timestamp;
}

export interface RestaurantProfile {
  id: string;
  ownerId: string;
  name: string;
  type?: string; // e.g., Italian, Cafe, Fine Dining
  createdAt: Timestamp; 
  // Add other restaurant-specific fields like address, phone, etc.
  subscriptionPlan?: string; // Example: 'basic', 'premium'
  stripeCustomerId?: string;
  subscriptionStatus?: 'active' | 'inactive' | 'trialing';
  taxRate?: number; // e.g., 0.10 for 10%
}

export interface MenuCategory {
  id: string;
  restaurantId: string;
  name: string;
  order: number; // For sorting categories
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface MenuSubcategory {
  id: string;
  restaurantId: string;
  categoryId: string;
  name: string;
  order: number; // For sorting subcategories within a category
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface MenuItemVariantOption {
  name: string;
  price: number; // Absolute price for this option
  // id?: string; // Optional: for easier management in UI state if needed
}

export interface MenuItemVariant {
  // id?: string; // Optional: for easier management in UI state if needed
  name: string; // e.g., "Size", "Spice Level"
  options: MenuItemVariantOption[];
}

export interface AvailabilityRule {
  // id?: string; // Optional: for easier management in UI state if needed
  dayOfWeek: 'Mon' | 'Tue' | 'Wed' | 'Thu' | 'Fri' | 'Sat' | 'Sun' | 'Everyday';
  startTime: string; // Format HH:mm
  endTime: string;   // Format HH:mm
}

export interface MenuItem {
  id: string;
  restaurantId: string;
  categoryId: string;
  subcategoryId?: string | null; // Optional, if item is directly under a category
  name:string;
  description: string;
  price: number; // Base price, or price if no variants
  imageUrl?: string | null;
  videoUrl?: string | null; // For short videos
  availability: boolean; // Master switch: true if available, false if not (temporarily disable)
  dietaryTags?: string[]; // e.g., ['vegan', 'gluten-free']
  allergenInfo?: string[];
  order: number; // For sorting items within a category/subcategory
  calories?: number; 
  crossSellItems?: string[]; 
  upsellItems?: string[]; 
  variants?: MenuItemVariant[]; // Item variants like size or spice level
  availabilitySchedule?: AvailabilityRule[]; // Specific time/day availability
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// Table Management System Types
export type TableStatus = 'available' | 'occupied' | 'reserved' | 'needs_cleaning';

export interface Table {
  id: string; // Firestore document ID
  restaurantId: string;
  tableDocId: string; // Stores its own document ID for collection group queries
  tableNumber: string; // User-defined table identifier (e.g., "T1", "A5", "Patio 2")
  capacity: number;
  status: TableStatus;
  qrCodeValue: string; // String value to be encoded in QR (e.g., URL to /menu/table/{id})
  currentOrderIds?: string[]; // IDs of active orders associated with this table for a session
  createdAt: string; 
  updatedAt: string; 
}

// Ordering System Types
export type OrderStatus = 
  | 'pending_customer_confirmation' // Cart submitted by customer, awaiting their final OK
  | 'pending_kitchen'               // Customer confirmed, awaiting kitchen acknowledgement
  | 'confirmed_by_kitchen'          // Kitchen acknowledged, will prepare
  | 'preparing'                     // Order is being prepared
  | 'ready_for_pickup'            // Food is ready at the counter/pass (for self-pickup or staff)
  | 'served'                        // Order served to the table
  | 'payment_pending'               // Bill presented, awaiting payment
  | 'completed'                     // Paid and finished
  | 'cancelled_by_customer'
  | 'cancelled_by_restaurant';

export interface OrderItem {
  menuItemId: string;
  menuItemName: string;
  quantity: number;
  unitPrice: number; // Price at the time of order for this item
  totalPrice: number; // quantity * unitPrice
  variantChoices?: { variantName: string; optionName: string; optionPrice: number }[]; // Record chosen variants
  notes?: string; // Customer notes for this specific item
}

export interface Order {
  id: string; // Firestore document ID
  restaurantId: string;
  tableId: string; // Reference to the Table.id
  tableNumber: string; // Denormalized for easier display
  items: OrderItem[];
  subtotal: number; // Sum of all OrderItem.totalPrice
  taxAmount?: number;
  serviceCharge?: number;
  discountAmount?: number;
  totalAmount: number; // subtotal + tax + serviceCharge - discount
  status: OrderStatus;
  customerNotes?: string; // General notes for the entire order
  kitchenNotes?: string; // Notes from staff to kitchen or vice-versa
  paymentMethod?: string;
  transactionId?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
