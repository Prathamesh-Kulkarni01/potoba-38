import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useToast } from '@/components/ui/use-toast';
import { Restaurant } from '@/types/auth';
import authService from '@/services/authService';

// Adjust the User type to make _id optional
interface User {
  _id?: string; // Made optional to match the userWithDefaults object
  id: string;
  name: string;
  email: string;
  role: 'user' | 'admin' | 'manager' | 'staff';
  permissions?: string[];
  restaurants?: Restaurant[];
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: () => boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  signup: (name: string, email: string, password: string, role?: string) => Promise<void>;
  logout: () => void;
  getCurrentRestaurant: () => Restaurant | undefined;
  currentRestaurantId: string | null;
  setCurrentRestaurantId: (id: string) => void;
  hasPermission: (permission: string) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
  navigate: (path: string) => void;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children, navigate }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [currentRestaurantId, setCurrentRestaurantId] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    const storedToken = localStorage.getItem('token');
    if (storedToken) {
      setToken(storedToken);
      fetchCurrentUser(storedToken);
    } else {
      setIsLoading(false);
    }
    
    const storedRestaurantId = localStorage.getItem('currentRestaurantId');
    if (storedRestaurantId) {
      setCurrentRestaurantId(storedRestaurantId);
    }
  }, []);

  useEffect(() => {
    if (currentRestaurantId) {
      localStorage.setItem('currentRestaurantId', currentRestaurantId);
    }
  }, [currentRestaurantId]);

  const fetchCurrentUser = async (authToken: string) => {
    setIsLoading(true);
    try {
      const user = await authService.getCurrentUser();
      console.log("Fetched user data:", user);

      const userWithDefaults = {
        ...user,
        role: user.role || 'user',
        permissions: user.permissions || getDefaultPermissions(user.role || 'user')
      };

      console.log("User with defaults:", userWithDefaults);
      setUser(userWithDefaults);

      if (userWithDefaults.restaurants && userWithDefaults.restaurants.length > 0) {
        const firstRestaurant = userWithDefaults.restaurants[0];
        if (!currentRestaurantId && firstRestaurant) {
          setCurrentRestaurantId(firstRestaurant.id || firstRestaurant._id);
        }
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
      localStorage.removeItem('token');
      setToken(null);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const { token, user } = await authService.login(email, password);
      localStorage.setItem('token', token);
      setToken(token);

      const userRole = user.role || 'user';
      console.log("User role from server:", userRole);

      const userWithDefaults = {
        ...user,
        role: userRole,
        permissions: user.permissions || getDefaultPermissions(userRole)
      };

      console.log("User with defaults:", userWithDefaults);
      setUser(userWithDefaults);

      if (userWithDefaults.restaurants && userWithDefaults.restaurants.length > 0) {
        const firstRestaurant = userWithDefaults.restaurants[0];
        const restaurantId = firstRestaurant.id || firstRestaurant._id;
        if (restaurantId) {
          setCurrentRestaurantId(restaurantId);
        }
      }

      toast({
        title: "Login successful",
        description: "You've been logged in",
      });
    } catch (error) {
      console.error('Login error:', error);
      toast({
        title: "Login error",
        description: "Could not connect to the server",
        variant: "destructive",
      });
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (name: string, email: string, password: string) => {
    setIsLoading(true);
    try {
      await authService.register(email, password, name);
      toast({
        title: "Registration successful",
        description: "Your account has been created. Please log in.",
      });
      navigate('/login');
    } catch (error) {
      console.error('Registration error:', error);
      toast({
        title: "Registration error",
        description: "Could not connect to the server",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const signup = async (name: string, email: string, password: string, role: string = 'user') => {
    setIsLoading(true);
    try {
      const { token, user } = await authService.register(email, password, name, role);
      localStorage.setItem('token', token);
      setToken(token);

      const userWithDefaults = {
        ...user,
        role: user.role || 'user',
        permissions: user.permissions || getDefaultPermissions(user.role || 'user')
      };

      setUser(userWithDefaults);

      toast({
        title: "Registration successful",
        description: "Your account has been created.",
      });
      navigate('/onboarding');
    } catch (error) {
      console.error('Signup error:', error);
      toast({
        title: "Signup error",
        description: "Could not connect to the server",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('currentRestaurantId');
    setUser(null);
    setToken(null);
    setCurrentRestaurantId(null);
    toast({
      title: "Logged out",
      description: "You've been logged out successfully",
    });
    navigate('/login');
  };
  
  const isAuthenticated = () => {
    return !!token && !!user;
  };
  
  const getCurrentRestaurant = (): Restaurant | undefined => {
    if (!user || !user.restaurants || user.restaurants.length === 0) {
      return undefined;
    }
    
    if (currentRestaurantId) {
      const restaurant = user.restaurants.find(r => 
        (r.id === currentRestaurantId || r._id === currentRestaurantId)
      );
      if (restaurant) {
        return restaurant;
      }
    }
    
    return user.restaurants[0];
  };
  
  const hasPermission = (permission: string): boolean => {
    if (!user) return false;
    
    if (user.role === 'admin') return true;
    
    if (!user.permissions) return false;
    
    return user.permissions.includes(permission);
  };
  
  const getDefaultPermissions = (role: string): string[] => {
    switch (role) {
      case 'admin':
        return [
          'view_dashboard',
          'manage_tables',
          'manage_menu',
          'manage_orders',
          'manage_marketing',
          'manage_loyalty',
          'manage_settings',
          'manage_users'
        ];
      case 'manager':
        return [
          'view_dashboard',
          'manage_tables',
          'manage_menu',
          'manage_orders',
          'manage_marketing',
          'manage_loyalty'
        ];
      case 'staff':
        return [
          'view_dashboard',
          'manage_tables',
          'manage_orders'
        ];
      case 'user':
      default:
        return ['view_dashboard'];
    }
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      token,
      isAuthenticated, 
      isLoading,
      login, 
      register,
      signup,
      logout,
      getCurrentRestaurant,
      currentRestaurantId,
      setCurrentRestaurantId,
      hasPermission
    }}>
      {children}
    </AuthContext.Provider>
  );
};

// Ensure consistent export for useAuth
export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
