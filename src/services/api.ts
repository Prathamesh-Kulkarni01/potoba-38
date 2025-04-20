import { toast } from "@/hooks/use-toast";
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

// Helper to check if we're in offline mode
const isOfflineMode = (): boolean => {
  return localStorage.getItem('offlineMode') === 'true';
};

// Helper to get the configured API base URL or use the default
const getApiBaseUrl = (): string => {
  if (isOfflineMode()) {
    const port = localStorage.getItem('apiPort') || '5000';
    return `http://localhost:${port}/api`;
  }
  return localStorage.getItem('apiBaseUrl') || 'http://localhost:5000/api';
};

// Toggle this to use mock API or real API
const USE_MOCK_API = false; 

// Function to store data locally in IndexedDB for offline use
const saveToIndexedDB = async <T>(storeName: string, data: T, id?: string): Promise<void> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('RestaurantAppOfflineDB', 1);
    
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      
      // Create object stores if they don't exist
      if (!db.objectStoreNames.contains('restaurants')) {
        db.createObjectStore('restaurants', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('menuItems')) {
        db.createObjectStore('menuItems', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('tables')) {
        db.createObjectStore('tables', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('orders')) {
        db.createObjectStore('orders', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('users')) {
        db.createObjectStore('users', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('syncQueue')) {
        db.createObjectStore('syncQueue', { keyPath: 'id', autoIncrement: true });
      }
    };
    
    request.onsuccess = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      const transaction = db.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      
      let storeOperation;
      if (id) {
        // For updates to existing items
        storeOperation = store.put({ ...data, id });
      } else {
        // For new items
        storeOperation = store.put(data);
      }
      
      storeOperation.onsuccess = () => resolve();
      storeOperation.onerror = () => reject(new Error('Failed to save to IndexedDB'));
      
      transaction.oncomplete = () => db.close();
    };
    
    request.onerror = () => reject(new Error('Failed to open IndexedDB'));
  });
};

// Function to retrieve data from IndexedDB
const getFromIndexedDB = async <T>(storeName: string, id?: string): Promise<T | T[]> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('RestaurantAppOfflineDB', 1);
    
    request.onsuccess = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      const transaction = db.transaction([storeName], 'readonly');
      const store = transaction.objectStore(storeName);
      
      let getOperation;
      if (id) {
        getOperation = store.get(id);
        getOperation.onsuccess = () => resolve(getOperation.result as T);
      } else {
        getOperation = store.getAll();
        getOperation.onsuccess = () => resolve(getOperation.result as T[]);
      }
      
      getOperation.onerror = () => reject(new Error('Failed to get data from IndexedDB'));
      
      transaction.oncomplete = () => db.close();
    };
    
    request.onerror = () => reject(new Error('Failed to open IndexedDB'));
  });
};

// Function to add operation to sync queue
const addToSyncQueue = async (operation: {
  type: 'CREATE' | 'UPDATE' | 'DELETE';
  endpoint: string;
  method: string;
  data?: any;
  id?: string;
}): Promise<void> => {
  return saveToIndexedDB('syncQueue', {
    ...operation,
    timestamp: new Date().toISOString(),
    synced: false
  });
};

// Function to sync data with server when online
const syncWithServer = async (): Promise<void> => {
  if (isOfflineMode() || !navigator.onLine) return;
  
  try {
    const syncQueue = await getFromIndexedDB<any[]>('syncQueue');
    const unsyncedOperations = syncQueue.filter(op => !op.synced);
    
    for (const operation of unsyncedOperations) {
      try {
        await apiRequest(
          operation.endpoint,
          operation.method,
          operation.data,
          localStorage.getItem('token') || undefined
        );
        
        // Mark as synced
        await saveToIndexedDB('syncQueue', { ...operation, synced: true }, operation.id);
      } catch (error) {
        console.error('Failed to sync operation:', operation, error);
      }
    }
  } catch (error) {
    console.error('Error during sync:', error);
  }
};

// Error handler helper
const handleApiError = (error: any): never => {
  const errorMessage = error.response?.data?.error || error.message || 'An unknown error occurred';
  console.error('API Error:', errorMessage);
  toast({
    variant: "destructive",
    description: errorMessage
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
  // If offline mode is enabled, use IndexedDB
  if (isOfflineMode() && !endpoint.includes('health-check')) {
    try {
      // Determine the store name based on the endpoint
      let storeName = '';
      let id = '';
      
      if (endpoint.includes('/auth')) {
        storeName = 'users';
      } else if (endpoint.includes('/menu')) {
        storeName = 'menuItems';
        // Extract ID from endpoint like /restaurants/123/menu/456
        const parts = endpoint.split('/');
        if (parts.length > 3) id = parts[parts.length - 1];
      } else if (endpoint.includes('/tables')) {
        storeName = 'tables';
        const parts = endpoint.split('/');
        if (parts.length > 3) id = parts[parts.length - 1];
      } else if (endpoint.includes('/orders')) {
        storeName = 'orders';
        const parts = endpoint.split('/');
        if (parts.length > 3) id = parts[parts.length - 1];
      } else if (endpoint.includes('/restaurants')) {
        storeName = 'restaurants';
        const parts = endpoint.split('/');
        if (parts.length > 1) id = parts[parts.length - 1];
      }
      
      // Handle different HTTP methods
      switch (method) {
        case 'GET':
          if (id) {
            const item = await getFromIndexedDB<T>(storeName, id);
            return { success: true, data: item as T };
          } else {
            const items = await getFromIndexedDB<T[]>(storeName);
            return { success: true, data: items as unknown as T };
          }
          
        case 'POST':
          const newId = Math.random().toString(36).substring(2, 15);
          await saveToIndexedDB(storeName, { ...data, id: newId });
          
          // Add to sync queue for when online
          await addToSyncQueue({
            type: 'CREATE',
            endpoint,
            method,
            data
          });
          
          return { success: true, data: { ...data, id: newId } as unknown as T };
          
        case 'PUT':
        case 'PATCH':
          await saveToIndexedDB(storeName, data, id);
          
          // Add to sync queue
          await addToSyncQueue({
            type: 'UPDATE',
            endpoint,
            method,
            data,
            id
          });
          
          return { success: true, data: data as unknown as T };
          
        case 'DELETE':
          // We don't actually delete in offline mode, just mark as deleted
          await saveToIndexedDB(storeName, { id, _deleted: true }, id);
          
          // Add to sync queue
          await addToSyncQueue({
            type: 'DELETE',
            endpoint,
            method,
            id
          });
          
          return { success: true };
          
        default:
          return { success: false, error: `Unsupported method ${method} in offline mode` };
      }
    } catch (error: any) {
      console.error('Offline storage error:', error);
      return { success: false, error: error.message };
    }
  }

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

// Start listening for online/offline events to trigger sync
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    toast({
      description: 'Connection restored. Syncing data...',
    });
    syncWithServer();
  });
  
  window.addEventListener('offline', () => {
    toast({
      variant: "warning",
      description: 'You are offline. Changes will be synced when you reconnect.',
    });
  });
  
  // Attempt to sync when the app starts
  if (navigator.onLine) {
    syncWithServer();
  }
}

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
  orders: orderApi,
  
  // Add sync function to manually trigger synchronization
  syncData: syncWithServer
};

export default api;
