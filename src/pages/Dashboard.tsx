
import React, { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Navbar from '../components/Navbar';
import RestaurantDashboard from '../components/RestaurantDashboard';
import TableManagement from '../components/TableManagement';
import MenuManagement from '../components/MenuManagement';
import OrderTable from '../components/OrderTable';

const Dashboard = () => {
  const location = useLocation();
  const [currentRestaurant] = useState("Demo Restaurant");
  
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
    <div className="min-h-screen bg-restaurant-background">
      <Navbar currentTenant={currentRestaurant} />
      
      <main className="container mx-auto px-4 py-6">
        {renderDashboardContent()}
      </main>
    </div>
  );
};

export default Dashboard;
