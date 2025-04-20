import React, { useState, useEffect } from 'react';
import { Navigate, Outlet, useLocation, Route, Routes } from 'react-router-dom';
import RestaurantDashboard from '../components/RestaurantDashboard';
import TableManagement from '../components/TableManagement';
import MenuManagement from '../components/MenuManagement';
import OrderTable from '../components/OrderTable';
import MarketingCampaigns from '../components/marketing/MarketingCampaigns';
import WhatsAppBot from '../components/marketing/WhatsAppBot';
import AiAssistant from '../components/marketing/AiAssistant';
import RewardsManagement from '../components/loyalty/RewardsManagement';
import PromotionsManagement from '../components/loyalty/PromotionsManagement';
import MembersManagement from '../components/loyalty/MembersManagement';
import { motion } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { DashboardShell } from '@/components/DashboardShell';
import authService from '@/services/authService';
import AddMenuItem from './AddMenuItem';

const Dashboard = () => {
  const location = useLocation();
  const { user, isLoading, updateUser } = useAuth(); // Added updateUser from context
  const [showFoodIcon, setShowFoodIcon] = useState(false);

  // Fetch user and update auth context on mount
  useEffect(() => {
    const fetchUser = async () => {
      try {
        const userData = await authService.getCurrentUser(); // Replace with actual API endpoint
        updateUser(userData); // Update user in auth context
      } catch (error) {
        console.error('Failed to fetch user:', error);
      }
    };

    fetchUser();
  }, [updateUser]);

  // Always initialize hooks before any conditional returns
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
    
    // Main navigation routes
    if (path === '/dashboard') {
      return <RestaurantDashboard />;
    } else if (path === '/dashboard/tables') {
      return <TableManagement />;
    } else if (path === '/dashboard/menu') {
      return <MenuManagement />;
    } else if (path === '/dashboard/orders') {
      return <OrderTable />;
    }
    
    // Marketing routes
    else if (path === '/dashboard/marketing/campaigns') {
      return <MarketingCampaigns />;
    } else if (path === '/dashboard/marketing/whatsapp') {
      return <WhatsAppBot />;
    } else if (path === '/dashboard/marketing/ai-assistant') {
      return <AiAssistant />;
    }
    
    // Loyalty routes
    else if (path === '/dashboard/loyalty/rewards') {
      return <RewardsManagement />;
    } else if (path === '/dashboard/loyalty/promotions') {
      return <PromotionsManagement />;
    } else if (path === '/dashboard/loyalty/members') {
      return <MembersManagement />;
    }

    // Menu sub-routes
    else if (path === '/dashboard/menu/add') {
      return <AddMenuItem />;
    }
    else if (path.startsWith('/dashboard/menu/edit/:id')) {
      const id = path.split('/').pop();
      return <AddMenuItem />;
    }
    
    // Render the Outlet for any other sub-routes
    return <Outlet />;
  };
  
  // If still loading, show a simple loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-restaurant-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-restaurant-primary mx-auto"></div>
          <p className="mt-4 text-restaurant-primary font-medium">Loading dashboard...</p>
        </div>
      </div>
    );
  }
  
  // Redirect to login if not authenticated
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  
  // Redirect to onboarding if user has no restaurants
  if (user.restaurants?.length === 0) {
    return <Navigate to="/onboarding" replace />;
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
