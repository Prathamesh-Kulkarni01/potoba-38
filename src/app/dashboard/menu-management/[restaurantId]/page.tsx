'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth/context';
import { getRestaurant } from '@/lib/firebase/firestore';
import type { RestaurantProfile } from '@/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import LoadingSpinner from '@/components/shared/loading-spinner';
import { Button } from '@/components/ui/button';
import { PlusCircle, Search, Filter } from 'lucide-react';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import Image from 'next/image';

// Placeholder components for MenuList, CategoryForm, etc.
// These would be built out in separate files.
const MenuListPlaceholder = () => (
  <div className="p-6 border border-dashed rounded-lg bg-muted/50 text-center">
    <Image 
      src="https://picsum.photos/seed/menulist/300/200" 
      alt="Menu List Placeholder"
      width={300}
      height={200}
      className="mx-auto rounded-md mb-4"
      data-ai-hint="restaurant menu"
    />
    <h3 className="text-lg font-semibold mb-2">Menu Item Management Area</h3>
    <p className="text-muted-foreground">
      Categories, subcategories, and menu items will be displayed and managed here.
      This includes adding, editing, deleting, and organizing your menu structure.
      Filtering and search functionality will also be available.
    </p>
  </div>
);


export default function MenuManagementPage() {
  const params = useParams();
  const restaurantId = params.restaurantId as string;
  const { user, role, initialLoading: authLoading } = useAuth();
  const router = useRouter();
  const [restaurant, setRestaurant] = useState<RestaurantProfile | null>(null);
  const [pageLoading, setPageLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;

    if (!user || role !== 'owner') {
      router.replace('/dashboard');
      return;
    }

    if (!restaurantId) {
      router.replace('/dashboard'); // Should not happen if navigation is correct
      return;
    }

    setPageLoading(true);
    getRestaurant(restaurantId)
      .then((data) => {
        if (data && data.ownerId === user.uid) {
          setRestaurant(data);
        } else {
          // Not found or not owner
          router.replace('/dashboard');
        }
      })
      .catch(() => {
        router.replace('/dashboard');
      })
      .finally(() => {
        setPageLoading(false);
      });
  }, [restaurantId, user, role, authLoading, router]);

  if (authLoading || pageLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <LoadingSpinner className="h-10 w-10 text-primary" />
      </div>
    );
  }

  if (!restaurant) {
    // This case should ideally be handled by the redirect in useEffect
    return (
      <Card>
        <CardHeader>
          <CardTitle>Error</CardTitle>
        </CardHeader>
        <CardContent>
          <p>Restaurant not found or you do not have permission to manage its menu.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl md:text-3xl">Menu Management for {restaurant.name}</CardTitle>
          <CardDescription>
            Organize categories, subcategories, and items for your restaurant's menu.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex flex-col md:flex-row gap-4 items-center">
            <div className="relative flex-grow w-full md:w-auto">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input placeholder="Search menu items..." className="pl-10 w-full" />
            </div>
            <Select>
              <SelectTrigger className="w-full md:w-[180px]">
                <SelectValue placeholder="Filter by Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {/* Populate with actual categories */}
                <SelectItem value="appetizers" disabled>Appetizers (soon)</SelectItem>
                <SelectItem value="main_course" disabled>Main Course (soon)</SelectItem>
              </SelectContent>
            </Select>
             <Select>
              <SelectTrigger className="w-full md:w-[180px]">
                <SelectValue placeholder="Filter by Subcategory" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Subcategories</SelectItem>
                 {/* Populate with actual subcategories */}
                <SelectItem value="veg" disabled>Vegetarian (soon)</SelectItem>
              </SelectContent>
            </Select>
            <Button className="w-full md:w-auto bg-accent hover:bg-accent/90 text-accent-foreground">
              <PlusCircle className="mr-2 h-4 w-4" /> Add New Item
            </Button>
          </div>
          
          {/* Placeholder for actual menu list/management UI */}
          <MenuListPlaceholder />

        </CardContent>
      </Card>
    </div>
  );
}
