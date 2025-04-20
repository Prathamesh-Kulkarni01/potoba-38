
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";
import { api } from '@/utils/api';
import { useAuth } from '@/contexts/AuthContext';

interface Restaurant {
  _id: string;
  name: string;
  location: string;
  cuisine: string;
  description?: string;
}

const DashboardPage: React.FC = () => {
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();
  const { user } = useAuth();

  useEffect(() => {
    const fetchRestaurants = async () => {
      try {
        const data = await api('/restaurants', { requiresAuth: true });
        setRestaurants(data);
      } catch (error) {
        console.error('Error fetching restaurants:', error);
        toast({
          title: "Error",
          description: "Failed to load your restaurants",
          variant: "destructive"
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchRestaurants();
  }, [toast]);

  return (
    <div className="container mx-auto py-10">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-gray-500">Welcome back, {user?.name || 'User'}</p>
        </div>
        <Link to="/restaurants/create">
          <Button>Add New Restaurant</Button>
        </Link>
      </div>

      {isLoading ? (
        <div className="text-center py-10">Loading your restaurants...</div>
      ) : restaurants.length === 0 ? (
        <div className="text-center py-10">
          <p className="text-gray-500 mb-4">You don't have any restaurants yet.</p>
          <Link to="/restaurants/create">
            <Button>Create Your First Restaurant</Button>
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {restaurants.map((restaurant) => (
            <Card key={restaurant._id}>
              <CardHeader>
                <CardTitle>{restaurant.name}</CardTitle>
                <CardDescription>{restaurant.cuisine} • {restaurant.location}</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">
                  {restaurant.description || 'No description available.'}
                </p>
              </CardContent>
              <CardFooter>
                <Link to={`/restaurants/${restaurant._id}`} className="w-full">
                  <Button variant="outline" className="w-full">View Details</Button>
                </Link>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default DashboardPage;
