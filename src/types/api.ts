
// API Response types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

// Auth types
export interface User {
  id: string;
  name: string;
  email: string;
  restaurants: Restaurant[];
}

export interface AuthResponse {
  user: User;
  token: string;
}

// Restaurant types
export interface Restaurant {
  id: string;
  name: string;
  logo?: string;
  description?: string;
  address?: string;
  phone?: string;
  cuisine?: string;
  tables?: number;
}

export interface CreateRestaurantDto {
  name: string;
  logo?: string;
  description?: string;
  address?: string;
  phone?: string;
  cuisine?: string;
  tables?: number;
}

// Menu types
export interface MenuItem {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  image?: string;
  restaurantId: string;
}

export interface CreateMenuItemDto {
  name: string;
  description: string;
  price: number;
  category: string;
  image?: string;
}

// Table types
export interface Table {
  id: string;
  number: number;
  capacity: number;
  status: 'available' | 'occupied' | 'reserved';
  restaurantId: string;
  qrCode?: string;
}

export interface CreateTableDto {
  number: number;
  capacity: number;
  status?: 'available' | 'occupied' | 'reserved';
}

// Order types
export interface OrderItem {
  menuItemId: string;
  name: string;
  price: number;
  quantity: number;
}

export interface Order {
  id: string;
  tableId: string;
  status: 'new' | 'in-progress' | 'completed' | 'cancelled';
  items: OrderItem[];
  total: number;
  createdAt: string;
  completedAt?: string;
  restaurantId: string;
  customerName?: string;
}

export interface CreateOrderDto {
  items: OrderItem[];
  total: number;
  customerName?: string;
}

export interface UpdateOrderStatusDto {
  status: 'new' | 'in-progress' | 'completed' | 'cancelled';
}
