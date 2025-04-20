
import { Restaurant } from '@/types/auth';

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface MenuItem {
  id: string;
  _id?: string;
  name: string;
  description: string;
  price: number;
  category: string;
  image?: string;
  available: boolean;
  preparationTime?: number;
  restaurantId: string;
}

export interface Table {
  id: string;
  _id?: string;
  name: string;
  number: number;
  capacity: number;
  status: 'available' | 'occupied' | 'reserved' | 'maintenance';
  restaurantId: string;
  qrCode?: string;
}

export interface Order {
  id: string;
  _id?: string;
  tableId: string;
  table?: Table;
  items: OrderItem[];
  status: 'pending' | 'preparing' | 'ready' | 'served' | 'paid' | 'cancelled';
  total: number;
  createdAt: string;
  updatedAt: string;
  restaurantId: string;
  customer?: {
    name: string;
    email?: string;
    phone?: string;
  };
}

export interface OrderItem {
  id: string;
  menuItemId: string;
  name: string;
  price: number;
  quantity: number;
  notes?: string;
}

export { Restaurant };
