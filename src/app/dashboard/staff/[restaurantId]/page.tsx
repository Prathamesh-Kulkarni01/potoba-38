'use client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Users } from "lucide-react";
import Image from "next/image";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth/context";
import { useEffect, useState } from "react";
import { getRestaurant } from "@/lib/firebase/firestore";
import LoadingSpinner from "@/components/shared/loading-spinner";
import { Button } from "@/components/ui/button";

export default function StaffManagementPage() {
  const params = useParams();
  const restaurantId = params.restaurantId as string;
  const { user, role } = useAuth();
  const router = useRouter();
  const [restaurantName, setRestaurantName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!restaurantId) {
      router.push('/dashboard');
      return;
    }
    if (user && role === 'owner') { // Only owners can manage staff for now
      getRestaurant(restaurantId).then(data => {
        if (data) {
          // Check if this owner actually owns this restaurant (additional security)
          if (data.ownerId === user.uid) {
            setRestaurantName(data.name);
          } else {
             router.push('/dashboard'); // Not their restaurant
          }
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

  if (!restaurantName) {
     // This case handles if user is not owner of this restaurantId after loading
    return (
      <Card>
        <CardHeader><CardTitle>Access Denied</CardTitle></CardHeader>
        <CardContent><p>You are not authorized to manage staff for this restaurant.</p></CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center text-2xl">
            <Users className="mr-2 h-6 w-6 text-primary" />
            Staff Management {restaurantName ? `for ${restaurantName}` : ''}
          </CardTitle>
          <CardDescription>
            Manage your team members. This feature is currently under development.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center text-center p-10 border-2 border-dashed border-border rounded-lg bg-muted/50">
            <Image 
              src={`https://picsum.photos/seed/staffmanagement${restaurantId}/300/200`}
              alt="Staff Management Coming Soon" 
              width={300} 
              height={200} 
              className="rounded-md mb-6"
              data-ai-hint="team meeting"
            />
            <h3 className="text-xl font-semibold mb-2">Coming Soon!</h3>
            <p className="text-muted-foreground mb-4">
              Efficiently manage your restaurant staff, assign roles, and track performance.
            </p>
            <Button variant="outline" disabled>Invite New Staff (Coming Soon)</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
