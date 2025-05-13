// src/app/dashboard/page.tsx
'use client';

import * as React from 'react'; 
import { useEffect, useState, useMemo, useCallback } from 'react';
import { useAuth } from '@/lib/auth/context';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ChefHat, Settings, UserCog, Users, Store, DollarSign, ShoppingCart, Star, LineChart as LineChartIcon, BookCopy, ShieldCheck, ScanText, ListOrdered, Briefcase, AreaChart, BarChart3, PieChart as PieChartIcon, Lightbulb, Clock, Users2, Table as TableIcon, RefreshCw, Hourglass, Utensils, CheckCircle, XCircle } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { getRestaurantsByOwner, getRestaurant } from '@/lib/firebase/firestore'; 
import type { RestaurantProfile, ClientOrder, OrderStatus as OrderStatusType, Table as FirebaseTableType, PopularItem as PopularItemType } from '@/types';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, LineChart, Line, PieChart, Pie, Cell, Sector } from 'recharts';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from '@/lib/utils';
import {
  getRestaurantOrderSummary,
  getRestaurantOrderStatusDistribution,
  getPopularMenuItems,
  listenToRestaurantOrders,
  type RestaurantOrderSummary,
  type OrderStatusDistribution,
} from '@/lib/firebase/orders';
import {
  getRestaurantTableOccupancy,
  listenToRestaurantTables,
  type TableOccupancy,
} from '@/lib/firebase/tables';
import { format, parseISO, subDays, startOfDay, endOfDay, eachDayOfInterval } from 'date-fns';
import { useToast } from '@/hooks/use-toast';


function AdminDashboard() {
  // ... (AdminDashboard implementation remains the same)
  return (
    <div className="space-y-6">
      <Card className="shadow-lg hover:shadow-xl transition-shadow duration-300">
        <CardHeader>
          <CardTitle className="text-2xl font-semibold text-primary flex items-center">
            <UserCog className="mr-3 h-7 w-7" />
            Platform Admin Panel
          </CardTitle>
          <CardDescription>Manage users, system settings, and view overall application analytics for Potoba.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-6 md:grid-cols-2">
          <DashboardNavigationCard
            title="User Management"
            description="View, edit, and manage user accounts and roles."
            icon={<Users className="h-8 w-8 text-accent" />}
            actionText="Go to Users"
            actionHref="/dashboard/admin/users"
            imageUrl="https://picsum.photos/seed/usermanagement/400/200"
            dataAiHint="user list interface"
          />
           <DashboardNavigationCard
            title="Restaurant Management"
            description="Oversee all restaurants on the platform."
            icon={<ShieldCheck className="h-8 w-8 text-accent" />}
            actionText="Manage Restaurants"
            actionHref="/dashboard/admin/restaurants"
            imageUrl="https://picsum.photos/seed/restomanage/400/200"
            dataAiHint="restaurant directory"
          />
          <DashboardNavigationCard
            title="System Analytics"
            description="Monitor application performance and user activity."
            icon={<AreaChart className="h-8 w-8 text-accent" />}
            actionText="View Analytics"
            actionHref="/dashboard/admin/analytics"
            imageUrl="https://picsum.photos/seed/analytics/400/200"
            dataAiHint="dashboard charts"
          />
           <DashboardNavigationCard
            title="Content Moderation"
            description="Review and manage user-generated content."
            icon={<ScanText className="h-8 w-8 text-accent" />}
            actionText="Moderate Content"
            actionHref="/dashboard/admin/content"
            imageUrl="https://picsum.photos/seed/contentmoderation/400/200"
            dataAiHint="content review"
          />
          <DashboardNavigationCard
            title="Application Settings"
            description="Configure global application settings and features."
            icon={<Settings className="h-8 w-8 text-accent" />}
            actionText="Go to Settings"
            actionHref="/dashboard/admin/settings"
            imageUrl="https://picsum.photos/seed/appsettings/400/200"
            dataAiHint="settings panel"
          />
        </CardContent>
      </Card>
    </div>
  );
}

interface DashboardMetricCardProps {
  title: string;
  value: string | number;
  change?: string;
  changeType?: 'positive' | 'negative' | 'neutral';
  icon: React.ReactNode;
  footerText?: string;
  isLoading?: boolean;
  dataAiHint?: string;
}

