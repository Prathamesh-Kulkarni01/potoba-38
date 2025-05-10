
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
  limit, 
  FieldPath, // Import FieldPath
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

  if (!itemId || typeof itemId !== 'string' || itemId.trim() === '') {
    console.error("getMenuItemByIdFromGroup: Invalid itemId received:", itemId);
    return null;
  }

  const itemsGroupRef = collectionGroup(db, 'menuItems');
  
  // Use FieldPath.documentId() for querying by document ID.
  // Ensure itemId is just the ID string.
  const q = query(itemsGroupRef, where(FieldPath.documentId(), "==", itemId), limit(1));
  
  const snapshot = await getDocs(q);

  if (snapshot.empty) {
    console.log(`No menu item found with ID: ${itemId} in collection group 'menuItems'.`);
    return null;
  }
  const docSnap = snapshot.docs[0];
  const data = docSnap.data();

  // The parent path extraction logic remains, but ensure the data itself contains necessary IDs.
  // It's more reliable if restaurantId, categoryId, and subcategoryId are fields within the MenuItem document.
  if (!data.restaurantId || !data.categoryId) {
     console.error("MenuItem document is missing restaurantId or categoryId fields:", docSnap.id, data);
     return null;
  }

  return {
    menuItem: { id: docSnap.id, ...data } as MenuItem,
    restaurantId: data.restaurantId, 
    categoryId: data.categoryId,     
    subcategoryId: data.subcategoryId || null 
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
