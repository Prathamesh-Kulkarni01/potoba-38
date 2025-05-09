'use client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Settings } from "lucide-react";
import Image from "next/image";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth/context";
import { useEffect, useState } from "react";
import { getRestaurant } from "@/lib/firebase/firestore";
import LoadingSpinner from "@/components/shared/loading-spinner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";

export default function RestaurantSettingsPage() {
  const params = useParams();
  const restaurantId = params.restaurantId as string;
  const { user, role } = useAuth();
  const router = useRouter();
  const [restaurant, setRestaurant] = useState<{name: string, ownerId: string} | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!restaurantId) {
      router.push('/dashboard');
      return;
    }
     if (user && role === 'owner') {
      getRestaurant(restaurantId).then(data => {
        if (data && data.ownerId === user.uid) {
          setRestaurant({name: data.name, ownerId: data.ownerId});
        } else if (data) { // Restaurant exists but not owned by current user
           router.push('/dashboard');
        }
        setLoading(false);
      }).catch(() => setLoading(false));
    } else if (user) { // Not an owner
      router.push('/dashboard');
      setLoading(false);
    }
  }, [restaurantId, user, role, router]);

  if (loading) {
    return <div className="flex justify-center items-center h-full"><LoadingSpinner /></div>;
  }
  
  if (!restaurant) {
    return (
      <Card>
        <CardHeader><CardTitle>Access Denied or Not Found</CardTitle></CardHeader>
        <CardContent><p>You are not authorized to manage settings for this restaurant, or it does not exist.</p></CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center text-2xl">
            <Settings className="mr-2 h-6 w-6 text-primary" />
            Settings for {restaurant.name}
          </CardTitle>
          <CardDescription>
            Manage specific settings for your restaurant. This feature is currently under development.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-8 max-w-2xl">
           <Image 
              src={`https://picsum.photos/seed/restosettings${restaurantId}/600/200`}
              alt="Restaurant Settings" 
              width={600} 
              height={200} 
              className="rounded-md mb-6 object-cover"
              data-ai-hint="modern settings interface"
            />
          <form className="space-y-6">
            <div>
              <Label htmlFor="onlineOrdering">Online Ordering</Label>
              <div className="flex items-center space-x-2 mt-1">
                <Switch id="onlineOrdering" />
                <Label htmlFor="onlineOrdering">Enable Online Orders</Label>
              </div>
              <CardDescription className="text-xs mt-1">Allow customers to place orders directly through the app.</CardDescription>
            </div>

            <div>
              <Label htmlFor="tableReservations">Table Reservations</Label>
               <div className="flex items-center space-x-2 mt-1">
                <Switch id="tableReservations" defaultChecked/>
                <Label htmlFor="tableReservations">Enable Table Reservations</Label>
              </div>
              <CardDescription className="text-xs mt-1">Allow customers to reserve tables in advance.</CardDescription>
            </div>
            
            <div>
              <Label htmlFor="notificationEmail">Notification Email</Label>
              <Input id="notificationEmail" type="email" defaultValue={`orders@${restaurant.name.toLowerCase().replace(/\s+/g, '')}.com`} className="mt-1" />
              <CardDescription className="text-xs mt-1">Email address to receive notifications for new orders and reservations.</CardDescription>
            </div>
            
            <Button type="submit" className="bg-accent hover:bg-accent/90 text-accent-foreground" disabled>
              Save Settings (Coming Soon)
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