function DashboardMetricCard({ title, value, change, changeType = 'neutral', icon, footerText, isLoading, dataAiHint }: DashboardMetricCardProps) {
  const changeColor = changeType === 'positive' ? 'text-green-600 dark:text-green-400' : changeType === 'negative' ? 'text-red-600 dark:text-red-400' : 'text-muted-foreground';
  return (
    <Card className="shadow-md hover:shadow-lg transition-shadow">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <>
            <Skeleton className="h-8 w-24 my-1" />
            {change && <Skeleton className="h-4 w-20 mt-1" />}
          </>
        ) : (
          <>
            <div className="text-2xl font-bold">{value}</div>
            {change && <p className={cn("text-xs", changeColor)}>{change}</p>}
          </>
        )}
        {footerText && !isLoading && (
          <p className="text-xs text-muted-foreground mt-1">{footerText}</p>
        )}
         {isLoading && footerText && ( <Skeleton className="h-4 w-32 mt-1" /> )}
      </CardContent>
    </Card>
  );
}

const CHART_COLORS = [
  'hsl(var(--chart-1))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))',
  'hsl(var(--chart-4))', 'hsl(var(--chart-5))', 'hsl(var(--primary))',
  'hsl(var(--secondary))', 'hsl(var(--accent))',
];

interface SalesTrendDataPoint {
  date: string;
  revenue: number;
  orders: number;
}

const orderStatusConfig: Record<OrderStatusType, { label: string; icon?: React.ElementType; shortLabel?: string }> = {
  pending_customer_confirmation: { label: 'Pending Customer Confirmation', shortLabel: 'Pending Cust.', icon: Hourglass },
  pending_kitchen: { label: 'Pending Kitchen Acceptance', shortLabel: 'Pending Kitchen', icon: Hourglass },
  confirmed_by_kitchen: { label: 'Kitchen Confirmed', shortLabel: 'Kitchen Confirmed', icon: Utensils },
  preparing: { label: 'Preparing', shortLabel: 'Preparing', icon: Utensils },
  ready_for_pickup: { label: 'Ready for Pickup', shortLabel: 'Ready Pickup', icon: ShoppingCart },
  served: { label: 'Served', shortLabel: 'Served', icon: CheckCircle },
  payment_pending: { label: 'Payment Pending', shortLabel: 'Payment Pend.', icon: Clock },
  completed: { label: 'Completed', shortLabel: 'Completed', icon: CheckCircle },
  cancelled_by_customer: { label: 'Cancelled by Customer', shortLabel: 'Cancelled (Cust)', icon: XCircle },
  cancelled_by_restaurant: { label: 'Cancelled by Restaurant', shortLabel: 'Cancelled (Rest)', icon: XCircle },
};


