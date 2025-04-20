import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
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

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [currentRestaurantId, setCurrentRestaurantId] = useState<string | null>(null);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    // Check for token in localStorage on initial load
    const storedToken = localStorage.getItem('token');
    if (storedToken) {
      setToken(storedToken);
      fetchCurrentUser(storedToken);
    } else {
      setIsLoading(false);
    }
    
    // Load current restaurant from localStorage if available
    const storedRestaurantId = localStorage.getItem('currentRestaurantId');
    if (storedRestaurantId) {
      setCurrentRestaurantId(storedRestaurantId);
    }
  }, []);

  // Update localStorage when currentRestaurantId changes
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
        }
      });

      if (response.ok) {
        const userData = await response.json();
        setUser(userData);
        
        // Set default restaurant if available and none selected
        if (!currentRestaurantId && userData.restaurants && userData.restaurants.length > 0) {
          setCurrentRestaurantId(userData.restaurants[0].id || userData.restaurants[0]._id);
        }
      } else {
        // Token is invalid, remove it
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
        body: JSON.stringify({ email, password })
      });

      const data = await response.json();

      if (response.ok) {
        localStorage.setItem('token', data.token);
        setToken(data.token);
        setUser(data.user);
        
        // Set default restaurant if available
        if (data.user.restaurants && data.user.restaurants.length > 0) {
          setCurrentRestaurantId(data.user.restaurants[0].id || data.user.restaurants[0]._id);
        }
        
        toast({
          title: "Login successful",
          description: "You've been logged in",
        });
        navigate('/dashboard');
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
        body: JSON.stringify({ name, email, password })
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
        body: JSON.stringify({ name, email, password, role })
      });

      const data = await response.json();

      if (response.ok) {
        // Auto login after signup
        localStorage.setItem('token', data.token);
        setToken(data.token);
        setUser(data.user);
        
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
    
    // If we have a currentRestaurantId, find that restaurant
    if (currentRestaurantId) {
      const restaurant = user.restaurants.find(r => 
        (r.id === currentRestaurantId || r._id === currentRestaurantId)
      );
      if (restaurant) {
        return restaurant;
      }
    }
    
    // Otherwise return first restaurant
    return user.restaurants[0];
  };
  
  const hasPermission = (permission: string): boolean => {
    if (!user) return false;
    
    // Admin has all permissions
    if (user.role === 'admin') return true;
    
    // Check user's permissions array
    return user.permissions?.includes(permission) || false;
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
