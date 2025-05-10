
import { getRestaurant } from '@/lib/firebase/firestore';
import { getMenuCategories, getMenuSubcategories, getMenuItems } from '@/lib/firebase/menu';
import type { RestaurantProfile, MenuCategory, MenuSubcategory, MenuItem } from '@/types';
import { notFound } from 'next/navigation';
import { convertFirebaseTimestampToString } from '@/lib/firebase/utils';
import RestaurantHomepageClient from '@/components/site/public-homepage/restaurant-homepage-client';

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
  
  const restaurantData = await getRestaurant(restaurantId);

  if (!restaurantData) {
    notFound();
  }
  // Explicitly type after conversion
  const restaurant: RestaurantProfile & { createdAt: string; updatedAt: string } = 
    stringifyTimestamps(restaurantData) as RestaurantProfile & { createdAt: string; updatedAt: string };

  const categoriesData: MenuCategory[] = (await getMenuCategories(restaurantId)).sort((a, b) => a.order - b.order);
  const subcategoriesData: MenuSubcategory[] = (await getMenuSubcategories(restaurantId)).sort((a,b) => a.order - b.order); 
  const menuItemsData: MenuItem[] = (await getMenuItems(restaurantId)).sort((a,b) => a.order - b.order);

  const categories: (MenuCategory & { createdAt: string; updatedAt: string })[] = 
    categoriesData.map(cat => stringifyTimestamps(cat) as MenuCategory & { createdAt: string; updatedAt: string });
  const subcategories: (MenuSubcategory & { createdAt: string; updatedAt: string })[] = 
    subcategoriesData.map(sub => stringifyTimestamps(sub) as MenuSubcategory & { createdAt: string; updatedAt: string });
  const menuItems: (MenuItem & { createdAt: string; updatedAt: string })[] = 
    menuItemsData.map(item => stringifyTimestamps(item) as MenuItem & { createdAt: string; updatedAt: string });

  // Dummy popular dishes (could be derived from orders in a real app)
  const popularDishes = menuItems.filter(item => item.availability).slice(0, 8); // Show up to 8 available items as popular

  // Dummy special offers
  const specialOffers = [
    { id: '1', title: 'Flat 30% Off', description: 'On orders above $50. Use code FLAT30.', imageUrl: `https://picsum.photos/seed/${restaurantId}offer1/600/300`, dataAiHint: "discount promotion" },
    { id: '2', title: 'Free Dessert', description: 'With any main course. Limited time!', imageUrl: `https://picsum.photos/seed/${restaurantId}offer2/600/300`, dataAiHint: "food offer" },
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
