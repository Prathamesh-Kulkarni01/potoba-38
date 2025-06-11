import type { Timestamp } from 'firebase/firestore';
import type { MenuItem } from './menu';
import type { TaxConfig } from './tax';

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

export type OrderItemStatus = 
  | 'pending'
  | 'sent_to_kitchen'
  | 'confirmed_by_kitchen'
  | 'preparing'
  | 'ready_for_pickup'
  | 'served'
  | 'cancelled_by_kitchen'
  | 'cancelled_by_customer';

export interface OrderItem {
  uniqueId: string; 
  menuItemId: string;
  menuItemName: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  status: OrderItemStatus; 
  variantChoices?: { variantName: string; optionName: string; optionPrice: number }[] | null;
  instructions?: string | null; 
  notes?: string | null; 
  createdAt: number; 
  updatedAt?: number; 
  groupId?: string | null;
  imageUrl?: string | null; 
  categoryId?: string | null; 
  taxOverrides?: TaxConfig[] | null; 
  menuItem?: MenuItem; 
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
  discountType?: 'percentage' | 'amount';
  totalAmount: number;
  status: OrderStatus; 
  customerName?: string | null;
  customerPhoneNumber?: string | null;
  customerWhatsapp?: string | null;
  email?: string | null;
  customerNotes?: string; 
  kitchenNotes?: string; 
  paymentMethod?: 'cash' | 'card' | 'upi' | 'wallet' | 'other' | null;
  transactionId?: string;
  groupId?: string | null;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  taxBreakup?: { taxId: string; name: string; amount: number; rate: number; }[];
}

export interface ClientOrder extends Omit<Order, 'createdAt' | 'updatedAt'> {
  createdAt: string; 
  updatedAt: string; 
  groupId?: string | null;
}

export interface GroupCartItem extends OrderItem {
  addedByUid: string;
  addedByName?: string;
}

export interface HistoricalOrder {
  id: string;
  originalTableId?: string; 
  items: OrderItem[]; 
  completedAt: number; 
  totalAmount: number;
  paymentMethod?: 'cash' | 'card' | 'upi' | 'wallet' | 'other' | null;
  paymentNote?: string | null;
}

export interface BillableSession {
  key: string;
  displayName: string;
  items: OrderItem[];
  orderId?: string | null;
  createdAt?: string | number | null;
  customerName?: string | null;
  isGroup: boolean;
  groupId?: string | null;
  status?: OrderStatus | null;
}

export interface PopularItem {
  menuItemId: string;
  menuItemName: string;
  orderCount: number;
  totalRevenue: number;
}
