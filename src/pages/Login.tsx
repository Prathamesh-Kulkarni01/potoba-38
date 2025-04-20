
import React, { useState, useEffect } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from '../contexts/AuthContext';
import { motion } from 'framer-motion';
import { Utensils, ChefHat } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

const Login = () => {
  const [email, setEmail] = useState('demo@example.com');
  const [password, setPassword] = useState('password');
  const [isLoading, setIsLoading] = useState(false);
  const { login, isAuthenticated, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Get redirect path from URL query parameter
  const searchParams = new URLSearchParams(location.search);
  const redirectPath = searchParams.get('redirect') || '/dashboard';

  // If user is already logged in, check if they have restaurants
  useEffect(() => {
    if (isAuthenticated() && user) {
      console.log("User already authenticated:", user);
      console.log("User role:", user.role);
      console.log("User permissions:", user.permissions);
      
      // Safely check if the user has restaurants
      if (!user.restaurants || user.restaurants.length === 0) {
        navigate('/onboarding');
      } else {
        navigate(redirectPath);
      }
    }
  }, [isAuthenticated, navigate, redirectPath, user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      await login(email, password);
      
      // Introduce a small delay to ensure user state is updated
      setTimeout(() => {
        if (isAuthenticated() && user) {
          console.log("User authenticated:", user);
          console.log("User role:", user.role || 'No role assigned');
          console.log("User permissions:", user.permissions || 'No permissions assigned');
          
          // Safely check if user has restaurants
          if (!user.restaurants || user.restaurants.length === 0) {
            navigate('/onboarding');
          } else {
            navigate(redirectPath);
          }
        } else {
          console.log("Authentication failed or user data not available");
        }
      }, 100);
    } catch (error) {
      console.error('Login error:', error);
      // Toast is handled in auth context
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-restaurant-background bg-pattern flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link to="/" className="inline-block">
            <motion.img 
              src="/images/potoba-logo.svg" 
              alt="TableMaster" 
              className="h-20 mx-auto mb-3"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.5 }}
            />
          </Link>
          <motion.h1 
            className="text-3xl font-bold text-restaurant-primary"
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.1, duration: 0.4 }}
          >
            TableMaster
          </motion.h1>
          <motion.p 
            className="text-muted-foreground"
            initial={{ y: -10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.4 }}
          >
            Login to manage your restaurants
          </motion.p>
        </div>
        
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.4 }}
        >
          <Card>
            <CardHeader>
              <CardTitle>Login</CardTitle>
              <CardDescription>
                Enter your credentials to access your dashboard
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password">Password</Label>
                    <Link to="/forgot-password" className="text-sm text-restaurant-primary hover:underline">
                      Forgot password?
                    </Link>
                  </div>
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? "Logging in..." : "Log in"}
                </Button>
              </form>
            </CardContent>
            <CardFooter className="flex justify-center">
              <p className="text-sm text-muted-foreground">
                Don't have an account?{" "}
                <Link to="/signup" className="text-restaurant-primary hover:underline">
                  Sign up
                </Link>
              </p>
            </CardFooter>
          </Card>
        </motion.div>
        
        {/* Decorative food illustrations */}
        <motion.div 
          className="fixed -bottom-10 -left-10 text-restaurant-primary/20 pointer-events-none"
          initial={{ opacity: 0, rotate: -20 }}
          animate={{ opacity: 1, rotate: 0 }}
          transition={{ delay: 0.5, duration: 0.7 }}
        >
          <Utensils size={60} />
        </motion.div>
        <motion.div 
          className="fixed -top-10 -right-10 text-restaurant-secondary/20 pointer-events-none"
          initial={{ opacity: 0, rotate: 20 }}
          animate={{ opacity: 1, rotate: 0 }}
          transition={{ delay: 0.6, duration: 0.7 }}
        >
          <ChefHat size={60} />
        </motion.div>
      </div>
    </div>
  );
};

export default Login;
