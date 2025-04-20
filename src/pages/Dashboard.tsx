
import React, { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Navbar from '../components/Navbar';
import RestaurantDashboard from '../components/RestaurantDashboard';
import TableManagement from '../components/TableManagement';
import MenuManagement from '../components/MenuManagement';
import OrderTable from '../components/OrderTable';
import { motion } from 'framer-motion';

const Dashboard = () => {
  const location = useLocation();
  const [currentRestaurant] = useState("Potoba Restaurant");
  
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
  
  return (
    <div className="min-h-screen bg-restaurant-background bg-pattern">
      <Navbar currentTenant={currentRestaurant} />
      
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
      
      {/* Decorative food illustrations */}
      <div className="fixed -bottom-16 -left-16 w-64 h-64 opacity-10 pointer-events-none">
        <img src="/images/food-doodle-1.svg" alt="" className="w-full h-full animate-spin-slow" />
      </div>
      <div className="fixed -top-16 -right-16 w-64 h-64 opacity-10 pointer-events-none">
        <img src="/images/food-doodle-2.svg" alt="" className="w-full h-full animate-spin-slow" />
      </div>
    </div>
  );
};

export default Dashboard;
