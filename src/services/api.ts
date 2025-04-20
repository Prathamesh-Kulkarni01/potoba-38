
import { toast } from "sonner";
import { mockApi } from "./mockApi";
import { 
  ApiResponse, 
  AuthResponse, 
  User, 
  Restaurant, 
  MenuItem, 
  Table, 
  Order,
  CreateRestaurantDto,
  CreateMenuItemDto,
  CreateTableDto,
  CreateOrderDto,
  UpdateOrderStatusDto
} from "@/types/api";

// Helper to get the configured API base URL or use the default
const getApiBaseUrl = (): string => {
  return localStorage.getItem('apiBaseUrl') || 'http://localhost:5000/api';
};

// Toggle this to use mock API or real API
const USE_MOCK_API = false; // Changed to false to use real API

// Error handler helper
const handleApiError = (error: any): never => {
  const errorMessage = error.response?.data?.error || error.message || 'An unknown error occurred';
  console.error('API Error:', errorMessage);
  toast.error(errorMessage);
  throw new Error(errorMessage);
};

// Generic API request function
const apiRequest = async <T>(
  endpoint: string, 
  method: string = 'GET',
  data?: any,
  token?: string
): Promise<ApiResponse<T>> => {
  // If mock API is enabled, use it instead of making real HTTP requests
  if (USE_MOCK_API) {
    // Split the endpoint to determine which mock API method to call
    const parts = endpoint.split('/').filter(part => part);
    
    // Handle auth endpoints
    if (parts[0] === 'auth') {
      switch (parts[1]) {
        case 'login':
          return mockApi.auth.login(data.email, data.password) as Promise<ApiResponse<T>>;
        case 'register':
          return mockApi.auth.register(data) as Promise<ApiResponse<T>>;
        case 'logout':
          return mockApi.auth.logout() as Promise<ApiResponse<T>>;
        case 'me':
          return mockApi.auth.getCurrentUser(token || '') as Promise<ApiResponse<T>>;
        default:
          return { success: false, error: 'Unknown auth endpoint' };
      }
    }
    
    // Handle restaurant endpoints
    if (parts[0] === 'restaurants') {
      if (parts.length === 1) {
        // /restaurants
        if (method === 'GET') return mockApi.restaurants.getAll() as Promise<ApiResponse<T>>;
        if (method === 'POST') return mockApi.restaurants.create(data) as Promise<ApiResponse<T>>;
      } else if (parts.length === 2 && !['menu', 'tables', 'orders'].includes(parts[2])) {
        // /restaurants/:id
        if (method === 'GET') return mockApi.restaurants.getById(parts[1]) as Promise<ApiResponse<T>>;
        if (method === 'PUT') return mockApi.restaurants.update(parts[1], data) as Promise<ApiResponse<T>>;
        if (method === 'DELETE') return mockApi.restaurants.delete(parts[1]) as Promise<ApiResponse<T>>;
      } else if (parts.length >= 3) {
        const restaurantId = parts[1];
        
        // Handle menu endpoints
        if (parts[2] === 'menu') {
          if (parts.length === 3) {
            // /restaurants/:id/menu
            if (method === 'GET') return mockApi.menu.getAll(restaurantId) as Promise<ApiResponse<T>>;
            if (method === 'POST') return mockApi.menu.create(restaurantId, data) as Promise<ApiResponse<T>>;
          } else if (parts.length === 4) {
            // /restaurants/:id/menu/:menuItemId
            const menuItemId = parts[3];
            if (method === 'GET') return mockApi.menu.getById(restaurantId, menuItemId) as Promise<ApiResponse<T>>;
            if (method === 'PUT') return mockApi.menu.update(restaurantId, menuItemId, data) as Promise<ApiResponse<T>>;
            if (method === 'DELETE') return mockApi.menu.delete(restaurantId, menuItemId) as Promise<ApiResponse<T>>;
          }
        }
        
        // Handle table endpoints
        if (parts[2] === 'tables') {
          if (parts.length === 3) {
            // /restaurants/:id/tables
            if (method === 'GET') return mockApi.tables.getAll(restaurantId) as Promise<ApiResponse<T>>;
            if (method === 'POST') return mockApi.tables.create(restaurantId, data) as Promise<ApiResponse<T>>;
          } else if (parts.length === 4) {
            // /restaurants/:id/tables/:tableId
            const tableId = parts[3];
            if (method === 'GET') return mockApi.tables.getById(restaurantId, tableId) as Promise<ApiResponse<T>>;
            if (method === 'PUT') return mockApi.tables.update(restaurantId, tableId, data) as Promise<ApiResponse<T>>;
            if (method === 'DELETE') return mockApi.tables.delete(restaurantId, tableId) as Promise<ApiResponse<T>>;
          }
        }
        
        // Handle order endpoints
        if (parts[2] === 'orders') {
          if (parts.length === 3) {
            // /restaurants/:id/orders
            if (method === 'GET') return mockApi.orders.getAll(restaurantId) as Promise<ApiResponse<T>>;
          } else if (parts.length === 4) {
            const orderId = parts[3];
            if (parts[3] === 'status') {
              // /restaurants/:id/orders/:orderId/status
              if (method === 'PATCH') return mockApi.orders.updateStatus(restaurantId, orderId, data.status) as Promise<ApiResponse<T>>;
            } else {
              // /restaurants/:id/orders/:orderId
              if (method === 'GET') return mockApi.orders.getById(restaurantId, orderId) as Promise<ApiResponse<T>>;
              if (method === 'PUT') return mockApi.orders.update(restaurantId, orderId, data) as Promise<ApiResponse<T>>;
              if (method === 'DELETE') return mockApi.orders.delete(restaurantId, orderId) as Promise<ApiResponse<T>>;
            }
          } else if (parts.length === 5 && parts[4] === 'status') {
            // /restaurants/:id/orders/:orderId/status
            const orderId = parts[3];
            if (method === 'PATCH') return mockApi.orders.updateStatus(restaurantId, orderId, data.status) as Promise<ApiResponse<T>>;
          }
        }
      }
    }

    // For any endpoints not handled by the mock
    console.warn('Unhandled mock API endpoint:', endpoint, method);
    return { success: false, error: 'Endpoint not implemented in mock API' };
  }
  
  // Real API implementation
  try {
    const url = `${getApiBaseUrl()}${endpoint}`;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const options: RequestInit = {
      method,
      headers,
      credentials: 'include',
    };

    if (data && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
      options.body = JSON.stringify(data);
    }

    const response = await fetch(url, options);
    const responseData = await response.json();

    if (!response.ok) {
      throw new Error(responseData.error || `Request failed with status ${response.status}`);
    }

    return { success: true, data: responseData };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
};

// API Functions for authentication
export const authApi = {
  login: async (email: string, password: string): Promise<ApiResponse<AuthResponse>> => {
    return apiRequest<AuthResponse>('/auth/login', 'POST', { email, password });
  },
  
  register: async (userData: { name: string, email: string, password: string }): Promise<ApiResponse<AuthResponse>> => {
    return apiRequest<AuthResponse>('/auth/register', 'POST', userData);
  },
  
  logout: async (): Promise<ApiResponse<void>> => {
    return apiRequest<void>('/auth/logout', 'POST');
  },
  
  getCurrentUser: async (token: string): Promise<ApiResponse<{ user: User }>> => {
    return apiRequest<{ user: User }>('/auth/me', 'GET', undefined, token);
  }
};

// API Functions for restaurants
export const restaurantApi = {
  getAll: async (token: string): Promise<ApiResponse<Restaurant[]>> => {
    return apiRequest<Restaurant[]>('/restaurants', 'GET', undefined, token);
  },
  
  getById: async (id: string, token: string): Promise<ApiResponse<Restaurant>> => {
    return apiRequest<Restaurant>(`/restaurants/${id}`, 'GET', undefined, token);
  },
  
  create: async (restaurantData: CreateRestaurantDto, token: string): Promise<ApiResponse<Restaurant>> => {
    return apiRequest<Restaurant>('/restaurants', 'POST', restaurantData, token);
  },
  
  update: async (id: string, restaurantData: Partial<Restaurant>, token: string): Promise<ApiResponse<Restaurant>> => {
    return apiRequest<Restaurant>(`/restaurants/${id}`, 'PUT', restaurantData, token);
  },
  
  delete: async (id: string, token: string): Promise<ApiResponse<void>> => {
    return apiRequest<void>(`/restaurants/${id}`, 'DELETE', undefined, token);
  }
};

// API Functions for menu items
export const menuApi = {
  getAll: async (restaurantId: string, token: string): Promise<ApiResponse<MenuItem[]>> => {
    return apiRequest<MenuItem[]>(`/restaurants/${restaurantId}/menu`, 'GET', undefined, token);
  },
  
  getById: async (restaurantId: string, menuItemId: string, token: string): Promise<ApiResponse<MenuItem>> => {
    return apiRequest<MenuItem>(`/restaurants/${restaurantId}/menu/${menuItemId}`, 'GET', undefined, token);
  },
  
  create: async (restaurantId: string, menuItemData: CreateMenuItemDto, token: string): Promise<ApiResponse<MenuItem>> => {
    return apiRequest<MenuItem>(`/restaurants/${restaurantId}/menu`, 'POST', menuItemData, token);
  },
  
  update: async (restaurantId: string, menuItemId: string, menuItemData: Partial<MenuItem>, token: string): Promise<ApiResponse<MenuItem>> => {
    return apiRequest<MenuItem>(`/restaurants/${restaurantId}/menu/${menuItemId}`, 'PUT', menuItemData, token);
  },
  
  delete: async (restaurantId: string, menuItemId: string, token: string): Promise<ApiResponse<void>> => {
    return apiRequest<void>(`/restaurants/${restaurantId}/menu/${menuItemId}`, 'DELETE', undefined, token);
  }
};

// API Functions for tables
export const tableApi = {
  getAll: async (restaurantId: string, token: string): Promise<ApiResponse<Table[]>> => {
    return apiRequest<Table[]>(`/restaurants/${restaurantId}/tables`, 'GET', undefined, token);
  },
  
  getById: async (restaurantId: string, tableId: string, token: string): Promise<ApiResponse<Table>> => {
    return apiRequest<Table>(`/restaurants/${restaurantId}/tables/${tableId}`, 'GET', undefined, token);
  },
  
  create: async (restaurantId: string, tableData: CreateTableDto, token: string): Promise<ApiResponse<Table>> => {
    return apiRequest<Table>(`/restaurants/${restaurantId}/tables`, 'POST', tableData, token);
  },
  
  update: async (restaurantId: string, tableId: string, tableData: Partial<Table>, token: string): Promise<ApiResponse<Table>> => {
    return apiRequest<Table>(`/restaurants/${restaurantId}/tables/${tableId}`, 'PUT', tableData, token);
  },
  
  delete: async (restaurantId: string, tableId: string, token: string): Promise<ApiResponse<void>> => {
    return apiRequest<void>(`/restaurants/${restaurantId}/tables/${tableId}`, 'DELETE', undefined, token);
  }
};

// API Functions for orders
export const orderApi = {
  getAll: async (restaurantId: string, token: string): Promise<ApiResponse<Order[]>> => {
    return apiRequest<Order[]>(`/restaurants/${restaurantId}/orders`, 'GET', undefined, token);
  },
  
  getById: async (restaurantId: string, orderId: string, token: string): Promise<ApiResponse<Order>> => {
    return apiRequest<Order>(`/restaurants/${restaurantId}/orders/${orderId}`, 'GET', undefined, token);
  },
  
  create: async (restaurantId: string, tableId: string, orderData: CreateOrderDto, token: string): Promise<ApiResponse<Order>> => {
    return apiRequest<Order>(`/restaurants/${restaurantId}/tables/${tableId}/orders`, 'POST', orderData, token);
  },
  
  update: async (restaurantId: string, orderId: string, orderData: Partial<Order>, token: string): Promise<ApiResponse<Order>> => {
    return apiRequest<Order>(`/restaurants/${restaurantId}/orders/${orderId}`, 'PUT', orderData, token);
  },
  
  updateStatus: async (restaurantId: string, orderId: string, status: UpdateOrderStatusDto, token: string): Promise<ApiResponse<Order>> => {
    return apiRequest<Order>(`/restaurants/${restaurantId}/orders/${orderId}/status`, 'PATCH', status, token);
  },
  
  delete: async (restaurantId: string, orderId: string, token: string): Promise<ApiResponse<void>> => {
    return apiRequest<void>(`/restaurants/${restaurantId}/orders/${orderId}`, 'DELETE', undefined, token);
  }
};

// Export all API services
export const api = {
  auth: authApi,
  restaurants: restaurantApi,
  menu: menuApi,
  tables: tableApi,
  orders: orderApi
};

export default api;
