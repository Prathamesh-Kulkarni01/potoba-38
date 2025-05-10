
// src/app/site/[restaurantId]/page.tsx
import { getRestaurant } from '@/lib/firebase/firestore';
import { getMenuCategories, getMenuSubcategories, getMenuItems } from '@/lib/firebase/menu';
import type { RestaurantProfile, MenuCategory, MenuItem, MenuSubcategory } from '@/types';
import { notFound } from 'next/navigation';
import { convertFirebaseTimestampToString } from '@/lib/firebase/utils';
import RestaurantHomepageClient from '@/components/site/public-homepage/restaurant-homepage-client'; // Updated import

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
    title: `${restaurant.name} - Order Online`,
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
  
  const popularDishes = menuItems.filter(item => item.availability && (item.order < 5 || item.name.toLowerCase().includes('special'))).slice(0, 6);

  // Mock special offers for now
  const specialOffers = [
    { id: "1", title: "Weekend Special: 20% Off", description: "Enjoy 20% off on all main courses this weekend!", imageUrl: `https://picsum.photos/seed/${restaurantId}offer1/600/400`, dataAiHint: "food discount weekend" },
    { id: "2", title: "Combo Bonanza", description: "Get a free dessert with any family combo meal.", imageUrl: `https://picsum.photos/seed/${restaurantId}offer2/600/400`, dataAiHint: "combo meal dessert" },
  ];
  
  return (
    <RestaurantHomepageClient
      restaurant={restaurant}
      categories={categories}
      subcategories={subcategories}
      menuItems={menuItems}
      popularDishes={popularDishes}
      specialOffers={specialOffers}
    />
  );
}

