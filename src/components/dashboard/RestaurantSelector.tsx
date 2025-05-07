import React from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { getFullDomain, getCurrentProtocol, getSubdomain, changeRestaurantTenant } from '@/utils/subdomain';

interface Restaurant {
  id: string;
  name: string;
  role: string;
}

interface RestaurantSelectorProps {
  restaurants: Restaurant[];
  currentRestaurant: Restaurant | null;
  onRestaurantChange: (restaurantId: string) => void;
}

const RestaurantSelector: React.FC<RestaurantSelectorProps> = ({
  restaurants,
  currentRestaurant,
  onRestaurantChange,
}) => {
  const navigate = useNavigate();
  const location = useLocation();

  const handleRestaurantChange = async (value: string) => {
    // Find the selected restaurant
    const selectedRestaurant = restaurants.find(r => r.id === value);
    if (!selectedRestaurant) return;

    try {
      // Update the restaurant in the parent component
      onRestaurantChange(value);

      // Change the subdomain to match the selected restaurant

    } catch (error) {
      console.error('Failed to change restaurant:', error);
      // You might want to show an error toast here
    }
  };

  const handleAddRestaurant = () => {
    navigate('/onboarding');
  };

  return (
    <div className="flex items-center gap-2">
      <Select
        value={currentRestaurant?.id}
        onValueChange={handleRestaurantChange}
      >
        <SelectTrigger className="w-[200px]">
          <SelectValue placeholder="Select restaurant" />
        </SelectTrigger>
        <SelectContent>
          {restaurants?.map((restaurant) => (
            <SelectItem key={restaurant.id} value={restaurant.id}>
              {restaurant.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Button
        variant="outline"
        size="icon"
        onClick={handleAddRestaurant}
        className="shrink-0"
      >
        <Plus className="h-4 w-4" />
      </Button>
    </div>
  );
};

export default RestaurantSelector;
