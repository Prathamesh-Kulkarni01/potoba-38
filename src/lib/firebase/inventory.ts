
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
  type WriteBatch,
  writeBatch,
  where,
  type QueryConstraint,
} from 'firebase/firestore';
import { db } from './config';
import type { InventoryItem, StockTransaction, StockTransactionType, UnitOfMeasure, OrderItem as ClientOrderItem, MenuItem, DailyStockSummary, SupplierInfo } from '@/types'; 
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
    unitConversionNotes: itemData.unitConversionNotes || null, 
    supplierInfo: itemData.supplierInfo || null,
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
    supplierInfo: dataToSave.supplierInfo,
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
  
  // Ensure optional fields are set to null if explicitly undefined or if they were null and not changed
  const optionalFields: (keyof InventoryItem)[] = ['unitConversionNotes', 'supplierInfo', 'reorderLevel', 'costPerUnit'];
  optionalFields.forEach(field => {
    if (data[field] === undefined && currentItemData[field] === null) {
      updateData[field] = null;
    } else if (data[field] === undefined && currentItemData[field] !== undefined) {
      updateData[field] = currentItemData[field]; // Retain existing value if not in update data
    } else if (data[field] === null) {
      updateData[field] = null; // Explicitly set to null
    }
  });


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
  relatedPurchaseId?: string | null,
  supplierName?: string | null,
  invoiceNumber?: string | null,
  batchNumber?: string | null,
  expiryDate?: Timestamp | null,
  paymentMode?: string | null
): Promise<StockTransaction> {
  if (!db) throw new Error("Firestore is not initialized.");

  const localBatch = batch || writeBatch(db); 
  const transactionsCol = collection(db, getStockTransactionsCollectionPath(restaurantId));
  const transactionDate = Timestamp.now(); 
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
    supplierName: supplierName === undefined ? null : supplierName,
    invoiceNumber: invoiceNumber === undefined ? null : invoiceNumber,
    batchNumber: batchNumber === undefined ? null : batchNumber,
    expiryDate: expiryDate === undefined ? null : expiryDate,
    paymentMode: paymentMode === undefined ? null : paymentMode,
    relatedOrderId: relatedOrderId === undefined ? null : relatedOrderId,
    relatedPurchaseId: relatedPurchaseId === undefined ? null : relatedPurchaseId,
    userId: userId === undefined ? null : userId,
  };
  localBatch.set(newTransactionRef, transactionPayload);

  let currentStock = 0;
  try {
    // If we are using a batch, we cannot read the item yet if it's part of the same batch creation.
    // For 'initial_stock', currentStock is effectively 0 before this transaction.
    // For other types, if we can't read (e.g., item doesn't exist which shouldn't happen for non-initial), we log error.
    if (transactionType !== 'initial_stock' && !batch) {
      const itemSnap = await getDoc(inventoryItemRef);
      if (itemSnap.exists()) { 
        currentStock = (itemSnap.data() as InventoryItem).currentStock;
      } else {
        console.warn(`Inventory item ${inventoryItemId} not found for transaction type ${transactionType}. Assuming 0 current stock.`);
      }
    } else if (transactionType !== 'initial_stock' && batch) {
        // If in a batch and not initial stock, we assume the item *must* exist prior.
        // Reading within a transaction/batch for uncommitted data is complex.
        // This relies on the caller ensuring the item exists or handling this scenario.
        // For now, we'll proceed assuming it might be read correctly if not part of the same batch write for creation.
        // A safer approach might involve passing currentStock if known in batch operations.
        // console.warn(`Reading inventory item ${inventoryItemId} within a batch for ${transactionType}. Stock level might not reflect uncommitted changes.`);
    }
  } catch (e) {
     if (transactionType !== 'initial_stock') {
        console.warn(`Error reading inventory item ${inventoryItemId} during transaction:`, e);
     }
  }

  const newStockLevel = currentStock + quantityChange;

  if (transactionType === 'initial_stock') {
    // Set currentStock and other fields for a new item.
    // If using a batch, this set() might be for a document that doesn't exist yet, which is fine.
    localBatch.set(inventoryItemRef, {
      currentStock: newStockLevel, // This is the opening stock
      lastStockUpdatedAt: transactionDate,
      updatedAt: transactionDate, // Also update main item's updatedAt
    }, { merge: true }); // Merge true in case other fields are being set in the same batch for a new item
  } else {
    // Update currentStock for an existing item.
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
  supplierName?: string | null,
  invoiceNumber?: string | null,
  batchNumber?: string | null,
  expiryDate?: Date | null, // Accept Date for easier UI binding
  paymentMode?: string | null
): Promise<StockTransaction> {
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
    notes, // Removed supplier from notes as it's now a dedicated field
    null,
    undefined, // No batch passed from here
    undefined,
    undefined,
    supplierName,
    invoiceNumber,
    batchNumber,
    expiryDate ? Timestamp.fromDate(expiryDate) : null,
    paymentMode
  );
}

export async function deductStockForSoldItems(restaurantId: string, orderId: string, orderItems: ClientOrderItem[]): Promise<void> {
  if (!db) throw new Error("Firestore is not initialized.");
  if (orderItems.length === 0) return;

  const batch = writeBatch(db);
  let transactionCount = 0;

  for (const orderItem of orderItems) {
    const menuItemResult = await getMenuItemByIdFromGroup(orderItem.menuItemId); // Use existing function that queries collection group
    if (menuItemResult && menuItemResult.menuItem.recipeIngredients && menuItemResult.menuItem.recipeIngredients.length > 0) {
      const menuItem = menuItemResult.menuItem;
      for (const ingredient of menuItem.recipeIngredients) {
        const inventoryItemRef = doc(db, getInventoryCollectionPath(restaurantId), ingredient.inventoryItemId);
        
        // It's generally not recommended to read inside a batch loop if possible,
        // but for simplicity and to get costPerUnit, we do it here.
        // For very high volume, consider denormalizing cost or optimizing this.
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
            -quantityToDeduct, // Quantity change is negative for deduction
            inventoryItemData.costPerUnit, 
            `Used in ${orderItem.quantity}x ${menuItem.name}`,
            null, // userId, could be system or cashier user
            batch, // Pass the batch
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
    
    const queryConstraints: QueryConstraint[] = [orderBy('transactionDate', 'desc')]; 
    if (inventoryItemId) {
        queryConstraints.unshift(where('inventoryItemId', '==', inventoryItemId));
    }
    const q = query(transactionsCol, ...queryConstraints);
    
    const snapshot = await getDocs(q);
    return snapshot.docs.map(docSnap => {
        const data = docSnap.data();
        return {
            id: docSnap.id,
            ...data,
            transactionDate: data.transactionDate as Timestamp,
            expiryDate: data.expiryDate ? (data.expiryDate as Timestamp) : null, // Ensure expiryDate is handled
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
        summary.stockInQuantity += transaction.quantity; // Assumes positive for 'in' types
        break;
      case 'sale_usage': // Stored as negative
      case 'adjustment_out': // Stored as negative
      case 'transfer_out': // Stored as negative
        summary.stockOutQuantity += Math.abs(transaction.quantity); 
        break;
      case 'wastage': // Stored as negative
        summary.wastageQuantity += Math.abs(transaction.quantity); 
        break;
    }
  });
  return summary;
}
    
