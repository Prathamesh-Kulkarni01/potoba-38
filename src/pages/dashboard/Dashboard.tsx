import React, { useState, useEffect } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import RestaurantDashboard from '../../components/dashboard/RestaurantDashboard';
import TableManagement from '../table/TableManagement';
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
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import AddMenuItem from '../menu/AddMenuItem';
import { useToast } from '@/components/ui/use-toast';

interface Restaurant {
  id: string;
  name: string;
  description: string;
  address: string;
  phone: string;
  cuisine: string;
  ownerId: string;
  createdAt: string;
  updatedAt: string;
}

const Dashboard = () => {
  const location = useLocation();
  const { user, restaurantId, loading, token } = useAuth();
  const [showFoodIcon, setShowFoodIcon] = useState(false);
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    const fetchRestaurant = async () => {
      if (restaurantId) {
        try {
          const restaurantRef = doc(db, 'restaurants', restaurantId);
          const restaurantDoc = await getDoc(restaurantRef);
          
          if (restaurantDoc.exists()) {
            setRestaurant({
              id: restaurantDoc.id,
              ...restaurantDoc.data()
            } as Restaurant);
          } else {
            toast({
              title: "Error",
              description: "Restaurant not found",
              variant: "destructive",
            });
          }
        } catch (error) {
          console.error('Failed to fetch restaurant:', error);
          toast({
            title: "Error",
            description: "Failed to load restaurant data",
            variant: "destructive",
          });
        }
      }
    };

    fetchRestaurant();
  }, [restaurantId, toast]);

  useEffect(() => {
    const timer = setTimeout(() => setShowFoodIcon(true), 1000);
    return () => clearTimeout(timer);
  }, []);

  const pageVariants = {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -20 }
  };

  const dashboardRoutes = {
    '/dashboard': <RestaurantDashboard restaurant={restaurant} />,
    '/dashboard/tables': <TableManagement restaurantId={restaurantId} />,
    '/dashboard/menu': <MenuManagement restaurantId={restaurantId} />,
    '/dashboard/orders': <OrderTable restaurantId={restaurantId} />,
    '/dashboard/marketing/campaigns': <MarketingCampaigns restaurantId={restaurantId} />,
    '/dashboard/marketing/whatsapp': <WhatsAppBot restaurantId={restaurantId} />,
    '/dashboard/marketing/ai-assistant': <AiAssistant restaurantId={restaurantId} />,
    '/dashboard/loyalty/rewards': <RewardsManagement restaurantId={restaurantId} />,
    '/dashboard/loyalty/promotions': <PromotionsManagement restaurantId={restaurantId} />,
    '/dashboard/loyalty/members': <MembersManagement restaurantId={restaurantId} />,
    '/dashboard/menu/add': <AddMenuItem restaurantId={restaurantId} />
  };

  const renderDashboardContent = () => {
    if (location.pathname.startsWith('/dashboard/menu/edit')) {
      return <AddMenuItem restaurantId={restaurantId} />;
    }
    return dashboardRoutes[location.pathname] || <Outlet />;
  };

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

  if (!token || !user) {
    return <Navigate to="/login" replace />;
  }

  if (!restaurantId) {
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
