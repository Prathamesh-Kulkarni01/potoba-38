import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useToast } from '@/components/ui/use-toast';
import { Restaurant } from '@/types/auth';

interface User {
  _id: string;
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
      const response = await fetch('http://localhost:5000/api/auth/me', {
        headers: {
          'Authorization': `Bearer ${authToken}`
        },
        credentials: 'include'
      });

      if (response.ok) {
        const userData = await response.json();
        console.log("Fetched user data:", userData);
        
        const userWithDefaults = {
          ...userData.data.user,
          role: userData.data.user.role || 'user',
          permissions: userData.data.user.permissions || getDefaultPermissions(userData.data.user.role || 'user')
        };
        
        console.log("User with defaults:", userWithDefaults);
        setUser(userWithDefaults);
        
        if (userWithDefaults.restaurants && userWithDefaults.restaurants.length > 0) {
          const firstRestaurant = userWithDefaults.restaurants[0];
          if (!currentRestaurantId && firstRestaurant) {
            setCurrentRestaurantId(firstRestaurant.id || firstRestaurant._id);
          }
        }
      } else {
        console.error("Failed to fetch current user:", await response.text());
        localStorage.removeItem('token');
        setToken(null);
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
      const response = await fetch('http://localhost:5000/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email, password }),
        credentials: 'include'
      });

      const data = await response.json();
      console.log("Login response:", data);

      if (response.ok) {
        localStorage.setItem('token', data.token);
        setToken(data.token);
        
        const userRole = data.user?.role || 'user';
        console.log("User role from server:", userRole);
        
        const userWithDefaults = {
          ...data.user,
          role: userRole,
          permissions: data.user?.permissions || getDefaultPermissions(userRole)
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
      } else {
        toast({
          title: "Login failed",
          description: data.message || "Invalid credentials",
          variant: "destructive",
        });
      }
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
      const response = await fetch('http://localhost:5000/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ name, email, password }),
        credentials: 'include'
      });

      const data = await response.json();

      if (response.ok) {
        toast({
          title: "Registration successful",
          description: "Your account has been created. Please log in.",
        });
        navigate('/login');
      } else {
        toast({
          title: "Registration failed",
          description: data.message || "Could not create account",
          variant: "destructive",
        });
      }
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
      const response = await fetch('http://localhost:5000/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ name, email, password, role }),
        credentials: 'include'
      });

      const data = await response.json();

      if (response.ok) {
        localStorage.setItem('token', data.data.token);
        setToken(data.data.token);
        
        const userWithDefaults = {
          ...data.data.user,
          role: data.data.user.role || 'user',
          permissions: data.data.user.permissions || getDefaultPermissions(data.data.user.role || 'user')
        };
        
        setUser(userWithDefaults);
        
        toast({
          title: "Registration successful",
          description: "Your account has been created.",
        });
        navigate('/onboarding');
      } else {
        toast({
          title: "Registration failed",
          description: data.message || "Could not create account",
          variant: "destructive",
        });
      }
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

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
