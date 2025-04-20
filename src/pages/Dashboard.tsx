
import React, { useState, useEffect } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import RestaurantDashboard from '../components/RestaurantDashboard';
import TableManagement from '../components/TableManagement';
import MenuManagement from '../components/MenuManagement';
import OrderTable from '../components/OrderTable';
import { motion } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { DashboardShell } from '@/components/DashboardShell';

const Dashboard = () => {
  const location = useLocation();
  const { user, loading } = useAuth();
  const [showFoodIcon, setShowFoodIcon] = useState(false);
  
  // Redirect to login if not authenticated
  if (!loading && !user) {
    return <Navigate to="/login" replace />;
  }
  
  // Redirect to onboarding if user has no restaurants
  if (!loading && user && user.restaurants.length === 0) {
    return <Navigate to="/onboarding" replace />;
  }
  
  // Random food icons for decoration
  useEffect(() => {
    const timer = setTimeout(() => {
      setShowFoodIcon(true);
    }, 1000);
    
    return () => clearTimeout(timer);
  }, []);
  
  // Animation variants
  const pageVariants = {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -20 }
  };
  
  // Determine which component to render based on the current route
  const renderDashboardContent = () => {
    const path = location.pathname;
    
    if (path === '/dashboard') {
      return <RestaurantDashboard />;
    } else if (path === '/dashboard/tables') {
      return <TableManagement />;
    } else if (path === '/dashboard/menu') {
      return <MenuManagement />;
    } else if (path === '/dashboard/orders') {
      return <OrderTable />;
    }
    
    // Render the Outlet for any other sub-routes
    return <Outlet />;
  };
  
  // If still loading, show a simple loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-restaurant-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-restaurant-primary mx-auto"></div>
          <p className="mt-4 text-restaurant-primary font-medium">Loading dashboard...</p>
        </div>
      </div>
    );
  }
  
  return (
    <DashboardShell>
      <motion.main 
        className="w-full"
        initial="initial"
        animate="animate"
        exit="exit"
        variants={pageVariants}
        transition={{ duration: 0.4 }}
      >
        {renderDashboardContent()}
      </motion.main>
      
      {/* Decorative food illustrations */}
      <div className="fixed -bottom-16 -left-16 w-64 h-64 opacity-10 pointer-events-none">
        <img src="/images/food-doodle-1.svg" alt="" className="w-full h-full animate-spin-slow" />
      </div>
      <div className="fixed -top-16 -right-16 w-64 h-64 opacity-10 pointer-events-none">
        <img src="/images/food-doodle-2.svg" alt="" className="w-full h-full animate-spin-slow" />
      </div>
    </DashboardShell>
  );
};

export default Dashboard;
