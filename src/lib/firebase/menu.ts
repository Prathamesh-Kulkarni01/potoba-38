

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
  limit, // Added limit
} from 'firebase/firestore';
import { db } from './config';
import type { MenuCategory, MenuSubcategory, MenuItem, MenuItemVariant, AvailabilityRule } from '@/types';

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

  const categoryRef = doc(db, 'restaurants', restaurantId, 'menuCategories', categoryId);

  const directItemsQuery = query(collection(db, 'restaurants', restaurantId, 'menuCategories', categoryId, 'menuItems'));
  const directItemsSnapshot = await getDocs(directItemsQuery);
  directItemsSnapshot.forEach(itemDoc => batch.delete(itemDoc.ref));
  
  const subcategoriesQuery = query(collection(db, 'restaurants', restaurantId, 'menuCategories', categoryId, 'menuSubcategories'));
  const subcategoriesSnapshot = await getDocs(subcategoriesQuery);

  for (const subcategoryDoc of subcategoriesSnapshot.docs) {
    const itemsQuery = query(collection(db, 'restaurants', restaurantId, 'menuCategories', categoryId, 'menuSubcategories', subcategoryDoc.id, 'menuItems'));
    const itemsSnapshot = await getDocs(itemsQuery);
    itemsSnapshot.forEach(itemDoc => batch.delete(itemDoc.ref));
    batch.delete(subcategoryDoc.ref);
  }
  
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
    const allSubcategoriesCol = collectionGroup(db, 'menuSubcategories');
    q = query(allSubcategoriesCol, where('restaurantId', '==', restaurantId), orderBy('categoryId'), orderBy('order', 'asc'), orderBy('name', 'asc'));
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
    createdAt: Timestamp.now(), 
    updatedAt: Timestamp.now()
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
  
  const subcategoryRef = doc(db, 'restaurants', restaurantId, 'menuCategories', categoryId, 'menuSubcategories', subcategoryId);
  
  const itemsQuery = query(collection(db, 'restaurants', restaurantId, 'menuCategories', categoryId, 'menuSubcategories', subcategoryId, 'menuItems'));
  const itemsSnapshot = await getDocs(itemsQuery);
  itemsSnapshot.forEach(itemDoc => batch.delete(itemDoc.ref));
  
  batch.delete(subcategoryRef);
  await batch.commit();
}


// --- MenuItem Functions ---
export async function getMenuItems(restaurantId: string): Promise<MenuItem[]> {
  if (!db) throw new Error("Firestore is not initialized.");
  
  const itemsColGroup = collectionGroup(db, 'menuItems');
  // Note: collectionGroup queries require specific indexes on fields like restaurantId.
  // For ordering, ensure composite indexes exist if combining where with multiple orderBy.
  // Example: (restaurantId asc, order asc, name asc)
  const q = query(itemsColGroup, where('restaurantId', '==', restaurantId), orderBy('categoryId'), orderBy('subcategoryId'), orderBy('order', 'asc'), orderBy('name', 'asc'));
  
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ 
      id: doc.id, 
      ...doc.data(), 
      createdAt: doc.data().createdAt as Timestamp, 
      updatedAt: doc.data().updatedAt as Timestamp 
    } as MenuItem)
  );
}

