
import { getRestaurant } from '@/lib/firebase/firestore';
import { getMenuItemByIdFromGroup, getMenuItems } from '@/lib/firebase/menu';
import type { RestaurantProfile, MenuItem } from '@/types';
import { notFound } from 'next/navigation';
import { convertFirebaseTimestampToString } from '@/lib/firebase/utils';
import ItemDetailClient from '@/components/site/item-page/item-detail-client';


interface ItemPageProps {
  params: {
    restaurantId: string;
    itemId: string;
  };
}

// Helper function to ensure Timestamps are converted to strings
const stringifyItemTimestamps = <T extends { createdAt?: any, updatedAt?: any }>(obj: T): Omit<T, 'createdAt' | 'updatedAt'> & { createdAt?: string, updatedAt?: string } => {
  const newObj = { ...obj };
  if (newObj.createdAt) {
    newObj.createdAt = convertFirebaseTimestampToString(newObj.createdAt);
  }
  if (newObj.updatedAt) {
    newObj.updatedAt = convertFirebaseTimestampToString(newObj.updatedAt);
  }
  return newObj as Omit<T, 'createdAt' | 'updatedAt'> & { createdAt?: string, updatedAt?: string };
};


export async function generateMetadata({ params }: ItemPageProps) {
  if (!params.itemId || typeof params.itemId !== 'string' || params.itemId.trim() === '') {
    return { title: 'Invalid Item Request' };
  }
  const itemResult = await getMenuItemByIdFromGroup(params.itemId);
  if (!itemResult || itemResult.restaurantId !== params.restaurantId) {
    return {
      title: 'Item Not Found',
    };
  }
  const item = stringifyItemTimestamps(itemResult.menuItem);
  return {
    title: `${item.name} - Order Online`,
    description: item.description || `Order ${item.name} now!`,
  };
}

export default async function ItemPage({ params }: ItemPageProps) {
  const { restaurantId, itemId } = params;

  if (!itemId || typeof itemId !== 'string' || itemId.trim() === '') {
    console.error("ItemPage: Invalid itemId received from params:", itemId);
    notFound();
  }

  const restaurantData = await getRestaurant(restaurantId);
  if (!restaurantData) {
    notFound();
  }
  const restaurant = stringifyItemTimestamps(restaurantData) as RestaurantProfile & { createdAt: string; updatedAt: string };

  const itemResult = await getMenuItemByIdFromGroup(itemId);
  if (!itemResult || itemResult.restaurantId !== restaurantId) {
    console.warn(`Item with ID ${itemId} found, but restaurantId ${itemResult?.restaurantId} does not match expected ${restaurantId}. Or item not found.`);
    notFound();
  }
  const menuItem = stringifyItemTimestamps(itemResult.menuItem) as MenuItem & { createdAt: string; updatedAt: string };

  // Fetch a few other items for "Frequently Bought Together"
  const allRestaurantItemsData = await getMenuItems(restaurantId);
  const allRestaurantItems = allRestaurantItemsData
    .map(item => stringifyItemTimestamps(item) as MenuItem & { createdAt: string; updatedAt: string })
    .filter(item => item.id !== menuItem.id && item.availability) // Exclude current item and unavailable items
    .slice(0, 5); // Take up to 5 items

  // Mock reviews for now
  const reviews = [
    { id: '1', reviewerName: 'Alice B.', rating: 5, content: 'Absolutely delicious! Best I have ever had.' },
    { id: '2', reviewerName: 'Charlie D.', rating: 4, content: 'Very good, a bit spicy for my taste but otherwise great.' },
    { id: '3', reviewerName: 'Elena F.', rating: 5, content: 'Perfectly cooked and amazing flavor. Will order again!' },
  ];
  const averageRating = reviews.length > 0 ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length : 0;


  return (
    <ItemDetailClient
      restaurant={restaurant}
      menuItem={menuItem}
      frequentlyBoughtTogetherItems={allRestaurantItems}
      reviews={reviews}
      averageRating={averageRating}
    />
  );
}
