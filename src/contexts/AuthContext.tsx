
import React, { createContext, useState, useContext, useEffect, ReactNode } from 'react';
import { User, Restaurant } from '../types/auth';
import authService from '../services/authService';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string) => Promise<void>;
  signup: (name: string, email: string, password: string) => Promise<void>;
  logout: () => void;
  isAuthenticated: () => boolean;
  getCurrentRestaurant: () => Restaurant | undefined;
  currentRestaurantId: string | null;
  setCurrentRestaurantId: (id: string) => void;
  addRestaurant: (restaurant: Partial<Restaurant>) => Promise<Restaurant>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentRestaurantId, setCurrentRestaurantId] = useState<string | null>(null);

  useEffect(() => {
    // Check if user is already logged in
    const token = authService.getToken();
    if (token) {
      // You might want to verify the token and get user info
      // For now, we'll just set a placeholder user
      setUser({ id: '1', email: 'user@example.com' });
    }
  }, []);

  // Set the first restaurant as the current one when user changes
  useEffect(() => {
    if (user?.restaurants && user.restaurants.length > 0 && !currentRestaurantId) {
      setCurrentRestaurantId(user.restaurants[0].id);
    }
  }, [user, currentRestaurantId]);

  const login = async (email: string, password: string) => {
    setLoading(true);
    setError(null);
    try {
      const { user } = await authService.login(email, password);
      setUser(user);
    } catch (err) {
      setError('Failed to login. Please check your credentials.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const register = async (email: string, password: string, name: string) => {
    setLoading(true);
    setError(null);
    try {
      const { user } = await authService.register(email, password, name);
      setUser(user);
    } catch (err) {
      setError('Failed to register. Please try again.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Alias for register to maintain compatibility
  const signup = async (name: string, email: string, password: string) => {
    return register(email, password, name);
  };

  const logout = () => {
    authService.logout();
    setUser(null);
    setCurrentRestaurantId(null);
  };

  const isAuthenticated = () => {
    return authService.isAuthenticated();
  };

  const getCurrentRestaurant = () => {
    if (!user || !user.restaurants || !currentRestaurantId) return undefined;
    
    return user.restaurants.find(restaurant => restaurant.id === currentRestaurantId);
  };

  const addRestaurant = async (restaurantData: Partial<Restaurant>): Promise<Restaurant> => {
    setLoading(true);
    setError(null);
    
    try {
      // In a real app, this would call an API endpoint to create a restaurant
      // For now, we'll simulate it with mock data
      const newRestaurant: Restaurant = {
        id: `restaurant-${Math.floor(Math.random() * 1000)}`,
        name: restaurantData.name || 'New Restaurant',
        ...restaurantData
      };
      
      // Add the new restaurant to the user's restaurants array
      const updatedUser = {
        ...user!,
        restaurants: [...(user?.restaurants || []), newRestaurant]
      };
      
      setUser(updatedUser);
      setCurrentRestaurantId(newRestaurant.id);
      
      return newRestaurant;
    } catch (err) {
      setError('Failed to add restaurant. Please try again.');
      console.error(err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      loading, 
      error, 
      login, 
      register, 
      signup,
      logout, 
      isAuthenticated, 
      getCurrentRestaurant,
      currentRestaurantId,
      setCurrentRestaurantId,
      addRestaurant
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
