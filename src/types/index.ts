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
