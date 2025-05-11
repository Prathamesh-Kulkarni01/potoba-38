// src/lib/firebase/menu.ts
'use server';
import {
  collection,
  addDoc,
  doc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
  Timestamp,
  writeBatch,
  collectionGroup, 
  limit,
  FieldPath, 
} from 'firebase/firestore';
import { db } from './config';
import type { MenuCategory, MenuSubcategory, MenuItem, MenuItemFormValues } from '@/types';
import { convertFirebaseTimestampToString } from './utils';

// Helper to convert Firestore Timestamps in an object to ISO strings
const convertTimestamps = <T extends Record<string, any>>(data: T): T => {
  const convertedData = { ...data };
  for (const key in convertedData) {
    if (convertedData[key] instanceof Timestamp) {
      convertedData[key] = convertFirebaseTimestampToString(convertedData[key]);
    } else if (typeof convertedData[key] === 'object' && convertedData[key] !== null) {
      // Handle nested Timestamps in objects (like variants or schedule)
      if (Array.isArray(convertedData[key])) {
         convertedData[key] = convertedData[key].map((item: any) => typeof item === 'object' ? convertTimestamps(item) : item);
      } else {
        convertedData[key] = convertTimestamps(convertedData[key]);
      }
    }
  }
  return convertedData;
};


// Menu Category Functions
export async function addMenuCategory(restaurantId: string, categoryData: Omit<MenuCategory, 'id' | 'restaurantId' | 'createdAt' | 'updatedAt'>): Promise<MenuCategory> {
  if (!db) throw new Error("Firestore is not initialized.");
  const categoriesCol = collection(db, `restaurants/${restaurantId}/categories`);
  const now = serverTimestamp();
  const docRef = await addDoc(categoriesCol, { ...categoryData, restaurantId, createdAt: now, updatedAt: now });
  return { id: docRef.id, restaurantId, ...categoryData, createdAt: Timestamp.now(), updatedAt: Timestamp.now() };
}

