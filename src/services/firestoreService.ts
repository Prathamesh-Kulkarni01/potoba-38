import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  Timestamp,
  DocumentData,
} from 'firebase/firestore';
import { db } from '../lib/firebase';

// Generic function to get a document by ID
export const getDocument = async <T>(
  collectionName: string,
  documentId: string
): Promise<T | null> => {
  try {
    const docRef = doc(db, collectionName, documentId);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() } as T;
    }
    return null;
  } catch (error) {
    console.error(`Error getting ${collectionName} document:`, error);
    throw error;
  }
};

// Generic function to get all documents in a collection
export const getCollection = async <T>(
  collectionName: string,
  restaurantId: string
): Promise<T[]> => {
  try {
    const q = query(
      collection(db, collectionName),
      where('restaurantId', '==', restaurantId)
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as T[];
  } catch (error) {
    console.error(`Error getting ${collectionName} collection:`, error);
    throw error;
  }
};

// Generic function to add a document
export const addDocument = async <T extends DocumentData>(
  collectionName: string,
  data: T
): Promise<string> => {
  try {
    const docRef = await addDoc(collection(db, collectionName), {
      ...data,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    });
    return docRef.id;
  } catch (error) {
    console.error(`Error adding ${collectionName} document:`, error);
    throw error;
  }
};

// Generic function to update a document
export const updateDocument = async <T extends DocumentData>(
  collectionName: string,
  documentId: string,
  data: Partial<T>
): Promise<void> => {
  try {
    const docRef = doc(db, collectionName, documentId);
    await updateDoc(docRef, {
      ...data,
      updatedAt: Timestamp.now(),
    });
  } catch (error) {
    console.error(`Error updating ${collectionName} document:`, error);
    throw error;
  }
};

// Generic function to delete a document
export const deleteDocument = async (
  collectionName: string,
  documentId: string
): Promise<void> => {
  try {
    const docRef = doc(db, collectionName, documentId);
    await deleteDoc(docRef);
  } catch (error) {
    console.error(`Error deleting ${collectionName} document:`, error);
    throw error;
  }
};

// Restaurant-specific functions
export const getRestaurant = async (restaurantId: string) => {
  return getDocument('restaurants', restaurantId);
};

export const updateRestaurant = async (
  restaurantId: string,
  data: Partial<DocumentData>
) => {
  return updateDocument('restaurants', restaurantId, data);
};

// Menu items functions
export const getMenuItems = async (restaurantId: string) => {
  const q = query(
    collection(db, 'menuItems'),
    where('restaurantId', '==', restaurantId),
    orderBy('category'),
    orderBy('name')
  );
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  }));
};

// Orders functions
export const getOrders = async (restaurantId: string) => {
  const q = query(
    collection(db, 'orders'),
    where('restaurantId', '==', restaurantId),
    orderBy('createdAt', 'desc'),
    limit(50)
  );
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  }));
};

// Users functions
export const getRestaurantUsers = async (restaurantId: string) => {
  const q = query(
    collection(db, 'users'),
    where('restaurantId', '==', restaurantId)
  );
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  }));
};

// Tables functions
export const getTables = async (restaurantId: string) => {
  const q = query(
    collection(db, 'tables'),
    where('restaurantId', '==', restaurantId),
    orderBy('number')
  );
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  }));
}; 