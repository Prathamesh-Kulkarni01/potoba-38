
'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth/context';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ChefHat, BarChart3, Utensils, Settings, UserCog, Users, SquareMenu, Store } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { getRestaurantsByOwner, getRestaurant } from '@/lib/firebase/firestore'; // For fetching restaurant name
import type { RestaurantProfile } from '@/types';
import { useParams, useSearchParams } from 'next/navigation'; // For potential query param based selection


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
          <DashboardCard
            title="User Management"
            description="View, edit, and manage user accounts and roles."
            icon={<Users className="h-8 w-8 text-accent" />}
            actionText="Go to Users"
            actionHref="/dashboard/admin/users"
            imageUrl="https://picsum.photos/seed/usermanagement/400/200"
            dataAiHint="user list interface"
          />
          <DashboardCard
            title="System Analytics"
            description="Monitor application performance and user activity."
            icon={<BarChart3 className="h-8 w-8 text-accent" />}
            actionText="View Analytics"
            actionHref="/dashboard/admin/analytics" 
            imageUrl="https://picsum.photos/seed/analytics/400/200"
            dataAiHint="dashboard charts"
          />
           <DashboardCard
            title="Content Moderation"
            description="Review and manage user-generated content."
            icon={<Utensils className="h-8 w-8 text-accent" />} 
            actionText="Moderate Content"
            actionHref="/dashboard/admin/content" 
            imageUrl="https://picsum.photos/seed/contentmoderation/400/200"
            dataAiHint="content review"
          />
          <DashboardCard
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

function OwnerDashboard() {
  const { user } = useAuth();
  const searchParams = useSearchParams();
  // Note: For the main dashboard, selectedRestaurantId might not be in URL params.
  // It's managed in DashboardLayout state. For this page to reflect it,
  // it would need to be passed down or read from a shared context.
  // For simplicity, we'll try to get it from localStorage if not passed, or use user's primary.
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
        // Attempt to load all restaurants if no specific one is selected or primary is null
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
    // This shouldn't happen if routing is correct, but as a fallback:
    return <p>Loading restaurant data...</p>;
  }


  return (
    <div className="space-y-6">
      <Card className="shadow-lg hover:shadow-xl transition-shadow duration-300">
        <CardHeader>
          <CardTitle className="text-2xl font-semibold text-primary flex items-center">
            <Store className="mr-3 h-7 w-7" />
            {currentRestaurantName ? `${currentRestaurantName} - Management` : "Restaurant Management"}
          </CardTitle>
          <CardDescription>Oversee your restaurant's operations, staff, recipes, and more within AuthZen.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <DashboardCard
            title="Restaurant Details"
            description="View and edit selected restaurant's information."
            icon={<Store className="h-8 w-8 text-accent" />}
            actionText="Go to Restaurant"
            actionHref={`/dashboard/restaurant/${selectedRestaurantId}`}
            imageUrl="https://picsum.photos/seed/myrestaurant/400/200"
            dataAiHint="restaurant storefront"
          />
          <DashboardCard
            title="Staff Management"
            description="Manage your team members for this restaurant."
            icon={<Users className="h-8 w-8 text-accent" />}
            actionText="Manage Staff"
            actionHref={`/dashboard/staff/${selectedRestaurantId}`} 
            imageUrl="https://picsum.photos/seed/staffmanagement/400/200"
            dataAiHint="team collaboration"
          />
          <DashboardCard
            title="Recipe Management"
            description="Create, edit, and organize your recipes for this restaurant."
            icon={<Utensils className="h-8 w-8 text-accent" />}
            actionText="Manage Recipes"
            actionHref={`/dashboard/recipes/${selectedRestaurantId}`}
            imageUrl="https://picsum.photos/seed/ownrecipes/400/200"
            dataAiHint="recipe book"
          />
          <DashboardCard
            title="Meal Planner"
            description="Plan weekly meals and menus for this restaurant."
            icon={<SquareMenu className="h-8 w-8 text-accent" />}
            actionText="Go to Meal Planner"
            actionHref={`/dashboard/meal-planner/${selectedRestaurantId}`}
            imageUrl="https://picsum.photos/seed/ownermealplanner/400/200"
            dataAiHint="food calendar"
          />
           <DashboardCard
            title="Restaurant Settings"
            description="Configure settings specific to this restaurant."
            icon={<Settings className="h-8 w-8 text-accent" />}
            actionText="Restaurant Settings"
            actionHref={`/dashboard/restaurant/${selectedRestaurantId}/settings`}
            imageUrl="https://picsum.photos/seed/restaurantsettings/400/200"
            dataAiHint="cogwheel options"
          />
        </CardContent>
      </Card>
    </div>
  );
}


function UserDashboard() { 
  // For staff, selectedRestaurantId would ideally come from user.restaurantId
  const { user } = useAuth();
  const restaurantIdForLinks = user?.role === 'staff' ? user.restaurantId : 'default'; // Or some other logic for general user

  return (
    <div className="space-y-6">
      <Card className="shadow-lg hover:shadow-xl transition-shadow duration-300">
        <CardHeader>
          <CardTitle className="text-2xl font-semibold text-primary flex items-center">
            <ChefHat className="mr-3 h-7 w-7" />
            Your Culinary Hub
          </CardTitle>
          <CardDescription>Explore recipes, plan your meals, and manage your culinary profile in AuthZen.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <DashboardCard
            title="Discover Recipes"
            description="Browse a vast collection of delicious recipes."
            icon={<Utensils className="h-8 w-8 text-accent" />}
            actionText="Find Recipes"
            actionHref={`/dashboard/recipes${user?.role === 'staff' && user.restaurantId ? `/${user.restaurantId}` : ''}`}
            imageUrl="https://picsum.photos/seed/recipes/400/200"
            dataAiHint="food variety"
          />
          <DashboardCard
            title="Meal Planner"
            description="Organize your weekly meals effortlessly."
            icon={<SquareMenu className="h-8 w-8 text-accent" />}
            actionText="Plan Meals"
            actionHref={`/dashboard/meal-planner${user?.role === 'staff' && user.restaurantId ? `/${user.restaurantId}` : ''}`}
            imageUrl="https://picsum.photos/seed/mealplanner/400/200"
            dataAiHint="calendar schedule"
          />
          <DashboardCard
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

interface DashboardCardProps {
  title: string;
  description: string;
  icon: React.ReactNode;
  actionText: string;
  actionHref: string;
  imageUrl: string;
  dataAiHint: string;
}

function DashboardCard({ title, description, icon, actionText, actionHref, imageUrl, dataAiHint }: DashboardCardProps) {
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
    <div className="container mx-auto py-8">
      <h1 className="text-4xl font-bold mb-2">
        Welcome to AuthZen, <span className="text-primary">{user.displayName || user.email?.split('@')[0] || 'User'}</span>!
      </h1>
      <p className="text-lg text-muted-foreground mb-8">
        You are logged in as a{role === 'admin' || role === 'owner' ? 'n' : ''} <span className="font-semibold text-accent">{role}</span>.
      </p>
      
      {dashboardComponent}
    </div>
  );
}
