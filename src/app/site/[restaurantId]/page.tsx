import { getRestaurant } from '@/lib/firebase/firestore';
import { getMenuCategories, getMenuSubcategories, getMenuItems } from '@/lib/firebase/menu';
import type { RestaurantProfile, MenuCategory, MenuSubcategory, MenuItem } from '@/types';
import { notFound } from 'next/navigation';
import PublicDigitalMenu from '@/components/site/public-digital-menu'; 
import { convertFirebaseTimestampToString } from '@/lib/firebase/utils';

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
    title: `${restaurant.name} - Digital Menu`,
    description: `Order online from ${restaurant.name}. ${restaurant.type ? `We are a ${restaurant.type} style restaurant.` : ''}`,
  };
}

export default async function RestaurantPublicPage({ params }: RestaurantPublicPageProps) {
  const restaurantId = params.restaurantId;
  
  const restaurantData = await getRestaurant(restaurantId);

  if (!restaurantData) {
    notFound();
  }
  const restaurant = stringifyTimestamps(restaurantData) as RestaurantProfile & {createdAt: string, updatedAt: string};


  const categoriesData: MenuCategory[] = await getMenuCategories(restaurantId);
  const subcategoriesData: MenuSubcategory[] = await getMenuSubcategories(restaurantId); 
  const menuItemsData: MenuItem[] = await getMenuItems(restaurantId);

  const categories = categoriesData.map(stringifyTimestamps)  as (MenuCategory & {createdAt: string, updatedAt: string})[];
  const subcategories = subcategoriesData.map(stringifyTimestamps) as (MenuSubcategory & {createdAt: string, updatedAt: string})[];
  const menuItems = menuItemsData.map(stringifyTimestamps) as (MenuItem & {createdAt: string, updatedAt: string})[];


  return (
    <PublicDigitalMenu 
      restaurant={restaurant}
      categories={categories}
      subcategories={subcategories}
      menuItems={menuItems}
    />
  );
}
