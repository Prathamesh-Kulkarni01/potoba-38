'use client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CalendarDays } from "lucide-react";
import Image from "next/image";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth/context";
import { useEffect, useState } from "react";
import { getRestaurant } from "@/lib/firebase/firestore";
import LoadingSpinner from "@/components/shared/loading-spinner";

export default function MealPlannerPage() {
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
     if (user && (role === 'owner' || (role === 'staff' && user.restaurantId === restaurantId))) {
      getRestaurant(restaurantId).then(data => {
        if (data) {
          setRestaurantName(data.name);
        }
        setLoading(false);
      }).catch(() => setLoading(false));
    } else if (user) {
      router.push('/dashboard');
       setLoading(false);
    }
  }, [restaurantId, user, role, router]);

  if (loading) {
    return <div className="flex justify-center items-center h-full"><LoadingSpinner /></div>;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center text-2xl">
            <CalendarDays className="mr-2 h-6 w-6 text-primary" />
            Meal Planner {restaurantName ? `for ${restaurantName}` : ''}
          </CardTitle>
          <CardDescription>
            Plan your meals for the week. This feature is currently under development.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center text-center p-10 border-2 border-dashed border-border rounded-lg bg-muted/50">
            <Image 
              src={`https://picsum.photos/seed/mealplanner${restaurantId}/300/200`} 
              alt="Meal Planner Coming Soon" 
              width={300} 
              height={200} 
              className="rounded-md mb-6"
              data-ai-hint="healthy food schedule"
            />
            <h3 className="text-xl font-semibold mb-2">Coming Soon!</h3>
            <p className="text-muted-foreground">
              Our chefs are busy cooking up an amazing meal planning experience for you.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
