import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback, useMemo } from 'react';
import { useToast } from '@/components/ui/use-toast';
import { Restaurant } from '@/types/auth';
import authService from '@/services/authService';
import { 
  User as FirebaseUser,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  updateProfile
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';

// Define our app's User type
interface User {
  id: string;
  name: string;
  email: string;
  role: 'user' | 'admin' | 'manager' | 'staff';
  permissions: string[];
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
  setUser: (user: User | null) => void; // Expose setUser
  updateUser: (user: User) => void; // Add updateUser method
  restaurantId: string | null;
  userRole: string | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, restaurantName: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentRestaurantId, setCurrentRestaurantId] = useState<string | null>(null);
  const [restaurantId, setRestaurantId] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const { toast } = useToast();

  // Restore auth states from temporary storage
  useEffect(() => {
    const tempAuthState = window.localStorage.getItem('tempAuthState');
    if (tempAuthState) {
      try {
        const { firebaseAuth, customToken, currentRestaurantId } = JSON.parse(tempAuthState);
        
        // Restore Firebase auth state
        if (firebaseAuth) {
          window.localStorage.setItem('firebase:authUser:app1-65be0:web', firebaseAuth);
        }
        
        // Restore custom token
        if (customToken) {
          window.localStorage.setItem('token', customToken);
          setToken(customToken);
        }
        
        // Restore current restaurant ID
        if (currentRestaurantId) {
          window.localStorage.setItem('currentRestaurantId', currentRestaurantId);
          setCurrentRestaurantId(currentRestaurantId);
        }
        
        // Clear temporary storage
        window.localStorage.removeItem('tempAuthState');
      } catch (error) {
        console.error('Error restoring auth states:', error);
      }
    }
  }, []);

  useEffect(() => {
    let mounted = true;
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser: FirebaseUser | null) => {
      if (!mounted) return;

      if (firebaseUser) {
        try {
          // Fetch user's restaurant and role information
          const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
          if (userDoc.exists() && mounted) {
            const userData = userDoc.data();
            const userWithDefaults: User = {
              id: firebaseUser.uid,
              name: userData.name || firebaseUser.displayName || '',
              email: firebaseUser.email || '',
              role: userData.role || 'user',
              permissions: userData.permissions || getDefaultPermissions(userData.role || 'user'),
              restaurants: userData.restaurants || []
            };
            setUser(userWithDefaults);
            setRestaurantId(userData.restaurantId);
            setUserRole(userData.role);
            setToken(firebaseUser.uid); // Use Firebase UID as token
          }
        } catch (error) {
          console.error('Error fetching user data:', error);
          if (mounted) {
            setUser(null);
            setRestaurantId(null);
            setUserRole(null);
            setToken(null);
          }
        }
      } else if (mounted) {
        setUser(null);
        setRestaurantId(null);
        setUserRole(null);
        setToken(null);
      }
      if (mounted) {
        setLoading(false);
      }
    });

    return () => {
      mounted = false;
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (currentRestaurantId) {
      localStorage.setItem('currentRestaurantId', currentRestaurantId);
    }
  }, [currentRestaurantId]);

  const fetchCurrentUser = useCallback(async (authToken: string) => {
    setLoading(true);
    try {
      const user = await authService.getCurrentUser();
      console.log("Fetched user data:", user);

      const userWithDefaults: User = {
        id: user.id || user._id || '',
        name: user.name || 'User', // Ensure name is always set
        email: user.email || '',
        role: user.role || 'user',
        permissions: user.permissions || getDefaultPermissions(user.role || 'user'),
        restaurants: user.restaurants || []
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
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, [currentRestaurantId]);

  const login = useCallback(async (email: string, password: string) => {
    setLoading(true);
    try {
      const { token, user } = await authService.login(email, password);
      localStorage.setItem('token', token);
      setToken(token);

      const userRole = user.role || 'user';
      console.log("User role from server:", userRole);

      const userWithDefaults: User = {
        id: user.id || user._id || '',
        name: user.name || 'User', // Ensure name is always set
        email: user.email || '',
        role: userRole,
        permissions: user.permissions || getDefaultPermissions(userRole),
        restaurants: user.restaurants || []
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
      setLoading(false);
    }
  }, [toast]);

  const register = useCallback(async (name: string, email: string, password: string) => {
    setLoading(true);
    try {
      await authService.register(email, password, name);
      toast({
        title: "Registration successful",
        description: "Your account has been created. Please log in.",
      });
    } catch (error) {
      console.error('Registration error:', error);
      toast({
        title: "Registration error",
        description: "Could not connect to the server",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const signup = useCallback(async (name: string, email: string, password: string, role: string = 'user') => {
    setLoading(true);
    try {
      const { token, user } = await authService.register(email, password, name, role);
      localStorage.setItem('token', token);
      setToken(token);

      const userWithDefaults: User = {
        id: user.id || user._id || '',
        name: user.name || name || 'User', // Use provided name or fallback
        email: user.email || email,
        role: user.role || role,
        permissions: user.permissions || getDefaultPermissions(user.role || role),
        restaurants: user.restaurants || []
      };

      setUser(userWithDefaults);

      toast({
        title: "Registration successful",
        description: "Your account has been created.",
      });
    } catch (error) {
      console.error('Signup error:', error);
      toast({
        title: "Signup error",
        description: "Could not connect to the server",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const logout = useCallback(() => {
    localStorage.removeItem('token');
    localStorage.removeItem('currentRestaurantId');
    setUser(null);
    setToken(null);
    setCurrentRestaurantId(null);
    setRestaurantId(null);
    setUserRole(null);
    toast({
      title: "Logged out",
      description: "You've been logged out successfully",
    });
  }, [toast]);
  
  const isAuthenticated = useCallback(() => {
    return !!token && !!user;
  }, [token, user]);
  
  const getCurrentRestaurant = useCallback((): Restaurant | undefined => {
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
  }, [user, currentRestaurantId]);
  
  const hasPermission = useCallback((permission: string): boolean => {
    if (!user) return false;
    
    if (user.role === 'admin') return true;
    
    if (!user.permissions) return false;
    
    return user.permissions.includes(permission);
  }, [user]);
  
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

  const updateUser = useCallback((updatedUser: User) => {
    setUser((prevUser) => ({
      ...prevUser,
      ...updatedUser,
    }));
  }, []);

  const signIn = async (email: string, password: string) => {
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (error) {
      console.error('Error signing in:', error);
      throw error;
    }
  };

  const signUp = async (email: string, password: string, restaurantName: string) => {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // Create a new restaurant document
      const restaurantRef = doc(db, 'restaurants', user.uid);
      await setDoc(restaurantRef, {
        name: restaurantName,
        createdAt: new Date().toISOString(),
        ownerId: user.uid,
      });

      // Create user document with role and restaurant reference
      await setDoc(doc(db, 'users', user.uid), {
        email: user.email,
        role: 'owner',
        restaurantId: user.uid,
        createdAt: new Date().toISOString(),
      });

      // Update user profile
      await updateProfile(user, {
        displayName: restaurantName,
      });
    } catch (error) {
      console.error('Error signing up:', error);
      throw error;
    }
  };

  const contextValue = useMemo(
    () => ({
      user,
      token,
      isAuthenticated,
      isLoading: loading,
      login,
      register,
      signup,
      logout,
      getCurrentRestaurant,
      currentRestaurantId,
      setCurrentRestaurantId,
      hasPermission,
      setUser,
      updateUser,
      restaurantId,
      userRole,
      loading,
      signIn,
      signUp,
    }),
    [user, token, isAuthenticated, loading, login, register, signup, logout, getCurrentRestaurant, currentRestaurantId, hasPermission, updateUser, restaurantId, userRole, signIn, signUp]
  );

  return (
    <AuthContext.Provider value={contextValue}>
      {!loading && children}
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
