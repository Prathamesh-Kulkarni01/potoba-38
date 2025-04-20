
import axios from 'axios';
import { AuthResponse } from '../types/auth';

const API_URL = import.meta.env.VITE_API_URL; // Use the environment variable

export const authService = {
  async login(email: string, password: string) {
    try {
      const response = await axios.post<AuthResponse>(`/api/auth/login`, // Use the API_URL
        { email, password },
        { withCredentials: true }
      );
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
      const response = await axios.post<AuthResponse>(`/api/auth/register`, // Use the API_URL
        { email, password, name, role },
        { withCredentials: true }
      );
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
        `/api/auth/users/${userId}/role`, // Use the API_URL
        { role, permissions },
        {
          headers: {
            Authorization: `Bearer ${token}`
          },
          withCredentials: true
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

      const response = await axios.get(`/api/auth/me`, { // Use the API_URL
        headers: {
          Authorization: `Bearer ${token}`
        },
        withCredentials: true
      });
      
      return response.data.data.user;
    } catch (error) {
      console.error('Get current user error:', error);
      throw error;
    }
  }
};

export default authService;
