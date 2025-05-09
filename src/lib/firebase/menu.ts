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
} from 'firebase/firestore';
import { db } from './config';
import type { MenuCategory, MenuSubcategory, MenuItem } from '@/types';

// --- MenuCategory Functions ---

export async function getMenuCategories(restaurantId: string): Promise<MenuCategory[]> {
  if (!db) throw new Error("Firestore is not initialized.");
  const categoriesCol = collection(db, 'restaurants', restaurantId, 'menuCategories');
  const q = query(categoriesCol, orderBy('order', 'asc'), orderBy('name', 'asc'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as MenuCategory));
}

export async function addMenuCategory(restaurantId: string, categoryData: Omit<MenuCategory, 'id' | 'restaurantId' | 'createdAt' | 'updatedAt'>): Promise<MenuCategory> {
  if (!db) throw new Error("Firestore is not initialized.");
  const categoriesCol = collection(db, 'restaurants', restaurantId, 'menuCategories');
  const docRef = await addDoc(categoriesCol, {
    ...categoryData,
    restaurantId,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return { id: docRef.id, restaurantId, ...categoryData, createdAt: Timestamp.now(), updatedAt: Timestamp.now() } as MenuCategory; // optimistic return
}

export async function updateMenuCategory(restaurantId: string, categoryId: string, data: Partial<Omit<MenuCategory, 'id' | 'restaurantId' | 'createdAt'>>): Promise<void> {
  if (!db) throw new Error("Firestore is not initialized.");
  const categoryRef = doc(db, 'restaurants', restaurantId, 'menuCategories', categoryId);
  await updateDoc(categoryRef, { ...data, updatedAt: serverTimestamp() });
}

export async function deleteMenuCategory(restaurantId: string, categoryId: string): Promise<void> {
  if (!db) throw new Error("Firestore is not initialized.");
  // TODO: Consider deleting subcategories and items within this category (cascade delete)
  // This requires more complex batch writes or a Cloud Function.
  // For now, simple delete.
  const categoryRef = doc(db, 'restaurants', restaurantId, 'menuCategories', categoryId);
  await deleteDoc(categoryRef);
}


// --- MenuSubcategory Functions (Placeholders) ---

export async function getMenuSubcategories(restaurantId: string, categoryId: string): Promise<MenuSubcategory[]> {
  if (!db) throw new Error("Firestore is not initialized.");
  const subcategoriesCol = collection(db, 'restaurants', restaurantId, 'menuCategories', categoryId, 'menuSubcategories');
  const q = query(subcategoriesCol, orderBy('order', 'asc'), orderBy('name', 'asc'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as MenuSubcategory));
}

export async function addMenuSubcategory(restaurantId: string, categoryId: string, subcategoryData: Omit<MenuSubcategory, 'id' | 'restaurantId' | 'categoryId' | 'createdAt' | 'updatedAt'>): Promise<MenuSubcategory> {
  if (!db) throw new Error("Firestore is not initialized.");
  const subcategoriesCol = collection(db, 'restaurants', restaurantId, 'menuCategories', categoryId, 'menuSubcategories');
  const docRef = await addDoc(subcategoriesCol, {
    ...subcategoryData,
    restaurantId,
    categoryId,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return { id: docRef.id, restaurantId, categoryId, ...subcategoryData, createdAt: Timestamp.now(), updatedAt: Timestamp.now() } as MenuSubcategory;
}

export async function updateMenuSubcategory(restaurantId: string, categoryId: string, subcategoryId: string, data: Partial<Omit<MenuSubcategory, 'id' | 'restaurantId' | 'categoryId' | 'createdAt'>>): Promise<void> {
  if (!db) throw new Error("Firestore is not initialized.");
  const subcategoryRef = doc(db, 'restaurants', restaurantId, 'menuCategories', categoryId, 'menuSubcategories', subcategoryId);
  await updateDoc(subcategoryRef, { ...data, updatedAt: serverTimestamp() });
}

export async function deleteMenuSubcategory(restaurantId: string, categoryId: string, subcategoryId: string): Promise<void> {
  if (!db) throw new Error("Firestore is not initialized.");
  // TODO: Consider deleting items within this subcategory
  const subcategoryRef = doc(db, 'restaurants', restaurantId, 'menuCategories', categoryId, 'menuSubcategories', subcategoryId);
  await deleteDoc(subcategoryRef);
}


// --- MenuItem Functions (Placeholders) ---

export async function getMenuItems(restaurantId: string, categoryId: string, subcategoryId?: string): Promise<MenuItem[]> {
  if (!db) throw new Error("Firestore is not initialized.");
  let itemsCol;
  if (subcategoryId) {
    itemsCol = collection(db, 'restaurants', restaurantId, 'menuCategories', categoryId, 'menuSubcategories', subcategoryId, 'menuItems');
  } else {
    // Items directly under a category (if subcategoryId is not provided or is null/undefined)
    // This path might need careful schema design. For now, assuming items are always under subcategories or directly under categories.
    // Let's assume for now items are primarily under subcategories or a general 'items' collection for the category.
    // A more robust way is to query all items for a restaurant and filter, or have a specific path.
    // For simplicity, let's assume if no subcategoryId, we fetch items directly under category.
    itemsCol = collection(db, 'restaurants', restaurantId, 'menuCategories', categoryId, 'menuItems');
  }
  
  const q = query(itemsCol, orderBy('order', 'asc'), orderBy('name', 'asc'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as MenuItem));
}

export async function addMenuItem(restaurantId: string, categoryId: string, subcategoryId: string | null | undefined, itemData: Omit<MenuItem, 'id' | 'restaurantId' | 'categoryId' | 'subcategoryId' | 'createdAt' | 'updatedAt'>): Promise<MenuItem> {
  if (!db) throw new Error("Firestore is not initialized.");
  
  let itemsColPath;
  if (subcategoryId) {
    itemsColPath = collection(db, 'restaurants', restaurantId, 'menuCategories', categoryId, 'menuSubcategories', subcategoryId, 'menuItems');
  } else {
    itemsColPath = collection(db, 'restaurants', restaurantId, 'menuCategories', categoryId, 'menuItems');
  }

  const docRef = await addDoc(itemsColPath, {
    ...itemData,
    restaurantId,
    categoryId,
    subcategoryId: subcategoryId || null,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return { id: docRef.id, restaurantId, categoryId, subcategoryId: subcategoryId || null, ...itemData, createdAt: Timestamp.now(), updatedAt: Timestamp.now() } as MenuItem;
}

export async function updateMenuItem(restaurantId: string, categoryId: string, subcategoryId: string | null | undefined, itemId: string, data: Partial<Omit<MenuItem, 'id' | 'restaurantId' | 'categoryId' | 'subcategoryId' | 'createdAt'>>): Promise<void> {
  if (!db) throw new Error("Firestore is not initialized.");
  
  let itemRefPath;
  if (subcategoryId) {
    itemRefPath = doc(db, 'restaurants', restaurantId, 'menuCategories', categoryId, 'menuSubcategories', subcategoryId, 'menuItems', itemId);
  } else {
    itemRefPath = doc(db, 'restaurants', restaurantId, 'menuCategories', categoryId, 'menuItems', itemId);
  }
  await updateDoc(itemRefPath, { ...data, updatedAt: serverTimestamp() });
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
