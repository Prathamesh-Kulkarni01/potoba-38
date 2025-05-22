
import {
  collection,
  addDoc,
  doc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  serverTimestamp,
  Timestamp,
  writeBatch,
} from 'firebase/firestore';
import { db } from './config';
import type { InventoryItem, StockTransaction } from '@/types'; // Assuming StockTransaction will be added later
import { convertFirebaseTimestampToString } from './utils';

const getInventoryCollectionPath = (restaurantId: string) => `restaurants/${restaurantId}/inventoryItems`;
const getStockTransactionsCollectionPath = (restaurantId: string) => `restaurants/${restaurantId}/stockTransactions`;

// --- InventoryItem Functions ---

export async function addInventoryItem(
  restaurantId: string,
  itemData: Omit<InventoryItem, 'id' | 'restaurantId' | 'createdAt' | 'updatedAt' | 'lastStockUpdatedAt'>
): Promise<InventoryItem> {
  if (!db) throw new Error("Firestore is not initialized.");
  const inventoryCol = collection(db, getInventoryCollectionPath(restaurantId));
  const now = Timestamp.now();
  const docRef = await addDoc(inventoryCol, {
    ...itemData,
    restaurantId,
    createdAt: now,
    updatedAt: now,
    lastStockUpdatedAt: now, // Initialize with current time
  });
  return {
    id: docRef.id,
    restaurantId,
    ...itemData,
    createdAt: now,
    updatedAt: now,
    lastStockUpdatedAt: now,
  } as InventoryItem;
}

export async function getInventoryItems(restaurantId: string): Promise<InventoryItem[]> {
  if (!db) throw new Error("Firestore is not initialized.");
  const inventoryCol = collection(db, getInventoryCollectionPath(restaurantId));
  const q = query(inventoryCol, orderBy('name', 'asc'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(docSnap => {
    const data = docSnap.data();
    return {
      id: docSnap.id,
      ...data,
      createdAt: data.createdAt as Timestamp, // Assuming these are stored as Timestamps
      updatedAt: data.updatedAt as Timestamp,
      lastStockUpdatedAt: data.lastStockUpdatedAt as Timestamp,
    } as InventoryItem;
  });
}

export async function getInventoryItem(restaurantId: string, itemId: string): Promise<InventoryItem | null> {
  if (!db) throw new Error("Firestore is not initialized.");
  const itemRef = doc(db, getInventoryCollectionPath(restaurantId), itemId);
  const docSnap = await getDoc(itemRef);
  if (docSnap.exists()) {
    const data = docSnap.data();
    return {
      id: docSnap.id,
      ...data,
      createdAt: data.createdAt as Timestamp,
      updatedAt: data.updatedAt as Timestamp,
      lastStockUpdatedAt: data.lastStockUpdatedAt as Timestamp,
    } as InventoryItem;
  }
  return null;
}

export async function updateInventoryItem(
  restaurantId: string,
  itemId: string,
  data: Partial<Omit<InventoryItem, 'id' | 'restaurantId' | 'createdAt' | 'lastStockUpdatedAt'>>
): Promise<void> {
  if (!db) throw new Error("Firestore is not initialized.");
  const itemRef = doc(db, getInventoryCollectionPath(restaurantId), itemId);
  // If currentStock is being updated, also update lastStockUpdatedAt
  const updateData = data.currentStock !== undefined 
    ? { ...data, updatedAt: serverTimestamp(), lastStockUpdatedAt: serverTimestamp() }
    : { ...data, updatedAt: serverTimestamp() };
  await updateDoc(itemRef, updateData);
}

export async function deleteInventoryItem(restaurantId: string, itemId: string): Promise<void> {
  if (!db) throw new Error("Firestore is not initialized.");
  // Consider deleting related stock transactions or archiving the item
  const itemRef = doc(db, getInventoryCollectionPath(restaurantId), itemId);
  await deleteDoc(itemRef);
}

// --- StockTransaction Functions (Placeholders for now) ---

export async function addStockTransaction(
  restaurantId: string,
  transactionData: Omit<StockTransaction, 'id' | 'restaurantId' | 'transactionDate'>
): Promise<StockTransaction> {
  if (!db) throw new Error("Firestore is not initialized.");
  const transactionsCol = collection(db, getStockTransactionsCollectionPath(restaurantId));
  const transactionDate = Timestamp.now(); // Or allow specific date
  
  // When adding a transaction, update the inventory item's currentStock
  const inventoryItemRef = doc(db, getInventoryCollectionPath(restaurantId), transactionData.inventoryItemId);
  const inventoryItemSnap = await getDoc(inventoryItemRef);

  if (!inventoryItemSnap.exists()) {
    throw new Error(`Inventory item with ID ${transactionData.inventoryItemId} not found.`);
  }
  const currentItemData = inventoryItemSnap.data() as InventoryItem;
  const newStock = currentItemData.currentStock + transactionData.quantity; // quantity can be negative for deductions

  const batch = writeBatch(db);

  const docRef = await addDoc(transactionsCol, { // addDoc generates ID if not specified
    ...transactionData,
    restaurantId,
    transactionDate,
  });

  batch.update(inventoryItemRef, {
    currentStock: newStock,
    lastStockUpdatedAt: transactionDate, // Use transaction date for stock update time
  });
  
  await batch.commit();

  return {
    id: docRef.id,
    restaurantId,
    ...transactionData,
    transactionDate,
  } as StockTransaction;
}

export async function getStockTransactions(restaurantId: string, inventoryItemId?: string): Promise<StockTransaction[]> {
    if (!db) throw new Error("Firestore is not initialized.");
    const transactionsCol = collection(db, getStockTransactionsCollectionPath(restaurantId));
    let q;
    if (inventoryItemId) {
        q = query(transactionsCol, where('inventoryItemId', '==', inventoryItemId), orderBy('transactionDate', 'desc'));
    } else {
        q = query(transactionsCol, orderBy('transactionDate', 'desc'));
    }
    const snapshot = await getDocs(q);
    return snapshot.docs.map(docSnap => {
        const data = docSnap.data();
        return {
            id: docSnap.id,
            ...data,
            transactionDate: data.transactionDate as Timestamp,
        } as StockTransaction;
    });
}
