import type { User as FirebaseUser } from 'firebase/auth';
import type { Timestamp } from 'firebase/firestore';
import type { UserRole, StaffRole, StaffPermissions } from './staff';

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
