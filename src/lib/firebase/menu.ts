
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
  documentId,
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
    // Ensure restaurantId is part of the subcategory document for this to work efficiently.
    // If not, this query might be slow or require a composite index on (restaurantId, order, name) for 'menuSubcategories' collection group.
    // Assuming subcategory documents contain restaurantId:
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
    restaurantId, // Store restaurantId for collection group queries
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
  // Ensure restaurantId is part of the menuItem document for this to work efficiently.
  // This query requires a composite index: (restaurantId, categoryId, subcategoryId, order, name) on the 'menuItems' collection group.
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

// Function to get a single menu item by its ID using collectionGroup query
// This function assumes that `itemIdValue` is the actual document ID of the menu item.
// And that each menu item document contains `restaurantId`, `categoryId`, and optionally `subcategoryId`.
export async function getMenuItemByIdFromGroup(itemIdValue: string): Promise<{ menuItem: MenuItem, restaurantId: string, categoryId: string, subcategoryId: string | null } | null> {
  if (!db) throw new Error("Firestore is not initialized.");

  if (!itemIdValue || typeof itemIdValue !== 'string' || itemIdValue.trim() === '') {
    console.error("getMenuItemByIdFromGroup: Invalid itemIdValue received:", itemIdValue);
    return null;
  }

  const itemsGroupRef = collectionGroup(db, 'menuItems');
  // Query for a document with a specific ID within the 'menuItems' collection group.
  // Using where(documentId(), '==', itemIdValue) is the correct way if itemIdValue is the doc ID.
  // However, if itemIdValue is a custom field like `itemIdString`, then use that field in where().
  // Based on addMenuItem, we store itemIdString which is the doc ID.
  const q = query(itemsGroupRef, where("itemIdString", "==", itemIdValue), limit(1));
  
  const snapshot = await getDocs(q);
console.log("test1")
  if (snapshot.empty) {
    console.log(`No menu item found with itemIdString: ${itemIdValue} in collection group 'menuItems'.`);
    // Fallback: try querying by actual document ID, though less efficient across shards if not targeted.
    // This path is usually not hit if itemIdString is correctly populated and indexed.
    // For robust solution, ensure `itemIdString` is always populated.
    // const directPathGuess = `restaurants/${SOME_RESTAURANT_ID}/menuCategories/${SOME_CATEGORY_ID}/menuItems/${itemIdValue}`; // this is hard to guess
    return null;
  }
  console.log("test2")
  const docSnap = snapshot.docs[0];
  const data = docSnap.data();

   // Validate essential fields for constructing a valid MenuItem and returning context
   if (!data.restaurantId || !data.categoryId) {
     console.error("MenuItem document is missing restaurantId or categoryId fields:", docSnap.id, data);
     return null;
   }
  
  return {
    menuItem: { id: docSnap.id, ...data, createdAt: data.createdAt as Timestamp, updatedAt: data.updatedAt as Timestamp } as MenuItem,
    restaurantId: data.restaurantId, 
    categoryId: data.categoryId,     
    subcategoryId: data.subcategoryId || null // Ensure this aligns with MenuItem type (optional or null)
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
  
  const newMenuItemDocRef = doc(itemsColRef); // Create a reference with a new auto-generated ID
  const itemIdString = newMenuItemDocRef.id; // Get the auto-generated ID

  const createdAt = serverTimestamp();
  const updatedAt = serverTimestamp();

  const dataToSave: any = {
    ...itemData,
    itemIdString, // Store the document's own ID as a field
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

  await setDoc(newMenuItemDocRef, dataToSave); // Use setDoc with the new reference

  return { 
    id: itemIdString, 
    itemIdString, // Include it in the returned object
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
      cleanedData[key] = null; // Store null if empty string or undefined
    }
    if (key === 'videoUrl' && (cleanedData[key] === '' || cleanedData[key] === undefined)) {
      cleanedData[key] = null; // Store null if empty string or undefined
    }
    if (key === 'calories' && (cleanedData[key] === null || cleanedData[key] === undefined || isNaN(cleanedData[key]))) {
       delete cleanedData[key]; // Remove if null, undefined, or NaN
    } else if (key === 'calories') {
       cleanedData[key] = Number(cleanedData[key]); // Ensure it's stored as a number
    }
    // For array fields, ensure they are not stored as empty arrays if that's not desired, or handle appropriately
    if ((key === 'variants' || key === 'availabilitySchedule' || key === 'dietaryTags' || key === 'allergenInfo' || key === 'crossSellItems' || key === 'upsellItems') && (!cleanedData[key] || (Array.isArray(cleanedData[key]) && cleanedData[key].length === 0))) {
      delete cleanedData[key]; // Example: remove if empty array
    }
  });
  
  const dataToUpdate = { ...cleanedData, updatedAt: serverTimestamp() };
  // Ensure itemIdString is not part of the update payload as it's immutable or set at creation
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