export async function getMenuItemByIdFromGroup(itemId: string): Promise<{ menuItem: MenuItem, restaurantId: string, categoryId: string, subcategoryId: string | null } | null> {
  if (!db) throw new Error("Firestore is not initialized.");
  const itemsGroupRef = collectionGroup(db, 'menuItems');
  // Firestore collection group queries cannot directly query by document ID if it's not a field.
  // A common practice is to store the document ID also as a field (e.g., `itemId` or `docId`) if you need to query it across groups.
  // However, if `itemId` is the actual document ID, and it's unique across *all* `menuItems` subcollections,
  // then a more complex approach or a direct path (if known) would be needed.
  // For this scenario, assuming `itemId` refers to a unique field *within* the menuItem documents or we can find it.
  // A simpler approach for a specific item *if its path is known or can be derived* is better.
  // This function assumes `itemId` is the document ID and we're trying to find it across any restaurant/category/subcategory.
  // This is generally INEFFICIENT if not indexed properly. A better solution is to fetch item if restaurantId/categoryId are known.

  // This function is a simplified example and might require specific Firestore indexes to work efficiently (e.g., on a field named 'itemIdField' if 'itemId' is not the doc ID).
  // If `itemId` IS the document ID and it is unique across all restaurants, you'd typically know more context (like restaurantId at least).

  // Let's assume for this example that itemId is the document ID and we're trying to locate it.
  // This approach is NOT ideal for performance without knowing the full path.
  // A more robust solution would involve querying a field that stores the item's unique ID if `itemId` is not the doc ID, or constructing the path if parts are known.

  // For the purpose of this example, we'll assume you have an `itemId` field in your documents.
  // If `itemId` parameter *is* the document ID, then getting its parent path is tricky with collectionGroup.
  // **This function needs to be re-evaluated based on how `itemId` is used and if it's a doc ID or a field.**
  // **Assuming `itemId` is the document ID and we are looking for it in any `menuItems` subcollection.**
  // **The best way to get a document by ID is by its full path, not a collectionGroup query by ID.**

  // Correct approach if itemId is document ID AND you know the full path parts (e.g. from URL params)
  // If only itemId is known and it could be anywhere, that's a very broad query.

  // Given the use case (public item page /site/[restaurantId]/item/[itemId]),
  // we expect `itemId` to be the document ID of a menu item.
  // We also have `restaurantId`. We'd still need categoryId and possibly subcategoryId.
  // A more direct way: Fetch ALL items for the restaurant and then filter by ID client-side (if # items is small)
  // OR: Re-think. If we are on /site/restaurantX/item/itemY, `itemY` IS the doc ID.
  // We need its full path. `getDoc(doc(db, "restaurants/../menuItems", itemId))`
  // The problem is the middle part of the path.

  // A collectionGroup query where `__name__` (document ID) equals `itemId` is possible but requires an index.
  const q = query(itemsGroupRef, where( "__name__", "==", itemId), limit(1));
  const snapshot = await getDocs(q);

  if (snapshot.empty) {
    return null;
  }
  const docSnap = snapshot.docs[0];
  const data = docSnap.data();

  // Extract parent path segments (this is a bit of a hack and assumes structure)
  // Path: restaurants/{restaurantId}/menuCategories/{categoryId}/[menuSubcategories/{subcategoryId}/]menuItems/{itemId}
  const pathSegments = docSnap.ref.path.split('/');
  // Example: ["restaurants", "res123", "menuCategories", "cat456", "menuItems", "item789"]
  // Or:      ["restaurants", "res123", "menuCategories", "cat456", "menuSubcategories", "sub789", "menuItems", "itemXYZ"]

  let restaurantId: string | undefined;
  let categoryId: string | undefined;
  let subcategoryId: string | null = null;

  if (pathSegments[0] === 'restaurants' && pathSegments[1]) {
    restaurantId = pathSegments[1];
  }
  if (pathSegments[2] === 'menuCategories' && pathSegments[3]) {
    categoryId = pathSegments[3];
  }
  if (pathSegments.length === 8 && pathSegments[4] === 'menuSubcategories' && pathSegments[5]) {
     subcategoryId = pathSegments[5];
  }


  if (!restaurantId || !categoryId) {
    console.error("Could not determine full path for menu item:", docSnap.ref.path);
    return null;
  }


  return {
    menuItem: { id: docSnap.id, ...data } as MenuItem,
    restaurantId: data.restaurantId, // This field MUST exist in your MenuItem document
    categoryId: data.categoryId,     // This field MUST exist
    subcategoryId: data.subcategoryId || null // This field MUST exist (or be null)
  };
}


