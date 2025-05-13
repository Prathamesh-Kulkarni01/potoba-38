
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
  setDoc, 
  documentId, // Keep for potential direct doc ID queries if needed elsewhere
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

export async function getMenuItemByIdFromGroup(itemIdValue: string): Promise<{ menuItem: MenuItem, restaurantId: string, categoryId: string, subcategoryId: string | null } | null> {
  if (!db) throw new Error("Firestore is not initialized.");
  if (!itemIdValue || typeof itemIdValue !== 'string' || itemIdValue.trim() === '') {
    console.error("[getMenuItemByIdFromGroup] Invalid itemIdValue received:", itemIdValue);
    return null;
  }
  console.log(`[getMenuItemByIdFromGroup] Querying 'menuItems' collection group for itemIdString: "${itemIdValue}"`);
  const itemsGroupRef = collectionGroup(db, 'menuItems');
  // Query for a document where the 'itemIdString' field matches the provided itemIdValue
  const q = query(itemsGroupRef, where("itemIdString", "==", itemIdValue), limit(1));
  
  const snapshot = await getDocs(q);

  if (snapshot.empty) {
    console.log(`[getMenuItemByIdFromGroup] No menu item found with itemIdString: "${itemIdValue}". Ensure Firestore index on 'menuItems' collection group (field 'itemIdString' ASC) exists and item data is consistent (itemIdString field matches document ID).`);
    return null;
  }
  
  const docSnap = snapshot.docs[0];
  const data = docSnap.data();

   if (!data.restaurantId || !data.categoryId) {
     console.error("[getMenuItemByIdFromGroup] MenuItem document is missing restaurantId or categoryId fields:", docSnap.id, data);
     return null;
   }
  
  return {
    menuItem: { id: docSnap.id, ...data, createdAt: data.createdAt as Timestamp, updatedAt: data.updatedAt as Timestamp } as MenuItem,
    restaurantId: data.restaurantId, 
    categoryId: data.categoryId,     
    subcategoryId: data.subcategoryId || null 
  };
}


export async function addMenuItem(
  restaurantId: string, 
  categoryId: string, 
  subcategoryId: string | null | undefined, 
  itemData: Omit<MenuItem, 'id' | 'restaurantId' | 'categoryId' | 'subcategoryId' | 'createdAt' | 'updatedAt' | 'itemIdString'>
): Promise<MenuItem> {
  if (!db) throw new Error("Firestore is not initialized.");
  
  let itemsColRef;
  if (subcategoryId) {
    itemsColRef = collection(db, 'restaurants', restaurantId, 'menuCategories', categoryId, 'menuSubcategories', subcategoryId, 'menuItems');
  } else {
    itemsColRef = collection(db, 'restaurants', restaurantId, 'menuCategories', categoryId, 'menuItems');
  }
  
  const newMenuItemDocRef = doc(itemsColRef); 
  const itemIdString = newMenuItemDocRef.id; 

  const createdAt = serverTimestamp();
  const updatedAt = serverTimestamp();

  const dataToSave: any = {
    ...itemData,
    itemIdString, 
    restaurantId,
    categoryId,
    subcategoryId: subcategoryId || null,
    createdAt,
    updatedAt,
  };

  if (itemData.calories === undefined || itemData.calories === null) delete dataToSave.calories; else dataToSave.calories = Number(itemData.calories);
  if (!itemData.crossSellItems || itemData.crossSellItems.length === 0) delete dataToSave.crossSellItems;
  if (!itemData.upsellItems || itemData.upsellItems.length === 0) delete dataToSave.upsellItems;
  if (!itemData.dietaryTags || itemData.dietaryTags.length === 0) delete dataToSave.dietaryTags;
  if (!itemData.allergenInfo || itemData.allergenInfo.length === 0) delete dataToSave.allergenInfo;
  
  if (itemData.imageUrl === '' || itemData.imageUrl === undefined) dataToSave.imageUrl = null;
  if (itemData.videoUrl === '' || itemData.videoUrl === undefined) dataToSave.videoUrl = null;

  if (!itemData.variants || itemData.variants.length === 0) delete dataToSave.variants;
  if (!itemData.availabilitySchedule || itemData.availabilitySchedule.length === 0) delete dataToSave.availabilitySchedule;

  await setDoc(newMenuItemDocRef, dataToSave); 

  return { 
    id: itemIdString, 
    itemIdString, 
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
  data: Partial<Omit<MenuItem, 'id' | 'restaurantId' | 'categoryId' | 'subcategoryId' | 'createdAt' | 'itemIdString'>>
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
       delete cleanedData[key]; 
    } else if (key === 'calories') {
       cleanedData[key] = Number(cleanedData[key]); 
    }
    
    if ((key === 'variants' || key === 'availabilitySchedule' || key === 'dietaryTags' || key === 'allergenInfo' || key === 'crossSellItems' || key === 'upsellItems') && (!cleanedData[key] || (Array.isArray(cleanedData[key]) && cleanedData[key].length === 0))) {
       cleanedData[key] = null; // Store null for empty arrays to remove them if desired
    }
  });
  
  const dataToUpdate = { ...cleanedData, updatedAt: serverTimestamp() };
  if (dataToUpdate.hasOwnProperty('itemIdString')) {
    delete dataToUpdate.itemIdString;
  }

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

// Batch add menu items (e.g., for import)
export async function batchAddMenuItems(restaurantId: string, itemsToImport: Array<{
  categoryName: string;
  itemName: string;
  itemPrice?: string;
  itemDescription?: string;
}>): Promise<number> {
  if (!db) throw new Error("Firestore is not initialized.");
  const batch = writeBatch(db);
  let importedCount = 0;

  const categoriesCache: Record<string, string> = {}; // Cache categoryName to categoryId

  for (const importItem of itemsToImport) {
    let categoryId = categoriesCache[importItem.categoryName];
    if (!categoryId) {
      // Simple check for existing category by name, or create new
      const categoriesCol = collection(db, `restaurants/${restaurantId}/menuCategories`);
      const q = query(categoriesCol, where("name", "==", importItem.categoryName), limit(1));
      const catSnapshot = await getDocs(q);
      if (!catSnapshot.empty) {
        categoryId = catSnapshot.docs[0].id;
      } else {
        const newCategoryData = { name: importItem.categoryName, order: 0, restaurantId, createdAt: serverTimestamp(), updatedAt: serverTimestamp() };
        const newCategoryRef = doc(collection(db, `restaurants/${restaurantId}/menuCategories`));
        batch.set(newCategoryRef, newCategoryData);
        categoryId = newCategoryRef.id;
      }
      categoriesCache[importItem.categoryName] = categoryId;
    }

    let price = 0;
    if (importItem.itemPrice) {
      const parsedPrice = parseFloat(importItem.itemPrice.replace(/[^0-9.-]+/g, ""));
      if (!isNaN(parsedPrice)) price = parsedPrice;
    }

    const itemsColRef = collection(db, `restaurants/${restaurantId}/menuCategories/${categoryId}/menuItems`);
    const newItemDocRef = doc(itemsColRef);
    const itemIdString = newItemDocRef.id;

    const menuItemData = {
      itemIdString,
      restaurantId,
      categoryId,
      name: importItem.itemName,
      description: importItem.itemDescription || '',
      price,
      availability: true,
      order: 0,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };
    batch.set(newItemDocRef, menuItemData);
    importedCount++;
  }

  await batch.commit();
  return importedCount;
}
