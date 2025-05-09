'use client';

import { useAuth } from '@/lib/auth/context';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ChefHat, BarChart3, Utensils, Settings, UserCog } from 'lucide-react';
import Image from 'next/image';

function AdminDashboard() {
  return (
    <div className="space-y-6">
      <Card className="shadow-lg hover:shadow-xl transition-shadow duration-300">
        <CardHeader>
          <CardTitle className="text-2xl font-semibold text-primary flex items-center">
            <UserCog className="mr-3 h-7 w-7" />
            Admin Control Panel
          </CardTitle>
          <CardDescription>Manage users, system settings, and view overall application analytics.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-6 md:grid-cols-2">
          <DashboardCard
            title="User Management"
            description="View, edit, and manage user accounts and roles."
            icon={<UsersIcon className="h-8 w-8 text-accent" />}
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
            icon={<Utensils className="h-8 w-8 text-accent" />} // Placeholder icon
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

function UserDashboard() {
  return (
    <div className="space-y-6">
      <Card className="shadow-lg hover:shadow-xl transition-shadow duration-300">
        <CardHeader>
          <CardTitle className="text-2xl font-semibold text-primary flex items-center">
            <ChefHat className="mr-3 h-7 w-7" />
            Your Culinary Hub
          </CardTitle>
          <CardDescription>Explore recipes, plan your meals, and manage your culinary profile.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <DashboardCard
            title="Discover Recipes"
            description="Browse a vast collection of delicious recipes from around the world."
            icon={<Utensils className="h-8 w-8 text-accent" />}
            actionText="Find Recipes"
            actionHref="/dashboard/recipes"
            imageUrl="https://picsum.photos/seed/recipes/400/200"
            dataAiHint="food variety"
          />
          <DashboardCard
            title="Meal Planner"
            description="Organize your weekly meals and generate shopping lists effortlessly."
            icon={<SquareMenuIcon className="h-8 w-8 text-accent" />}
            actionText="Plan Meals"
            actionHref="/dashboard/meal-planner"
            imageUrl="https://picsum.photos/seed/mealplanner/400/200"
            dataAiHint="calendar schedule"
          />
          <DashboardCard
            title="My Profile"
            description="Update your preferences, saved recipes, and personal information."
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
          <a href={actionHref}>{actionText}</a>
        </Button>
      </CardContent>
    </Card>
  );
}

// Placeholder icons (lucide-react might not have all of these directly)
const UsersIcon = (props: any) => <Users {...props} />;
const SquareMenuIcon = (props: any) => <SquareMenu {...props} />;


export default function DashboardPage() {
  const { user, role } = useAuth();

  if (!user) return null; // Or a loading state

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-4xl font-bold mb-2">
        Welcome, <span className="text-primary">{user.email?.split('@')[0] || 'User'}</span>!
      </h1>
      <p className="text-lg text-muted-foreground mb-8">
        You are logged in as a{role === 'admin' ? 'n' : ''} <span className="font-semibold text-accent">{role}</span>.
      </p>
      
      {role === 'admin' ? <AdminDashboard /> : <UserDashboard />}
    </div>
  );
}
