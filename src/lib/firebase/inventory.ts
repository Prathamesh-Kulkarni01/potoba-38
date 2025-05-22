
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
  where,
} from 'firebase/firestore';
import { db } from './config';
import type { InventoryItem, StockTransaction, StockTransactionType } from '@/types'; 
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
    lastStockUpdatedAt: now, 
  });

  // Record initial stock as a transaction
  if (itemData.currentStock > 0) {
    const transactionData: Omit<StockTransaction, 'id' | 'restaurantId' | 'transactionDate'> = {
      inventoryItemId: docRef.id,
      inventoryItemName: itemData.name,
      transactionType: 'initial_stock',
      quantity: itemData.currentStock,
      unitOfMeasure: itemData.unitOfMeasure,
      costPerUnitAtTransaction: itemData.costPerUnit,
      notes: 'Initial stock entry',
    };
    await addStockTransactionInternal(restaurantId, docRef.id, itemData.name, itemData.unitOfMeasure, 'initial_stock', itemData.currentStock, itemData.costPerUnit, 'Initial stock entry', null);
  }


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
      createdAt: data.createdAt as Timestamp, 
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
  
  const itemSnapshot = await getDoc(itemRef);
  if (!itemSnapshot.exists()) throw new Error("Inventory item not found for update.");
  const currentItemData = itemSnapshot.data() as InventoryItem;

  const updateData:any = { ...data, updatedAt: serverTimestamp() };

  // If currentStock is explicitly part of the update AND it's different from current
  if (data.currentStock !== undefined && data.currentStock !== currentItemData.currentStock) {
    updateData.lastStockUpdatedAt = serverTimestamp();
    // Record an adjustment transaction
    const stockDifference = data.currentStock - currentItemData.currentStock;
    const transactionType: StockTransactionType = stockDifference > 0 ? 'adjustment_in' : 'adjustment_out';
    
    await addStockTransactionInternal(
      restaurantId, 
      itemId, 
      data.name || currentItemData.name, 
      data.unitOfMeasure || currentItemData.unitOfMeasure, 
      transactionType, 
      stockDifference, // This is the change, not the new total
      data.costPerUnit !== undefined ? data.costPerUnit : currentItemData.costPerUnit,
      'Manual stock adjustment',
      null // No user ID for now
    );
    // The addStockTransactionInternal will handle updating the item's stock again via batch, which is slightly redundant here
    // but ensures the transaction is logged. We'll just let it run.
    // The updateDoc below will then ensure other fields (like name, category etc.) are updated.
  }
  // The update of currentStock on the item itself is now handled by addStockTransactionInternal if stock changed.
  // If only other fields changed, this updateDoc will handle it.
  // If stock changed, addStockTransactionInternal already updated currentStock and lastStockUpdatedAt.
  // We only need to update other non-stock fields if they are present in 'data'.
  const nonStockData: Partial<Omit<InventoryItem, 'currentStock'>> = {...data};
  delete (nonStockData as any).currentStock; // remove currentStock if it was part of data

  if (Object.keys(nonStockData).length > 0) {
    await updateDoc(itemRef, {...nonStockData, updatedAt: serverTimestamp()});
  } else if (data.currentStock === undefined) { // if only non-stock fields were in `data` and there were none
     await updateDoc(itemRef, { updatedAt: serverTimestamp() }); // just update timestamp
  }

}

export async function deleteInventoryItem(restaurantId: string, itemId: string): Promise<void> {
  if (!db) throw new Error("Firestore is not initialized.");
  
  const batch = writeBatch(db);
  const itemRef = doc(db, getInventoryCollectionPath(restaurantId), itemId);
  batch.delete(itemRef);

  // Optionally, delete related stock transactions
  const transactionsCol = collection(db, getStockTransactionsCollectionPath(restaurantId));
  const q = query(transactionsCol, where('inventoryItemId', '==', itemId));
  const transactionsSnapshot = await getDocs(q);
  transactionsSnapshot.forEach(docSnap => batch.delete(docSnap.ref));
  
  await batch.commit();
}


