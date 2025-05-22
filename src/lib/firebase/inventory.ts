
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
  type WriteBatch,
} from 'firebase/firestore';
import { db } from './config';
import type { InventoryItem, StockTransaction, StockTransactionType, UnitOfMeasure, OrderItem as ClientOrderItem, MenuItem, DailyStockSummary } from '@/types'; 
import { convertFirebaseTimestampToString } from './utils';
import { getMenuItemByIdFromGroup } from './menu'; 
import { startOfDay, endOfDay } from 'date-fns';

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
  
  const dataToSave = {
    ...itemData,
    restaurantId,
    createdAt: now,
    updatedAt: now,
    lastStockUpdatedAt: now,
    unitConversionNotes: itemData.unitConversionNotes || null, // Ensure null if not provided
  };

  const docRef = await addDoc(inventoryCol, dataToSave);

  if (itemData.currentStock > 0) {
    await addStockTransactionInternal(restaurantId, docRef.id, itemData.name, itemData.unitOfMeasure, 'initial_stock', itemData.currentStock, itemData.costPerUnit, 'Initial stock entry (Opening Stock)', null);
  }

  return {
    id: docRef.id,
    restaurantId,
    ...itemData,
    unitConversionNotes: dataToSave.unitConversionNotes,
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

  const batch = writeBatch(db);
  const now = Timestamp.now();

  const updateData: any = { ...data, updatedAt: now };
  if (updateData.unitConversionNotes === undefined) {
    updateData.unitConversionNotes = currentItemData.unitConversionNotes || null;
  }

  if (data.currentStock !== undefined && data.currentStock !== currentItemData.currentStock) {
    const stockDifference = data.currentStock - currentItemData.currentStock;
    const transactionType: StockTransactionType = stockDifference > 0 ? 'adjustment_in' : 'adjustment_out';
    
    await addStockTransactionInternal(
      restaurantId, 
      itemId, 
      data.name || currentItemData.name, 
      data.unitOfMeasure || currentItemData.unitOfMeasure, 
      transactionType, 
      stockDifference,
      data.costPerUnit !== undefined ? data.costPerUnit : currentItemData.costPerUnit,
      'Manual stock adjustment',
      null,
      batch // Pass batch to internal function
    );
    updateData.lastStockUpdatedAt = now;
  }
  
  batch.update(itemRef, updateData);
  await batch.commit();
}

export async function deleteInventoryItem(restaurantId: string, itemId: string): Promise<void> {
  if (!db) throw new Error("Firestore is not initialized.");
  
  const batch = writeBatch(db);
  const itemRef = doc(db, getInventoryCollectionPath(restaurantId), itemId);
  batch.delete(itemRef);

  const transactionsCol = collection(db, getStockTransactionsCollectionPath(restaurantId));
  const q = query(transactionsCol, where('inventoryItemId', '==', itemId));
  const transactionsSnapshot = await getDocs(q);
  transactionsSnapshot.forEach(docSnap => batch.delete(docSnap.ref));
  
  await batch.commit();
}

async function addStockTransactionInternal(
  restaurantId: string,
  inventoryItemId: string,
  inventoryItemName: string,
  unitOfMeasure: UnitOfMeasure,
  transactionType: StockTransactionType,
  quantityChange: number, 
  costPerUnitAtTransaction?: number | null,
  notes?: string | null,
  userId?: string | null,
  batch?: WriteBatch, // Optional batch for atomicity
  relatedOrderId?: string | null,
  relatedPurchaseId?: string | null
): Promise<StockTransaction> {
  if (!db) throw new Error("Firestore is not initialized.");

  const localBatch = batch || writeBatch(db); // Use provided batch or create a new one
  const transactionsCol = collection(db, getStockTransactionsCollectionPath(restaurantId));
  const transactionDate = Timestamp.now(); // Consistent timestamp for transaction and item update
  const inventoryItemRef = doc(db, getInventoryCollectionPath(restaurantId), inventoryItemId);
  
  const newTransactionRef = doc(transactionsCol); 
  const transactionPayload: StockTransaction = {
    id: newTransactionRef.id, 
    restaurantId,
    inventoryItemId,
    inventoryItemName,
    transactionType,
    quantity: quantityChange,
    unitOfMeasure,
    transactionDate,
    costPerUnitAtTransaction: costPerUnitAtTransaction === undefined ? null : costPerUnitAtTransaction,
    notes: notes === undefined ? null : notes,
    relatedOrderId: relatedOrderId === undefined ? null : relatedOrderId,
    relatedPurchaseId: relatedPurchaseId === undefined ? null : relatedPurchaseId,
    userId: userId === undefined ? null : userId,
  };
  localBatch.set(newTransactionRef, transactionPayload);

  let currentStock = 0;
  try {
    const itemSnap = await (batch ? localBatch.get(inventoryItemRef) : getDoc(inventoryItemRef));
     if (itemSnap && typeof (itemSnap as any).exists === 'function' && (itemSnap as any).exists()) { 
      currentStock = ((itemSnap as any).data() as InventoryItem).currentStock;
    } else if (transactionType !== 'initial_stock') {
      console.warn(`Inventory item ${inventoryItemId} not found for transaction type ${transactionType}. Assuming 0 current stock.`);
    }
  } catch (e) {
     if (transactionType !== 'initial_stock') {
        console.warn(`Error reading inventory item ${inventoryItemId} during transaction (might not exist yet):`, e);
     }
  }


  const newStockLevel = currentStock + quantityChange;

  if (transactionType === 'initial_stock') {
    localBatch.set(inventoryItemRef, {
      currentStock: newStockLevel,
      lastStockUpdatedAt: transactionDate,
      updatedAt: transactionDate,
    }, { merge: true });
  } else {
    localBatch.update(inventoryItemRef, {
      currentStock: newStockLevel,
      lastStockUpdatedAt: transactionDate, 
      updatedAt: transactionDate, 
    });
  }
  
  if (!batch) { 
    await localBatch.commit();
  }

  return { ...transactionPayload, id: newTransactionRef.id }; 
}

