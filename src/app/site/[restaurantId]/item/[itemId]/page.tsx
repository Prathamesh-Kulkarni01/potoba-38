
// src/app/site/[restaurantId]/item/[itemId]/page.tsx
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
  const { restaurantId, itemId } = params;
  if (!itemId || typeof itemId !== 'string' || itemId.trim() === '' || !restaurantId || typeof restaurantId !== 'string' || restaurantId.trim() === '') {
    console.error(`[generateMetadata] Invalid itemId ("${itemId}") or restaurantId ("${restaurantId}") received.`);
    return { title: 'Invalid Item Request' };
  }

  const itemResult = await getMenuItemByIdFromGroup(itemId);
  if (!itemResult || itemResult.restaurantId !== restaurantId) {
    console.warn(`[generateMetadata] Item not found or restaurant ID mismatch for itemId: ${itemId}, pageRestaurantId: ${restaurantId}. ItemResult:`, itemResult);
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
  console.log(`[ItemPage] Loading item details. Restaurant ID: "${restaurantId}", Item ID: "${itemId}" (Type: ${typeof itemId})`);

  if (!itemId || typeof itemId !== 'string' || itemId.trim() === '' || !restaurantId || typeof restaurantId !== 'string' || restaurantId.trim() === '') {
    console.error(`[ItemPage] Invalid itemId ("${itemId}") or restaurantId ("${restaurantId}") in params. Triggering notFound().`);
    notFound();
  }

  const itemResult = await getMenuItemByIdFromGroup(itemId);

  if (!itemResult) {
    console.error(`[ItemPage] Menu item not found for ID "${itemId}" using getMenuItemByIdFromGroup. This could be an issue with the item ID, Firestore index on 'menuItems' collection group (field 'itemIdString'), or data consistency. Triggering notFound().`);
    notFound();
  }
  
  if (itemResult.restaurantId !== restaurantId) {
    console.error(`[ItemPage] Item's restaurantId "${itemResult.restaurantId}" does not match current page's restaurantId "${restaurantId}". This indicates a mismatch or incorrect link. Triggering notFound().`);
    notFound();
  }
  
  const menuItem = stringifyItemTimestamps(itemResult.menuItem) as MenuItem & { createdAt: string; updatedAt: string };
  console.log(`[ItemPage] Successfully fetched menu item: ${menuItem.name}`);

  console.log(`[ItemPage] Fetching restaurant details for ID: ${restaurantId}`);
  const restaurantDataResult = await getRestaurant(restaurantId);
  if (!restaurantDataResult) {
    console.error(`[ItemPage] Restaurant not found for ID "${restaurantId}". Triggering notFound().`);
    notFound();
  }
  const restaurant = stringifyItemTimestamps(restaurantDataResult) as RestaurantProfile & { createdAt: string; updatedAt: string };
  console.log(`[ItemPage] Successfully fetched restaurant: ${restaurant.name}`);

  console.log(`[ItemPage] Fetching all menu items for restaurant ID: ${restaurantId} for cross-sell suggestions.`);
  const allRestaurantItemsData = await getMenuItems(restaurantId); 
  const frequentlyBoughtTogetherItems = allRestaurantItemsData
    .map(item => stringifyItemTimestamps(item) as MenuItem & { createdAt: string; updatedAt: string })
    .filter(item => item.id !== menuItem.id && item.availability) 
    .slice(0, 5); 
  console.log(`[ItemPage] Found ${frequentlyBoughtTogetherItems.length} items for cross-sell suggestions.`);

  const reviews = [
    { id: '1', reviewerName: 'Alice B.', rating: 5, content: 'Absolutely delicious! Best I have ever had.' },
    { id: '2', reviewerName: 'Charlie D.', rating: 4, content: 'Very good, a bit spicy for my taste but otherwise great.' },
    { id: '3', reviewerName: 'Elena F.', rating: 5, content: 'Perfectly cooked and amazing flavor. Will order again!' },
  ];
  const averageRating = reviews.length > 0 ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length : 0;

  console.log(`[ItemPage] Rendering ItemDetailClient for item: ${menuItem.name}`);
  return (
    <ItemDetailClient
      restaurant={restaurant}
      menuItem={menuItem}
      frequentlyBoughtTogetherItems={frequentlyBoughtTogetherItems}
      reviews={reviews}
      averageRating={averageRating}
    />
  );
}
