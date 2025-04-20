
import React, { createContext, useContext, useState, useEffect } from 'react';
import { toast } from "sonner";
import { api } from "@/services/api";
import { User, Restaurant } from "@/types/api";

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (name: string, email: string, password: string) => Promise<void>;
  logout: () => void;
  addRestaurant: (restaurant: Omit<Restaurant, 'id'>) => Promise<Restaurant>;
  getCurrentRestaurant: () => Restaurant | undefined;
  setCurrentRestaurantId: (id: string) => void;
  currentRestaurantId: string | null;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export const AuthProvider: React.FC<{children: React.ReactNode}> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentRestaurantId, setCurrentRestaurantId] = useState<string | null>(null);
  
  // Check for existing session on mount
  useEffect(() => {
    const checkAuthStatus = async () => {
      const token = localStorage.getItem('token');
      const storedRestaurantId = localStorage.getItem('currentRestaurantId');
      
      if (token) {
        try {
          const response = await api.auth.getCurrentUser(token);
          
          if (response.success && response.data) {
            setUser(response.data.user);
            
            if (storedRestaurantId) {
              setCurrentRestaurantId(storedRestaurantId);
            } else if (response.data.user.restaurants.length > 0) {
              // Set first restaurant as default if none selected
              setCurrentRestaurantId(response.data.user.restaurants[0].id);
            }
          }
        } catch (error) {
          console.error("Failed to restore session:", error);
          localStorage.removeItem('token');
        }
      }
      
      setLoading(false);
    };
    
    checkAuthStatus();
  }, []);
  
  // Save current restaurant to localStorage whenever it changes
  useEffect(() => {
    if (currentRestaurantId) {
      localStorage.setItem('currentRestaurantId', currentRestaurantId);
    } else {
      localStorage.removeItem('currentRestaurantId');
    }
  }, [currentRestaurantId]);
  
  const login = async (email: string, password: string) => {
    setLoading(true);
    try {
      const response = await api.auth.login(email, password);
      
      if (!response.success || !response.data) {
        throw new Error(response.error || "Login failed");
      }
      
      const { user, token } = response.data;
      
      // Save token to localStorage
      localStorage.setItem('token', token);
      
      setUser(user);
      
      // Set current restaurant to first one if available
      if (user.restaurants.length > 0) {
        setCurrentRestaurantId(user.restaurants[0].id);
      }
      
      toast.success("Logged in successfully!");
    } catch (error) {
      console.error("Login error:", error);
      toast.error("Login failed. Please check your credentials.");
      throw error;
    } finally {
      setLoading(false);
    }
  };
  
  const signup = async (name: string, email: string, password: string) => {
    setLoading(true);
    try {
      const response = await api.auth.register({ name, email, password });
      
      if (!response.success || !response.data) {
        throw new Error(response.error || "Registration failed");
      }
      
      const { user, token } = response.data;
      
      // Save token to localStorage
      localStorage.setItem('token', token);
      
      setUser(user);
      toast.success("Account created successfully!");
    } catch (error) {
      console.error("Signup error:", error);
      toast.error("Failed to create account.");
      throw error;
    } finally {
      setLoading(false);
    }
  };
  
  const logout = () => {
    api.auth.logout().catch(error => {
      console.error("Logout error:", error);
    });
    
    setUser(null);
    setCurrentRestaurantId(null);
    localStorage.removeItem('token');
    localStorage.removeItem('currentRestaurantId');
    toast.info("Logged out successfully");
  };
  
  const addRestaurant = async (restaurant: Omit<Restaurant, 'id'>) => {
    if (!user) throw new Error("User must be logged in to add a restaurant");
    
    const token = localStorage.getItem('token');
    if (!token) throw new Error("Authentication token not found");
    
    try {
      const response = await api.restaurants.create(restaurant, token);
      
      if (!response.success || !response.data) {
        throw new Error(response.error || "Failed to add restaurant");
      }
      
      const newRestaurant = response.data;
      
      // Update user with new restaurant
      const updatedUser = {
        ...user,
        restaurants: [...user.restaurants, newRestaurant]
      };
      
      setUser(updatedUser);
      
      // Set as current restaurant if it's the first one
      if (updatedUser.restaurants.length === 1) {
        setCurrentRestaurantId(newRestaurant.id);
      }
      
      return newRestaurant;
    } catch (error) {
      console.error("Error adding restaurant:", error);
      toast.error("Failed to add restaurant");
      throw error;
    }
  };
  
  const getCurrentRestaurant = () => {
    if (!user || !currentRestaurantId) return undefined;
    return user.restaurants.find(r => r.id === currentRestaurantId);
  };
  
  return (
    <AuthContext.Provider value={{
      user,
      loading,
      login,
      signup,
      logout,
      addRestaurant,
      getCurrentRestaurant,
      setCurrentRestaurantId,
      currentRestaurantId
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
