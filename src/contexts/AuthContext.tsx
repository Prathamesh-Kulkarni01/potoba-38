
import React, { createContext, useContext, useState, useEffect } from 'react';
import { toast } from "@/hooks/use-toast";
import { api } from "@/services/api";
import { mockApi } from "@/services/mockApi"; 
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
              localStorage.setItem('currentRestaurantId', response.data.user.restaurants[0].id);
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
      if (user.restaurants && user.restaurants.length > 0) {
        setCurrentRestaurantId(user.restaurants[0].id);
      }
      
      toast({
        description: "Logged in successfully!",
      });
    } catch (error) {
      console.error("Login error:", error);
      
      // Try using mock API as fallback in development
      try {
        const mockResponse = await mockApi.auth.login(email, password);
        if (mockResponse.success && mockResponse.data) {
          const { user, token } = mockResponse.data;
          
          // Save token to localStorage
          localStorage.setItem('token', token);
          
          setUser(user);
          
          // Set current restaurant to first one if available
          if (user.restaurants && user.restaurants.length > 0) {
            setCurrentRestaurantId(user.restaurants[0].id);
          }
          
          toast({
            description: "Logged in successfully with mock data!",
          });
          return;
        }
      } catch (mockError) {
        console.error("Mock login also failed:", mockError);
      }
      
      toast({
        variant: "destructive",
        description: "Login failed. Please check your credentials.",
      });
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
      
      // Save token to localStorage - ensure this line executes
      console.log('Saving token to localStorage:', token);
      localStorage.setItem('token', token);
      
      setUser(user);
      toast({
        description: "Account created successfully!",
      });
    } catch (error) {
      console.error("Signup error:", error);
      
      // Try mock API as fallback
      try {
        const mockResponse = await mockApi.auth.register({ name, email, password });
        if (mockResponse.success && mockResponse.data) {
          const { user, token } = mockResponse.data;
          
          // Save token to localStorage - ensure this executes in mock flow too
          console.log('Saving mock token to localStorage:', token);
          localStorage.setItem('token', token);
          
          setUser(user);
          toast({
            description: "Account created successfully with mock data!",
          });
          return;
        }
      } catch (mockError) {
        console.error("Mock signup also failed:", mockError);
      }
      
      toast({
        variant: "destructive",
        description: "Failed to create account.",
      });
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
    toast({
      description: "Logged out successfully",
    });
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
        restaurants: [...(user.restaurants || []), newRestaurant]
      };
      
      setUser(updatedUser);
      
      // Set as current restaurant if it's the first one
      if (!updatedUser.restaurants || updatedUser.restaurants.length === 1) {
        setCurrentRestaurantId(newRestaurant.id);
      }
      
      return newRestaurant;
    } catch (error) {
      console.error("Error adding restaurant:", error);
      
      // Try mock API as fallback
      try {
        const mockResponse = await mockApi.restaurants.create(restaurant, "mock-jwt-token");
        if (mockResponse.success && mockResponse.data) {
          const newRestaurant = mockResponse.data;
          
          // Update user with new restaurant
          const updatedUser = {
            ...user,
            restaurants: [...(user.restaurants || []), newRestaurant]
          };
          
          setUser(updatedUser);
          
          // Set as current restaurant if it's the first one
          if (!updatedUser.restaurants || updatedUser.restaurants.length === 1) {
            setCurrentRestaurantId(newRestaurant.id);
          }
          
          toast({
            description: "Restaurant added successfully (mock mode)",
          });
          return newRestaurant;
        }
      } catch (mockError) {
        console.error("Mock API also failed:", mockError);
      }
      
      toast({
        variant: "destructive",
        description: "Failed to add restaurant",
      });
      throw error;
    }
  };
  
  const getCurrentRestaurant = () => {
    if (!user || !currentRestaurantId || !user.restaurants) return undefined;
    return user.restaurants.find(r => r.id === currentRestaurantId);
  };
  
  // Make sure all context values are always provided - no conditionals!
  const contextValue = {
    user,
    loading,
    login,
    signup,
    logout,
    addRestaurant,
    getCurrentRestaurant,
    setCurrentRestaurantId,
    currentRestaurantId
  };
  
  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
