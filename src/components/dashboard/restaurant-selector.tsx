import React, { useState } from 'react';
import Link from 'next/link';
import { useAuth } from "@/lib/auth/context";
import { getRestaurantsByOwner } from "@/lib/firebase/firestore";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { RestaurantProfile } from "@/types";
import { ExternalLink, PlusCircle } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface RestaurantSelectorProps {
  selectedRestaurantId: string | null;
  currentRestaurantDetails: RestaurantProfile | null;
  onRestaurantChange: (restaurantId: string) => void;
  isMobile?: boolean;
}

const RestaurantSelector = ({
  selectedRestaurantId,
  currentRestaurantDetails,
  onRestaurantChange,
  isMobile = false,
}: RestaurantSelectorProps) => {
  const { user, role: authContextRole } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [restaurants, setRestaurants] = useState<RestaurantProfile[]>(
    currentRestaurantDetails ? [currentRestaurantDetails] : []
  );

  const loadAllRestaurants = async () => {
    if (!user?.uid || authContextRole !== "owner" || isLoading) return;
    setIsLoading(true);
    try {
      const restaurants = await getRestaurantsByOwner(user.uid);
      setRestaurants(restaurants);
    } catch (error) {
      console.error("Failed to fetch restaurants:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Could not load your restaurants.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleValueChange = (value: string) => {
    if (value === "create_new_restaurant_redirect_target") {
      window.location.href = "/dashboard/create-restaurant";
      return;
    }
    onRestaurantChange(value);
  };

  if (authContextRole !== "owner") return null;

  return (
    <div className={isMobile ? "flex items-center gap-2" : "p-2 space-y-2 group-data-[collapsible=icon]:hidden"}>
      <div className="flex items-center space-x-2">
        <Select
          value={selectedRestaurantId || ""}
          onValueChange={handleValueChange}
          onOpenChange={(open) => {
            if (open && restaurants.length <= 1) {
              loadAllRestaurants();
            }
          }}
          disabled={isLoading}
        >
          <SelectTrigger 
            className={
              isMobile 
                ? "w-auto h-8 text-xs px-2 py-1 max-w-[110px] truncate"
                : "w-full flex-grow text-xs h-9"
            }
          >
            <SelectValue
              placeholder={isLoading ? "Loading..." : "Select Restaurant..."}
            />
          </SelectTrigger>
          <SelectContent>
            {restaurants.map((restaurant) => (
              <SelectItem
                key={restaurant.id}
                value={restaurant.id}
                className="text-xs"
              >
                {restaurant.name}
              </SelectItem>
            ))}
            <SelectItem
              value="create_new_restaurant_redirect_target"
              className="text-xs text-primary"
            >
              Create New
            </SelectItem>
          </SelectContent>
        </Select>
        {selectedRestaurantId && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  asChild 
                  className={isMobile ? "h-8 w-8 text-primary p-0" : "h-9 w-9 flex-shrink-0"}
                >
                  <Link
                    href={`/site/${selectedRestaurantId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    title="Open Public Page"
                  >
                    <ExternalLink className="h-4 w-4" />
                  </Link>
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Open Public Page</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      </div>
      {!isMobile && (
        <Button variant="outline" size="sm" className="w-full text-xs" asChild>
          <Link href="/dashboard/create-restaurant">
            <PlusCircle className="mr-2 h-3 w-3" /> Create New
          </Link>
        </Button>
      )}
    </div>
  );
};

export default RestaurantSelector;