export async function addMenuItem(
  restaurantId: string, 
  categoryId: string, 
  subcategoryId: string | null | undefined, 
  itemData: Omit<MenuItem, 'id' | 'restaurantId' | 'categoryId' | 'subcategoryId' | 'createdAt' | 'updatedAt'>
): Promise<MenuItem> {
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

  // Handle optional fields to avoid storing empty values if not intended
  if (itemData.calories === undefined || itemData.calories === null) delete dataToSave.calories; else dataToSave.calories = Number(itemData.calories);
  if (!itemData.crossSellItems || itemData.crossSellItems.length === 0) delete dataToSave.crossSellItems;
  if (!itemData.upsellItems || itemData.upsellItems.length === 0) delete dataToSave.upsellItems;
  if (!itemData.dietaryTags || itemData.dietaryTags.length === 0) delete dataToSave.dietaryTags;
  if (!itemData.allergenInfo || itemData.allergenInfo.length === 0) delete dataToSave.allergenInfo;
  
  if (itemData.imageUrl === '' || itemData.imageUrl === undefined) dataToSave.imageUrl = null;
  if (itemData.videoUrl === '' || itemData.videoUrl === undefined) dataToSave.videoUrl = null;

  if (!itemData.variants || itemData.variants.length === 0) delete dataToSave.variants;
  if (!itemData.availabilitySchedule || itemData.availabilitySchedule.length === 0) delete dataToSave.availabilitySchedule;

  const docRef = await addDoc(itemsColPath, dataToSave);
  return { 
    id: docRef.id, 
    restaurantId, 
    categoryId, 
    subcategoryId: subcategoryId || null, 
    ...itemData, 
    createdAt: Timestamp.now(), 
    updatedAt: Timestamp.now()
  } as MenuItem;
}

export async function updateMenuItem(
  restaurantId: string, 
  categoryId: string, 
  subcategoryId: string | null | undefined, 
  itemId: string, 
  data: Partial<Omit<MenuItem, 'id' | 'restaurantId' | 'categoryId' | 'subcategoryId' | 'createdAt'>>
): Promise<void> {
  if (!db) throw new Error("Firestore is not initialized.");
  
  let itemRefPath;
  if (subcategoryId) {
    itemRefPath = doc(db, 'restaurants', restaurantId, 'menuCategories', categoryId, 'menuSubcategories', subcategoryId, 'menuItems', itemId);
  } else {
    itemRefPath = doc(db, 'restaurants', restaurantId, 'menuCategories', categoryId, 'menuItems', itemId);
  }
  
  const cleanedData: { [key: string]: any } = { ...data };

  Object.keys(cleanedData).forEach(key => {
    if (cleanedData[key] === undefined) {
      delete cleanedData[key];
    }
    if (key === 'imageUrl' && (cleanedData[key] === '' || cleanedData[key] === undefined)) {
      cleanedData[key] = null;
    }
    if (key === 'videoUrl' && (cleanedData[key] === '' || cleanedData[key] === undefined)) {
      cleanedData[key] = null;
    }
    if (key === 'calories' && (cleanedData[key] === null || cleanedData[key] === undefined || isNaN(cleanedData[key]))) {
       delete cleanedData[key]; // Remove if null, undefined, or NaN
    } else if (key === 'calories') {
       cleanedData[key] = Number(cleanedData[key]);
    }
    if ((key === 'variants' || key === 'availabilitySchedule' || key === 'dietaryTags' || key === 'allergenInfo' || key === 'crossSellItems' || key === 'upsellItems') && (!cleanedData[key] || (Array.isArray(cleanedData[key]) && cleanedData[key].length === 0))) {
      delete cleanedData[key]; // Remove if empty array or falsy
    }
  });
  
  const dataToUpdate = { ...cleanedData, updatedAt: serverTimestamp() };

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

