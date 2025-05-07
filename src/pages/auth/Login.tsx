import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate, Link, useLocation } from "react-router-dom";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "../../contexts/AuthContext";
import { motion } from "framer-motion";
import { Utensils, ChefHat } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { signIn, user, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();

  const searchParams = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const redirectPath = useMemo(() => searchParams.get("redirect") || "/dashboard", [searchParams]);

  useEffect(() => {
    if (user) {
      navigate(redirectPath);
    }
  }, [user, navigate, redirectPath]);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setIsLoading(true);

      try {
        await signIn(email, password);
        toast({
          title: "Login successful",
          description: "Welcome back!",
        });
      } catch (error: any) {
        console.error("Login error:", error);
        toast({
          title: "Login failed",
          description: error.message || "Please check your credentials and try again.",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    },
    [email, password, signIn, toast]
  );

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-restaurant-background bg-pattern flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link to="/" className="inline-block">
            <motion.img
              src="/images/icon-logo.png"
              alt="Potoba"
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
            Potoba
          </motion.h1>
          <motion.p
            className="text-muted-foreground"
            initial={{ y: -10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.4 }}
          >
            Login to manage your restaurant
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
                  <label htmlFor="email" className="block text-sm font-medium text-muted-foreground">
                    Email
                  </label>
                  <input
                    id="email"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="block w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                  />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label htmlFor="password" className="block text-sm font-medium text-muted-foreground">
                      Password
                    </label>
                    <Link
                      to="/forgot-password"
                      className="text-sm text-restaurant-primary hover:underline"
                    >
                      Forgot password?
                    </Link>
                  </div>
                  <input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="block w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                  />
                </div>
                <Button
                  type="submit"
                  className="w-full"
                  disabled={isLoading}
                >
                  {isLoading ? "Logging in..." : "Log in"}
                </Button>
              </form>
            </CardContent>
            <CardFooter className="flex justify-center">
              <p className="text-sm text-muted-foreground">
                Don't have an account?{" "}
                <Link
                  to="/signup"
                  className="text-restaurant-primary hover:underline"
                >
                  Sign up
                </Link>
              </p>
            </CardFooter>
          </Card>
        </motion.div>

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
