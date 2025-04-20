
import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { PlusCircle, Store, ChevronDown } from 'lucide-react';
import { Link } from 'react-router-dom';
import { toast } from "sonner";

const RestaurantSelector = () => {
  const { user, currentRestaurantId, setCurrentRestaurantId, getCurrentRestaurant } = useAuth();
  const [open, setOpen] = useState(false);
  
  if (!user) return null;
  
  const currentRestaurant = getCurrentRestaurant();
  
  const handleRestaurantChange = (restaurantId: string) => {
    setCurrentRestaurantId(restaurantId);
    setOpen(false);
    
    const selectedRestaurant = user.restaurants?.find(r => r.id === restaurantId);
    if (selectedRestaurant) {
      toast.success(`Switched to ${selectedRestaurant.name}`);
    }
  };
  
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button 
          variant="outline" 
          className="flex items-center gap-2 bg-white/20 text-white border-white/20 hover:bg-white/30 hover:text-white"
        >
          <Store className="h-4 w-4" />
          <span className="max-w-[120px] truncate">
            {currentRestaurant?.name || "Select Restaurant"}
          </span>
          <ChevronDown className="h-3 w-3 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[220px] p-0" align="start">
        <div className="px-2 py-2 text-sm font-medium text-muted-foreground">
          Your Restaurants
        </div>
        <div className="flex flex-col">
          {user.restaurants && user.restaurants.length > 0 ? (
            user.restaurants.map((restaurant) => (
              <Button
                key={restaurant.id}
                variant="ghost"
                className={`justify-start px-2 py-1.5 text-sm cursor-pointer ${
                  restaurant.id === currentRestaurantId
                    ? "bg-muted font-medium"
                    : ""
                }`}
                onClick={() => handleRestaurantChange(restaurant.id)}
              >
                <span className="truncate">{restaurant.name}</span>
              </Button>
            ))
          ) : (
            <div className="px-2 py-1.5 text-sm text-muted-foreground">
              No restaurants yet
            </div>
          )}
        </div>
        <div className="border-t border-border px-2 py-2">
          <Button
            variant="ghost"
            className="w-full justify-start gap-2 px-2 py-1.5 text-sm"
            asChild
          >
            <Link to="/onboarding">
              <PlusCircle className="h-4 w-4" />
              <span>Add Restaurant</span>
            </Link>
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default RestaurantSelector;
