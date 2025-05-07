import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { CalendarDays, ChefHat, DollarSign, IndianRupee, ShoppingBasket, Users } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/components/ui/use-toast';
import { Restaurant, MenuItem, Table, Order } from '@/types/api';
import { collection, query, getDocs, doc, getDoc, addDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useLanguage } from '@/hooks/use-language';
import AiAnalytics from './AiAnalytics';


const RestaurantDashboard = () => {
  const { user, currentRestaurantId } = useAuth();
  const navigate = useNavigate();
  const { t } = useLanguage();

  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [tables, setTables] = useState<Table[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [creatingDemoData, setCreatingDemoData] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      try {
        if (!user || !user.restaurants || user.restaurants.length === 0) {
          navigate('/onboarding');
          return;
        }

        if (!currentRestaurantId) {
          toast({
            title: "Error",
            description: "No restaurant selected",
            variant: "destructive"
          });
          navigate('/dashboard');
          return;
        }

        // Fetch restaurant data
        const restaurantRef = doc(db, 'restaurants', currentRestaurantId);
        const restaurantDoc = await getDoc(restaurantRef);
        if (restaurantDoc.exists()) {
          setRestaurant({ id: restaurantDoc.id, ...restaurantDoc.data() } as Restaurant);
        }

        // Fetch menu items
        const menuRef = collection(db, 'restaurants', currentRestaurantId, 'menu');
        const menuSnapshot = await getDocs(menuRef);
        const menuData = menuSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as MenuItem[];
        setMenuItems(menuData);

        // Fetch tables
        const tablesRef = collection(db, 'restaurants', currentRestaurantId, 'tables');
        const tablesSnapshot = await getDocs(tablesRef);
        const tablesData = tablesSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Table[];
        setTables(tablesData);

        // Fetch orders
        const ordersRef = collection(db, 'restaurants', currentRestaurantId, 'orders');
        const ordersSnapshot = await getDocs(ordersRef);
        const ordersData = ordersSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Order[];
        setOrders(ordersData);

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
  }, [user, navigate, currentRestaurantId]);

  const createDemoData = async () => {
    if (!currentRestaurantId) return;

    try {
      setCreatingDemoData(true);

      // Create demo menu items
      const menuRef = collection(db, 'restaurants', currentRestaurantId, 'menu');
      const demoMenuItems = [
        {
          name: 'Margherita Pizza',
          description: 'Classic tomato and mozzarella pizza',
          price: 12.99,
          category: 'Main Course',
          available: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        },
        {
          name: 'Caesar Salad',
          description: 'Fresh romaine lettuce with Caesar dressing',
          price: 8.99,
          category: 'Appetizers',
          available: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
      ];

      for (const item of demoMenuItems) {
        await addDoc(menuRef, item);
      }

      // Create demo tables
      const tablesRef = collection(db, 'restaurants', currentRestaurantId, 'tables');
      const demoTables = [
        { number: 1, capacity: 4, status: 'available' },
        { number: 2, capacity: 2, status: 'available' },
        { number: 3, capacity: 6, status: 'available' }
      ];

      for (const table of demoTables) {
        await addDoc(tablesRef, {
          ...table,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        });
      }

      toast({
        title: "Demo Data Created",
        description: "Sample menu items and tables have been created for your restaurant.",
      });

      // Reload data
      // loadData();
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
            {creatingDemoData ? t('Creating...') : t('Create Demo Data')}
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
            <IndianRupee className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₹{totalRevenue.toFixed(2)}</div>
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
                      <div>₹{typeof order.total === 'number' ? order.total.toFixed(2) : order.total}</div>
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
                    <div>₹{item.price.toFixed(2)}</div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
      <AiAnalytics />
    </div>
  );
};

export default RestaurantDashboard;
