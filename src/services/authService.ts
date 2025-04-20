
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
  
  async register(email: string, password: string, name: string) {
    try {
      const response = await axios.post<AuthResponse>(`${API_URL}/auth/register`, { email, password, name });
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
  }
};

export default authService;
