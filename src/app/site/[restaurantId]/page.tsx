
// src/app/site/[restaurantId]/page.tsx
import { getRestaurant } from '@/lib/firebase/firestore';
import { getMenuCategories, getMenuSubcategories, getMenuItems } from '@/lib/firebase/menu';
import type { RestaurantProfile, MenuCategory, MenuItem } from '@/types';
import { notFound } from 'next/navigation';
import { convertFirebaseTimestampToString } from '@/lib/firebase/utils';
import PublicDigitalMenu from '@/components/site/public-digital-menu'; // Updated import

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
  // Subcategories are not directly used by PublicDigitalMenu but might be needed for deeper menu structures if adapted
  // const subcategoriesData: MenuSubcategory[] = (await getMenuSubcategories(restaurantId)).sort((a,b) => a.order - b.order); 
  const menuItemsData: MenuItem[] = (await getMenuItems(restaurantId)).sort((a,b) => a.order - b.order);

  const categories: (MenuCategory & { createdAt: string; updatedAt: string })[] = 
    categoriesData.map(cat => stringifyTimestamps(cat) as MenuCategory & { createdAt: string; updatedAt: string });
  const menuItems: (MenuItem & { createdAt: string; updatedAt: string })[] = 
    menuItemsData.map(item => stringifyTimestamps(item) as MenuItem & { createdAt: string; updatedAt: string });
  
  return (
    <PublicDigitalMenu
      restaurantData={restaurant}
      menuCategoriesData={categories}
      menuItemsData={menuItems}
    />
  );
}
