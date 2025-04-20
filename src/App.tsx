
import React from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import { ThemeProvider } from "./components/theme/ThemeProvider";
import Index from "./pages/Index";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import RestaurantOnboarding from "./pages/RestaurantOnboarding";
import Dashboard from "./pages/Dashboard";
import TableDetail from "./pages/TableDetail";
import CustomerOrder from "./pages/CustomerOrder";
import ScanLanding from "./pages/ScanLanding";
import NotFound from "./pages/NotFound";
import ApiSettings from "./pages/ApiSettings";
import ApiDocs from "./components/ApiDocs";
import "./App.css";

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
                <Route path="/onboarding" element={<RestaurantOnboarding />} />
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/dashboard/tables" element={<Dashboard />} />
                <Route path="/dashboard/menu" element={<Dashboard />} />
                <Route path="/dashboard/orders" element={<Dashboard />} />
                <Route path="/dashboard/api-settings" element={<ApiSettings />} />
                <Route path="/dashboard/api-docs" element={<ApiDocs />} />
                <Route path="/dashboard/tables/:tableId" element={<TableDetail />} />
                <Route path="/scan" element={<ScanLanding />} />
                <Route path="/order/:tableId" element={<CustomerOrder />} />
                {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
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
