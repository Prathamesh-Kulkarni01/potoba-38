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
  if (!params.itemId || typeof params.itemId !== 'string' || params.itemId.trim() === '' || !params.restaurantId || typeof params.restaurantId !== 'string' || params.restaurantId.trim() === '') {
    console.error(`generateMetadata: Invalid itemId ("${params.itemId}") or restaurantId ("${params.restaurantId}") received.`);
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
  console.log(`ItemPage: Attempting to load item. Restaurant ID: ${restaurantId}, Item ID: ${itemId}`);


  if (!itemId || typeof itemId !== 'string' || itemId.trim() === '' || !restaurantId || typeof restaurantId !== 'string' || restaurantId.trim() === '') {
    console.error(`ItemPage: Invalid itemId ("${itemId}") or restaurantId ("${restaurantId}") received from params. Triggering notFound().`);
    notFound();
  }

  console.log(`ItemPage: Fetching restaurant data for ID: ${restaurantId}`);
  const restaurantDataResult = await getRestaurant(restaurantId);
  if (!restaurantDataResult) {
    console.error(`ItemPage: Restaurant not found for restaurantId "${restaurantId}". Triggering notFound().`);
    notFound();
  }
  console.log(`ItemPage: Restaurant data fetched successfully for ${restaurantDataResult.name}`);
  const restaurant = stringifyItemTimestamps(restaurantDataResult) as RestaurantProfile & { createdAt: string; updatedAt: string };

  console.log(`ItemPage: Fetching menu item by itemIdString: ${itemId}`);
  const itemResult = await getMenuItemByIdFromGroup(itemId);

  if (!itemResult) {
    console.error(`ItemPage: No item found for itemIdString "${itemId}". This often indicates a missing Firestore index on the 'menuItems' collection group for the 'itemIdString' field, or the item genuinely does not exist with this ID. Triggering notFound().`);
    notFound();
  }
  console.log(`ItemPage: Item found: ${itemResult.menuItem.name}. Item's restaurantId: ${itemResult.restaurantId}, Current restaurantId: ${restaurantId}`);

  if (itemResult.restaurantId !== restaurantId) {
    console.error(`ItemPage: Item's restaurantId "${itemResult.restaurantId}" does not match current restaurantId "${restaurantId}". Triggering notFound().`);
    notFound();
  }
  const menuItem = stringifyItemTimestamps(itemResult.menuItem) as MenuItem & { createdAt: string; updatedAt: string };
  console.log(`ItemPage: Menu item processed: ${menuItem.name}`);

  console.log(`ItemPage: Fetching all menu items for restaurant ID: ${restaurantId} for cross-sell.`);
  const allRestaurantItemsData = await getMenuItems(restaurantId);
  const allRestaurantItems = allRestaurantItemsData
    .map(item => stringifyItemTimestamps(item) as MenuItem & { createdAt: string; updatedAt: string })
    .filter(item => item.id !== menuItem.id && item.availability)
    .slice(0, 5);
  console.log(`ItemPage: Found ${allRestaurantItems.length} items for cross-sell.`);

  // Mock reviews for now
  const reviews = [
    { id: '1', reviewerName: 'Alice B.', rating: 5, content: 'Absolutely delicious! Best I have ever had.' },
    { id: '2', reviewerName: 'Charlie D.', rating: 4, content: 'Very good, a bit spicy for my taste but otherwise great.' },
    { id: '3', reviewerName: 'Elena F.', rating: 5, content: 'Perfectly cooked and amazing flavor. Will order again!' },
  ];
  const averageRating = reviews.length > 0 ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length : 0;

  console.log(`ItemPage: Rendering ItemDetailClient for item: ${menuItem.name}`);
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
