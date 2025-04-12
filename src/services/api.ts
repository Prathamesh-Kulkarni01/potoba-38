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

// Helper functions
const isOfflineMode = (): boolean => localStorage.getItem('offlineMode') === 'true';
const getApiBaseUrl = (): string => isOfflineMode()
  ? `http://localhost:${localStorage.getItem('apiPort') || '5000'}/api`
  : localStorage.getItem('apiBaseUrl') || 'http://localhost:5000/api';

// IndexedDB helpers
const openIndexedDB = (): Promise<IDBDatabase> => new Promise((resolve, reject) => {
  const request = indexedDB.open('RestaurantAppOfflineDB', 1);
  request.onupgradeneeded = (event) => {
    const db = (event.target as IDBOpenDBRequest).result;
    ['restaurants', 'menuItems', 'tables', 'orders', 'users', 'syncQueue'].forEach(store => {
      if (!db.objectStoreNames.contains(store)) db.createObjectStore(store, { keyPath: 'id', autoIncrement: store === 'syncQueue' });
    });
  };
  request.onsuccess = (event) => resolve((event.target as IDBOpenDBRequest).result);
  request.onerror = () => reject(new Error('Failed to open IndexedDB'));
});

const performIndexedDBOperation = async <T>(
  storeName: string, 
  operation: 'get' | 'getAll' | 'put', 
  data?: T, 
  id?: string
): Promise<T | T[] | void> => {
  const db = await openIndexedDB();
  const transaction = db.transaction([storeName], operation === 'put' ? 'readwrite' : 'readonly');
  const store = transaction.objectStore(storeName);
  return new Promise((resolve, reject) => {
    const request = operation === 'get' ? store.get(id!) 
      : operation === 'getAll' ? store.getAll() 
      : store.put({ ...data, id });
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(new Error(`Failed to ${operation} data in IndexedDB`));
    transaction.oncomplete = () => db.close();
  });
};

// Sync helpers
const addToSyncQueue = async (operation: any): Promise<void> => {
  await performIndexedDBOperation('syncQueue', 'put', { ...operation, timestamp: new Date().toISOString(), synced: false });
};

const syncWithServer = async (): Promise<void> => {
  if (isOfflineMode() || !navigator.onLine) return;
  try {
    const syncQueue = await performIndexedDBOperation<any[]>('syncQueue', 'getAll');
    for (const operation of syncQueue.filter(op => !op.synced)) {
      try {
        await apiRequest(operation.endpoint, operation.method, operation.data, localStorage.getItem('token') || undefined);
        await performIndexedDBOperation('syncQueue', 'put', { ...operation, synced: true }, operation.id);
      } catch (error) {
        console.error('Failed to sync operation:', operation, error);
      }
    }
  } catch (error) {
    console.error('Error during sync:', error);
  }
};

// API request handler
const apiRequest = async <T>(
  endpoint: string, 
  method: string = 'GET', 
  data?: any, 
  token?: string
): Promise<ApiResponse<T>> => {
  if (isOfflineMode() && !endpoint.includes('health-check')) {
    const storeName = endpoint.includes('/auth') ? 'users' 
      : endpoint.includes('/menu') ? 'menuItems' 
      : endpoint.includes('/tables') ? 'tables' 
      : endpoint.includes('/orders') ? 'orders' 
      : 'restaurants';
    const id = endpoint.split('/').pop() || '';
    if (method === 'GET') {
      const result = id ? await performIndexedDBOperation<T>(storeName, 'get', undefined, id) 
        : await performIndexedDBOperation<T[]>(storeName, 'getAll');
      return { success: true, data: result as T };
    }
    if (['POST', 'PUT', 'PATCH'].includes(method)) {
      const newId = method === 'POST' ? Math.random().toString(36).substring(2, 15) : id;
      await performIndexedDBOperation(storeName, 'put', { ...data, id: newId });
      await addToSyncQueue({ type: method === 'POST' ? 'CREATE' : 'UPDATE', endpoint, method, data, id: newId });
      return { success: true, data: { ...data, id: newId } as T };
    }
    if (method === 'DELETE') {
      await performIndexedDBOperation(storeName, 'put', { id, _deleted: true }, id);
      await addToSyncQueue({ type: 'DELETE', endpoint, method, id });
      return { success: true };
    }
    return { success: false, error: `Unsupported method ${method} in offline mode` };
  }

  if (USE_MOCK_API) return mockApiHandler(endpoint, method, data, token);

  try {
    const response = await fetch(`${getApiBaseUrl()}${endpoint}`, {
      method,
      headers: { 'Content-Type': 'application/json', ...(token && { Authorization: `Bearer ${token}` }) },
      credentials: 'include',
      body: data && ['POST', 'PUT', 'PATCH'].includes(method) ? JSON.stringify(data) : undefined
    });
    const responseData = await response.json();
    if (!response.ok) throw new Error(responseData.error || `Request failed with status ${response.status}`);
    return { success: true, data: responseData };
  } catch (error: any) {
    toast.error(error.message);
    return { success: false, error: error.message };
  }
};

// Mock API handler
const mockApiHandler = async <T>(endpoint: string, method: string, data: any, token?: string): Promise<ApiResponse<T>> => {
  const parts = endpoint.split('/').filter(Boolean);
  const [resource, id, subResource, subId] = parts;
  const mockHandlers: Record<string, any> = {
    auth: mockApi.auth,
    restaurants: mockApi.restaurants,
    menu: mockApi.menu,
    tables: mockApi.tables,
    orders: mockApi.orders
  };
  const handler = mockHandlers[resource];
  if (!handler) return { success: false, error: 'Unhandled mock API endpoint' };
  return handler[method.toLowerCase()](id, subResource, subId, data, token);
};

// API services
export const api = {
  auth: {
    login: (email: string, password: string) => apiRequest<AuthResponse>('/auth/login', 'POST', { email, password }),
    register: (userData: { name: string, email: string, password: string }) => apiRequest<AuthResponse>('/auth/register', 'POST', userData),
    logout: () => apiRequest<void>('/auth/logout', 'POST'),
    getCurrentUser: (token: string) => apiRequest<{ user: User }>('/auth/me', 'GET', undefined, token)
  },
  restaurants: {
    getAll: (token: string) => apiRequest<Restaurant[]>('/restaurants', 'GET', undefined, token),
    getById: (id: string, token: string) => apiRequest<Restaurant>(`/restaurants/${id}`, 'GET', undefined, token),
    create: (data: CreateRestaurantDto, token: string) => apiRequest<Restaurant>('/restaurants', 'POST', data, token),
    update: (id: string, data: Partial<Restaurant>, token: string) => apiRequest<Restaurant>(`/restaurants/${id}`, 'PUT', data, token),
    delete: (id: string, token: string) => apiRequest<void>(`/restaurants/${id}`, 'DELETE', undefined, token)
  },
  // ...similar structure for menu, tables, and orders
  syncData: syncWithServer
};

export default api;
