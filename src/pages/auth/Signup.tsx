import React, { useState, useCallback, useMemo } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { Utensils, ChefHat } from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";

const Signup = () => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("user");
  const [isLoading, setIsLoading] = useState(false);
  const { signup } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setIsLoading(true);

      try {
        console.log("Starting signup process...");
        await signup(name, email, password, role);
        navigate("/onboarding");
      } catch (error) {
        console.error("Signup error:", error);
      } finally {
        setIsLoading(false);
      }
    },
    [name, email, password, role, signup, navigate]
  );

  const nameInputProps = useMemo(
    () => ({
      id: "name",
      placeholder: "Your Name",
      value: name,
      onChange: (e: React.ChangeEvent<HTMLInputElement>) => setName(e.target.value),
      required: true,
      className: "input",
    }),
    [name]
  );

  const emailInputProps = useMemo(
    () => ({
      id: "email",
      type: "email",
      placeholder: "you@example.com",
      value: email,
      onChange: (e: React.ChangeEvent<HTMLInputElement>) => setEmail(e.target.value),
      required: true,
      className: "input",
    }),
    [email]
  );

  const passwordInputProps = useMemo(
    () => ({
      id: "password",
      type: "password",
      value: password,
      onChange: (e: React.ChangeEvent<HTMLInputElement>) => setPassword(e.target.value),
      required: true,
      className: "input",
    }),
    [password]
  );

  return (
    <div className="min-h-screen bg-restaurant-background bg-pattern flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link to="/" className="inline-block">
            <motion.img
              src="/images/potoba-logo.svg"
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
            Create your account to get started
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
                Enter your details to create an account
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <label htmlFor="name" className="block text-sm font-medium text-muted-foreground">
                    Name
                  </label>
                  <input
                    {...nameInputProps}
                    className="block w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                  />
                </div>
                <div className="space-y-2">
                  <label htmlFor="email" className="block text-sm font-medium text-muted-foreground">
                    Email
                  </label>
                  <input
                    {...emailInputProps}
                    className="block w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                  />
                </div>
                <div className="space-y-2">
                  <label htmlFor="password" className="block text-sm font-medium text-muted-foreground">
                    Password
                  </label>
                  <input
                    {...passwordInputProps}
                    className="block w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                  />
                </div>
                <div className="space-y-2">
                  <label htmlFor="role" className="block text-sm font-medium text-muted-foreground">
                    Role
                  </label>
                  <select
                    id="role"
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    className="block w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                  >
                    <option value="user">User</option>
                    <option value="staff">Staff</option>
                    <option value="manager">Manager</option>
                    <option value="admin">Administrator</option>
                  </select>
                  <p className="text-xs text-muted-foreground mt-1">
                    Note: This is for demo purposes. In a real application, role assignment would be managed by administrators.
                  </p>
                </div>
                <button
                  type="submit"
                  className="w-full inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:opacity-50"
                  disabled={isLoading}
                >
                  {isLoading ? "Creating account..." : "Sign up"}
                </button>
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