function OwnerDashboard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [currentRestaurantName, setCurrentRestaurantName] = useState<string | null>(null);
  const [selectedRestaurantId, setSelectedRestaurantId] = useState<string | null>(null);
  
  const [isOverallLoading, setIsOverallLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const [dashboardMetrics, setDashboardMetrics] = useState<RestaurantOrderSummary & { tableOccupancy?: TableOccupancy } | null>(null);
  const [salesTrendData, setSalesTrendData] = useState<SalesTrendDataPoint[]>([]);
  const [popularItems, setPopularItems] = useState<PopularItemType[]>([]);
  const [orderStatusDistribution, setOrderStatusDistribution] = useState<OrderStatusDistribution[]>([]);
  const [peakHoursData, setPeakHoursData] = useState<{ hour: string; orders: number }[]>([]);
  const [aiInsights, setAiInsights] = useState<string[]>([]);

  const [salesDataPeriod, setSalesDataPeriod] = useState<'7d' | '30d'>('7d');
  const [liveOrders, setLiveOrders] = useState<ClientOrder[]>([]);
  const [liveTables, setLiveTables] = useState<FirebaseTableType[]>([]);

  useEffect(() => {
    if (user?.uid && user.role === 'owner') {
      const storedRestaurantId = localStorage.getItem(`selectedRestaurant_${user.uid}`) || user.restaurantId;
      if (storedRestaurantId) {
        setSelectedRestaurantId(storedRestaurantId);
      } else {
        getRestaurantsByOwner(user.uid).then(restaurants => {
          if (restaurants.length > 0) {
            const firstRestaurantId = restaurants[0].id;
            setSelectedRestaurantId(firstRestaurantId);
            localStorage.setItem(`selectedRestaurant_${user.uid}`, firstRestaurantId);
          } else {
             setIsOverallLoading(false); 
          }
        });
      }
    } else if (user) { 
      setIsOverallLoading(false);
    }
  }, [user]);

  const fetchDataForDashboard = useCallback(async (restaurantId: string, period: 7 | 30) => {
    if (!restaurantId) return;
    setIsRefreshing(true); 
    try {
      const currentRestaurant = await getRestaurant(restaurantId);
      setCurrentRestaurantName(currentRestaurant?.name || "Restaurant");

      const [summary, statusDist, popular, occupancy] = await Promise.all([
        getRestaurantOrderSummary(restaurantId, period),
        getRestaurantOrderStatusDistribution(restaurantId, period),
        getPopularMenuItems(restaurantId, period, 5),
        getRestaurantTableOccupancy(restaurantId)
      ]);

      setDashboardMetrics({ ...summary, tableOccupancy: occupancy });
      setPopularItems(popular);
      setOrderStatusDistribution(statusDist.map((s, idx) => ({ ...s, fill: CHART_COLORS[idx % CHART_COLORS.length] })));
      
      const periodInDays = period === 7 ? 7 : 30;
      const endDate = new Date();
      const startDate = subDays(endDate, periodInDays - 1);
      const dateRange = eachDayOfInterval({ start: startOfDay(startDate), end: endOfDay(endDate) });

      const dailyData: Record<string, { revenue: number; orders: number }> = {};
      dateRange.forEach(day => {
        dailyData[format(day, 'yyyy-MM-dd')] = { revenue: 0, orders: 0 };
      });

      summary.ordersLastPeriod?.forEach(order => {
        const orderDateStr = format(parseISO(order.createdAt), 'yyyy-MM-dd');
        if (dailyData[orderDateStr]) {
          dailyData[orderDateStr].revenue += order.totalAmount;
          dailyData[orderDateStr].orders += 1; 
        }
      });
      
      const trendData = dateRange.map(day => {
        const dateStr = format(day, 'yyyy-MM-dd');
        return {
          date: format(day, periodInDays === 7 ? 'EEE' : 'd MMM'),
          revenue: dailyData[dateStr]?.revenue || 0,
          orders: dailyData[dateStr]?.orders || 0,
        };
      });
      setSalesTrendData(trendData);
      
      const hourlyOrders: Record<number, number> = {};
      summary.ordersLastPeriod?.forEach(order => {
        const hour = parseISO(order.createdAt).getHours();
        hourlyOrders[hour] = (hourlyOrders[hour] || 0) + 1;
      });
      const peakData = Object.entries(hourlyOrders).map(([hour, count]) => ({ hour: `${parseInt(hour)}:00`, orders: count})).sort((a,b) => parseInt(a.hour) - parseInt(b.hour));
      setPeakHoursData(peakData.slice(0,12)); 

      const insights = [];
      if (summary.totalRevenue > 0) insights.push(`Total revenue for the last ${periodInDays} days: ₹${summary.totalRevenue.toLocaleString()}.`);
      if (occupancy.occupancyRate > 70) insights.push(`Table occupancy is high at ${occupancy.occupancyRate.toFixed(0)}%. Consider optimizing table turnover.`);
      if (popular.length > 0) insights.push(`${popular[0].menuItemName} is your top seller! Ensure stock levels are good.`);
      setAiInsights(insights);

    } catch (error) {
      console.error("Error fetching dashboard data:", error);
      toast({ variant: 'destructive', title: 'Error Fetching Data', description: 'Could not load dashboard insights.' });
    } finally {
      setIsOverallLoading(false);
      setIsRefreshing(false);
    }
  }, [toast]);

  useEffect(() => {
    if (!selectedRestaurantId) {
      return;
    }
  
    // Fetch initial data when restaurantId or period changes
    fetchDataForDashboard(selectedRestaurantId, salesDataPeriod === '7d' ? 7 : 30);
  
    // Setup listeners
    let currentUnsubOrders: (() => void) | null = null;
    let currentUnsubTables: (() => void) | null = null;
  
    const setupAsyncListeners = async () => {
      try {
        currentUnsubOrders = listenToRestaurantOrders(
          selectedRestaurantId,
          (updatedOrders) => {
            setLiveOrders(updatedOrders);
          },
          salesDataPeriod === '7d' ? 7 : 30
        );
  
        // Assuming listenToRestaurantTables is now synchronous as per previous fixes
        // If it were still async returning a Promise for the unsub function:
        // currentUnsubTables = await listenToRestaurantTables(selectedRestaurantId, (updatedTables) => { ... });
        // But since it should be sync:
        currentUnsubTables = listenToRestaurantTables(selectedRestaurantId, (updatedTables) => {
          setLiveTables(updatedTables);
          const occupiedCount = updatedTables.filter(t => t.status === 'occupied').length;
          const totalTables = updatedTables.length;
          const occupancyRate = totalTables > 0 ? (occupiedCount / totalTables) * 100 : 0;
          setDashboardMetrics(prev => {
            const currentPrev = prev || { totalRevenue: 0, totalOrders: 0, averageOrderValue: 0 };
            return {
              ...currentPrev, 
              tableOccupancy: { totalTables, occupiedTables: occupiedCount, occupancyRate }
            };
          });
        });
      } catch (error) {
        console.error("Error setting up listeners:", error);
        toast({ variant: "destructive", title: "Listener Error", description: "Could not set up live data updates." });
      }
    };

    setupAsyncListeners();
  
    // Cleanup function for listeners
    return () => {
      if (currentUnsubOrders) {
        currentUnsubOrders();
      }
      if (currentUnsubTables) {
        currentUnsubTables();
      }
    };
  }, [selectedRestaurantId, salesDataPeriod, toast, fetchDataForDashboard]);


  if (!user || user.role !== 'owner') {
    return (
        <div className="p-4">
            <Card><CardHeader><CardTitle>Access Denied</CardTitle></CardHeader>
            <CardContent><p>This dashboard is for restaurant owners.</p></CardContent></Card>
        </div>
    );
  }
  
  if (isOverallLoading && !selectedRestaurantId) { 
    return (
        <div className="p-4">
            <Skeleton className="h-12 w-1/2 mb-4" />
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-32" />)}
            </div>
        </div>
    );
  }


  if (!selectedRestaurantId && !isOverallLoading) { 
    return (
      <div className="space-y-6 p-4">
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="text-2xl font-semibold text-primary">Welcome, Restaurant Owner!</CardTitle>
            <CardDescription>
              You don't have a restaurant selected or haven't created one yet.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="mb-4">Please select a restaurant from the sidebar, or create a new one to get started.</p>
            <Button asChild className="bg-accent hover:bg-accent/90 text-accent-foreground">
              <Link href="/dashboard/create-restaurant">Create New Restaurant</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  const isLoadingMetrics = isOverallLoading || isRefreshing;


  return (
    <div className="space-y-8">
      <Card className="shadow-lg hover:shadow-xl transition-shadow duration-300">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-2xl font-semibold text-primary flex items-center">
              <Store className="mr-3 h-7 w-7" />
              {currentRestaurantName ? `${currentRestaurantName} - Insights` : <Skeleton className="h-7 w-48" />}
            </CardTitle>
            <CardDescription>Key metrics and performance overview for your restaurant.</CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={() => fetchDataForDashboard(selectedRestaurantId!, salesDataPeriod === '7d' ? 7 : 30)} disabled={isRefreshing}>
            <RefreshCw className={cn("mr-2 h-4 w-4", isRefreshing && "animate-spin")} />
            Refresh
          </Button>
        </CardHeader>
      </Card>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <DashboardMetricCard
            title={`Revenue (${salesDataPeriod === '7d' ? 'Last 7 Days' : 'Last 30 Days'})`}
            value={dashboardMetrics ? `₹${dashboardMetrics.totalRevenue.toLocaleString()}` : '...'}
            icon={<DollarSign className="h-5 w-5 text-muted-foreground" />}
            isLoading={isLoadingMetrics}
            dataAiHint="revenue growth"
        />
        <DashboardMetricCard
            title={`Total Orders (${salesDataPeriod === '7d' ? 'Last 7 Days' : 'Last 30 Days'})`}
            value={dashboardMetrics ? dashboardMetrics.totalOrders : '...'}
            icon={<ShoppingCart className="h-5 w-5 text-muted-foreground" />}
            isLoading={isLoadingMetrics}
            dataAiHint="order volume"
        />
        <DashboardMetricCard
            title="Avg. Order Value"
            value={dashboardMetrics ? `₹${dashboardMetrics.averageOrderValue.toFixed(2)}` : '...'}
            icon={<DollarSign className="h-5 w-5 text-muted-foreground" />}
            isLoading={isLoadingMetrics}
            dataAiHint="average check size"
        />
         <DashboardMetricCard
            title="Active Tables"
            value={dashboardMetrics?.tableOccupancy ? `${dashboardMetrics.tableOccupancy.occupiedTables} / ${dashboardMetrics.tableOccupancy.totalTables}` : '...'}
            footerText={dashboardMetrics?.tableOccupancy ? `${dashboardMetrics.tableOccupancy.occupancyRate.toFixed(0)}% Occupancy` : undefined}
            icon={<TableIcon className="h-5 w-5 text-muted-foreground" />}
            isLoading={isLoadingMetrics}
            dataAiHint="table occupancy"
        />
      </div>
      <Card className="shadow-md bg-gradient-to-r from-primary/5 via-accent/5 to-secondary/5 border-primary/20">
        <CardHeader>
            <CardTitle className="text-lg flex items-center text-primary">
                <Lightbulb className="mr-2 h-5 w-5"/> AI-Powered Suggestions
            </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
             {isLoadingMetrics || aiInsights.length === 0 ? <> <Skeleton className="h-6 w-3/4"/> <Skeleton className="h-6 w-full"/> <Skeleton className="h-6 w-2/3"/> </> : 
                aiInsights.map((insight, idx) => (
                    <p key={idx}><strong className="text-foreground">{insight.split(':')[0]}:</strong>{insight.split(':')[1]}</p>
                ))
            }
        </CardContent>
      </Card>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 shadow-md">
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle className="text-lg flex items-center">
                  <LineChartIcon className="mr-2 h-5 w-5 text-accent" /> Sales Trend
              </CardTitle>
              <Tabs defaultValue={salesDataPeriod} onValueChange={(value) => setSalesDataPeriod(value as '7d' | '30d')}>
                <TabsList className="grid w-full grid-cols-2 h-8 text-xs">
                  <TabsTrigger value="7d" className="h-6 px-2 text-xs">7 Days</TabsTrigger>
                  <TabsTrigger value="30d" className="h-6 px-2 text-xs">30 Days</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          </CardHeader>
          <CardContent>
            {isLoadingMetrics || salesTrendData.length === 0 ? <Skeleton className="h-[300px] w-full" /> : (
            <ResponsiveContainer width="100%" height={300}>
                <LineChart data={salesTrendData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border) / 0.5)" />
                    <XAxis dataKey="date" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} />
                    <YAxis tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} />
                    <RechartsTooltip contentStyle={{ backgroundColor: 'hsl(var(--background))', border: '1px solid hsl(var(--border))' }} itemStyle={{ color: 'hsl(var(--foreground))' }}/>
                    <Legend wrapperStyle={{fontSize: "12px"}}/>
                    <Line type="monotone" dataKey="revenue" stroke="hsl(var(--primary))" strokeWidth={2} activeDot={{ r: 6, fill: 'hsl(var(--primary))' }} name="Revenue (₹)" />
                    <Line type="monotone" dataKey="orders" stroke="hsl(var(--secondary))" strokeWidth={2} activeDot={{ r: 6, fill: 'hsl(var(--secondary))' }} name="Orders" />
                </LineChart>
            </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
        <Card className="shadow-md">
          <CardHeader>
            <CardTitle className="text-lg flex items-center">
                <Star className="mr-2 h-5 w-5 text-accent" /> Top Selling Items
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {isLoadingMetrics || popularItems.length === 0 ? Array.from({length: 5}).map((_, i) => <Skeleton key={i} className="h-10 w-full" />) :
            popularItems.map(item => (
                <div key={item.menuItemId} className="flex justify-between items-center p-2 bg-muted/30 hover:bg-muted/50 rounded-md text-sm">
                    <span className="font-medium text-foreground truncate max-w-[60%]">{item.menuItemName}</span>
                    <span className="text-xs text-muted-foreground text-right">{item.orderCount} orders <br/> ₹{item.totalRevenue.toLocaleString()}</span>
                </div>
            ))}
             {!isLoadingMetrics && selectedRestaurantId && (
                <Button variant="outline" size="sm" className="w-full mt-4" asChild>
                    <Link href={`/dashboard/menu-management/${selectedRestaurantId}`}>View Full Menu</Link>
                </Button>
             )}
          </CardContent>
        </Card>
      </div>

       <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="shadow-md">
                <CardHeader>
                    <CardTitle className="text-lg flex items-center">
                        <PieChartIcon className="mr-2 h-5 w-5 text-accent" /> Order Status Distribution
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {isLoadingMetrics || orderStatusDistribution.length === 0 ? <Skeleton className="h-[250px] w-full" /> : (
                    <ResponsiveContainer width="100%" height={250}>
                        <PieChart>
                            <Pie data={orderStatusDistribution} dataKey="count" nameKey="status" cx="50%" cy="50%" outerRadius={80} labelLine={false} label={({ status, percent }) => `${(orderStatusConfig[status as OrderStatusType]?.shortLabel || status)} ${(percent * 100).toFixed(0)}%`}>
                                {orderStatusDistribution.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.fill || CHART_COLORS[index % CHART_COLORS.length]} stroke={entry.fill || CHART_COLORS[index % CHART_COLORS.length]} />
                                ))}
                            </Pie>
                            <RechartsTooltip contentStyle={{ backgroundColor: 'hsl(var(--background))', border: '1px solid hsl(var(--border))' }} itemStyle={{ color: 'hsl(var(--foreground))' }} formatter={(value, name) => [value, orderStatusConfig[name as OrderStatusType]?.label || name]}/>
                            <Legend wrapperStyle={{fontSize: "12px"}} formatter={(value) => orderStatusConfig[value as OrderStatusType]?.label || value} />
                        </PieChart>
                    </ResponsiveContainer>
                    )}
                </CardContent>
            </Card>
            <Card className="shadow-md">
                <CardHeader>
                    <CardTitle className="text-lg flex items-center">
                        <BarChart3 className="mr-2 h-5 w-5 text-accent" /> Peak Ordering Hours
                    </CardTitle>
                </CardHeader>
                <CardContent>
                     {isLoadingMetrics || peakHoursData.length === 0 ? <Skeleton className="h-[250px] w-full" /> : (
                    <ResponsiveContainer width="100%" height={250}>
                        <BarChart data={peakHoursData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border) / 0.5)"/>
                            <XAxis dataKey="hour" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} />
                            <YAxis tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} />
                            <RechartsTooltip contentStyle={{ backgroundColor: 'hsl(var(--background))', border: '1px solid hsl(var(--border))' }} itemStyle={{ color: 'hsl(var(--foreground))' }}/>
                            <Bar dataKey="orders" fill="hsl(var(--accent))" radius={[4, 4, 0, 0]} name="Orders" />
                        </BarChart>
                    </ResponsiveContainer>
                     )}
                </CardContent>
            </Card>
        </div>

     
    </div>
  );
}


