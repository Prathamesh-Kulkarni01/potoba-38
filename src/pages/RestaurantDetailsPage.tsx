
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";
import { api } from '@/utils/api';

interface Restaurant {
  _id: string;
  name: string;
  location: string;
  cuisine: string;
  description?: string;
}

const RestaurantDetailsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    const fetchRestaurant = async () => {
      if (!id) return;
      
      try {
        const data = await api(`/restaurants/${id}`, { requiresAuth: true });
        setRestaurant(data);
      } catch (error) {
        console.error('Error fetching restaurant details:', error);
        toast({
          title: "Error",
          description: "Failed to load restaurant details",
          variant: "destructive"
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchRestaurant();
  }, [id, toast]);

  const handleDelete = async () => {
    if (!id || !window.confirm("Are you sure you want to delete this restaurant?")) return;
    
    setIsDeleting(true);
    
    try {
      await api(`/restaurants/${id}`, {
        method: 'DELETE',
        requiresAuth: true
      });
      
      toast({
        title: "Success",
        description: "Restaurant deleted successfully"
      });
      
      navigate('/dashboard');
    } catch (error) {
      console.error('Error deleting restaurant:', error);
      setIsDeleting(false);
    }
  };

  if (isLoading) {
    return <div className="container mx-auto py-10 text-center">Loading restaurant details...</div>;
  }

  if (!restaurant) {
    return <div className="container mx-auto py-10 text-center">Restaurant not found</div>;
  }

  return (
    <div className="container mx-auto py-10">
      <Card>
        <CardHeader>
          <CardTitle className="text-3xl">{restaurant.name}</CardTitle>
          <div className="flex gap-2 text-sm text-gray-500">
            <span>{restaurant.cuisine}</span>
            <span>•</span>
            <span>{restaurant.location}</span>
          </div>
        </CardHeader>
        <CardContent>
          <div className="mb-8">
            <h2 className="text-xl font-semibold mb-2">Description</h2>
            <p className="text-gray-600">
              {restaurant.description || 'No description available.'}
            </p>
          </div>
          
          <div className="flex gap-4">
            <Button variant="outline" onClick={() => navigate('/dashboard')}>
              Back to Dashboard
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={isDeleting}>
              {isDeleting ? 'Deleting...' : 'Delete Restaurant'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default RestaurantDetailsPage;
