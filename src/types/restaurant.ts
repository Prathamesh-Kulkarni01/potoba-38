import type { Timestamp } from 'firebase/firestore';
import type { TaxConfig } from './tax';
import type { OutletType } from './outlet';

export interface RestaurantProfile {
  id: string;
  ownerId: string;
  name: string;
  outletType: OutletType;
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
