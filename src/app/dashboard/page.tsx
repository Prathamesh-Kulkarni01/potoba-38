// src/app/dashboard/page.tsx
'use client';

import * as React from 'react'; 
import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth/context';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ChefHat, Settings, UserCog, Users, Store, DollarSign, ShoppingCart, Star, LineChart as LineChartIcon, BookCopy, ShieldCheck, ScanText, ListOrdered, Briefcase, AreaChart, BarChart3, PieChart as PieChartIcon, Lightbulb, Clock, Users2, Table as TableIcon } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { getRestaurantsByOwner, getRestaurant } from '@/lib/firebase/firestore'; 
import type { RestaurantProfile } from '@/types';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, LineChart, Line, PieChart, Pie, Cell, Sector } from 'recharts';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';


function AdminDashboard() {
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

// Mock data for charts
const salesLast7Days = [
  { date: 'Mon', revenue: 120, orders: 15 }, { date: 'Tue', revenue: 150, orders: 20 },
  { date: 'Wed', revenue: 130, orders: 18 }, { date: 'Thu', revenue: 180, orders: 25 },
  { date: 'Fri', revenue: 220, orders: 30 }, { date: 'Sat', revenue: 300, orders: 40 },
  { date: 'Sun', revenue: 250, orders: 35 },
];
const salesLast30Days = Array.from({ length: 30 }, (_, i) => ({
  date: `Day ${i + 1}`,
  revenue: Math.floor(Math.random() * 300) + 50,
  orders: Math.floor(Math.random() * 30) + 5,
}));

const popularItemsData = [
  { name: 'Paneer Tikka Masala', orders: 120, revenue: 12000 },
  { name: 'Butter Chicken', orders: 95, revenue: 11400 },
  { name: 'Dal Makhani', orders: 80, revenue: 6400 },
  { name: 'Garlic Naan', orders: 150, revenue: 7500 },
  { name: 'Mango Lassi', orders: 70, revenue: 3500 },
];

const orderStatusDistributionData = [
  { name: 'Completed', value: 250, fill: 'hsl(var(--chart-1))' },
  { name: 'Preparing', value: 45, fill: 'hsl(var(--chart-2))'  },
  { name: 'Pending', value: 20, fill: 'hsl(var(--chart-3))'  },
  { name: 'Cancelled', value: 15, fill: 'hsl(var(--chart-4))'  },
];
const CHART_COLORS = orderStatusDistributionData.map(d => d.fill);

const peakHoursData = [
  { hour: '9AM', orders: 10 }, { hour: '10AM', orders: 15 }, { hour: '11AM', orders: 25 },
  { hour: '12PM', orders: 40 }, { hour: '1PM', orders: 55 }, { hour: '2PM', orders: 35 },
  { hour: '5PM', orders: 30 }, { hour: '6PM', orders: 45 }, { hour: '7PM', orders: 60 },
  { hour: '8PM', orders: 50 }, { hour: '9PM', orders: 30 },
];

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


function OwnerDashboard() {
  const { user } = useAuth();
  const [currentRestaurantName, setCurrentRestaurantName] = useState<string | null>(null);
  const [selectedRestaurantId, setSelectedRestaurantId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true); // For overall dashboard data
  const [salesDataPeriod, setSalesDataPeriod] = useState<'7d' | '30d'>('7d');

  useEffect(() => {
    setIsLoading(true);
    if (user?.uid && user.role === 'owner') {
      const storedRestaurantId = localStorage.getItem(`selectedRestaurant_${user.uid}`) || user.restaurantId;
      setSelectedRestaurantId(storedRestaurantId);

      if (storedRestaurantId) {
        getRestaurant(storedRestaurantId).then(restaurant => {
          if (restaurant) {
            setCurrentRestaurantName(restaurant.name);
          }
          // Simulate fetching data for this restaurant
          setTimeout(() => setIsLoading(false), 1000);
        });
      } else {
        getRestaurantsByOwner(user.uid).then(restaurants => {
          if (restaurants.length > 0) {
            const firstRestaurantId = restaurants[0].id;
            setSelectedRestaurantId(firstRestaurantId);
            setCurrentRestaurantName(restaurants[0].name);
            localStorage.setItem(`selectedRestaurant_${user.uid}`, firstRestaurantId);
          }
          setTimeout(() => setIsLoading(false), 1000);
        });
      }
    } else {
        setIsLoading(false);
    }
  }, [user]);


  if (!selectedRestaurantId && user?.role === 'owner' && !isLoading) {
    return (
      <div className="space-y-6">
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

  const currentSalesData = salesDataPeriod === '7d' ? salesLast7Days : salesLast30Days;
  const totalRevenue = currentSalesData.reduce((sum, item) => sum + item.revenue, 0);
  const totalOrders = currentSalesData.reduce((sum, item) => sum + item.orders, 0);
  const averageOrderValue = totalOrders > 0 ? (totalRevenue / totalOrders) : 0;


  return (
    <div className="space-y-8">
      <Card className="shadow-lg hover:shadow-xl transition-shadow duration-300">
        <CardHeader>
          <CardTitle className="text-2xl font-semibold text-primary flex items-center">
            <Store className="mr-3 h-7 w-7" />
            {currentRestaurantName ? `${currentRestaurantName} - Insights Dashboard` : "Restaurant Insights Dashboard"}
          </CardTitle>
          <CardDescription>Key metrics and performance overview for your restaurant. (Mock Data)</CardDescription>
        </CardHeader>
      </Card>

      {/* Key Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <DashboardMetricCard
            title={`Revenue (${salesDataPeriod === '7d' ? 'Last 7 Days' : 'Last 30 Days'})`}
            value={`₹${totalRevenue.toLocaleString()}`}
            change="+12.5% vs prev."
            changeType="positive"
            icon={<DollarSign className="h-5 w-5 text-muted-foreground" />}
            isLoading={isLoading}
            dataAiHint="revenue growth"
        />
        <DashboardMetricCard
            title={`Total Orders (${salesDataPeriod === '7d' ? 'Last 7 Days' : 'Last 30 Days'})`}
            value={totalOrders}
            change="+8.2% vs prev."
            changeType="positive"
            icon={<ShoppingCart className="h-5 w-5 text-muted-foreground" />}
            isLoading={isLoading}
            dataAiHint="order volume"
        />
        <DashboardMetricCard
            title="Avg. Order Value"
            value={`₹${averageOrderValue.toFixed(2)}`}
            change="-1.5% vs prev."
            changeType="negative"
            icon={<DollarSign className="h-5 w-5 text-muted-foreground" />}
            isLoading={isLoading}
            dataAiHint="average check size"
        />
         <DashboardMetricCard
            title="Active Tables"
            value="8 / 15"
            footerText="53% Occupancy"
            icon={<TableIcon className="h-5 w-5 text-muted-foreground" />}
            isLoading={isLoading}
            dataAiHint="table occupancy"
        />
      </div>

      {/* Sales Trend and Popular Items */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 shadow-md">
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle className="text-lg flex items-center">
                  <LineChartIcon className="mr-2 h-5 w-5 text-accent" /> Sales Trend
              </CardTitle>
              <Tabs defaultValue="7d" onValueChange={(value) => setSalesDataPeriod(value as '7d' | '30d')}>
                <TabsList className="grid w-full grid-cols-2 h-8 text-xs">
                  <TabsTrigger value="7d" className="h-6 px-2 text-xs">7 Days</TabsTrigger>
                  <TabsTrigger value="30d" className="h-6 px-2 text-xs">30 Days</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? <Skeleton className="h-[300px] w-full" /> : (
            <ResponsiveContainer width="100%" height={300}>
                <LineChart data={currentSalesData}>
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
            {isLoading ? Array.from({length: 5}).map((_, i) => <Skeleton key={i} className="h-10 w-full" />) :
            popularItemsData.map(item => (
                <div key={item.name} className="flex justify-between items-center p-2 bg-muted/30 hover:bg-muted/50 rounded-md text-sm">
                    <span className="font-medium text-foreground truncate max-w-[60%]">{item.name}</span>
                    <span className="text-xs text-muted-foreground text-right">{item.orders} orders <br/> ₹{item.revenue.toLocaleString()}</span>
                </div>
            ))}
             {!isLoading && (
                <Button variant="outline" size="sm" className="w-full mt-4" asChild>
                    <Link href={`/dashboard/menu-management/${selectedRestaurantId}`}>View Full Menu</Link>
                </Button>
             )}
          </CardContent>
        </Card>
      </div>

      {/* Order Status and Peak Hours */}
       <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="shadow-md">
                <CardHeader>
                    <CardTitle className="text-lg flex items-center">
                        <PieChartIcon className="mr-2 h-5 w-5 text-accent" /> Order Status Distribution
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {isLoading ? <Skeleton className="h-[250px] w-full" /> : (
                    <ResponsiveContainer width="100%" height={250}>
                        <PieChart>
                            <Pie data={orderStatusDistributionData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} labelLine={false} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                                {orderStatusDistributionData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.fill} stroke={entry.fill} />
                                ))}
                            </Pie>
                            <RechartsTooltip contentStyle={{ backgroundColor: 'hsl(var(--background))', border: '1px solid hsl(var(--border))' }} itemStyle={{ color: 'hsl(var(--foreground))' }}/>
                            <Legend wrapperStyle={{fontSize: "12px"}} />
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
                     {isLoading ? <Skeleton className="h-[250px] w-full" /> : (
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

      {/* AI Insights */}
      <Card className="shadow-md bg-gradient-to-r from-primary/5 via-accent/5 to-secondary/5 border-primary/20">
        <CardHeader>
            <CardTitle className="text-lg flex items-center text-primary">
                <Lightbulb className="mr-2 h-5 w-5"/> AI-Powered Suggestions
            </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
             {isLoading ? <> <Skeleton className="h-6 w-3/4"/> <Skeleton className="h-6 w-full"/> <Skeleton className="h-6 w-2/3"/> </> : <>
            <p><strong className="text-foreground">Sales Forecast:</strong> Based on recent performance, next week's sales are projected to be around ₹{ (totalRevenue * 1.05).toLocaleString() }. Consider stocking up on popular items.</p>
            <p><strong className="text-foreground">Peak Hour Alert:</strong> 7 PM is consistently your busiest hour. Ensure adequate staffing during this time to maintain service quality.</p>
            <p><strong className="text-foreground">Menu Opportunity:</strong> "Mango Lassi" is gaining popularity quickly. Consider promoting it or creating a combo offer.</p>
            </>}
        </CardContent>
      </Card>
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
            icon={<ChefHat className="h-8 w-8 text-accent" />} // Changed from SquareMenu to ChefHat for user context
            actionText="Plan Meals"
            actionHref={user?.restaurantId ? `/dashboard/meal-planner/${user.restaurantId}` : '/dashboard/meal-planner/default'}
            imageUrl="https://picsum.photos/seed/mealplanner/400/200"
            dataAiHint="calendar schedule"
          />
          <DashboardNavigationCard
            title="My Profile"
            description="Update your preferences and personal information."
            icon={<UserCog className="h-8 w-8 text-accent" />} // Changed from ChefHat to UserCog
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
          {React.cloneElement(icon as React.ReactElement, small ? {className: "h-6 w-6 text-accent"} : {className: (icon as React.ReactElement).props.className || "h-8 w-8 text-accent"})}
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
  const { user, role } = useAuth();

  if (!user) return null;

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
      <h1 className="text-3xl md:text-4xl font-bold mb-2">
        Welcome to Potoba, <span className="text-primary">{user.displayName || user.email?.split('@')[0] || 'User'}</span>!
      </h1>
      <p className="text-md md:text-lg text-muted-foreground mb-8">
        You are logged in as a{role === 'admin' || role === 'owner' ? 'n' : ''} <span className="font-semibold text-accent">{role}</span>.
      </p>

      {dashboardComponent}
    </div>
  );
}

