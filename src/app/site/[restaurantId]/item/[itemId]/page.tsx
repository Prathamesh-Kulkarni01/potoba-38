
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
    console.error(`ItemPage: Invalid itemId received from params: "${itemId}" for restaurant "${restaurantId}".`);
    notFound();
  }

  const restaurantDataResult = await getRestaurant(restaurantId);
  if (!restaurantDataResult) {
    console.error(`ItemPage: Restaurant not found for restaurantId "${restaurantId}".`);
    notFound();
  }
  const restaurant = stringifyItemTimestamps(restaurantDataResult) as RestaurantProfile & { createdAt: string; updatedAt: string };

  const itemResult = await getMenuItemByIdFromGroup(itemId);

  if (!itemResult) {
    console.error(`ItemPage: No item found for itemId "${itemId}" in restaurant "${restaurantId}" using getMenuItemByIdFromGroup. This often indicates a missing Firestore index on the 'menuItems' collection group for the 'itemIdString' field, or the item genuinely does not exist with this ID.`);
    notFound();
  }

  // This check is crucial: an item might be found by its ID (itemIdString), but we must ensure it belongs to the *current* restaurant context.
  if (itemResult.restaurantId !== restaurantId) {
    console.error(`ItemPage: Item found for itemId "${itemId}", but its restaurantId "${itemResult.restaurantId}" does not match the current restaurantId "${restaurantId}". Access denied or item belongs to a different restaurant.`);
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

// Developer Note: If you are consistently getting 404 errors for item pages,
// please ensure you have a Firestore index for the 'menuItems' collection group:
// Collection ID: menuItems (Collection group)
// Fields to index: itemIdString (Ascending)
// This index is necessary for the getMenuItemByIdFromGroup function to efficiently query items across all restaurants.
