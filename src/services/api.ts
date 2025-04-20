import { useAuth } from '@/contexts/AuthContext';
import { ApiResponse, Restaurant, MenuItem, Table, Order } from '@/types/api';

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

// Helper function for API requests
const fetchWithAuth = async (url: string, options: RequestInit, headers: Record<string, string>) => {
  try {
    const response = await fetch(url, { ...options, headers });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Request failed');
    }

    const data = await response.json();
    return { success: true, data: data.data || data };
  } catch (error) {
    console.error(`Error during API request to ${url}:`, error);
    return { success: false, error: error.message || 'Network error' };
  }
};

// API functions
const api = {
  // Menu
  getMenuItems: (restaurantId: string, headers: Record<string, string>): Promise<ApiResponse<MenuItem[]>> =>
    fetchWithAuth(`${API_URL}/restaurants/${restaurantId}/menu`, {}, headers),

  createMenuItem: (restaurantId: string, menuItemData: any, headers: Record<string, string>) =>
    fetchWithAuth(`${API_URL}/restaurants/${restaurantId}/menu`, {
      method: 'POST',
      body: JSON.stringify(menuItemData),
    }, headers),

  // Tables
  getTables: (restaurantId: string, headers: Record<string, string>): Promise<ApiResponse<Table[]>> =>
    fetchWithAuth(`${API_URL}/restaurants/${restaurantId}/tables`, {}, headers),

  // Orders
  getOrders: (restaurantId: string, headers: Record<string, string>): Promise<ApiResponse<Order[]>> =>
    fetchWithAuth(`${API_URL}/restaurants/${restaurantId}/orders`, {}, headers),

  // Restaurants
  getRestaurants: (headers: Record<string, string>): Promise<ApiResponse<Restaurant[]>> =>
    fetchWithAuth(`${API_URL}/restaurants`, {}, headers),

  getRestaurantById: (id: string, headers: Record<string, string>): Promise<ApiResponse<Restaurant>> =>
    fetchWithAuth(`${API_URL}/restaurants/${id}`, {}, headers),

  createRestaurant: (restaurantData: any, headers: Record<string, string>): Promise<ApiResponse<Restaurant>> =>
    fetchWithAuth(`${API_URL}/restaurants`, {
      method: 'POST',
      body: JSON.stringify(restaurantData),
    }, headers),

  updateRestaurant: (id: string, restaurantData: any, headers: Record<string, string>): Promise<ApiResponse<Restaurant>> =>
    fetchWithAuth(`${API_URL}/restaurants/${id}`, {
      method: 'PUT',
      body: JSON.stringify(restaurantData),
    }, headers),

  deleteRestaurant: (id: string, headers: Record<string, string>): Promise<ApiResponse<null>> =>
    fetchWithAuth(`${API_URL}/restaurants/${id}`, {
      method: 'DELETE',
    }, headers),

  // Categories
  getCategories: (restaurantId: string, headers: Record<string, string>): Promise<ApiResponse<any[]>> =>
    fetchWithAuth(`${API_URL}/restaurants/${restaurantId}/categories`, {}, headers),

  createCategory: (restaurantId: string, categoryData: any, headers: Record<string, string>): Promise<ApiResponse<any>> =>
    fetchWithAuth(`${API_URL}/restaurants/${restaurantId}/categories`, {
      method: 'POST',
      body: JSON.stringify(categoryData),
    }, headers),
};

// Custom hook to use API
export const useApi = () => {
  const { getAuthHeaders } = useAuthHeaders();

  const headers = getAuthHeaders();

  return {
    ...api,
    headers,
  };
};

export default api;
