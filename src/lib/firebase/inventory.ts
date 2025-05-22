
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
import type { InventoryItem, StockTransaction, StockTransactionType, UnitOfMeasure, OrderItem as ClientOrderItem, MenuItem, DailyStockSummary, SupplierInfo, InventoryItemCategory, RecipeIngredientItem } from '@/types'; 
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
      stockDifference, 
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
  batchParam?: WriteBatch, 
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
  // If this is part of a larger batch (like creating an item AND its initial stock),
  // the item might not exist yet when getDoc is called.
  // We rely on transaction for atomic update of stock level.
  if (!batchParam || transactionType !== 'initial_stock') {
    try {
      const itemSnap = await (batchParam ? (batchParam as any)._firestore.getDocFromServer(inventoryItemRef) : getDoc(inventoryItemRef));
      if (itemSnap.exists()) {
        currentStock = (itemSnap.data() as InventoryItem).currentStock;
      } else if (transactionType !== 'purchase' && transactionType !== 'adjustment_in' && transactionType !== 'initial_stock'){ 
        console.warn(`Inventory item ${inventoryItemId} not found for transaction type ${transactionType}. Assuming 0 current stock for update, but this might be an error.`);
      }
    } catch (e) {
       // This can happen if the document doesn't exist yet and we're in a transaction/batch that's creating it.
       // In this case, currentStock remains 0, which is correct for an initial_stock or first purchase.
       if (transactionType !== 'initial_stock' && transactionType !== 'purchase' && transactionType !== 'adjustment_in') {
         console.warn(`Failed to read inventory item ${inventoryItemId} during transaction, assuming 0 stock. Error: ${e}`);
       }
    }
  }
  
  const newStockLevel = currentStock + quantityChange;

  localBatch.set(inventoryItemRef, { 
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
  quantityReceived: number, 
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
    quantityReceived, 
    costPerUnit,
    notes,
    null, 
    undefined, 
    undefined, 
    undefined, 
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
  quantityOut: number, 
  transactionType: 'wastage' | 'adjustment_out' | 'internal_consumption',
  notes?: string | null,
  userId?: string | null 
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
    -Math.abs(quantityOut), 
    item.costPerUnit, 
    notes,
    userId,
    undefined 
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
        // UNIT CONVERSION LOGIC NEEDED HERE for advanced system
        // For now, assumes recipe unit directly matches inventory unit or is manually converted by user input
        // e.g., if InventoryItem 'Flour' is in KG, and recipe needs 500g,
        // RecipeIngredientItem should be { inventoryItemId: 'flour_id', quantityUsed: 0.5, unitOfMeasureUsed: 'kg' }
        // OR { inventoryItemId: 'flour_id', quantityUsed: 500, unitOfMeasureUsed: 'g' } AND 'Flour' is stocked in 'g'.
        // A proper conversion system would look up conversion factors (e.g., 1kg = 1000g).
        const inventoryItemRef = doc(db, getInventoryCollectionPath(restaurantId), ingredient.inventoryItemId);
        const inventoryItemSnap = await getDoc(inventoryItemRef); // Consider transaction read if in strict transaction

        if (inventoryItemSnap.exists()) {
          const inventoryItemData = inventoryItemSnap.data() as InventoryItem;
          
          // Basic check: if recipe unit is different than stock unit, log warning.
          // This is a placeholder for a proper conversion system.
          if (ingredient.unitOfMeasureUsed !== inventoryItemData.unitOfMeasure) {
            console.warn(`Unit mismatch for ${inventoryItemData.name}: Stocked in ${inventoryItemData.unitOfMeasure}, recipe uses ${ingredient.unitOfMeasureUsed}. Assuming direct deduction. Implement unit conversion.`);
          }

          const quantityToDeduct = ingredient.quantityUsed * orderItem.quantity;

          await addStockTransactionInternal(
            restaurantId,
            ingredient.inventoryItemId,
            ingredient.inventoryItemName, 
            ingredient.unitOfMeasureUsed, // Using the unit from the recipe here
            'sale_usage',
            -Math.abs(quantityToDeduct), 
            inventoryItemData.costPerUnit, 
            `Used in ${orderItem.quantity}x ${menuItem.name}`,
            null, 
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
    const endOfDayForFilter = endOfDay(filters.endDate); 
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
    
