
import axios from 'axios';
import { AuthResponse } from '../types/auth';

const API_URL = 'http://localhost:5000/api';

export const authService = {
  async login(email: string, password: string) {
    try {
      const response = await axios.post<AuthResponse>(`${API_URL}/auth/login`, { email, password });
      const { token, user } = response.data.data;
      
      // Store token in localStorage
      localStorage.setItem('token', token);
      
      return { token, user };
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  },
  
  async register(email: string, password: string, name: string, role?: string) {
    try {
      const response = await axios.post<AuthResponse>(`${API_URL}/auth/register`, { email, password, name, role });
      const { token, user } = response.data.data;
      
      // Store token in localStorage
      localStorage.setItem('token', token);
      
      return { token, user };
    } catch (error) {
      console.error('Registration error:', error);
      throw error;
    }
  },
  
  logout() {
    localStorage.removeItem('token');
  },
  
  getToken() {
    return localStorage.getItem('token');
  },
  
  isAuthenticated() {
    return !!this.getToken();
  },

  async updateUserRole(userId: string, role: string, permissions?: string[]) {
    try {
      const token = this.getToken();
      if (!token) throw new Error('Not authenticated');

      const response = await axios.put(
        `${API_URL}/auth/users/${userId}/role`, 
        { role, permissions },
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );
      
      return response.data.data.user;
    } catch (error) {
      console.error('Update user role error:', error);
      throw error;
    }
  },
  
  async getCurrentUser() {
    try {
      const token = this.getToken();
      if (!token) throw new Error('Not authenticated');

      const response = await axios.get(`${API_URL}/auth/me`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      
      return response.data.data.user;
    } catch (error) {
      console.error('Get current user error:', error);
      throw error;
    }
  }
};

export default authService;
