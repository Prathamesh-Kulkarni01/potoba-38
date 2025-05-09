
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
  WriteBatch,
  writeBatch,
  collectionGroup,
} from 'firebase/firestore';
import { db } from './config';
import type { MenuCategory, MenuSubcategory, MenuItem } from '@/types';

// --- MenuCategory Functions ---

export async function getMenuCategories(restaurantId: string): Promise<MenuCategory[]> {
  if (!db) throw new Error("Firestore is not initialized.");
  const categoriesCol = collection(db, 'restaurants', restaurantId, 'menuCategories');
  const q = query(categoriesCol, orderBy('order', 'asc'), orderBy('name', 'asc'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data(), createdAt: doc.data().createdAt as Timestamp, updatedAt: doc.data().updatedAt as Timestamp } as MenuCategory));
}

export async function addMenuCategory(restaurantId: string, categoryData: Omit<MenuCategory, 'id' | 'restaurantId' | 'createdAt' | 'updatedAt'>): Promise<MenuCategory> {
  if (!db) throw new Error("Firestore is not initialized.");
  const categoriesCol = collection(db, 'restaurants', restaurantId, 'menuCategories');
  const createdAt = serverTimestamp();
  const updatedAt = serverTimestamp();
  const docRef = await addDoc(categoriesCol, {
    ...categoryData,
    restaurantId,
    createdAt,
    updatedAt,
  });
  return { 
    id: docRef.id, 
    restaurantId, 
    ...categoryData, 
    createdAt: Timestamp.now(), // Optimistic return
    updatedAt: Timestamp.now()  // Optimistic return
  } as MenuCategory;
}

export async function updateMenuCategory(restaurantId: string, categoryId: string, data: Partial<Omit<MenuCategory, 'id' | 'restaurantId' | 'createdAt'>>): Promise<void> {
  if (!db) throw new Error("Firestore is not initialized.");
  const categoryRef = doc(db, 'restaurants', restaurantId, 'menuCategories', categoryId);
  await updateDoc(categoryRef, { ...data, updatedAt: serverTimestamp() });
}

export async function deleteMenuCategory(restaurantId: string, categoryId: string): Promise<void> {
  if (!db) throw new Error("Firestore is not initialized.");
  const batch = writeBatch(db);

  // Path to category
  const categoryRef = doc(db, 'restaurants', restaurantId, 'menuCategories', categoryId);

  // Get all items directly under this category (if any)
  const directItemsQuery = query(collection(db, 'restaurants', restaurantId, 'menuCategories', categoryId, 'menuItems'));
  const directItemsSnapshot = await getDocs(directItemsQuery);
  directItemsSnapshot.forEach(itemDoc => batch.delete(itemDoc.ref));
  
  // Get all subcategories under this category
  const subcategoriesQuery = query(collection(db, 'restaurants', restaurantId, 'menuCategories', categoryId, 'menuSubcategories'));
  const subcategoriesSnapshot = await getDocs(subcategoriesQuery);

  for (const subcategoryDoc of subcategoriesSnapshot.docs) {
    // Get all items under this subcategory
    const itemsQuery = query(collection(db, 'restaurants', restaurantId, 'menuCategories', categoryId, 'menuSubcategories', subcategoryDoc.id, 'menuItems'));
    const itemsSnapshot = await getDocs(itemsQuery);
    itemsSnapshot.forEach(itemDoc => batch.delete(itemDoc.ref));
    
    // Delete the subcategory itself
    batch.delete(subcategoryDoc.ref);
  }
  
  // Delete the category
  batch.delete(categoryRef);
  
  await batch.commit();
}


// --- MenuSubcategory Functions ---

export async function getMenuSubcategories(restaurantId: string, categoryId?: string): Promise<MenuSubcategory[]> {
  if (!db) throw new Error("Firestore is not initialized.");
  
  let q;
  if (categoryId) {
     const subcategoriesCol = collection(db, 'restaurants', restaurantId, 'menuCategories', categoryId, 'menuSubcategories');
     q = query(subcategoriesCol, orderBy('order', 'asc'), orderBy('name', 'asc'));
  } else {
    // Fetch all subcategories for the restaurant if categoryId is not provided
    // This requires querying a collection group
    const allSubcategoriesCol = collectionGroup(db, 'menuSubcategories');
    q = query(allSubcategoriesCol, where('restaurantId', '==', restaurantId), orderBy('order', 'asc'), orderBy('name', 'asc'));
  }
  
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data(), createdAt: doc.data().createdAt as Timestamp, updatedAt: doc.data().updatedAt as Timestamp } as MenuSubcategory));
}

export async function addMenuSubcategory(restaurantId: string, categoryId: string, subcategoryData: Omit<MenuSubcategory, 'id' | 'restaurantId' | 'categoryId' | 'createdAt' | 'updatedAt'>): Promise<MenuSubcategory> {
  if (!db) throw new Error("Firestore is not initialized.");
  const subcategoriesCol = collection(db, 'restaurants', restaurantId, 'menuCategories', categoryId, 'menuSubcategories');
  const createdAt = serverTimestamp();
  const updatedAt = serverTimestamp();
  const docRef = await addDoc(subcategoriesCol, {
    ...subcategoryData,
    restaurantId,
    categoryId,
    createdAt,
    updatedAt,
  });
  return { 
    id: docRef.id, 
    restaurantId, 
    categoryId, 
    ...subcategoryData, 
    createdAt: Timestamp.now(), // Optimistic
    updatedAt: Timestamp.now() // Optimistic
  } as MenuSubcategory;
}

