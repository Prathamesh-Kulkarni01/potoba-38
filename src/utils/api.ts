
import { toast } from "@/components/ui/use-toast";

const API_URL = 'http://localhost:5000/api';

interface ApiOptions {
  method?: string;
  headers?: Record<string, string>;
  body?: any;
  requiresAuth?: boolean;
}

export const api = async (endpoint: string, options: ApiOptions = {}) => {
  const { 
    method = 'GET', 
    headers = {}, 
    body = null, 
    requiresAuth = false 
  } = options;

  // Prepare headers
  const requestHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    ...headers
  };

  // Add auth token if required
  if (requiresAuth) {
    const token = localStorage.getItem('token');
    if (!token) {
      toast({
        title: "Authentication Error",
        description: "You need to be logged in to perform this action",
        variant: "destructive"
      });
      throw new Error('Authentication required');
    }
    requestHeaders['Authorization'] = `Bearer ${token}`;
  }

  // Prepare request options
  const requestOptions: RequestInit = {
    method,
    headers: requestHeaders,
  };

  // Add body if provided
  if (body) {
    requestOptions.body = JSON.stringify(body);
  }

  try {
    // Make the request
    const response = await fetch(`${API_URL}${endpoint}`, requestOptions);
    
    // Check if response is okay
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const errorMessage = errorData.message || `API request failed with status ${response.status}`;
      
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive"
      });
      
      throw new Error(errorMessage);
    }
    
    // Parse and return JSON response
    return await response.json();
  } catch (error) {
    console.error('API request error:', error);
    throw error;
  }
};
