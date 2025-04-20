
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { CalendarDays, ChefHat, DollarSign, ShoppingBasket, Users } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import restaurantService from '@/services/restaurantService';
import { toast } from '@/components/ui/use-toast';
import { Restaurant, MenuItem, Table, Order } from '@/types/api';
import { api } from '@/services/api';

const RestaurantDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [tables, setTables] = useState<Table[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [creatingDemoData, setCreatingDemoData] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      try {
        if (!user || !user.restaurants || user.restaurants.length === 0) {
          navigate('/onboarding');
          return;
        }

        const restaurantId = user.restaurants[0].id || user.restaurants[0]._id || '';
        const token = localStorage.getItem('token');
        
        if (!token) {
          toast({
            title: "Authentication Error",
            description: "Please log in again.",
            variant: "destructive"
          });
          navigate('/login');
          return;
        }
        
        // Fetch restaurant data
        const restaurantData = await restaurantService.getRestaurant(restaurantId);
        setRestaurant(restaurantData);
        
        // Fetch menu items, tables, and orders
        const menuResponse = await api.menu.getAll(restaurantId, token);
        const tablesResponse = await api.tables.getAll(restaurantId, token);
        const ordersResponse = await api.orders.getAll(restaurantId, token);
        
        if (menuResponse.success) {
          setMenuItems(menuResponse.data || []);
        }
        
        if (tablesResponse.success) {
          setTables(tablesResponse.data || []);
        }
        
        if (ordersResponse.success) {
          setOrders(ordersResponse.data || []);
        }
      } catch (error) {
        console.error('Error loading restaurant data:', error);
        toast({
          title: "Error Loading Data",
          description: "There was a problem loading your restaurant data.",
          variant: "destructive"
        });
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [user, navigate]);

  const createDemoData = async () => {
    if (!restaurant) return;
    
    try {
      setCreatingDemoData(true);
      await restaurantService.createDemoData(restaurant.id || restaurant._id || '');
      
      toast({
        title: "Demo Data Created",
        description: "Sample menu items, tables and orders have been created for your restaurant.",
      });
      
      // Reload data
      const token = localStorage.getItem('token');
      if (!token) return;
      
      const restaurantId = restaurant.id || restaurant._id || '';
      const menuResponse = await api.menu.getAll(restaurantId, token);
      const tablesResponse = await api.tables.getAll(restaurantId, token);
      const ordersResponse = await api.orders.getAll(restaurantId, token);
      
      if (menuResponse.success) {
        setMenuItems(menuResponse.data || []);
      }
      
      if (tablesResponse.success) {
        setTables(tablesResponse.data || []);
      }
      
      if (ordersResponse.success) {
        setOrders(ordersResponse.data || []);
      }
    } catch (error) {
      console.error('Error creating demo data:', error);
      toast({
        title: "Error",
        description: "Failed to create demo data.",
        variant: "destructive"
      });
    } finally {
      setCreatingDemoData(false);
    }
  };

  // Calculate dashboard stats
  const activeOrders = orders.filter(order => 
    order.status !== 'completed' && 
    order.status !== 'cancelled' && 
    order.status !== 'paid'
  ).length;
  
  // Fix the arithmetic operation error - calculate total revenue properly
  const totalRevenue = orders
    .filter(order => order.status === 'paid' || order.status === 'completed')
    .reduce((sum, order) => {
      // Convert to number if it's a string, or use 0 if undefined
      const orderTotal = typeof order.total === 'string' 
        ? parseFloat(order.total) 
        : (typeof order.total === 'number' ? order.total : 0);
      
      return sum + orderTotal;
    }, 0);
  
  const totalTables = tables.length;
  const availableTables = tables.filter(table => table.status === 'available').length;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <span className="loading loading-spinner loading-lg"></span>
      </div>
    );
  }

  // Find table by ID
  const getTableNumberById = (tableId: string) => {
    const table = tables.find(t => t.id === tableId || t._id === tableId);
    return table ? table.number : 'N/A';
  };

  return (
    <div className="p-4 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">{restaurant?.name || 'Restaurant Dashboard'}</h2>
          <p className="text-muted-foreground">{restaurant?.description}</p>
        </div>
        
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            onClick={createDemoData}
            disabled={creatingDemoData}
          >
            {creatingDemoData ? 'Creating...' : 'Create Demo Data'}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Orders in Progress</CardTitle>
            <ShoppingBasket className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeOrders}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${totalRevenue.toFixed(2)}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Menu Items</CardTitle>
            <ChefHat className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{menuItems.length}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Tables</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{availableTables} / {totalTables}</div>
          </CardContent>
        </Card>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Recent Orders</CardTitle>
          </CardHeader>
          <CardContent>
            {orders.length === 0 ? (
              <p className="text-muted-foreground">No orders yet.</p>
            ) : (
              <div className="space-y-4">
                {orders.slice(0, 5).map((order) => (
                  <div key={order.id || order._id} className="flex justify-between items-center">
                    <div>
                      <div className="font-medium">Table {getTableNumberById(order.tableId)}</div>
                      <div className="text-sm text-muted-foreground">
                        {new Date(order.createdAt).toLocaleString()}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div>${typeof order.total === 'number' ? order.total.toFixed(2) : order.total}</div>
                      <Badge variant={
                        order.status === 'paid' || order.status === 'completed' ? 'default' : 
                        order.status === 'preparing' || order.status === 'ready' || order.status === 'in-progress' ? 'secondary' : 
                        order.status === 'cancelled' ? 'destructive' : 'outline'
                      }>
                        {order.status}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Popular Menu Items</CardTitle>
          </CardHeader>
          <CardContent>
            {menuItems.length === 0 ? (
              <p className="text-muted-foreground">No menu items yet.</p>
            ) : (
              <div className="space-y-4">
                {menuItems.slice(0, 5).map((item) => (
                  <div key={item.id || item._id} className="flex justify-between items-center">
                    <div>
                      <div className="font-medium">{item.name}</div>
                      <div className="text-sm text-muted-foreground">{item.category}</div>
                    </div>
                    <div>${item.price.toFixed(2)}</div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default RestaurantDashboard;
