import type { Timestamp } from 'firebase/firestore';
import { GroupCartItem } from './order';

export type TableStatus = 'available' | 'occupied' | 'reserved' | 'needs_cleaning' | 'paying';

export interface TableArea {
  id: string;
  restaurantId: string;
  name: string;
  order: number; 
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface Table {
  id: string;
  restaurantId: string;
  tableDocId: string; 
  tableNumber: string;
  capacity: number;
  status: TableStatus;
  qrCodeValue: string;
  areaId?: string | null;
  areaName?: string | null; 
  assignedWaiterId?: string | null;
  assignedWaiterName?: string | null;
  lastOrderId?: string | null;
  lastOrderTotal?: number | null;
  lastOrderAt?: Timestamp | string | null; 
  currentOrderIds?: string[];
  createdAt: string; 
  updatedAt: string; 
  name?: string; 
  shape?: 'square' | 'circle' | 'rectangle';
}

export interface TipEntry {
  id: string;
  amount: number;
  timestamp: number; 
  tableId?: string | null; 
  notes?: string | null; 
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
