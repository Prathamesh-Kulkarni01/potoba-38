
import { getRestaurant } from '@/lib/firebase/firestore';
import { getMenuCategories, getMenuSubcategories, getMenuItems } from '@/lib/firebase/menu';
import type { RestaurantProfile, MenuCategory, MenuSubcategory, MenuItem } from '@/types';
import { notFound } from 'next/navigation';
import PublicDigitalMenu from '@/components/site/public-digital-menu'; // New client component

interface RestaurantPublicPageProps {
  params: {
    restaurantId: string;
  };
}

export async function generateMetadata({ params }: RestaurantPublicPageProps) {
  const restaurant = await getRestaurant(params.restaurantId);
  if (!restaurant) {
    return {
      title: 'Restaurant Not Found',
    };
  }
  return {
    title: `${restaurant.name} - Digital Menu`,
    description: `Order online from ${restaurant.name}. ${restaurant.type ? `We are a ${restaurant.type} style restaurant.` : ''}`,
  };
}

export default async function RestaurantPublicPage({ params }: RestaurantPublicPageProps) {
  const restaurantId = params.restaurantId;
  const restaurant: RestaurantProfile | null = await getRestaurant(restaurantId);

  if (!restaurant) {
    notFound();
  }

  // Fetch menu data
  const categories: MenuCategory[] = await getMenuCategories(restaurantId);
  const subcategories: MenuSubcategory[] = await getMenuSubcategories(restaurantId); // Fetches all for the restaurant
  const menuItems: MenuItem[] = await getMenuItems(restaurantId); // Fetches all for the restaurant

  return (
    <PublicDigitalMenu 
      restaurant={restaurant}
      categories={categories}
      subcategories={subcategories}
      menuItems={menuItems}
    />
  );
}

