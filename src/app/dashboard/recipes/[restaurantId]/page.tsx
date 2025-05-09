'use client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Utensils } from "lucide-react";
import Image from "next/image";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth/context";
import { useEffect, useState } from "react";
import { getRestaurant } from "@/lib/firebase/firestore";
import LoadingSpinner from "@/components/shared/loading-spinner";

export default function RecipesPage() {
  const params = useParams();
  const restaurantId = params.restaurantId as string;
  const { user, role } = useAuth();
  const router = useRouter();
  const [restaurantName, setRestaurantName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!restaurantId) {
      router.push('/dashboard'); // Or some error page
      return;
    }
    // Access check: owner or staff of this restaurant
    if (user && (role === 'owner' || (role === 'staff' && user.restaurantId === restaurantId))) {
      getRestaurant(restaurantId).then(data => {
        if (data) {
          setRestaurantName(data.name);
        }
        setLoading(false);
      }).catch(() => setLoading(false));
    } else if (user) { // User exists but not authorized
      router.push('/dashboard');
      setLoading(false);
    }
    // If no user, auth context will handle redirection
  }, [restaurantId, user, role, router]);

  if (loading) {
    return <div className="flex justify-center items-center h-full"><LoadingSpinner /></div>;
  }
  
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center text-2xl">
            <Utensils className="mr-2 h-6 w-6 text-primary" />
            Recipes {restaurantName ? `for ${restaurantName}` : ''}
          </CardTitle>
          <CardDescription>
            Explore and manage culinary delights for your restaurant. More recipes coming soon!
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Card key={i} className="overflow-hidden hover:shadow-lg transition-shadow">
                <Image 
                  src={`https://picsum.photos/seed/recipe${restaurantId}${i}/400/250`} 
                  alt={`Recipe ${i}`}
                  width={400} 
                  height={250} 
                  className="w-full h-48 object-cover"
                  data-ai-hint="delicious food" 
                />
                <CardHeader>
                  <CardTitle className="text-lg">Amazing Recipe Title {i}</CardTitle>
                  <CardDescription>A short, enticing description of this delicious dish.</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">Prep time: 20 mins | Cook time: 30 mins</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
