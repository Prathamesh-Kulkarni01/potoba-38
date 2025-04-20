
import React from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import { ThemeProvider } from "./components/theme/ThemeProvider";
import ProtectedRoute from "./components/ProtectedRoute";
import Index from "./pages/Index";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Unauthorized from "./pages/Unauthorized";
import RestaurantOnboarding from "./pages/RestaurantOnboarding";
import Dashboard from "./pages/Dashboard";
import TableDetail from "./pages/TableDetail";
import CustomerOrder from "./pages/CustomerOrder";
import ScanLanding from "./pages/ScanLanding";
import NotFound from "./pages/NotFound";
import ApiSettings from "./pages/ApiSettings";
import ApiDocs from "./components/ApiDocs";
import "./App.css";
import { toast } from "./hooks/use-toast";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 5 * 60 * 1000, // 5 minutes
    },
  },
});


const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <div className="app-container theme-transition">
              <Routes>
                <Route path="/" element={<Index />} />
                <Route path="/login" element={<Login />} />
                <Route path="/signup" element={<Signup />} />
                <Route path="/unauthorized" element={<Unauthorized />} />
                <Route 
                  path="/onboarding" 
                  element={
                    <ProtectedRoute>
                      <RestaurantOnboarding />
                    </ProtectedRoute>
                  } 
                />
                
                {/* Dashboard routes */}
                <Route 
                  path="/dashboard" 
                  element={
                    <ProtectedRoute requiredPermission="view_dashboard">
                      <Dashboard />
                    </ProtectedRoute>
                  } 
                />
                <Route 
                  path="/dashboard/tables" 
                  element={
                    <ProtectedRoute requiredPermission="manage_tables">
                      <Dashboard />
                    </ProtectedRoute>
                  } 
                />
                <Route 
                  path="/dashboard/menu" 
                  element={
                    <ProtectedRoute requiredPermission="manage_menu">
                      <Dashboard />
                    </ProtectedRoute>
                  } 
                />
                <Route 
                  path="/dashboard/orders" 
                  element={
                    <ProtectedRoute requiredPermission="manage_orders">
                      <Dashboard />
                    </ProtectedRoute>
                  } 
                />
                <Route 
                  path="/dashboard/api-settings" 
                  element={
                    <ProtectedRoute requiredPermission="manage_settings">
                      <ApiSettings />
                    </ProtectedRoute>
                  } 
                />
                <Route 
                  path="/dashboard/api-docs" 
                  element={
                    <ProtectedRoute requiredPermission="manage_settings">
                      <ApiDocs />
                    </ProtectedRoute>
                  } 
                />
                <Route 
                  path="/dashboard/tables/:tableId" 
                  element={
                    <ProtectedRoute requiredPermission="manage_tables">
                      <TableDetail />
                    </ProtectedRoute>
                  } 
                />
                
                {/* Marketing routes */}
                <Route 
                  path="/dashboard/marketing/campaigns" 
                  element={
                    <ProtectedRoute requiredPermission="manage_marketing">
                      <Dashboard />
                    </ProtectedRoute>
                  } 
                />
                <Route 
                  path="/dashboard/marketing/whatsapp" 
                  element={
                    <ProtectedRoute requiredPermission="manage_marketing">
                      <Dashboard />
                    </ProtectedRoute>
                  } 
                />
                <Route 
                  path="/dashboard/marketing/ai-assistant" 
                  element={
                    <ProtectedRoute requiredPermission="manage_marketing">
                      <Dashboard />
                    </ProtectedRoute>
                  } 
                />
                
                {/* Loyalty routes */}
                <Route 
                  path="/dashboard/loyalty/rewards" 
                  element={
                    <ProtectedRoute requiredPermission="manage_loyalty">
                      <Dashboard />
                    </ProtectedRoute>
                  } 
                />
                <Route 
                  path="/dashboard/loyalty/promotions" 
                  element={
                    <ProtectedRoute requiredPermission="manage_loyalty">
                      <Dashboard />
                    </ProtectedRoute>
                  } 
                />
                <Route 
                  path="/dashboard/loyalty/members" 
                  element={
                    <ProtectedRoute requiredPermission="manage_loyalty">
                      <Dashboard />
                    </ProtectedRoute>
                  } 
                />
                
                {/* Customer facing routes */}
                <Route path="/scan" element={<ScanLanding />} />
                <Route path="/order/:tableId" element={<CustomerOrder />} />
                
                {/* Catch-all route */}
                <Route path="*" element={<NotFound />} />
              </Routes>
            </div>
          </BrowserRouter>
        </TooltipProvider>
      </AuthProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
