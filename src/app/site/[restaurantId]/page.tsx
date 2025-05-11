// src/app/site/[restaurantId]/page.tsx
import { getRestaurant } from '@/lib/firebase/firestore';
import { getMenuCategories, getMenuSubcategories, getMenuItems } from '@/lib/firebase/menu';
import type { RestaurantProfile, MenuCategory, MenuItem, MenuSubcategory } from '@/types';
import { notFound } from 'next/navigation';
import { convertFirebaseTimestampToString } from '@/lib/firebase/utils';
import SingleRestaurantFoodAppClient from '@/components/site/public-digital-menu/single-restaurant-food-app-client';

interface RestaurantPublicPageProps {
  params: {
    restaurantId: string;
  };
}

// Helper function to ensure Timestamps are converted to strings
const stringifyTimestamps = <T extends { createdAt?: any, updatedAt?: any }>(obj: T): Omit<T, 'createdAt' | 'updatedAt'> & { createdAt?: string, updatedAt?: string } => {
  const newObj = { ...obj };
  if (newObj.createdAt) {
    newObj.createdAt = convertFirebaseTimestampToString(newObj.createdAt);
  }
  if (newObj.updatedAt) {
    newObj.updatedAt = convertFirebaseTimestampToString(newObj.updatedAt);
  }
  return newObj as Omit<T, 'createdAt' | 'updatedAt'> & { createdAt?: string, updatedAt?: string };
};


export async function generateMetadata({ params }: RestaurantPublicPageProps) {
  const restaurantData = await getRestaurant(params.restaurantId);
  if (!restaurantData) {
    return {
      title: 'Restaurant Not Found',
    };
  }
  const restaurant = stringifyTimestamps(restaurantData);
  return {
    title: `${restaurant.name} - Order Food Online`,
    description: `Order delicious food from ${restaurant.name}. ${restaurant.type ? `Specializing in ${restaurant.type} cuisine.` : ''}`,
  };
}

export default async function RestaurantPublicPage({ params }: RestaurantPublicPageProps) {
  const restaurantId = params.restaurantId;
  
  const restaurantDataResult = await getRestaurant(restaurantId);

  if (!restaurantDataResult) {
    notFound();
  }
  const restaurant: RestaurantProfile & { createdAt: string; updatedAt: string } = 
    stringifyTimestamps(restaurantDataResult) as RestaurantProfile & { createdAt: string; updatedAt: string };

  const categoriesData: MenuCategory[] = (await getMenuCategories(restaurantId)).sort((a, b) => a.order - b.order);
  const subcategoriesData: MenuSubcategory[] = (await getMenuSubcategories(restaurantId)).sort((a,b) => a.order - b.order); 
  const menuItemsData: MenuItem[] = (await getMenuItems(restaurantId)).sort((a,b) => a.order - b.order);

  const categories: (MenuCategory & { createdAt: string; updatedAt: string })[] = 
    categoriesData.map(cat => stringifyTimestamps(cat) as MenuCategory & { createdAt: string; updatedAt: string });
  const subcategories: (MenuSubcategory & { createdAt: string; updatedAt: string })[] =
    subcategoriesData.map(sub => stringifyTimestamps(sub) as MenuSubcategory & { createdAt: string; updatedAt: string });
  const menuItems: (MenuItem & { createdAt: string; updatedAt: string })[] = 
    menuItemsData.map(item => stringifyTimestamps(item) as MenuItem & { createdAt: string; updatedAt: string });
  
  // For "Popular Items" - take a few available items, maybe with high order or specific tag if available
  // For now, just take first few available items as "popular"
  const popularItems = menuItems.filter(item => item.availability).slice(0, 6);

  // Mock offers for now, or fetch if you have an offers collection
  const offers = [
    { 
      id: "1", 
      title: "50% OFF", 
      description: "Up to ₹10 | Use code WELCOME50",
      color: "bg-gradient-to-r from-purple-500 to-indigo-600" // Match provided UI
    },
    { 
      id: "2", 
      title: "FREE DELIVERY", 
      description: "On orders above ₹15 | Limited time",
      color: "bg-gradient-to-r from-orange-400 to-pink-500"
    },
    { 
      id: "3", 
      title: "COMBO DEAL", 
      description: "Save 30% on family combos",
      color: "bg-gradient-to-r from-green-400 to-cyan-500"
    }
  ];

  // Details needed by the new UI, some might be mocked or derived if not in RestaurantProfile
  const restaurantDisplayInfo = {
    name: restaurant.name,
    logo: restaurant.settings?.customDomain ? `https://logo.clearbit.com/${restaurant.settings.customDomain}` : `https://picsum.photos/seed/${restaurant.id}logo/60/60`, // Example logic for logo
    coverImage: `https://picsum.photos/seed/${restaurant.id}cover/400/150`,
    cuisine: restaurant.type || "Delicious Food", // Use restaurant type as cuisine
    rating: 4.6, // Mocked, or fetch from reviews system
    deliveryTime: "25-30 min", // Mocked, or derive from settings
    minOrder: "₹10", // Mocked, or derive from settings
    isOpen: true, // Mocked, or derive from operational hours settings
  };
  
  return (
    <SingleRestaurantFoodAppClient
      restaurantData={restaurant} // Pass the full profile for any other needs
      restaurantDisplayInfo={restaurantDisplayInfo}
      menuCategoriesData={categories}
      allMenuItemsData={menuItems} // Pass all items, client can filter
      popularItemsData={popularItems} // Pass pre-selected popular items
      offersData={offers}
    />
  );
}
