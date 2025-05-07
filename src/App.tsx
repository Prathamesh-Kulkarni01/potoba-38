import React, { useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { ThemeProvider } from "./components/theme/ThemeProvider";
import ProtectedRoute from "./components/auth/ProtectedRoute";
import Index from "./pages/LandingPage";
import Login from "./pages/auth/Login";
import Signup from "./pages/auth/Signup";
import Unauthorized from "./pages/Unauthorized";
import RestaurantOnboarding from "./pages/onboarding/RestaurantOnboarding";
import Dashboard from "./pages/dashboard/Dashboard";
import TableDetail from "./pages/table/TableDetail";
import CustomerOrder from "./pages/customer/CustomerOrder";
import ScanLanding from "./pages/customer/ScanLanding";
import NotFound from "./pages/NotFound";
import Settings from "./pages/settings/Settings";
import "./App.css";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 5 * 60 * 1000, // 5 minutes
    },
  },
});

// Create a wrapper component to provide navigate function
const AuthProviderWithRouter: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <AuthProvider>
      {children}
    </AuthProvider>
  );
};

// Helper component to reduce redundancy in ProtectedRoute usage
const ProtectedRouteWrapper: React.FC<{
  permission: string;
  children: React.ReactNode;
}> = ({ permission, children }) => (
  <ProtectedRoute requiredPermission={permission}>{children}</ProtectedRoute>
);

// Define route configurations
const publicRoutes = [
  { path: "/", element: <Index /> },
  { path: "/login", element: <Login /> },
  { path: "/signup", element: <Signup /> },
  { path: "/unauthorized", element: <Unauthorized /> },
  { path: "/scan", element: <ScanLanding /> },
  { path: "/order/:tableId", element: <CustomerOrder /> },
  { path: "*", element: <NotFound /> },
];

const protectedRoutes = [
  {
    permission: "view_dashboard",
    routes: [
      { path: "/dashboard", element: <Dashboard /> },
      { path: "/onboarding", element: <RestaurantOnboarding /> }
    ],
  },
  {
    permission: "manage_tables",
    routes: [
      { path: "/dashboard/tables", element: <Dashboard /> },
      { path: "/dashboard/tables/:tableId", element: <TableDetail /> },
    ],
  },
  {
    permission: "manage_menu",
    routes: [
      { path: "/dashboard/menu", element: <Dashboard /> },
      { path: "/dashboard/menu/add", element: <Dashboard /> },
      { path: "/dashboard/menu/edit/:id", element: <Dashboard /> },
    ],
  },
  {
    permission: "manage_orders",
    routes: [{ path: "/dashboard/orders", element: <Dashboard /> }],
  },
  {
    permission: "manage_settings",
    routes: [
      { path: "/dashboard/settings", element: <Settings /> },
    ],
  },
  {
    permission: "manage_marketing",
    routes: [
      { path: "/dashboard/marketing/campaigns", element: <Dashboard /> },
      { path: "/dashboard/marketing/whatsapp", element: <Dashboard /> },
      { path: "/dashboard/marketing/ai-assistant", element: <Dashboard /> },
    ],
  },
  {
    permission: "manage_loyalty",
    routes: [
      { path: "/dashboard/loyalty/rewards", element: <Dashboard /> },
      { path: "/dashboard/loyalty/promotions", element: <Dashboard /> },
      { path: "/dashboard/loyalty/members", element: <Dashboard /> },
    ],
  },
];
const API_URL = import.meta.env.VITE_API_URL;

const App = () => {
  useEffect(() => {
    const checkApiHealth = async () => {
      try {
        const response = await fetch(`${API_URL}/api/health-check`);
        if (!response.ok) {
          console.error("API health check failed:", response.statusText);
        } else {
          console.log("API health check successful");
        }
      } catch (error) {
        console.error("Error during API health check:", error);
      }
    };

    checkApiHealth();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <Router>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <AuthProviderWithRouter>
              <div className="app-container theme-transition">
                <Routes>
                  {/* Public Routes */}
                  {publicRoutes.map(({ path, element }) => (
                    <Route key={path} path={path} element={element} />
                  ))}

                  {/* Protected Routes */}
                  {protectedRoutes.map(({ permission, routes }) =>
                    routes.map(({ path, element }) => (
                      <Route
                        key={path}
                        path={path}
                        element={
                          <ProtectedRouteWrapper permission={permission}>
                            {element}
                          </ProtectedRouteWrapper>
                        }
                      />
                    ))
                  )}
                </Routes>
              </div>
            </AuthProviderWithRouter>
          </TooltipProvider>
        </Router>
      </ThemeProvider>
    </QueryClientProvider>
  );
};

export default App;
