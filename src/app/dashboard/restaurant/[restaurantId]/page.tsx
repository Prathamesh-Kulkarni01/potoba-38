
'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth/context';
import { getRestaurant } from '@/lib/firebase/firestore';
import type { RestaurantProfile } from '@/types';
import { outletTypes } from '@/types'; // Import outletTypes for display
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Store, Edit3, Utensils, Users, Settings as SettingsIcon, Info } from 'lucide-react'; 
import LoadingSpinner from '@/components/shared/loading-spinner';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';
import Image from 'next/image';

export default function RestaurantDetailsPage() {
  const { user, role } = useAuth();
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  
  const restaurantId = params.restaurantId as string;

  const [restaurant, setRestaurant] = useState<RestaurantProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!restaurantId) {
      toast({ variant: 'destructive', title: 'Error', description: 'Restaurant ID is missing.' });
      router.push('/dashboard');
      return;
    }

    if (user && role !== 'owner' && role !== 'staff') { 
        toast({ variant: 'destructive', title: 'Access Denied', description: 'You do not have permission to view this page.' });
        router.push('/dashboard');
        return;
    }
    
    if (user && role === 'staff' && user.restaurantId !== restaurantId) {
        toast({ variant: 'destructive', title: 'Access Denied', description: 'You do not have permission to view this restaurant.' });
        router.push('/dashboard');
        return;
    }

    setLoading(true);
    getRestaurant(restaurantId)
      .then((data) => {
        if (data) {
          setRestaurant(data);
        } else {
          toast({ variant: 'destructive', title: 'Not Found', description: 'Restaurant not found.' });
          router.push('/dashboard');
        }
      })
      .catch((error) => {
        console.error("Error fetching restaurant:", error);
        toast({ variant: 'destructive', title: 'Error', description: 'Failed to load restaurant details.' });
      })
      .finally(() => setLoading(false));
  }, [restaurantId, user, role, router, toast]);

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[300px]">
        <LoadingSpinner className="h-10 w-10 text-primary" />
      </div>
    );
  }

  if (!restaurant) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Restaurant Not Found</CardTitle>
        </CardHeader>
        <CardContent>
          <p>The restaurant details could not be loaded. It might have been removed or you may not have access.</p>
           <Button onClick={() => router.push('/dashboard')} className="mt-4">Go to Dashboard</Button>
        </CardContent>
      </Card>
    );
  }
  
  const handleSaveChanges = (e: React.FormEvent) => {
      e.preventDefault();
      toast({title: "Demo Action", description: "Saving changes is not implemented in this demo."});
  }

  const currentOutletTypeLabel = outletTypes.find(ot => ot.value === restaurant.outletType)?.label || restaurant.outletType || 'Not specified';

  return (
    <div className="space-y-6">
      <Card className="shadow-lg">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center text-3xl font-bold text-primary">
              <Store className="mr-3 h-8 w-8" />
              {restaurant.name}
            </CardTitle>
            {role === 'owner' && (
                <Button variant="outline" size="sm" asChild>
                    <Link href={`/dashboard/restaurant/${restaurantId}/settings`}>
                        <SettingsIcon className="mr-2 h-4 w-4" /> Restaurant Settings
                    </Link>
                </Button>
            )}
          </div>
          <CardDescription className="flex items-center">
             <Info className="mr-2 h-4 w-4 text-muted-foreground" /> Type: {currentOutletTypeLabel}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-8">
            <Image 
                src={`https://picsum.photos/seed/${restaurant.id}/800/300`} 
                alt={`${restaurant.name} hero image`}
                width={800}
                height={300}
                className="w-full h-64 object-cover rounded-lg shadow-md"
                data-ai-hint="restaurant interior"
            />

          {role === 'owner' && (
            <form onSubmit={handleSaveChanges} className="space-y-6 max-w-2xl p-4 border rounded-lg bg-card">
                <h3 className="text-xl font-semibold mb-2 text-foreground">Edit Restaurant Details (Demo)</h3>
              <div>
                <Label htmlFor="restaurantName">Restaurant Name</Label>
                <Input id="restaurantName" type="text" defaultValue={restaurant.name} className="mt-1" />
              </div>
              <div>
                <Label htmlFor="restaurantOutletType">Restaurant Type</Label>
                <Input id="restaurantOutletType" type="text" defaultValue={currentOutletTypeLabel} className="mt-1" disabled />
                <p className="text-xs text-muted-foreground mt-1">To change outlet type, go to Restaurant Settings.</p>
              </div>
              <Button type="submit" className="bg-accent hover:bg-accent/90 text-accent-foreground">
                <Edit3 className="mr-2 h-4 w-4" /> Save Changes (Demo)
              </Button>
            </form>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
            <Link href={`/dashboard/menu-management/${restaurantId}`} className="block">
                <Card className="hover:shadow-xl transition-shadow cursor-pointer h-full">
                    <CardHeader className="flex-row items-center gap-3">
                        <Utensils className="h-8 w-8 text-accent"/>
                        <CardTitle className="text-xl">Menu Management</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <CardDescription>Create, view, and manage menu for {restaurant.name}.</CardDescription>
                    </CardContent>
                </Card>
            </Link>
             {role === 'owner' && (
                <Link href={`/dashboard/staff/${restaurantId}`} className="block">
                    <Card className="hover:shadow-xl transition-shadow cursor-pointer h-full">
                        <CardHeader className="flex-row items-center gap-3">
                            <Users className="h-8 w-8 text-accent"/>
                            <CardTitle className="text-xl">Staff Management</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <CardDescription>Manage staff members and their roles for this restaurant.</CardDescription>
                        </CardContent>
                    </Card>
                </Link>
             )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
