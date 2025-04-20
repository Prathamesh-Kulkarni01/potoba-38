import { useAuth } from '@/contexts/AuthContext';
import { ApiResponse, Category, MenuItem, Order, Restaurant, Table } from '@/types/api';

// Base API URL
const API_URL = '/api';

export const useAuthHeaders = () => {
  const { token } = useAuth();

  const getAuthHeaders = () => {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    return headers;
  };

  return { getAuthHeaders };
};

// Generalized API request function
const request = async <T>(
  method: string,
  url: string,
  {
    params = '',
    data = null,
  }: { params?: string; data?: any } = {},
  headers: Record<string, string> = {}
): Promise<T> => {
  try {
    const fullUrl = `${API_URL}/${url}${params ? `/${params}` : ''}`;
    const options: RequestInit = {
      method,
      headers,
      ...(data && { body: JSON.stringify(data) }),
    };

    const response = await fetch(fullUrl, options);

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error?.message || 'Request failed');
    }

    const responseData = await response.json();
    return responseData?.data?.data || responseData?.data || responseData;
  } catch (error: any) {
    console.error(`Error during API request to ${url}:`, error);
    throw new Error(error?.message || 'Network error');
  }
};

// Custom hook to use API
export const useApi = () => {
  const { getAuthHeaders } = useAuthHeaders();
  const headers = getAuthHeaders();

  return {
    menu: {
      get: (restaurantId: string) =>
        request<MenuItem[]>('GET', `restaurants/${restaurantId}/menu`, {}, headers),
      getById: (restaurantId: string, id: string) =>
        request<MenuItem>('GET', `restaurants/${restaurantId}/menu/${id}`, {}, headers),
      create: (restaurantId: string, data: any) =>
        request('POST', `restaurants/${restaurantId}/menu`, { data }, headers),
      update: (restaurantId: string, id: string, data: any) =>
        request('PUT', `restaurants/${restaurantId}/menu/${id}`, { data }, headers),
      delete: (restaurantId: string, id: string) =>
        request('DELETE', `restaurants/${restaurantId}/menu/${id}`, {}, headers),
    },

    table: {
      get: (restaurantId: string) =>
        request<Table[]>('GET', `restaurants/${restaurantId}/tables`, {}, headers),
      getById: (restaurantId: string, id: string) =>
        request<Table>('GET', `restaurants/${restaurantId}/tables/${id}`, {}, headers),
      create: (restaurantId: string, data: any) =>
        request('POST', `restaurants/${restaurantId}/tables`, { data }, headers),
      update: (restaurantId: string, id: string, data: any) =>
        request('PUT', `restaurants/${restaurantId}/tables/${id}`, { data }, headers),
      delete: (restaurantId: string, id: string) =>
        request('DELETE', `restaurants/${restaurantId}/tables/${id}`, {}, headers),
      createDefault: async (restaurantId: string, count: number = 10) => {
        const existingTables = await request<Table[]>(
          'GET',
          `restaurants/${restaurantId}/tables`,
          {},
          headers
        );

        const existingTableNumbers = new Set(
          existingTables.map((table: any) => table.number)
        );

        const tables = [];
        for (let i = 1; tables.length < count; i++) {
          if (!existingTableNumbers.has(i)) {
            tables.push({
              number: i,
              capacity: Math.floor(Math.random() * 3) + 2,
              status: 'available',
            });
          }
        }

        return Promise.all(
          tables.map(table =>
            request('POST', `restaurants/${restaurantId}/tables`, { data: table }, headers)
          )
        );
      },
    },

    order: {
      get: (restaurantId: string) =>
        request<Order[]>('GET', `restaurants/${restaurantId}/orders`, {}, headers),
      getById: (restaurantId: string, id: string) =>
        request<Order>('GET', `restaurants/${restaurantId}/orders/${id}`, {}, headers),
      create: (restaurantId: string, data: any) =>
        request('POST', `restaurants/${restaurantId}/orders`, { data }, headers),
      update: (restaurantId: string, id: string, data: any) =>
        request('PUT', `restaurants/${restaurantId}/orders/${id}`, { data }, headers),
      delete: (restaurantId: string, id: string) =>
        request('DELETE', `restaurants/${restaurantId}/orders/${id}`, {}, headers),
      updateStatus: (restaurantId: string, id: string, statusData: any) =>
        request('PATCH', `restaurants/${restaurantId}/orders/${id}/status`, { data: statusData }, headers),
    },

    restaurant: {
      get: () => request<Restaurant[]>('GET', 'restaurants', {}, headers),
      getById: (id: string) => request<Restaurant>('GET', `restaurants/${id}`, {}, headers),
      create: (data: any) => request('POST', 'restaurants', { data }, headers),
      update: (id: string, data: any) =>
        request('PUT', `restaurants/${id}`, { data }, headers),
      delete: (id: string) => request('DELETE', `restaurants/${id}`, {}, headers),
      createDemoData: (id: string) =>
        request('POST', `restaurants/${id}/demo-data`, {}, headers),
    },

    category: {
      get: (restaurantId: string) =>
        request<Category[]>('GET', `restaurants/${restaurantId}/categories`, {}, headers),
      create: (restaurantId: string, data: any) =>
        request('POST', `restaurants/${restaurantId}/categories`, { data }, headers),
    },

    sync: {
      post: () => request('POST', 'sync-databases', {}, headers),
    },
  };
};

export default useApi;
