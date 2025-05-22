
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
import type { InventoryItem, StockTransaction, StockTransactionType, UnitOfMeasure, OrderItem as ClientOrderItem, MenuItem, DailyStockSummary, SupplierInfo, InventoryItemCategory } from '@/types'; 
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
    reorderLevel: itemData.reorderLevel === undefined ? null : itemData.reorderLevel,
    costPerUnit: itemData.costPerUnit === undefined ? null : itemData.costPerUnit,
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
  
  const optionalFields: (keyof InventoryItem)[] = ['unitConversionNotes', 'supplierInfo', 'reorderLevel', 'costPerUnit'];
  optionalFields.forEach(field => {
    if (data[field] === undefined && currentItemData[field] === null) {
      updateData[field] = null;
    } else if (data[field] === undefined && currentItemData[field] !== undefined) {
      // Retain existing value if not in update data (and existing value is not explicitly null)
      updateData[field] = currentItemData[field];
    } else if (data[field] === null) {
      updateData[field] = null; 
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
      stockDifference, // This is the change amount, not the new total
      data.costPerUnit !== undefined ? data.costPerUnit : currentItemData.costPerUnit,
      'Manual stock adjustment via item edit',
      null,
      batch 
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
  batchParam?: WriteBatch, // Optional batch for atomicity
  relatedOrderId?: string | null,
  relatedPurchaseId?: string | null,
  supplierName?: string | null,
  invoiceNumber?: string | null,
  batchNumber?: string | null,
  expiryDate?: Timestamp | null,
  paymentMode?: string | null
): Promise<StockTransaction> {
  if (!db) throw new Error("Firestore is not initialized.");

  const localBatch = batchParam || writeBatch(db); 
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
    quantity: quantityChange, // This should be the change amount (+ve for in, -ve for out)
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
  if (transactionType !== 'initial_stock') {
    // For existing items, we need to fetch the current stock to calculate the new stock.
    // This read should happen *before* the batch update if not part of the same transaction creation.
    // If this is part of a larger batched operation where inventoryItemRef might not exist yet
    // or is being created in the same batch, this logic might need adjustment.
    // For isolated stock transactions, this is generally fine.
    const itemSnap = await getDoc(inventoryItemRef); // Read current stock if item exists
    if (itemSnap.exists()) {
      currentStock = (itemSnap.data() as InventoryItem).currentStock;
    } else if (transactionType !== 'purchase' && transactionType !== 'adjustment_in'){ 
      // If it's an outflow and item doesn't exist, that's an issue.
      // For purchase/adj_in, it might be okay if this function is called right after item creation in same batch
      console.warn(`Inventory item ${inventoryItemId} not found for transaction type ${transactionType}. Assuming 0 current stock for update, but this might be an error.`);
    }
  }
  
  const newStockLevel = currentStock + quantityChange;

  // Update the main inventory item's stock level and last update timestamp
  localBatch.set(inventoryItemRef, { // Use set with merge:true or update
    currentStock: newStockLevel,
    lastStockUpdatedAt: transactionDate,
    updatedAt: transactionDate,
  }, { merge: true }); 
  
  if (!batchParam) { 
    await localBatch.commit();
  }

  return { ...transactionPayload, id: newTransactionRef.id }; 
}

export async function recordPurchase(
  restaurantId: string,
  inventoryItemId: string,
  quantityReceived: number, // Should be positive
  costPerUnit: number | null,
  notes?: string | null,
  supplierName?: string | null,
  invoiceNumber?: string | null,
  batchNumber?: string | null,
  expiryDate?: Date | null,
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
    quantityReceived, // Positive for purchase
    costPerUnit,
    notes,
    null, // userId
    undefined, // No batch passed from here
    undefined, // relatedOrderId
    undefined, // relatedPurchaseId (could be self-referential if we create a purchase doc)
    supplierName,
    invoiceNumber,
    batchNumber,
    expiryDate ? Timestamp.fromDate(expiryDate) : null,
    paymentMode
  );
}

export async function recordStockOutflow(
  restaurantId: string,
  inventoryItemId: string,
  quantityOut: number, // Should be positive (will be converted to negative internally)
  transactionType: 'wastage' | 'adjustment_out' | 'internal_consumption',
  notes?: string | null,
  userId?: string | null // Optional user ID who performed the action
): Promise<StockTransaction> {
  const item = await getInventoryItem(restaurantId, inventoryItemId);
  if (!item) throw new Error(`Inventory item ${inventoryItemId} not found.`);
  if (quantityOut <= 0) throw new Error("Quantity for stock outflow must be positive.");

  return addStockTransactionInternal(
    restaurantId,
    inventoryItemId,
    item.name,
    item.unitOfMeasure,
    transactionType,
    -Math.abs(quantityOut), // Ensure it's negative for outflow
    item.costPerUnit, // Use current cost for valuation of outflow
    notes,
    userId,
    undefined // No batch passed from here
  );
}


export async function deductStockForSoldItems(restaurantId: string, orderId: string, orderItems: ClientOrderItem[]): Promise<void> {
  if (!db) throw new Error("Firestore is not initialized.");
  if (orderItems.length === 0) return;

  const batch = writeBatch(db);
  let transactionCount = 0;

  for (const orderItem of orderItems) {
    // Assuming getMenuItemByIdFromGroup is efficient and fetches necessary data.
    // If not, consider fetching all menu items once or optimizing this lookup.
    const menuItemResult = await getMenuItemByIdFromGroup(orderItem.menuItemId); 
    
    if (menuItemResult && menuItemResult.menuItem.recipeIngredients && menuItemResult.menuItem.recipeIngredients.length > 0) {
      const menuItem = menuItemResult.menuItem;
      for (const ingredient of menuItem.recipeIngredients) {
        // Note: Reading inventoryItemData inside the loop to get costPerUnit for each transaction.
        // This could be optimized if performance becomes an issue by fetching all relevant inventory items upfront.
        const inventoryItemRef = doc(db, getInventoryCollectionPath(restaurantId), ingredient.inventoryItemId);
        const inventoryItemSnap = await getDoc(inventoryItemRef);

        if (inventoryItemSnap.exists()) {
          const inventoryItemData = inventoryItemSnap.data() as InventoryItem;
          const quantityToDeduct = ingredient.quantityUsed * orderItem.quantity;

          // addStockTransactionInternal handles batching and updating currentStock
          await addStockTransactionInternal(
            restaurantId,
            ingredient.inventoryItemId,
            ingredient.inventoryItemName, // Using the name stored in recipe for consistency
            ingredient.unitOfMeasureUsed, 
            'sale_usage',
            -Math.abs(quantityToDeduct), // Ensure negative for deduction
            inventoryItemData.costPerUnit, // Cost at the time of sale usage
            `Used in ${orderItem.quantity}x ${menuItem.name}`,
            null, // userId, could be system or cashier user
            batch,
            orderId
          );
          transactionCount++;
        } else {
          console.warn(`Inventory item ${ingredient.inventoryItemId} (named ${ingredient.inventoryItemName}) for menu item ${menuItem.name} not found. Stock not deducted for this ingredient.`);
        }
      }
    }
  }

  if (transactionCount > 0) {
    await batch.commit();
    console.log(`Successfully recorded stock deductions for ${transactionCount} ingredients for order ${orderId}.`);
  }
}


export async function getStockTransactions(
  restaurantId: string,
  filters?: {
    inventoryItemId?: string;
    transactionTypes?: StockTransactionType[];
    startDate?: Date;
    endDate?: Date;
  }
): Promise<StockTransaction[]> {
  if (!db) throw new Error("Firestore is not initialized.");
  const transactionsCol = collection(db, getStockTransactionsCollectionPath(restaurantId));
  
  const queryConstraints: QueryConstraint[] = [orderBy('transactionDate', 'desc')]; 
  
  if (filters?.inventoryItemId) {
    queryConstraints.push(where('inventoryItemId', '==', filters.inventoryItemId));
  }
  if (filters?.transactionTypes && filters.transactionTypes.length > 0) {
    queryConstraints.push(where('transactionType', 'in', filters.transactionTypes));
  }
  if (filters?.startDate) {
    queryConstraints.push(where('transactionDate', '>=', Timestamp.fromDate(filters.startDate)));
  }
  if (filters?.endDate) {
    const endOfDayForFilter = endOfDay(filters.endDate); // Ensure we capture the whole day
    queryConstraints.push(where('transactionDate', '<=', Timestamp.fromDate(endOfDayForFilter)));
  }

  const q = query(transactionsCol, ...queryConstraints);
  
  const snapshot = await getDocs(q);
  return snapshot.docs.map(docSnap => {
    const data = docSnap.data();
    return {
      id: docSnap.id,
      ...data,
      transactionDate: data.transactionDate as Timestamp,
      expiryDate: data.expiryDate ? (data.expiryDate as Timestamp) : null,
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
  
  const today = new Date();
  const startOfToday = startOfDay(today);
  const endOfTodayDate = endOfDay(today);

  const transactions = await getStockTransactions(restaurantId, { startDate: startOfToday, endDate: endOfTodayDate });

  const summary: DailyStockSummary = {
    stockInQuantity: 0,
    stockOutQuantity: 0,
    wastageQuantity: 0,
  };

  transactions.forEach(transaction => {
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
      case 'internal_consumption':
        summary.stockOutQuantity += Math.abs(transaction.quantity); 
        break;
      case 'wastage': 
        summary.wastageQuantity += Math.abs(transaction.quantity); 
        break;
    }
  });
  return summary;
}
    
