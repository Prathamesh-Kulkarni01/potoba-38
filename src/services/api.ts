
import { toast } from "@/hooks/use-toast";

// Base URL for your Express backend - change this to your actual server URL when deployed
const API_BASE_URL = 'http://localhost:5000/api';

// Types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

// Error handler helper
const handleApiError = (error: any): never => {
  const errorMessage = error.response?.data?.error || error.message || 'An unknown error occurred';
  console.error('API Error:', errorMessage);
  toast({
    title: "Error",
    description: errorMessage,
    variant: "destructive",
  });
  throw new Error(errorMessage);
};

// Generic API request function
const apiRequest = async <T>(
  endpoint: string, 
  method: string = 'GET',
  data?: any,
  token?: string
): Promise<ApiResponse<T>> => {
  try {
    const url = `${API_BASE_URL}${endpoint}`;
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
  login: async (email: string, password: string) => {
    return apiRequest<{ user: any; token: string }>('/auth/login', 'POST', { email, password });
  },
  
  register: async (userData: any) => {
    return apiRequest<{ user: any; token: string }>('/auth/register', 'POST', userData);
  },
  
  logout: async () => {
    return apiRequest('/auth/logout', 'POST');
  },
  
  getCurrentUser: async (token: string) => {
    return apiRequest<{ user: any }>('/auth/me', 'GET', undefined, token);
  }
};

// API Functions for restaurants
export const restaurantApi = {
  getAll: async (token: string) => {
    return apiRequest<any[]>('/restaurants', 'GET', undefined, token);
  },
  
  getById: async (id: string, token: string) => {
    return apiRequest<any>(`/restaurants/${id}`, 'GET', undefined, token);
  },
  
  create: async (restaurantData: any, token: string) => {
    return apiRequest<any>('/restaurants', 'POST', restaurantData, token);
  },
  
  update: async (id: string, restaurantData: any, token: string) => {
    return apiRequest<any>(`/restaurants/${id}`, 'PUT', restaurantData, token);
  },
  
  delete: async (id: string, token: string) => {
    return apiRequest<void>(`/restaurants/${id}`, 'DELETE', undefined, token);
  }
};

// API Functions for menu items
export const menuApi = {
  getAll: async (restaurantId: string, token: string) => {
    return apiRequest<any[]>(`/restaurants/${restaurantId}/menu`, 'GET', undefined, token);
  },
  
  getById: async (restaurantId: string, menuItemId: string, token: string) => {
    return apiRequest<any>(`/restaurants/${restaurantId}/menu/${menuItemId}`, 'GET', undefined, token);
  },
  
  create: async (restaurantId: string, menuItemData: any, token: string) => {
    return apiRequest<any>(`/restaurants/${restaurantId}/menu`, 'POST', menuItemData, token);
  },
  
  update: async (restaurantId: string, menuItemId: string, menuItemData: any, token: string) => {
    return apiRequest<any>(`/restaurants/${restaurantId}/menu/${menuItemId}`, 'PUT', menuItemData, token);
  },
  
  delete: async (restaurantId: string, menuItemId: string, token: string) => {
    return apiRequest<void>(`/restaurants/${restaurantId}/menu/${menuItemId}`, 'DELETE', undefined, token);
  }
};

// API Functions for tables
export const tableApi = {
  getAll: async (restaurantId: string, token: string) => {
    return apiRequest<any[]>(`/restaurants/${restaurantId}/tables`, 'GET', undefined, token);
  },
  
  getById: async (restaurantId: string, tableId: string, token: string) => {
    return apiRequest<any>(`/restaurants/${restaurantId}/tables/${tableId}`, 'GET', undefined, token);
  },
  
  create: async (restaurantId: string, tableData: any, token: string) => {
    return apiRequest<any>(`/restaurants/${restaurantId}/tables`, 'POST', tableData, token);
  },
  
  update: async (restaurantId: string, tableId: string, tableData: any, token: string) => {
    return apiRequest<any>(`/restaurants/${restaurantId}/tables/${tableId}`, 'PUT', tableData, token);
  },
  
  delete: async (restaurantId: string, tableId: string, token: string) => {
    return apiRequest<void>(`/restaurants/${restaurantId}/tables/${tableId}`, 'DELETE', undefined, token);
  }
};

// API Functions for orders
export const orderApi = {
  getAll: async (restaurantId: string, token: string) => {
    return apiRequest<any[]>(`/restaurants/${restaurantId}/orders`, 'GET', undefined, token);
  },
  
  getById: async (restaurantId: string, orderId: string, token: string) => {
    return apiRequest<any>(`/restaurants/${restaurantId}/orders/${orderId}`, 'GET', undefined, token);
  },
  
  create: async (restaurantId: string, tableId: string, orderData: any, token: string) => {
    return apiRequest<any>(`/restaurants/${restaurantId}/tables/${tableId}/orders`, 'POST', orderData, token);
  },
  
  update: async (restaurantId: string, orderId: string, orderData: any, token: string) => {
    return apiRequest<any>(`/restaurants/${restaurantId}/orders/${orderId}`, 'PUT', orderData, token);
  },
  
  updateStatus: async (restaurantId: string, orderId: string, status: string, token: string) => {
    return apiRequest<any>(`/restaurants/${restaurantId}/orders/${orderId}/status`, 'PATCH', { status }, token);
  },
  
  delete: async (restaurantId: string, orderId: string, token: string) => {
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
