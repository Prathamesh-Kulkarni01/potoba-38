
// src/app/menu/table/[tableId]/page.tsx
import { getRestaurant } from '@/lib/firebase/firestore';
import { getTableByDocIdFromGroup } from '@/lib/firebase/tables';
import { getMenuCategories, getMenuSubcategories, getMenuItems } from '@/lib/firebase/menu';
import type { RestaurantProfile, MenuCategory, MenuItem, MenuSubcategory, Table } from '@/types';
import { notFound } from 'next/navigation';
import { convertFirebaseTimestampToString } from '@/lib/firebase/utils';
import SingleRestaurantFoodAppClient from '@/components/site/public-digital-menu/single-restaurant-food-app-client';

interface ScanOrderPageProps {
  params: {
    tableId: string; // This is the tableDocId from the URL
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

export async function generateMetadata({ params }: ScanOrderPageProps) {
  const tableResult = await getTableByDocIdFromGroup(params.tableId);
  if (!tableResult || !tableResult.restaurantId) {
    return { title: 'Table Not Found' };
  }
  const restaurantData = await getRestaurant(tableResult.restaurantId);
  if (!restaurantData) {
    return { title: 'Restaurant Not Found' };
  }
  return {
    title: `Order for Table ${tableResult.table.tableNumber} at ${restaurantData.name}`,
    description: `Scan and order directly from your table at ${restaurantData.name}.`,
  };
}

export default async function ScanOrderPage({ params }: ScanOrderPageProps) {
  const tableDocId = params.tableId;

  const tableResult = await getTableByDocIdFromGroup(tableDocId);

  if (!tableResult || !tableResult.table || !tableResult.restaurantId) {
    console.error(`ScanOrderPage: Invalid tableDocId "${tableDocId}" or missing restaurantId.`);
    notFound();
  }
  
  const { table, restaurantId: resolvedRestaurantId } = tableResult;
  // Ensure the table object passed to the client has string timestamps
  const tableInfo = stringifyTimestamps(table) as Table;


  const restaurantDataResult = await getRestaurant(resolvedRestaurantId);
  if (!restaurantDataResult) {
    console.error(`ScanOrderPage: Restaurant not found for ID "${resolvedRestaurantId}".`);
    notFound();
  }
  const restaurant: RestaurantProfile & { createdAt: string; updatedAt: string } = 
    stringifyTimestamps(restaurantDataResult) as RestaurantProfile & { createdAt: string; updatedAt: string };

  const categoriesData: MenuCategory[] = (await getMenuCategories(resolvedRestaurantId)).sort((a, b) => a.order - b.order);
  const subcategoriesData: MenuSubcategory[] = (await getMenuSubcategories(resolvedRestaurantId)).sort((a,b) => a.order - b.order); 
  const menuItemsData: MenuItem[] = (await getMenuItems(resolvedRestaurantId)).sort((a,b) => a.order - b.order);

  const categories: (MenuCategory & { createdAt: string; updatedAt: string })[] = 
    categoriesData.map(cat => stringifyTimestamps(cat) as MenuCategory & { createdAt: string; updatedAt: string });
  const menuItems: (MenuItem & { createdAt: string; updatedAt: string })[] = 
    menuItemsData.map(item => stringifyTimestamps(item) as MenuItem & { createdAt: string; updatedAt: string });
  
  const popularItems = menuItems.filter(item => item.availability).slice(0, 6);

  const offers = [
    { id: "1", title: "Table Order Special", description: "10% off your first table order!", color: "bg-gradient-to-r from-teal-500 to-cyan-600" },
    { id: "2", title: "Quick Bites Combo", description: "Starter + Drink for $5", color: "bg-gradient-to-r from-amber-400 to-yellow-500"}
  ];

  const restaurantDisplayInfo = {
    name: restaurant.name,
    logo: restaurant.settings?.customDomain ? `https://logo.clearbit.com/${restaurant.settings.customDomain}` : `https://picsum.photos/seed/${restaurant.id}logo/60/60`,
    coverImage: `https://picsum.photos/seed/${restaurant.id}cover/400/150`,
    cuisine: restaurant.type || "Delicious Food",
    rating: 4.5, // Mock or fetch
    deliveryTime: "N/A - Table Order",
    minOrder: "$0", // No min for table order usually
    isOpen: true, // Mock or fetch
  };
  
  const tableContext = {
    id: tableInfo.id, // This is the table's Firestore document ID
    number: tableInfo.tableNumber,
    docId: tableInfo.tableDocId, // The ID scanned from QR, should match tableInfo.id
  };

  return (
    <SingleRestaurantFoodAppClient
      restaurantData={restaurant}
      restaurantDisplayInfo={restaurantDisplayInfo}
      menuCategoriesData={categories}
      allMenuItemsData={menuItems}
      popularItemsData={popularItems}
      offersData={offers}
      tableContext={tableContext} 
    />
  );
}

