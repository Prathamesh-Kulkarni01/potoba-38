
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
          console.log('Auth status response:', response);
          
          if (response.success && response.data) {
            // Extract user from nested data structure
            const userData = response.data.data && response.data.data.user 
              ? response.data.data.user 
              : response.data.user 
                ? response.data.user 
                : response.data;
            
            console.log('Extracted user data:', userData);
            
            // Ensure userData is a User object, not an object containing User
            const actualUser = (userData as any).user ? (userData as any).user : userData;
            setUser(actualUser as User);
            
            if (storedRestaurantId) {
              setCurrentRestaurantId(storedRestaurantId);
            } else if (actualUser.restaurants && actualUser.restaurants.length > 0) {
              // Set first restaurant as default if none selected
              setCurrentRestaurantId(actualUser.restaurants[0].id);
              localStorage.setItem('currentRestaurantId', actualUser.restaurants[0].id);
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
      console.log('Attempting login...');
      const response = await api.auth.login(email, password);
      console.log('Login response:', response);
      
      if (!response.success || !response.data) {
        throw new Error(response.error || "Login failed");
      }
      
      // Extract data from potentially nested response
      const responseData = response.data.data || response.data;
      const user = responseData.user;
      const token = responseData.token;
      
      console.log('Extracted user:', user);
      console.log('Extracted token:', token);
      
      // Save token to localStorage
      console.log('Saving token to localStorage:', token);
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
      
      toast({
        variant: "destructive",
        description: `Login failed: ${error}`,
      });
      throw error;
    } finally {
      setLoading(false);
    }
  };
  
  const signup = async (name: string, email: string, password: string) => {
    setLoading(true);
    try {
      console.log('Attempting signup with API...');
      const response = await api.auth.register({ name, email, password });
      console.log('API signup response:', response);
      
      if (!response.success || !response.data) {
        throw new Error(response.error || "Registration failed");
      }
      
      // Handle the nested data structure in the response
      const userData = response.data.data || response.data;
      const user = userData.user;
      const token = userData.token;
      
      console.log('Extracted user:', user);
      console.log('Extracted token:', token);
      
      // Save token to localStorage
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
        console.log('Attempting signup with mock API...');
        const mockResponse = await mockApi.auth.register({ name, email, password });
        
        if (mockResponse.success && mockResponse.data) {
          console.log('Mock API signup response:', mockResponse.data);
          
          const userData = mockResponse.data.data || mockResponse.data;
          const user = userData.user;
          const token = userData.token;
          
          console.log('Saving mock token to localStorage:', token);
          localStorage.setItem('token', token);
          
          setUser(user);
          
          toast({
            description: "Account created successfully (mock mode)",
          });
          return;
        }
      } catch (mockError) {
        console.error("Mock API signup also failed:", mockError);
      }
      
      toast({
        variant: "destructive",
        description: `Failed to create account: ${error}`,
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
      console.log('Add restaurant response:', response);
      
      if (!response.success || !response.data) {
        throw new Error(response.error || "Failed to add restaurant");
      }
      
      // Extract restaurant from potentially nested response
      const newRestaurant = response.data.data || response.data;
      console.log('Extracted restaurant:', newRestaurant);
      
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
        const mockResponse = await mockApi.restaurants.create(restaurant);
        if (mockResponse.success && mockResponse.data) {
          const newRestaurant = mockResponse.data.data || mockResponse.data;
          
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
