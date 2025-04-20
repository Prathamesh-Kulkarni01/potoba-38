
import React, { createContext, useState, useContext, useEffect, ReactNode } from 'react';
import { User, Restaurant } from '../types/auth';
import authService from '../services/authService';
import { toast } from '@/hooks/use-toast';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string, role?: string) => Promise<void>;
  signup: (name: string, email: string, password: string, role?: string) => Promise<void>;
  logout: () => void;
  isAuthenticated: () => boolean;
  hasRole: (role: string | string[]) => boolean;
  hasPermission: (permission: string | string[]) => boolean;
  getCurrentRestaurant: () => Restaurant | undefined;
  currentRestaurantId: string | null;
  setCurrentRestaurantId: (id: string) => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentRestaurantId, setCurrentRestaurantId] = useState<string | null>(null);

  const refreshUser = async () => {
    try {
      if (authService.isAuthenticated()) {
        const currentUser = await authService.getCurrentUser();
        setUser(currentUser);
        
        // Set the first restaurant as the current one when user changes
        if (currentUser?.restaurants && currentUser.restaurants.length > 0 && !currentRestaurantId) {
          setCurrentRestaurantId(currentUser.restaurants[0].id);
        }
      }
    } catch (error) {
      console.error('Failed to refresh user data', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Check if user is already logged in on component mount
    refreshUser();
  }, []);

  const login = async (email: string, password: string) => {
    setLoading(true);
    setError(null);
    try {
      const { user } = await authService.login(email, password);
      setUser(user);
      
      // Set the first restaurant as the current one if available
      if (user.restaurants && user.restaurants.length > 0) {
        setCurrentRestaurantId(user.restaurants[0].id);
      }
      
      toast({
        title: "Login successful",
        description: `Welcome back, ${user.name || 'user'}!`,
      });
    } catch (err) {
      const errorMsg = 'Failed to login. Please check your credentials.';
      setError(errorMsg);
      toast({
        variant: "destructive",
        title: "Login failed",
        description: errorMsg,
      });
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const register = async (email: string, password: string, name: string, role?: string) => {
    setLoading(true);
    setError(null);
    try {
      const { user } = await authService.register(email, password, name, role);
      setUser(user);
      toast({
        title: "Registration successful",
        description: `Welcome, ${user.name || 'user'}!`,
      });
    } catch (err) {
      const errorMsg = 'Failed to register. Please try again.';
      setError(errorMsg);
      toast({
        variant: "destructive",
        title: "Registration failed",
        description: errorMsg,
      });
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Alias for register to maintain compatibility
  const signup = async (name: string, email: string, password: string, role?: string) => {
    return register(email, password, name, role);
  };

  const logout = () => {
    authService.logout();
    setUser(null);
    setCurrentRestaurantId(null);
    toast({
      title: "Logged out",
      description: "You have been successfully logged out.",
    });
  };

  const isAuthenticated = () => {
    return authService.isAuthenticated();
  };

  const hasRole = (roleToCheck: string | string[]) => {
    if (!user) return false;
    
    const roles = Array.isArray(roleToCheck) ? roleToCheck : [roleToCheck];
    
    // Admin has all roles
    if (user.role === 'admin') return true;
    
    return roles.includes(user.role || '');
  };

  const hasPermission = (permissionToCheck: string | string[]) => {
    if (!user) return false;
    
    // Admin has all permissions
    if (user.role === 'admin') return true;
    
    const permissions = Array.isArray(permissionToCheck) ? permissionToCheck : [permissionToCheck];
    
    return user.permissions?.some(p => permissions.includes(p)) || false;
  };

  const getCurrentRestaurant = () => {
    if (!user || !user.restaurants || !currentRestaurantId) return undefined;
    
    return user.restaurants.find(restaurant => restaurant.id === currentRestaurantId);
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
      hasRole,
      hasPermission,
      getCurrentRestaurant,
      currentRestaurantId,
      setCurrentRestaurantId,
      refreshUser
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
