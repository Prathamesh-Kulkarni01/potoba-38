
import React, { useState, useEffect } from 'react';
import { Navigate, Outlet, useLocation, useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import RestaurantDashboard from '../components/RestaurantDashboard';
import TableManagement from '../components/TableManagement';
import MenuManagement from '../components/MenuManagement';
import OrderTable from '../components/OrderTable';
import { motion } from 'framer-motion';
import { Toaster } from 'sonner';
import { CupSoda, Utensils } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

const Dashboard = () => {
  const location = useLocation();
  const { user, loading, getCurrentRestaurant } = useAuth();
  const navigate = useNavigate();
  const [showFoodIcon, setShowFoodIcon] = useState(false);
  
  const currentRestaurant = getCurrentRestaurant();
  
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
    <div className="min-h-screen bg-restaurant-background bg-pattern">
      <Navbar currentTenant={currentRestaurant?.name} />
      
      <motion.main 
        className="container mx-auto px-4 py-6"
        initial="initial"
        animate="animate"
        exit="exit"
        variants={pageVariants}
        transition={{ duration: 0.4 }}
      >
        {renderDashboardContent()}
      </motion.main>
      
      {/* Toaster for notifications */}
      <Toaster position="top-right" />
      
      {/* Decorative food illustrations */}
      <div className="fixed -bottom-16 -left-16 w-64 h-64 opacity-10 pointer-events-none">
        <img src="/images/food-doodle-1.svg" alt="" className="w-full h-full animate-spin-slow" />
      </div>
      <div className="fixed -top-16 -right-16 w-64 h-64 opacity-10 pointer-events-none">
        <img src="/images/food-doodle-2.svg" alt="" className="w-full h-full animate-spin-slow" />
      </div>
      
      {/* Floating food icons - decorative elements */}
      {showFoodIcon && (
        <>
          <motion.div 
            className="fixed bottom-10 right-10 text-restaurant-primary opacity-70 pointer-events-none"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 0.7, y: 0 }}
            transition={{ duration: 1 }}
          >
            <motion.div
              animate={{ 
                y: [0, -15, 0],
              }}
              transition={{ 
                repeat: Infinity, 
                duration: 3,
                ease: "easeInOut" 
              }}
            >
              <Utensils size={24} />
            </motion.div>
          </motion.div>
          
          <motion.div 
            className="fixed bottom-20 right-20 text-restaurant-secondary opacity-70 pointer-events-none"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 0.7, y: 0 }}
            transition={{ duration: 1, delay: 0.5 }}
          >
            <motion.div
              animate={{ 
                y: [0, -20, 0],
              }}
              transition={{ 
                repeat: Infinity, 
                duration: 4,
                ease: "easeInOut",
                delay: 0.5
              }}
            >
              <CupSoda size={24} />
            </motion.div>
          </motion.div>
        </>
      )}
    </div>
  );
};

export default Dashboard;
