
import { useAuth } from '@/contexts/AuthContext';

// Base API URL
const API_URL = 'http://localhost:5000/api';

export const useApi = () => {
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

  // Restaurants
  const getRestaurants = async () => {
    try {
      const response = await fetch(`${API_URL}/restaurants`, {
        headers: getAuthHeaders(),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Could not fetch restaurants');
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error fetching restaurants:', error);
      throw error;
    }
  };

  const getRestaurantById = async (id: string) => {
    try {
      const response = await fetch(`${API_URL}/restaurants/${id}`, {
        headers: getAuthHeaders(),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Could not fetch restaurant');
      }
      
      return await response.json();
    } catch (error) {
      console.error(`Error fetching restaurant ${id}:`, error);
      throw error;
    }
  };

  const createRestaurant = async (restaurantData: any) => {
    try {
      console.log('Creating restaurant with token:', token);
      const response = await fetch(`${API_URL}/restaurants`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(restaurantData),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        console.error('Server response:', errorData);
        throw new Error(errorData.message || 'Could not create restaurant');
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error creating restaurant:', error);
      throw error;
    }
  };

  const updateRestaurant = async (id: string, restaurantData: any) => {
    try {
      const response = await fetch(`${API_URL}/restaurants/${id}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify(restaurantData),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Could not update restaurant');
      }
      
      return await response.json();
    } catch (error) {
      console.error(`Error updating restaurant ${id}:`, error);
      throw error;
    }
  };

  const deleteRestaurant = async (id: string) => {
    try {
      const response = await fetch(`${API_URL}/restaurants/${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Could not delete restaurant');
      }
      
      return await response.json();
    } catch (error) {
      console.error(`Error deleting restaurant ${id}:`, error);
      throw error;
    }
  };

  return {
    getRestaurants,
    getRestaurantById,
    createRestaurant,
    updateRestaurant,
    deleteRestaurant
  };
};