export async function updateMenuSubcategory(restaurantId: string, categoryId: string, subcategoryId: string, data: Partial<Omit<MenuSubcategory, 'id' | 'restaurantId' | 'categoryId' | 'createdAt'>>): Promise<void> {
  if (!db) throw new Error("Firestore is not initialized.");
  const subcategoryRef = doc(db, 'restaurants', restaurantId, 'menuCategories', categoryId, 'menuSubcategories', subcategoryId);
  await updateDoc(subcategoryRef, { ...data, updatedAt: serverTimestamp() });
}

export async function deleteMenuSubcategory(restaurantId: string, categoryId: string, subcategoryId: string): Promise<void> {
  if (!db) throw new Error("Firestore is not initialized.");
  const batch = writeBatch(db);
  
  // Path to subcategory
  const subcategoryRef = doc(db, 'restaurants', restaurantId, 'menuCategories', categoryId, 'menuSubcategories', subcategoryId);
  
  // Get all items under this subcategory
  const itemsQuery = query(collection(db, 'restaurants', restaurantId, 'menuCategories', categoryId, 'menuSubcategories', subcategoryId, 'menuItems'));
  const itemsSnapshot = await getDocs(itemsQuery);
  itemsSnapshot.forEach(itemDoc => batch.delete(itemDoc.ref));
  
  // Delete the subcategory itself
  batch.delete(subcategoryRef);
  
  await batch.commit();
}


// --- MenuItem Functions ---
export async function getMenuItems(restaurantId: string): Promise<MenuItem[]> {
  if (!db) throw new Error("Firestore is not initialized.");
  
  const itemsColGroup = collectionGroup(db, 'menuItems');
  const q = query(itemsColGroup, where('restaurantId', '==', restaurantId), orderBy('order', 'asc'), orderBy('name', 'asc'));
  
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ 
      id: doc.id, 
      ...doc.data(), 
      createdAt: doc.data().createdAt as Timestamp, 
      updatedAt: doc.data().updatedAt as Timestamp 
    } as MenuItem)
  );
}


export async function addMenuItem(restaurantId: string, categoryId: string, subcategoryId: string | null | undefined, itemData: Omit<MenuItem, 'id' | 'restaurantId' | 'categoryId' | 'subcategoryId' | 'createdAt' | 'updatedAt'>): Promise<MenuItem> {
  if (!db) throw new Error("Firestore is not initialized.");
  
  let itemsColPath;
  if (subcategoryId) {
    itemsColPath = collection(db, 'restaurants', restaurantId, 'menuCategories', categoryId, 'menuSubcategories', subcategoryId, 'menuItems');
  } else {
    itemsColPath = collection(db, 'restaurants', restaurantId, 'menuCategories', categoryId, 'menuItems');
  }
  const createdAt = serverTimestamp();
  const updatedAt = serverTimestamp();

  const dataToSave: any = {
    ...itemData,
    restaurantId,
    categoryId,
    subcategoryId: subcategoryId || null,
    createdAt,
    updatedAt,
  };

  // Ensure optional fields are not set if they are undefined
  if (itemData.calories === undefined) delete dataToSave.calories;
  if (itemData.crossSellItems === undefined) delete dataToSave.crossSellItems;
  if (itemData.upsellItems === undefined) delete dataToSave.upsellItems;
  if (itemData.dietaryTags === undefined) delete dataToSave.dietaryTags;
  if (itemData.allergenInfo === undefined) delete dataToSave.allergenInfo;


  const docRef = await addDoc(itemsColPath, dataToSave);
  return { 
    id: docRef.id, 
    restaurantId, 
    categoryId, 
    subcategoryId: subcategoryId || null, 
    ...itemData, 
    createdAt: Timestamp.now(), // Optimistic
    updatedAt: Timestamp.now() // Optimistic
  } as MenuItem;
}

export async function updateMenuItem(restaurantId: string, categoryId: string, subcategoryId: string | null | undefined, itemId: string, data: Partial<Omit<MenuItem, 'id' | 'restaurantId' | 'categoryId' | 'subcategoryId' | 'createdAt'>>): Promise<void> {
  if (!db) throw new Error("Firestore is not initialized.");
  
  let itemRefPath;
  if (subcategoryId) {
    itemRefPath = doc(db, 'restaurants', restaurantId, 'menuCategories', categoryId, 'menuSubcategories', subcategoryId, 'menuItems', itemId);
  } else {
    itemRefPath = doc(db, 'restaurants', restaurantId, 'menuCategories', categoryId, 'menuItems', itemId);
  }
  
  const dataToUpdate: any = { ...data, updatedAt: serverTimestamp() };

  // Ensure optional fields are handled correctly for updates (e.g., explicitly set to null or remove if undefined)
  // For firestore, if a field is undefined in `data`, it won't be updated. 
  // If you want to remove a field, you'd typically use `deleteField()` or set it to null if appropriate.
  // The current structure assumes `Partial` means only provided fields are updated.

  await updateDoc(itemRefPath, dataToUpdate);
}

export async function deleteMenuItem(restaurantId: string, categoryId: string, subcategoryId: string | null | undefined, itemId: string): Promise<void> {
  if (!db) throw new Error("Firestore is not initialized.");
   let itemRefPath;
  if (subcategoryId) {
    itemRefPath = doc(db, 'restaurants', restaurantId, 'menuCategories', categoryId, 'menuSubcategories', subcategoryId, 'menuItems', itemId);
  } else {
    itemRefPath = doc(db, 'restaurants', restaurantId, 'menuCategories', categoryId, 'menuItems', itemId);
  }
  await deleteDoc(itemRefPath);
}