function UserDashboard() {
  const { user } = useAuth();
  const restaurantContextId = user?.restaurantId || 'default'; 

  return (
    <div className="space-y-6">
      <Card className="shadow-lg hover:shadow-xl transition-shadow duration-300">
        <CardHeader>
          <CardTitle className="text-2xl font-semibold text-primary flex items-center">
            <ChefHat className="mr-3 h-7 w-7" />
            Your Culinary Hub
          </CardTitle>
          <CardDescription>Explore menus, plan your meals, and manage your culinary profile in Potoba.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <DashboardNavigationCard
            title="Browse Menus"
            description="Discover delicious dishes from various restaurants."
            icon={<BookCopy className="h-8 w-8 text-accent" />} 
            actionText="Find Menus"
            actionHref={user?.restaurantId ? `/dashboard/menu-management/${user.restaurantId}` : `/menu/table/demoTableIdForUser`} 
            imageUrl="https://picsum.photos/seed/menus/400/200"
            dataAiHint="food variety"
          />
          <DashboardNavigationCard
            title="Meal Planner"
            description="Organize your weekly meals effortlessly."
            icon={<ChefHat className="h-8 w-8 text-accent" />} 
            actionText="Plan Meals"
            actionHref={user?.restaurantId ? `/dashboard/meal-planner/${user.restaurantId}` : '/dashboard/meal-planner/default'}
            imageUrl="https://picsum.photos/seed/mealplanner/400/200"
            dataAiHint="calendar schedule"
          />
          <DashboardNavigationCard
            title="My Profile"
            description="Update your preferences and personal information."
            icon={<UserCog className="h-8 w-8 text-accent" />} 
            actionText="View Profile"
            actionHref="/dashboard/profile"
            imageUrl="https://picsum.photos/seed/userprofile/400/200"
            dataAiHint="personal account"
          />
        </CardContent>
      </Card>
    </div>
  );
}

