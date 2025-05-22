
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
import type { InventoryItem, StockTransaction, StockTransactionType, UnitOfMeasure, OrderItem as ClientOrderItem, MenuItem } from '@/types'; 
import { convertFirebaseTimestampToString } from './utils';
import { getMenuItemByIdFromGroup } from './menu'; // To fetch menu item details

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
      null 
    );
  }
  const nonStockData: Partial<Omit<InventoryItem, 'currentStock'>> = {...data};
  delete (nonStockData as any).currentStock; 

  if (Object.keys(nonStockData).length > 0) {
    await updateDoc(itemRef, {...nonStockData, updatedAt: serverTimestamp()});
  } else if (data.currentStock === undefined) { 
     await updateDoc(itemRef, { updatedAt: serverTimestamp() });
  }

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
  relatedOrderId?: string | null,
  relatedPurchaseId?: string | null
): Promise<StockTransaction> {
  if (!db) throw new Error("Firestore is not initialized.");

  const transactionsCol = collection(db, getStockTransactionsCollectionPath(restaurantId));
  const transactionDate = Timestamp.now();
  const inventoryItemRef = doc(db, getInventoryCollectionPath(restaurantId), inventoryItemId);
  
  const batch = writeBatch(db);

  const newTransactionRef = doc(transactionsCol); 
  const transactionPayload: StockTransaction = {
    id: newTransactionRef.id, 
    restaurantId,
    inventoryItemId,
    inventoryItemName,
    transactionType,
    quantity: quantityChange, // Store the change in quantity
    unitOfMeasure,
    transactionDate,
    costPerUnitAtTransaction: costPerUnitAtTransaction === undefined ? null : costPerUnitAtTransaction,
    notes: notes === undefined ? null : notes,
    relatedOrderId: relatedOrderId === undefined ? null : relatedOrderId,
    relatedPurchaseId: relatedPurchaseId === undefined ? null : relatedPurchaseId,
    userId: userId === undefined ? null : userId,
  };
  batch.set(newTransactionRef, transactionPayload);

  const itemSnap = await getDoc(inventoryItemRef); // Get current stock inside the transaction logic if not using Firestore transactions
  if (!itemSnap.exists()) {
    throw new Error(`Inventory item with ID ${inventoryItemId} not found during transaction.`);
  }
  const currentItemData = itemSnap.data() as InventoryItem;
  const newStockLevel = currentItemData.currentStock + quantityChange; // Apply the change

  batch.update(inventoryItemRef, {
    currentStock: newStockLevel,
    lastStockUpdatedAt: transactionDate, 
    updatedAt: transactionDate, 
  });
  
  await batch.commit();

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
    quantityReceived, // Positive for purchase
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
        const inventoryItemSnap = await getDoc(inventoryItemRef); // Ideally use transaction.get if in a Firestore transaction

        if (inventoryItemSnap.exists()) {
          const inventoryItemData = inventoryItemSnap.data() as InventoryItem;
          // TODO: Unit conversion logic if ingredient.unitOfMeasureUsed is different from inventoryItemData.unitOfMeasure
          const quantityToDeduct = ingredient.quantityUsed * orderItem.quantity;

          // Create stock transaction document
          const transactionRef = doc(collection(db, getStockTransactionsCollectionPath(restaurantId)));
          const transactionData: Omit<StockTransaction, 'id' | 'restaurantId' | 'transactionDate'> = {
            inventoryItemId: ingredient.inventoryItemId,
            inventoryItemName: ingredient.inventoryItemName,
            transactionType: 'sale_usage',
            quantity: -quantityToDeduct, // Negative for deduction
            unitOfMeasure: ingredient.unitOfMeasureUsed, // Or inventoryItemData.unitOfMeasure if no conversion
            costPerUnitAtTransaction: inventoryItemData.costPerUnit, // Use current cost
            relatedOrderId: orderId,
            notes: `Used in ${orderItem.quantity}x ${menuItem.name}`,
          };
          batch.set(transactionRef, { ...transactionData, restaurantId, transactionDate: serverTimestamp()});
          transactionCount++;

          // Update inventory item stock
          const newStock = inventoryItemData.currentStock - quantityToDeduct;
          batch.update(inventoryItemRef, {
            currentStock: newStock,
            lastStockUpdatedAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
        } else {
          console.warn(`Inventory item ${ingredient.inventoryItemId} for menu item ${menuItem.name} not found.`);
        }
      }
    }
  }

  if (transactionCount > 0) {
    await batch.commit();
    console.log(`Successfully deducted stock for ${transactionCount} ingredients for order ${orderId}.`);
  }
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

    
