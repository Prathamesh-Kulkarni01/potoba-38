
'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth/context';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ChefHat, BarChart3, Utensils, Settings, UserCog, Users, SquareMenu, Store, DollarSign, ShoppingCart, Star, LineChart, BookCopy, ShieldCheck, ScanText } from 'lucide-react'; // Added BookCopy, ShieldCheck, ScanText
import Image from 'next/image';
import Link from 'next/link';
import { getRestaurantsByOwner, getRestaurant } from '@/lib/firebase/firestore'; // For fetching restaurant name
import type { RestaurantProfile } from '@/types';
import { useParams, useSearchParams } from 'next/navigation'; // For potential query param based selection
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, LineChart as RechartsLineChart, Line } from 'recharts';


function AdminDashboard() {
  return (
    <div className="space-y-6">
      <Card className="shadow-lg hover:shadow-xl transition-shadow duration-300">
        <CardHeader>
          <CardTitle className="text-2xl font-semibold text-primary flex items-center">
            <UserCog className="mr-3 h-7 w-7" />
            Platform Admin Panel
          </CardTitle>
          <CardDescription>Manage users, system settings, and view overall application analytics for AuthZen.</CardDescription>
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
            icon={<BarChart3 className="h-8 w-8 text-accent" />}
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

const mockSalesData = [
  { name: 'Mon', sales: 400 },
  { name: 'Tue', sales: 300 },
  { name: 'Wed', sales: 500 },
  { name: 'Thu', sales: 700 },
  { name: 'Fri', sales: 600 },
  { name: 'Sat', sales: 800 },
  { name: 'Sun', sales: 750 },
];

const mockPopularItems = [
    {id: 1, name: "Spicy Ramen", orders: 120},
    {id: 2, name: "Classic Burger", orders: 95},
    {id: 3, name: "Avocado Toast", orders: 80},
];


function OwnerDashboard() {
  const { user } = useAuth();
  const [currentRestaurantName, setCurrentRestaurantName] = useState<string | null>(null);
  const [selectedRestaurantId, setSelectedRestaurantId] = useState<string | null>(null);

  useEffect(() => {
    if (user?.uid && user.role === 'owner') {
      const storedRestaurantId = localStorage.getItem(`selectedRestaurant_${user.uid}`) || user.restaurantId;
      setSelectedRestaurantId(storedRestaurantId);

      if (storedRestaurantId) {
        getRestaurant(storedRestaurantId).then(restaurant => {
          if (restaurant) {
            setCurrentRestaurantName(restaurant.name);
          }
        });
      } else {
        getRestaurantsByOwner(user.uid).then(restaurants => {
          if (restaurants.length > 0) {
            const firstRestaurantId = restaurants[0].id;
            setSelectedRestaurantId(firstRestaurantId);
            setCurrentRestaurantName(restaurants[0].name);
            localStorage.setItem(`selectedRestaurant_${user.uid}`, firstRestaurantId);
          }
        });
      }
    }
  }, [user]);


  if (!selectedRestaurantId && user?.role === 'owner') {
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

  if (!selectedRestaurantId && user?.role !== 'owner') {
    return <p>Loading restaurant data...</p>;
  }


  return (
    <div className="space-y-6">
      <Card className="shadow-lg hover:shadow-xl transition-shadow duration-300">
        <CardHeader>
          <CardTitle className="text-2xl font-semibold text-primary flex items-center">
            <Store className="mr-3 h-7 w-7" />
            {currentRestaurantName ? `${currentRestaurantName} - Insights` : "Restaurant Insights"}
          </CardTitle>
          <CardDescription>Overview of your restaurant's performance and key metrics. (Mock Data)</CardDescription>
        </CardHeader>
        <CardContent className="space-y-8">
            {/* Key Metrics Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <InsightCard
                    title="Total Revenue"
                    value="$12,345"
                    trend="+5.2% this month"
                    icon={<DollarSign className="h-6 w-6 text-primary" />}
                    dataAiHint="money graph"
                />
                <InsightCard
                    title="Total Orders"
                    value="678"
                    trend="+10 orders today"
                    icon={<ShoppingCart className="h-6 w-6 text-primary" />}
                    dataAiHint="shopping cart"
                />
                <InsightCard
                    title="Avg. Rating"
                    value="4.6 / 5"
                    trend="from 250 reviews"
                    icon={<Star className="h-6 w-6 text-primary" />}
                    dataAiHint="star rating"
                />
                 <InsightCard
                    title="New Customers"
                    value="42"
                    trend="+15 this week"
                    icon={<Users className="h-6 w-6 text-primary" />}
                    dataAiHint="people group"
                />
            </div>

            {/* Sales Trend Chart and Popular Items */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <Card className="lg:col-span-2 shadow-md">
                    <CardHeader>
                        <CardTitle className="text-lg flex items-center">
                            <LineChart className="mr-2 h-5 w-5 text-accent" /> Sales Trend (Last 7 Days)
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <ResponsiveContainer width="100%" height={300}>
                            <RechartsLineChart data={mockSalesData}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="name" />
                                <YAxis />
                                <RechartsTooltip />
                                <Legend />
                                <Line type="monotone" dataKey="sales" stroke="hsl(var(--primary))" strokeWidth={2} activeDot={{ r: 8 }} />
                            </RechartsLineChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>
                <Card className="shadow-md">
                    <CardHeader>
                        <CardTitle className="text-lg flex items-center">
                            <Utensils className="mr-2 h-5 w-5 text-accent" /> Popular Items
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        {mockPopularItems.map(item => (
                            <div key={item.id} className="flex justify-between items-center p-2 bg-muted/50 rounded-md">
                                <span className="font-medium text-sm">{item.name}</span>
                                <span className="text-xs text-foreground">{item.orders} orders</span>
                            </div>
                        ))}
                         <Button variant="outline" size="sm" className="w-full mt-4" asChild>
                            <Link href={`/dashboard/menu-management/${selectedRestaurantId}`}>Manage Menu</Link>
                        </Button>
                    </CardContent>
                </Card>
            </div>

            {/* Quick Actions Row */}
             <Card className="shadow-md">
                <CardHeader>
                    <CardTitle className="text-lg">Quick Actions</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                    <Button variant="outline" asChild className="flex-1">
                        <Link href={`/dashboard/restaurant/${selectedRestaurantId}`}>
                            <Store className="mr-2 h-4 w-4"/> Details
                        </Link>
                    </Button>
                     <Button variant="outline" asChild className="flex-1">
                        <Link href={`/dashboard/menu-management/${selectedRestaurantId}`}>
                            <BookCopy className="mr-2 h-4 w-4"/> Menu
                        </Link>
                    </Button>
                    <Button variant="outline" asChild className="flex-1">
                        <Link href={`/dashboard/staff/${selectedRestaurantId}`}>
                            <Users className="mr-2 h-4 w-4"/> Staff
                        </Link>
                    </Button>
                    <Button variant="outline" asChild className="flex-1">
                         <Link href={`/dashboard/meal-planner/${selectedRestaurantId}`}>
                            <SquareMenu className="mr-2 h-4 w-4"/> Planner
                        </Link>
                    </Button>
                    <Button variant="outline" asChild className="flex-1">
                        <Link href={`/dashboard/restaurant/${selectedRestaurantId}/settings`}>
                            <Settings className="mr-2 h-4 w-4"/> Settings
                        </Link>
                    </Button>
                </CardContent>
            </Card>
        </CardContent>
      </Card>
    </div>
  );
}


function UserDashboard() {
  const { user } = useAuth();
  const restaurantContextId = user?.restaurantId || 'default'; // Fallback for general users if needed

  return (
    <div className="space-y-6">
      <Card className="shadow-lg hover:shadow-xl transition-shadow duration-300">
        <CardHeader>
          <CardTitle className="text-2xl font-semibold text-primary flex items-center">
            <ChefHat className="mr-3 h-7 w-7" />
            Your Culinary Hub
          </CardTitle>
          <CardDescription>Explore menus, plan your meals, and manage your culinary profile in AuthZen.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <DashboardNavigationCard
            title="Browse Menus"
            description="Discover delicious dishes from various restaurants."
            icon={<BookCopy className="h-8 w-8 text-accent" />} // Changed from Utensils to BookCopy
            actionText="Find Menus"
            actionHref={`/dashboard/menu-management/${restaurantContextId}`} // Generic or context-based link
            imageUrl="https://picsum.photos/seed/menus/400/200"
            dataAiHint="food variety"
          />
          <DashboardNavigationCard
            title="Meal Planner"
            description="Organize your weekly meals effortlessly."
            icon={<SquareMenu className="h-8 w-8 text-accent" />}
            actionText="Plan Meals"
            actionHref={`/dashboard/meal-planner/${restaurantContextId}`}
            imageUrl="https://picsum.photos/seed/mealplanner/400/200"
            dataAiHint="calendar schedule"
          />
          <DashboardNavigationCard
            title="My Profile"
            description="Update your preferences and personal information."
            icon={<ChefHat className="h-8 w-8 text-accent" />}
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
}

function DashboardNavigationCard({ title, description, icon, actionText, actionHref, imageUrl, dataAiHint }: DashboardNavigationCardProps) {
  return (
    <Card className="overflow-hidden transition-all hover:scale-[1.02] hover:shadow-lg">
      <Image src={imageUrl} alt={title} width={400} height={200} className="w-full h-40 object-cover" data-ai-hint={dataAiHint}/>
      <CardHeader>
        <div className="flex items-center gap-3 mb-2">
          {icon}
          <CardTitle className="text-xl">{title}</CardTitle>
        </div>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <Button asChild className="w-full bg-primary hover:bg-primary/90 text-primary-foreground">
          <Link href={actionHref}>{actionText}</Link>
        </Button>
      </CardContent>
    </Card>
  );
}

interface InsightCardProps {
    title: string;
    value: string;
    trend?: string;
    icon: React.ReactNode;
    dataAiHint: string;
}

function InsightCard({ title, value, trend, icon, dataAiHint }: InsightCardProps) {
    return (
        <Card className="shadow-md hover:shadow-lg transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{title}</CardTitle>
                {icon}
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold">{value}</div>
                {trend && <p className="text-xs text-muted-foreground">{trend}</p>}
                 <Image src={`https://picsum.photos/seed/${title.toLowerCase().replace(/\s/g, '')}/100/60`} alt={title} width={100} height={60} className="w-full h-10 object-cover mt-2 rounded opacity-30" data-ai-hint={dataAiHint}/>
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
  } else { // Covers 'staff' and 'user'
    dashboardComponent = <UserDashboard />;
  }

  return (
    <div className="container mx-auto py-8 px-2 md:px-4">
      <h1 className="text-3xl md:text-4xl font-bold mb-2">
        Welcome to AuthZen, <span className="text-primary">{user.displayName || user.email?.split('@')[0] || 'User'}</span>!
      </h1>
      <p className="text-md md:text-lg text-muted-foreground mb-8">
        You are logged in as a{role === 'admin' || role === 'owner' ? 'n' : ''} <span className="font-semibold text-accent">{role}</span>.
      </p>

      {dashboardComponent}
    </div>
  );
}