interface DashboardNavigationCardProps {
  title: string;
  description: string;
  icon: React.ReactNode;
  actionText: string;
  actionHref: string;
  imageUrl: string;
  dataAiHint: string;
  small?: boolean; 
}

function DashboardNavigationCard({ title, description, icon, actionText, actionHref, imageUrl, dataAiHint, small = false }: DashboardNavigationCardProps) {
  return (
    <Card className={`overflow-hidden transition-all hover:scale-[1.02] hover:shadow-lg ${small ? 'flex flex-col' : ''}`}>
      <Image src={imageUrl} alt={title} width={small ? 300 : 400} height={small ? 150 : 200} className={`w-full ${small ? 'h-32' : 'h-40'} object-cover`} data-ai-hint={dataAiHint}/>
      <CardHeader className={small ? 'p-3' : 'p-6'}>
        <div className={`flex items-center gap-3 ${small ? 'mb-1' : 'mb-2'}`}>
          {React.cloneElement(icon as React.ReactElement, { className: cn( (icon as React.ReactElement).props.className || "h-8 w-8 text-accent", small ? "h-6 w-6" : "") })}
          <CardTitle className={small ? 'text-md' : 'text-xl'}>{title}</CardTitle>
        </div>
        <CardDescription className={small ? 'text-xs leading-snug' : ''}>{description}</CardDescription>
      </CardHeader>
      <CardContent className={`${small ? 'p-3 pt-0 mt-auto' : 'p-6 pt-0'}`}>
        <Button asChild className={`w-full bg-primary hover:bg-primary/90 text-primary-foreground ${small ? 'h-8 text-xs' : ''}`}>
          <Link href={actionHref}>{actionText}</Link>
        </Button>
      </CardContent>
    </Card>
  );
}


export default function DashboardPage() {
  const { user, role, initialLoading } = useAuth();

  if (initialLoading || !user) { 
    return (
      <div className="flex h-screen items-center justify-center">
        <LoadingSpinner className="h-12 w-12 text-primary"/>
      </div>
    );
  }


  let dashboardComponent;
  if (role === 'admin') {
    dashboardComponent = <AdminDashboard />;
  } else if (role === 'owner') {
    dashboardComponent = <OwnerDashboard />;
  } else { 
    dashboardComponent = <UserDashboard />;
  }

  return (
    <div className="container mx-auto py-8 px-2 md:px-4">
      {/* <h1 className="text-3xl md:text-4xl font-bold mb-2">
        Welcome to Potoba, <span className="text-primary">{user.displayName || user.email?.split('@')[0] || 'User'}</span>!
      </h1>
      <p className="text-md md:text-lg text-muted-foreground mb-8">
        You are logged in as a{role === 'admin' || role === 'owner' ? 'n' : ''} <span className="font-semibold text-accent">{role}</span>.
      </p> */}

      {dashboardComponent}
    </div>
  );
}

