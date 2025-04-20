import React, { useState, useEffect } from 'react';
import { Navigate, Outlet, useLocation, Route, Routes } from 'react-router-dom';
import RestaurantDashboard from '../../components/dashboard/RestaurantDashboard';
import TableManagement from '../../components/table/TableManagement';
import MenuManagement from '../../components/menu/MenuManagement';
import OrderTable from '../../components/order/OrderTable';
import MarketingCampaigns from '../../components/marketing/MarketingCampaigns';
import WhatsAppBot from '../../components/marketing/WhatsAppBot';
import AiAssistant from '../../components/marketing/AiAssistant';
import RewardsManagement from '../../components/loyalty/RewardsManagement';
import PromotionsManagement from '../../components/loyalty/PromotionsManagement';
import MembersManagement from '../../components/loyalty/MembersManagement';
import { motion } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { DashboardShell } from '@/components/dashboard/DashboardShell';
import authService from '@/services/authService';
import AddMenuItem from '../menu/AddMenuItem';

const Dashboard = () => {
  const location = useLocation();
  const { user, isLoading, updateUser } = useAuth();
  const [showFoodIcon, setShowFoodIcon] = useState(false);

  // Fetch user and update auth context on mount
  useEffect(() => {
    const fetchUser = async () => {
      try {
        const userData = await authService.getCurrentUser();
        updateUser(userData);
      } catch (error) {
        console.error('Failed to fetch user:', error);
      }
    };

    fetchUser();
  }, [updateUser]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setShowFoodIcon(true);
    }, 1000);
    return () => clearTimeout(timer);
  }, []);

  const pageVariants = {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -20 }
  };

  // Route configuration using a Map for efficient lookups
  const routeMap = new Map([
    ['/dashboard', <RestaurantDashboard />],
    ['/dashboard/tables', <TableManagement />],
    ['/dashboard/menu', <MenuManagement />],
    ['/dashboard/orders', <OrderTable />],
    ['/dashboard/marketing/campaigns', <MarketingCampaigns />],
    ['/dashboard/marketing/whatsapp', <WhatsAppBot />],
    ['/dashboard/marketing/ai-assistant', <AiAssistant />],
    ['/dashboard/loyalty/rewards', <RewardsManagement />],
    ['/dashboard/loyalty/promotions', <PromotionsManagement />],
    ['/dashboard/loyalty/members', <MembersManagement />],
    ['/dashboard/menu/add', <AddMenuItem />],
    ['/dashboard/menu/edit', <AddMenuItem />]
  ]);

  // Determine which component to render based on the current route
  const renderDashboardContent = () => {
    for (const [path, component] of routeMap) {
      if (location.pathname.startsWith(path)) {
        return component;
      }
    }
    return <Outlet />;
  };

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

  if (!user && !isLoading) {
    return <Navigate to="/login" replace />;
  }

  if (!isLoading&&user.restaurants?.length === 0) {
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