export async function getMenuCategories(restaurantId: string): Promise<MenuCategory[]> {
  if (!db) throw new Error("Firestore is not initialized.");
  const categoriesCol = collection(db, `restaurants/${restaurantId}/categories`);
  const q = query(categoriesCol, orderBy('order', 'asc'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(docSnap => convertTimestamps({ id: docSnap.id, ...docSnap.data() } as MenuCategory));
}

export async function updateMenuCategory(restaurantId: string, categoryId: string, data: Partial<Omit<MenuCategory, 'id' | 'restaurantId' | 'createdAt'>>): Promise<void> {
  if (!db) throw new Error("Firestore is not initialized.");
  const categoryRef = doc(db, `restaurants/${restaurantId}/categories`, categoryId);
  await updateDoc(categoryRef, { ...data, updatedAt: serverTimestamp() });
}

export async function deleteMenuCategory(restaurantId: string, categoryId: string): Promise<void> {
  if (!db) throw new Error("Firestore is not initialized.");
  const batch = writeBatch(db);
  const categoryRef = doc(db, `restaurants/${restaurantId}/categories`, categoryId);
  batch.delete(categoryRef);

  // Delete associated subcategories and their items
  const subcategoriesCol = collection(db, `restaurants/${restaurantId}/categories/${categoryId}/subcategories`);
  const subcategoriesSnapshot = await getDocs(subcategoriesCol);
  for (const subDoc of subcategoriesSnapshot.docs) {
    batch.delete(subDoc.ref);
    // Delete items within this subcategory
    const itemsInSubCol = collection(db, `restaurants/${restaurantId}/categories/${categoryId}/subcategories/${subDoc.id}/items`);
    const itemsInSubSnapshot = await getDocs(itemsInSubCol);
    itemsInSubSnapshot.forEach(itemDoc => batch.delete(itemDoc.ref));
  }
  // Delete items directly under this category
  const itemsCol = collection(db, `restaurants/${restaurantId}/categories/${categoryId}/items`);
  const itemsSnapshot = await getDocs(itemsCol);
  itemsSnapshot.forEach(itemDoc => batch.delete(itemDoc.ref));
  
  await batch.commit();
}


// Menu Subcategory Functions
export async function addMenuSubcategory(restaurantId: string, categoryId: string, subcategoryData: Omit<MenuSubcategory, 'id' | 'restaurantId' | 'categoryId' | 'createdAt' | 'updatedAt'>): Promise<MenuSubcategory> {
  if (!db) throw new Error("Firestore is not initialized.");
  const subcategoriesCol = collection(db, `restaurants/${restaurantId}/categories/${categoryId}/subcategories`);
  const now = serverTimestamp();
  const docRef = await addDoc(subcategoriesCol, { ...subcategoryData, restaurantId, categoryId, createdAt: now, updatedAt: now });
  return { id: docRef.id, restaurantId, categoryId, ...subcategoryData, createdAt: Timestamp.now(), updatedAt: Timestamp.now() };
}

export async function getMenuSubcategories(restaurantId: string): Promise<MenuSubcategory[]> {
  if (!db) throw new Error("Firestore is not initialized.");
  // This queries all subcategories across all categories for a restaurant using a collection group query
  const subcategoriesGroupRef = collectionGroup(db, 'subcategories');
  const q = query(subcategoriesGroupRef, where('restaurantId', '==', restaurantId), orderBy('order', 'asc'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(docSnap => convertTimestamps({ id: docSnap.id, ...docSnap.data() } as MenuSubcategory));
}


export async function updateMenuSubcategory(restaurantId: string, categoryId: string, subcategoryId: string, data: Partial<Omit<MenuSubcategory, 'id' | 'restaurantId' | 'categoryId' | 'createdAt'>>): Promise<void> {
  if (!db) throw new Error("Firestore is not initialized.");
  const subcategoryRef = doc(db, `restaurants/${restaurantId}/categories/${categoryId}/subcategories`, subcategoryId);
  await updateDoc(subcategoryRef, { ...data, updatedAt: serverTimestamp() });
}

export async function deleteMenuSubcategory(restaurantId: string, categoryId: string, subcategoryId: string): Promise<void> {
  if (!db) throw new Error("Firestore is not initialized.");
  const batch = writeBatch(db);
  const subcategoryRef = doc(db, `restaurants/${restaurantId}/categories/${categoryId}/subcategories`, subcategoryId);
  batch.delete(subcategoryRef);
  // Delete items within this subcategory
  const itemsCol = collection(db, `restaurants/${restaurantId}/categories/${categoryId}/subcategories/${subcategoryId}/items`);
  const itemsSnapshot = await getDocs(itemsCol);
  itemsSnapshot.forEach(itemDoc => batch.delete(itemDoc.ref));
  await batch.commit();
}


// Menu Item Functions
function getItemsCollectionPath(restaurantId: string, categoryId: string, subcategoryId?: string | null): string {
  if (subcategoryId) {
    return `restaurants/${restaurantId}/categories/${categoryId}/subcategories/${subcategoryId}/items`;
  }
  return `restaurants/${restaurantId}/categories/${categoryId}/items`;
}

export async function addMenuItem(
  restaurantId: string, 
  categoryId: string, 
  subcategoryId: string | null | undefined, 
  itemData: MenuItemFormValues
): Promise<MenuItem> {
  if (!db) throw new Error("Firestore is not initialized.");
  const itemsColPath = getItemsCollectionPath(restaurantId, categoryId, subcategoryId);
  const itemsCol = collection(db, itemsColPath);
  const now = serverTimestamp();
  
  const docRef = await addDoc(itemsCol, { 
    ...itemData, 
    restaurantId, 
    categoryId, 
    subcategoryId: subcategoryId || null,
    itemIdString: '', // Placeholder, will be updated below
    createdAt: now, 
    updatedAt: now 
  });

  // Update the document with its own ID in itemIdString
  await updateDoc(docRef, { itemIdString: docRef.id });

  return { 
    id: docRef.id, 
    itemIdString: docRef.id,
    restaurantId, 
    categoryId, 
    subcategoryId: subcategoryId || null,
    ...itemData, 
    createdAt: Timestamp.now(), 
    updatedAt: Timestamp.now() 
  } as MenuItem; // Cast because form values match a subset of MenuItem
}

export async function getMenuItems(restaurantId: string): Promise<MenuItem[]> {
  if (!db) throw new Error("Firestore is not initialized.");
  const itemsGroupRef = collectionGroup(db, 'items');
  const q = query(itemsGroupRef, where('restaurantId', '==', restaurantId), orderBy('order', 'asc'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(docSnap => convertTimestamps({ id: docSnap.id, ...docSnap.data() } as MenuItem));
}


export async function getMenuItemByIdFromGroup(itemIdValue: string): Promise<{ menuItem: MenuItem; restaurantId: string; } | null> {
  if (!db) throw new Error("Firestore is not initialized.");
  if (!itemIdValue || typeof itemIdValue !== 'string' || itemIdValue.trim() === '') {
    console.error("[getMenuItemByIdFromGroup] Invalid or empty itemIdValue provided:", itemIdValue);
    return null;
  }
  console.log(`[getMenuItemByIdFromGroup] Querying 'menuItems' collection group for itemIdString: "${itemIdValue}"`);

  const itemsGroupRef = collectionGroup(db, 'items'); 
  // Ensure the query is against the correct field that stores the item's ID.
  // Assuming 'itemIdString' is the field that stores the document ID.
  const q = query(itemsGroupRef, where("itemIdString", "==", itemIdValue), limit(1));

  try {
    const snapshot = await getDocs(q);
    if (!snapshot.empty) {
      const docSnap = snapshot.docs[0];
      const data = docSnap.data();
      if (!data.restaurantId) {
        console.error(`[getMenuItemByIdFromGroup] Item found (ID: ${docSnap.id}) but is missing restaurantId field.`);
        return null;
      }
      const menuItem = convertTimestamps({ id: docSnap.id, ...data } as MenuItem);
      console.log(`[getMenuItemByIdFromGroup] Found menu item: ${menuItem.name} for restaurant ${data.restaurantId}`);
      return { menuItem, restaurantId: data.restaurantId as string };
    } else {
      console.warn(`[getMenuItemByIdFromGroup] No menu item found with itemIdString: "${itemIdValue}". Ensure Firestore index on 'items' collection group (field 'itemIdString' ASC) exists and item data is consistent (itemIdString field matches document ID).`);
      return null;
    }
  } catch (error) {
    console.error(`[getMenuItemByIdFromGroup] Error querying for item ID "${itemIdValue}":`, error);
    return null;
  }
}

export async function updateMenuItem(
  restaurantId: string, 
  categoryId: string, 
  subcategoryId: string | null | undefined, 
  itemId: string, 
  data: Partial<MenuItemFormValues>
): Promise<void> {
  if (!db) throw new Error("Firestore is not initialized.");
  const itemPath = getItemsCollectionPath(restaurantId, categoryId, subcategoryId);
  const itemRef = doc(db, itemPath, itemId);
  await updateDoc(itemRef, { ...data, updatedAt: serverTimestamp() });
}

export async function deleteMenuItem(
  restaurantId: string, 
  categoryId: string, 
  subcategoryId: string | null | undefined, 
  itemId: string
): Promise<void> {
  if (!db) throw new Error("Firestore is not initialized.");
  const itemPath = getItemsCollectionPath(restaurantId, categoryId, subcategoryId);
  const itemRef = doc(db, itemPath, itemId);
  await deleteDoc(itemRef);
}
