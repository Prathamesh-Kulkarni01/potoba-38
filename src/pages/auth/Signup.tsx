import React, { useState, useCallback } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { Utensils, ChefHat } from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";
import { useToast } from "@/components/ui/use-toast";

const Signup = () => {
  const [restaurantName, setRestaurantName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { signUp } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setIsLoading(true);

      try {
        await signUp(email, password, restaurantName);
        toast({
          title: "Account created",
          description: "Your restaurant account has been created successfully.",
        });
        navigate("/dashboard");
      } catch (error: any) {
        console.error("Signup error:", error);
        toast({
          title: "Signup failed",
          description: error.message || "Please try again with different credentials.",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    },
    [email, password, restaurantName, signUp, navigate, toast]
  );

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
            Create your restaurant account
          </motion.p>
        </div>

        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.4 }}
        >
          <Card>
            <CardHeader>
              <CardTitle>Sign Up</CardTitle>
              <CardDescription>
                Enter your restaurant details to get started
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <label htmlFor="restaurantName" className="block text-sm font-medium text-muted-foreground">
                    Restaurant Name
                  </label>
                  <input
                    id="restaurantName"
                    type="text"
                    placeholder="Your Restaurant Name"
                    value={restaurantName}
                    onChange={(e) => setRestaurantName(e.target.value)}
                    required
                    className="block w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                  />
                </div>
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
                  <label htmlFor="password" className="block text-sm font-medium text-muted-foreground">
                    Password
                  </label>
                  <input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={6}
                    className="block w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Password must be at least 6 characters long
                  </p>
                </div>
                <Button
                  type="submit"
                  className="w-full"
                  disabled={isLoading}
                >
                  {isLoading ? "Creating account..." : "Sign up"}
                </Button>
              </form>
            </CardContent>
            <CardFooter className="flex justify-center">
              <p className="text-sm text-muted-foreground">
                Already have an account?{" "}
                <Link
                  to="/login"
                  className="text-restaurant-primary hover:underline"
                >
                  Log in
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

export default Signup;
