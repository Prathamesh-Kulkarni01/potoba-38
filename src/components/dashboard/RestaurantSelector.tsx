
import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { PlusCircle, Store, ChevronDown, Building2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const RestaurantSelector = () => {
  const { user, currentRestaurantId, setCurrentRestaurantId, getCurrentRestaurant } = useAuth();
  const [open, setOpen] = useState(false);
  
  if (!user) return null;
  
  const currentRestaurant = getCurrentRestaurant();
  
  const handleRestaurantChange = (restaurantId: string) => {
    setCurrentRestaurantId(restaurantId);
    setOpen(false);
    
    const selectedRestaurant = user.restaurants?.find(r => r._id === restaurantId);
    if (selectedRestaurant) {
      toast.success(`Switched to ${selectedRestaurant.name}`);
    }
  };
  
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button 
          variant="outline" 
          className="flex items-center justify-between gap-2 w-full bg-sidebar-accent/20 text-sidebar-foreground border-sidebar-border/50 hover:bg-sidebar-accent/30 hover:text-sidebar-foreground"
          size="sm"
        >
          <div className="flex items-center gap-2 max-w-[80%]">
            {currentRestaurant?.logo ? (
              <img 
                src={currentRestaurant.logo} 
                alt={currentRestaurant.name} 
                className="h-4 w-4 rounded-sm object-cover"
              />
            ) : (
              <Building2 className="h-4 w-4 text-sidebar-foreground/70" />
            )}
            <span className="truncate font-medium">
              {currentRestaurant?.name || "Select Restaurant"}
            </span>
          </div>
          <ChevronDown className="h-3 w-3 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[220px] p-0" align="start">
        <div className="px-3 py-2 text-xs font-medium text-muted-foreground border-b">
          Your Restaurants
        </div>
        <div className="max-h-[250px] overflow-y-auto py-1">
          {user.restaurants && user.restaurants.length > 0 ? (
            user.restaurants.map((restaurant) => (
              <Button
                key={restaurant.id}
                variant="ghost"
                className={cn(
                  "w-full justify-start gap-2 px-3 py-1.5 text-sm h-auto",
                  restaurant.id === currentRestaurantId
                    ? "bg-accent text-accent-foreground font-medium"
                    : ""
                )}
                onClick={() => handleRestaurantChange(restaurant._id)}
              >
                {restaurant.logo ? (
                  <img 
                    src={restaurant.logo} 
                    alt={restaurant.name} 
                    className="h-4 w-4 rounded-sm object-cover flex-shrink-0"
                  />
                ) : (
                  <Store className="h-4 w-4 flex-shrink-0" />
                )}
                <span className="truncate">{restaurant.name}</span>
              </Button>
            ))
          ) : (
            <div className="px-3 py-2 text-sm text-muted-foreground">
              No restaurants yet
            </div>
          )}
        </div>
        <div className="border-t border-border px-2 py-1.5">
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