export async function recordPurchase(
  restaurantId: string,
  inventoryItemId: string,
  quantityReceived: number,
  costPerUnit: number | null,
  notes?: string | null,
  supplierName?: string | null 
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
    null 
  );
}

export async function deductStockForSoldItems(restaurantId: string, orderId: string, orderItems: ClientOrderItem[]): Promise<void> {
  if (!db) throw new Error("Firestore is not initialized.");
  if (orderItems.length === 0) return;

  const batch = writeBatch(db);
  let transactionCount = 0;

  for (const orderItem of orderItems) {
    const menuItemResult = await getMenuItemByIdFromGroup(orderItem.menuItemId);
    if (menuItemResult && menuItemResult.menuItem.recipeIngredients && menuItemResult.menuItem.recipeIngredients.length > 0) {
      const menuItem = menuItemResult.menuItem;
      for (const ingredient of menuItem.recipeIngredients) {
        const inventoryItemRef = doc(db, getInventoryCollectionPath(restaurantId), ingredient.inventoryItemId);
        
        const inventoryItemSnap = await getDoc(inventoryItemRef); 

        if (inventoryItemSnap.exists()) {
          const inventoryItemData = inventoryItemSnap.data() as InventoryItem;
          const quantityToDeduct = ingredient.quantityUsed * orderItem.quantity;

          await addStockTransactionInternal(
            restaurantId,
            ingredient.inventoryItemId,
            ingredient.inventoryItemName,
            ingredient.unitOfMeasureUsed, 
            'sale_usage',
            -quantityToDeduct, 
            inventoryItemData.costPerUnit, 
            `Used in ${orderItem.quantity}x ${menuItem.name}`,
            null, 
            batch, 
            orderId
          );
          transactionCount++;
        } else {
          console.warn(`Inventory item ${ingredient.inventoryItemId} for menu item ${menuItem.name} not found.`);
        }
      }
    }
  }

  if (transactionCount > 0) {
    await batch.commit();
    console.log(`Successfully recorded stock deductions for ${transactionCount} ingredients for order ${orderId}.`);
  }
}


export async function getStockTransactions(restaurantId: string, inventoryItemId?: string): Promise<StockTransaction[]> {
    if (!db) throw new Error("Firestore is not initialized.");
    const transactionsCol = collection(db, getStockTransactionsCollectionPath(restaurantId));
    let q;
    const queryConstraints: any[] = [orderBy('transactionDate', 'desc')]; 
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

// --- KPI Functions ---
export async function calculateTotalStockValue(restaurantId: string): Promise<number> {
  if (!db) throw new Error("Firestore is not initialized.");
  const items = await getInventoryItems(restaurantId);
  return items.reduce((total, item) => {
    if (item.costPerUnit && item.currentStock > 0) {
      return total + (item.currentStock * item.costPerUnit);
    }
    return total;
  }, 0);
}

export async function countLowStockItems(restaurantId: string): Promise<number> {
  if (!db) throw new Error("Firestore is not initialized.");
  const items = await getInventoryItems(restaurantId);
  return items.filter(item => item.reorderLevel !== null && item.reorderLevel !== undefined && item.currentStock <= item.reorderLevel).length;
}

export async function getDailyStockTransactionSummary(restaurantId: string): Promise<DailyStockSummary> {
  if (!db) throw new Error("Firestore is not initialized.");
  const transactionsCol = collection(db, getStockTransactionsCollectionPath(restaurantId));
  
  const today = new Date();
  const startOfTodayTimestamp = Timestamp.fromDate(startOfDay(today));
  const endOfTodayTimestamp = Timestamp.fromDate(endOfDay(today));

  const q = query(
    transactionsCol,
    where('transactionDate', '>=', startOfTodayTimestamp),
    where('transactionDate', '<=', endOfTodayTimestamp)
  );

  const snapshot = await getDocs(q);
  const summary: DailyStockSummary = {
    stockInQuantity: 0,
    stockOutQuantity: 0,
    wastageQuantity: 0,
  };

  snapshot.forEach(docSnap => {
    const transaction = docSnap.data() as StockTransaction;
    switch (transaction.transactionType) {
      case 'purchase':
      case 'adjustment_in':
      case 'initial_stock':
      case 'transfer_in':
        summary.stockInQuantity += transaction.quantity;
        break;
      case 'sale_usage':
      case 'adjustment_out':
      case 'transfer_out':
        summary.stockOutQuantity += Math.abs(transaction.quantity); 
        break;
      case 'wastage':
        summary.wastageQuantity += Math.abs(transaction.quantity); 
        break;
    }
  });
  return summary;
}
    
