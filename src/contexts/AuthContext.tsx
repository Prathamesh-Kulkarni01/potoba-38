
import React, { createContext, useContext, useState, useEffect } from 'react';
import { toast } from "sonner";

// Types
export interface User {
  id: string;
  name: string;
  email: string;
  restaurants: Restaurant[];
}

export interface Restaurant {
  id: string;
  name: string;
  logo?: string;
  description?: string;
  address?: string;
  phone?: string;
  cuisine?: string;
  tables?: number;
}

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

// Dummy API functions
const dummyApiLogin = async (email: string, password: string): Promise<User> => {
  // Simulate API call delay
  await new Promise(resolve => setTimeout(resolve, 800));
  
  // Check credentials (in real app, this would be done on server)
  if (email === 'demo@example.com' && password === 'password') {
    return {
      id: 'user-1',
      name: 'Demo User',
      email: 'demo@example.com',
      restaurants: [
        {
          id: 'rest-1',
          name: 'Potoba Restaurant',
          logo: '/images/potoba-logo.svg',
          description: 'Authentic cuisine with a modern twist',
          cuisine: 'Fusion',
          tables: 20,
        }
      ]
    };
  }
  
  throw new Error('Invalid credentials');
};

const dummyApiSignup = async (name: string, email: string, password: string): Promise<User> => {
  // Simulate API call delay
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // In a real app, this would create a new user in the database
  return {
    id: 'user-' + Math.random().toString(36).substring(2, 9),
    name,
    email,
    restaurants: []
  };
};

const dummyApiAddRestaurant = async (userId: string, restaurant: Omit<Restaurant, 'id'>): Promise<Restaurant> => {
  // Simulate API call delay
  await new Promise(resolve => setTimeout(resolve, 800));
  
  // In a real app, this would add a restaurant to the database
  return {
    ...restaurant,
    id: 'rest-' + Math.random().toString(36).substring(2, 9),
  };
};

export const AuthProvider: React.FC<{children: React.ReactNode}> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentRestaurantId, setCurrentRestaurantId] = useState<string | null>(null);
  
  // Check for existing session on mount
  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    const storedRestaurantId = localStorage.getItem('currentRestaurantId');
    
    if (storedUser) {
      setUser(JSON.parse(storedUser));
      if (storedRestaurantId) {
        setCurrentRestaurantId(storedRestaurantId);
      } else if (JSON.parse(storedUser).restaurants.length > 0) {
        // Set first restaurant as default if none selected
        setCurrentRestaurantId(JSON.parse(storedUser).restaurants[0].id);
      }
    }
    
    setLoading(false);
  }, []);
  
  // Save user and current restaurant to localStorage whenever they change
  useEffect(() => {
    if (user) {
      localStorage.setItem('user', JSON.stringify(user));
    } else {
      localStorage.removeItem('user');
    }
  }, [user]);
  
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
      const userData = await dummyApiLogin(email, password);
      setUser(userData);
      
      // Set current restaurant to first one if available
      if (userData.restaurants.length > 0) {
        setCurrentRestaurantId(userData.restaurants[0].id);
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
      const userData = await dummyApiSignup(name, email, password);
      setUser(userData);
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
    setUser(null);
    setCurrentRestaurantId(null);
    localStorage.removeItem('user');
    localStorage.removeItem('currentRestaurantId');
    toast.info("Logged out successfully");
  };
  
  const addRestaurant = async (restaurant: Omit<Restaurant, 'id'>) => {
    if (!user) throw new Error("User must be logged in to add a restaurant");
    
    try {
      const newRestaurant = await dummyApiAddRestaurant(user.id, restaurant);
      
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
