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
