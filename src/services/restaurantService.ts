
import axios from 'axios';
import { Restaurant } from '../types/auth';
import authService from './authService';

const API_URL = 'http://localhost:5000/api';

export const restaurantService = {
  async getRestaurants() {
    try {
      const token = authService.getToken();
      if (!token) throw new Error('Not authenticated');

      const response = await axios.get(`${API_URL}/restaurants`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      
      return response.data.data;
    } catch (error) {
      console.error('Get restaurants error:', error);
      throw error;
    }
  },
  
  async getRestaurant(id: string) {
    try {
      const token = authService.getToken();
      if (!token) throw new Error('Not authenticated');

      const response = await axios.get(`${API_URL}/restaurants/${id}`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      
      return response.data.data;
    } catch (error) {
      console.error('Get restaurant error:', error);
      throw error;
    }
  },
  
  async createRestaurant(data: Partial<Restaurant>) {
    try {
      const token = authService.getToken();
      if (!token) throw new Error('Not authenticated');

      const response = await axios.post(`${API_URL}/restaurants`, data, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      
      return response.data.data;
    } catch (error) {
      console.error('Create restaurant error:', error);
      throw error;
    }
  },
  
  async createDefaultTables(restaurantId: string, count: number = 10) {
    try {
      const token = authService.getToken();
      if (!token) throw new Error('Not authenticated');
      
      const tables = [];
      for (let i = 1; i <= count; i++) {
        tables.push({
          number: i,
          capacity: Math.floor(Math.random() * 3) + 2, // 2-4 people
          status: 'available'
        });
      }
      
      // Create tables in sequence
      const createdTables = [];
      for (const table of tables) {
        const response = await axios.post(
          `${API_URL}/restaurants/${restaurantId}/tables`, 
          table,
          {
            headers: {
              Authorization: `Bearer ${token}`
            }
          }
        );
        createdTables.push(response.data.data);
      }
      
      return createdTables;
    } catch (error) {
      console.error('Create default tables error:', error);
      throw error;
    }
  },
  
  async createDemoData(restaurantId: string) {
    try {
      const token = authService.getToken();
      if (!token) throw new Error('Not authenticated');

      const response = await axios.post(
        `${API_URL}/restaurants/${restaurantId}/demo-data`,
        {},
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );
      
      return response.data.data;
    } catch (error) {
      console.error('Create demo data error:', error);
      throw error;
    }
  }
};

export default restaurantService;