// Internal helper for adding stock transaction and updating item stock atomically
async function addStockTransactionInternal(
  restaurantId: string,
  inventoryItemId: string,
  inventoryItemName: string,
  unitOfMeasure: UnitOfMeasure,
  transactionType: StockTransactionType,
  quantity: number, // Can be positive (purchase, adj_in) or negative (sale, wastage, adj_out)
  costPerUnitAtTransaction?: number | null,
  notes?: string | null,
  userId?: string | null,
  relatedOrderId?: string | null,
  relatedPurchaseId?: string | null
): Promise<StockTransaction> {
  if (!db) throw new Error("Firestore is not initialized.");

  const transactionsCol = collection(db, getStockTransactionsCollectionPath(restaurantId));
  const transactionDate = Timestamp.now();
  const inventoryItemRef = doc(db, getInventoryCollectionPath(restaurantId), inventoryItemId);
  
  const batch = writeBatch(db);

  // 1. Create new StockTransaction document
  const newTransactionRef = doc(transactionsCol); // Auto-generate ID
  const transactionPayload: StockTransaction = {
    id: newTransactionRef.id, // Will be overwritten by Firestore, but good for type
    restaurantId,
    inventoryItemId,
    inventoryItemName,
    transactionType,
    quantity,
    unitOfMeasure,
    transactionDate,
    costPerUnitAtTransaction: costPerUnitAtTransaction === undefined ? null : costPerUnitAtTransaction,
    notes: notes === undefined ? null : notes,
    relatedOrderId: relatedOrderId === undefined ? null : relatedOrderId,
    relatedPurchaseId: relatedPurchaseId === undefined ? null : relatedPurchaseId,
    userId: userId === undefined ? null : userId,
  };
  batch.set(newTransactionRef, transactionPayload);

  // 2. Update InventoryItem's currentStock and lastStockUpdatedAt
  // It's safer to read the current stock within a transaction if this function were to be called concurrently
  // For now, we assume it's called in contexts where a prior read of item might be stale if not careful.
  // A more robust solution would use Firestore transactions if direct concurrent updates are expected.
  // However, batch writes are atomic for these two operations.
  const itemSnap = await getDoc(inventoryItemRef);
  if (!itemSnap.exists()) {
    throw new Error(`Inventory item with ID ${inventoryItemId} not found during transaction.`);
  }
  const currentItemData = itemSnap.data() as InventoryItem;
  const newStockLevel = currentItemData.currentStock + quantity;

  batch.update(inventoryItemRef, {
    currentStock: newStockLevel,
    lastStockUpdatedAt: transactionDate, // Use transaction date as the last stock update time
    updatedAt: transactionDate, // Also update the item's general updatedAt
  });
  
  await batch.commit();

  return { ...transactionPayload, id: newTransactionRef.id }; // Return with the actual ID
}

export async function recordPurchase(
  restaurantId: string,
  inventoryItemId: string,
  quantityReceived: number,
  costPerUnit: number | null,
  notes?: string | null,
  supplierName?: string | null // Simple supplier name for now
) {
  const item = await getInventoryItem(restaurantId, inventoryItemId);
  if (!item) throw new Error(`Item ${inventoryItemId} not found.`);

  return addStockTransactionInternal(
    restaurantId,
    inventoryItemId,
    item.name,
    item.unitOfMeasure,
    'purchase',
    quantityReceived,
    costPerUnit,
    notes || `Purchased from ${supplierName || 'supplier'}`,
    null // userId - can be added if a user is logged in performing this
  );
}


export async function getStockTransactions(restaurantId: string, inventoryItemId?: string): Promise<StockTransaction[]> {
    if (!db) throw new Error("Firestore is not initialized.");
    const transactionsCol = collection(db, getStockTransactionsCollectionPath(restaurantId));
    let q;
    const queryConstraints: QueryConstraint[] = [orderBy('transactionDate', 'desc')];
    if (inventoryItemId) {
        queryConstraints.unshift(where('inventoryItemId', '==', inventoryItemId));
    }
    q = query(transactionsCol, ...queryConstraints);
    
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

    