
import { jwtDecode } from 'jwt-decode';

// Base URL for API
const API_URL = '/api';

// Store token in localStorage
export const storeToken = (token) => {
  localStorage.setItem('token', token);
};

// Get token from localStorage
export const getToken = () => {
  return localStorage.getItem('token');
};

// Remove token from localStorage
export const removeToken = () => {
  localStorage.removeItem('token');
};

// Check if user is authenticated
export const isAuthenticated = () => {
  const token = getToken();
  if (!token) return false;
  
  try {
    const decoded = jwtDecode(token);
    const currentTime = Date.now() / 1000;
    
    // Check if token is expired
    if (decoded.exp < currentTime) {
      removeToken();
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Token validation error:', error);
    removeToken();
    return false;
  }
};

// Get user role from token
export const getUserRole = () => {
  try {
    const token = getToken();
    if (!token) return null;
    
    const decoded = jwtDecode(token);
    return decoded.role;
  } catch (error) {
    console.error('Get user role error:', error);
    return null;
  }
};

// Check if user has specific role
export const hasRole = (role) => {
  return getUserRole() === role;
};

// Get user info from token
export const getUserInfo = () => {
  try {
    const token = getToken();
    if (!token) return null;
    
    return jwtDecode(token);
  } catch (error) {
    console.error('Get user info error:', error);
    return null;
  }
};

// API request with auth header
export const authFetch = async (endpoint, options = {}) => {
  const token = getToken();
  
  const headers = {
    'Content-Type': 'application/json',
    ...(token && { 'Authorization': `Bearer ${token}` }),
    ...options.headers
  };
  
  const config = {
    ...options,
    headers,
    credentials: 'include'
  };
  
  try {
    const response = await fetch(`${API_URL}${endpoint}`, config);
    
    // If response is 401 Unauthorized, clear token and redirect to login
    if (response.status === 401) {
      removeToken();
      window.location.href = '/login';
      return null;
    }
    
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.message || 'Something went wrong');
    }
    
    return data;
  } catch (error) {
    console.error('Auth fetch error:', error);
    throw error;
  }
};

// Refresh token
export const refreshToken = async () => {
  try {
    const data = await authFetch('/auth/refresh-token', { method: 'POST' });
    if (data && data.token) {
      storeToken(data.token);
      return true;
    }
    return false;
  } catch (error) {
    console.error('Token refresh error:', error);
    return false;
  }
};

// Login user
export const loginUser = async (credentials) => {
  try {
    const response = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(credentials),
      credentials: 'include'
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.message || 'Login failed');
    }
    
    if (data.token) {
      storeToken(data.token);
    }
    
    return data;
  } catch (error) {
    console.error('Login error:', error);
    throw error;
  }
};

// Register user
export const registerUser = async (userData) => {
  try {
    const response = await fetch(`${API_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(userData),
      credentials: 'include'
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.message || 'Registration failed');
    }
    
    if (data.token) {
      storeToken(data.token);
    }
    
    return data;
  } catch (error) {
    console.error('Registration error:', error);
    throw error;
  }
};

// Logout user
export const logoutUser = () => {
  removeToken();
  // Redirect to home page or login page
  window.location.href = '/';
};
