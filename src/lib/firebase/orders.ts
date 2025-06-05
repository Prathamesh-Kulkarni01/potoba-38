
// src/lib/firebase/orders.ts

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
  type QueryConstraint,
  limit,
  getCountFromServer,
  onSnapshot,
  startAt,
  endAt,
  documentId,
  runTransaction,
} from 'firebase/firestore';
import { db } from './config';
import type { Order, OrderStatus, OrderItem, ClientOrder, MenuItem, TaxConfig, MenuCategory, RestaurantProfile, OrderItemStatus } from '@/types';
import { convertFirebaseTimestampToString, getOrdersCollectionPath } from './utils';
import { startOfDay, endOfDay, subDays } from 'date-fns';
import { getRestaurant } from './firestore';
import { getMenuCategories, getMenuItemByIdFromGroup } from './menu';
import { calculateOrderTaxes } from '../taxEngine';
import { deductStockForSoldItems } from './inventory';

const safeString = (value: any): string | null => typeof value === 'string' && value.trim() !== '' ? value.trim() : null;
const safeNumber = (value: any): number | null => typeof value === 'number' && !isNaN(value) ? value : null;

// Helper to sanitize an OrderItem
export const sanitizeOrderItem = (item: Partial<OrderItem>): OrderItem => {
  const now = Date.now();
  const menuItemId = item.menuItemId || 'unknown-item';
  
  let uniqueIdFromItem = item.uniqueId;
  if (!uniqueIdFromItem) {
    const timestampPartForId = (item.createdAt && typeof item.createdAt === 'object' && typeof (item.createdAt as any).toDate === 'function')
        ? (item.createdAt as Timestamp).toDate().getTime()
        : (typeof item.createdAt === 'number' ? item.createdAt : now);
    // Using simple string concatenation
    uniqueIdFromItem = menuItemId + '-' + timestampPartForId;
  }
  
  const idParts = uniqueIdFromItem.split('-');
  const needsSuffix = idParts.length < 3 || !/^[a-z0-9]{7,}$/i.test(idParts[idParts.length - 1]);
  // Using simple string concatenation
  const finalUniqueId = needsSuffix
    ? uniqueIdFromItem + '-' + Math.random().toString(36).substring(2, 9)
    : uniqueIdFromItem;

  const finalCreatedAt = (item.createdAt && typeof item.createdAt === 'object' && typeof (item.createdAt as any).toDate === 'function')
    ? (item.createdAt as Timestamp).toDate().getTime()
    : (typeof item.createdAt === 'number' ? item.createdAt : now);

  const finalUpdatedAt = (item.updatedAt && typeof item.updatedAt === 'object' && typeof (item.updatedAt as any).toDate === 'function')
    ? (item.updatedAt as Timestamp).toDate().getTime()
    : (typeof item.updatedAt === 'number' ? item.updatedAt : finalCreatedAt);


  return {
    uniqueId: finalUniqueId,
    menuItemId: menuItemId,
    menuItemName: item.menuItemName || 'Unknown Item',
    quantity: typeof item.quantity === 'number' && item.quantity > 0 ? item.quantity : 1,
    unitPrice: typeof item.unitPrice === 'number' ? item.unitPrice : 0,
    totalPrice: (typeof item.unitPrice === 'number' ? item.unitPrice : 0) * (typeof item.quantity === 'number' && item.quantity > 0 ? item.quantity : 1),
    status: item.status || 'pending',
    variantChoices: item.variantChoices || null,
    instructions: safeString(item.instructions),
    notes: safeString(item.notes),
    createdAt: finalCreatedAt,
    updatedAt: finalUpdatedAt,
    groupId: safeString(item.groupId),
    imageUrl: safeString(item.imageUrl),
    categoryId: safeString(item.categoryId),
    taxOverrides: item.taxOverrides || null,
    // menuItem: item.menuItem, // Do not include menuItem for Firestore persistence if it's the full object
  };
};


const toClientOrder = (docId: string, data: any): ClientOrder => {
    const orderBase: Omit<ClientOrder, 'id' | 'createdAt' | 'updatedAt'> = {
        restaurantId: data.restaurantId,
        userId: data.userId || null,
        tableId: data.tableId || null,
        tableNumber: data.tableNumber || null,
        items: (data.items || []).map((itemData: any) => sanitizeOrderItem(itemData as Partial<OrderItem>)),
        subtotal: typeof data.subtotal === 'number' ? data.subtotal : 0,
        totalAmount: typeof data.totalAmount === 'number' ? data.totalAmount : 0,
        status: data.status as OrderStatus,
        customerName: safeString(data.customerName),
        customerPhoneNumber: safeString(data.customerPhoneNumber),
        customerWhatsapp: safeString(data.customerWhatsapp),
        taxAmount: safeNumber(data.taxAmount),
        serviceCharge: safeNumber(data.serviceCharge),
        discountAmount: safeNumber(data.discountAmount),
        customerNotes: safeString(data.customerNotes),
        kitchenNotes: safeString(data.kitchenNotes),
        paymentMethod: safeString(data.paymentMethod),
        transactionId: safeString(data.transactionId),
        groupId: safeString(data.groupId),
        taxBreakup: data.taxBreakup || null,
    };

    return {
        id: docId,
        ...orderBase,
        createdAt: convertFirebaseTimestampToString(data.createdAt),
        updatedAt: convertFirebaseTimestampToString(data.updatedAt),
    };
};

export function deriveOverallOrderStatus(items: OrderItem[]): OrderStatus {
  if (!items || items.length === 0) {
    return 'pending_customer_confirmation'; 
  }

  const activeItems = items.filter(item => item.status !== 'cancelled_by_customer' && item.status !== 'cancelled_by_kitchen');

  if (activeItems.length === 0) { // All items are cancelled
    return 'cancelled_by_restaurant'; // Or determine by who cancelled the last item
  }
  if (activeItems.every(item => item.status === 'served')) return 'payment_pending';
  if (activeItems.some(item => item.status === 'ready_for_pickup') && activeItems.every(item => item.status === 'ready_for_pickup' || item.status === 'served')) return 'ready_for_pickup';
  if (activeItems.some(item => item.status === 'preparing')) return 'preparing';
  if (activeItems.some(item => item.status === 'confirmed_by_kitchen')) return 'confirmed_by_kitchen';
  if (activeItems.some(item => item.status === 'sent_to_kitchen')) return 'pending_kitchen';
  
  // If all active items are 'pending' (local waiter app state before sending to kitchen)
  if (activeItems.every(item => item.status === 'pending')) return 'pending_customer_confirmation'; 

  // Fallback, or if items are in a mixed state not covered above (e.g., some pending, some sent)
  return 'pending_kitchen'; 
}


export async function createOrder(restaurantId: string, orderData: Partial<Omit<Order, 'id' | 'createdAt' | 'updatedAt'>>): Promise<Order> {
  if (!db) throw new Error("Firestore is not initialized.");
  const ordersCol = collection(db, getOrdersCollectionPath(restaurantId));

  const restaurant = await getRestaurant(restaurantId);
  if (!restaurant) throw new Error('Restaurant not found for order creation.');
  const categoriesData = await getMenuCategories(restaurantId);
  const categoryMap = Object.fromEntries(categoriesData.map(cat => [cat.id, cat]));

  const sanitizedItems = (orderData.items || []).map(item => sanitizeOrderItem({
      ...item,
      status: item.status || 'sent_to_kitchen', 
      groupId: item.groupId || orderData.groupId || null, // Inherit groupId from order if not on item
  }));

  const itemsForTax = sanitizedItems.map(item => ({
    item: {
      id: item.menuItemId,
      itemIdString: item.menuItemId,
      restaurantId,
      categoryId: item.categoryId || '', // Make sure categoryId is present on item if needed for tax
      name: item.menuItemName,
      description: '',
      price: item.unitPrice,
      availability: true, // Assume available for tax calculation
      order: 0,
      createdAt: Timestamp.now(), // Placeholder for type compatibility
      updatedAt: Timestamp.now(), // Placeholder for type compatibility
      taxOverrides: item.taxOverrides || null, // Make sure taxOverrides are passed
    },
    quantity: item.quantity,
  }));
  const taxResult = calculateOrderTaxes({ items: itemsForTax, restaurant, categoryMap });
  const derivedStatus = deriveOverallOrderStatus(sanitizedItems);

  const dataToSave: Omit<Order, 'id' | 'createdAt' | 'updatedAt'> & { createdAt: Timestamp; updatedAt: Timestamp } = {
    restaurantId: restaurantId,
    userId: orderData.userId ?? null,
    tableId: orderData.tableId ?? null,
    tableNumber: orderData.tableNumber ?? null,
    items: sanitizedItems,
    subtotal: taxResult.subtotal,
    taxAmount: taxResult.totalTax ?? null,
    serviceCharge: safeNumber(orderData.serviceCharge),
    discountAmount: safeNumber(orderData.discountAmount),
    totalAmount: taxResult.total,
    status: derivedStatus, 
    customerName: safeString(orderData.customerName),
    customerPhoneNumber: safeString(orderData.customerPhoneNumber),
    customerWhatsapp: safeString(orderData.customerWhatsapp),
    customerNotes: safeString(orderData.customerNotes),
    kitchenNotes: safeString(orderData.kitchenNotes),
    paymentMethod: safeString(orderData.paymentMethod),
    transactionId: safeString(orderData.transactionId),
    groupId: safeString(orderData.groupId), // Save groupId at the order level
    taxBreakup: (taxResult.taxBreakup && taxResult.taxBreakup.length > 0) ? taxResult.taxBreakup : null,
    createdAt: serverTimestamp() as Timestamp,
    updatedAt: serverTimestamp() as Timestamp,
  };

  const docRef = await addDoc(ordersCol, dataToSave);

  try {
    if (dataToSave.status !== 'pending_customer_confirmation' && dataToSave.status !== 'pending_kitchen') {
      await deductStockForSoldItems(restaurantId, docRef.id, dataToSave.items as ClientOrderItem[]);
    }
  } catch (error) {
    console.error(`Failed to deduct stock for order ${docRef.id}:`, error);
  }

  const nowForClient = Timestamp.now();
  return {
    id: docRef.id,
    ...dataToSave, 
    createdAt: nowForClient, 
    updatedAt: nowForClient,
    taxAmount: dataToSave.taxAmount ?? undefined,
    serviceCharge: dataToSave.serviceCharge ?? undefined,
    discountAmount: dataToSave.discountAmount ?? undefined,
    customerNotes: dataToSave.customerNotes ?? undefined,
    kitchenNotes: dataToSave.kitchenNotes ?? undefined,
    paymentMethod: dataToSave.paymentMethod ?? undefined,
    transactionId: dataToSave.transactionId ?? undefined,
    groupId: dataToSave.groupId ?? undefined,
    taxBreakup: dataToSave.taxBreakup ?? undefined,
  };
}

export async function getOrder(restaurantId: string, orderId: string): Promise<ClientOrder | null> {
    if (!db) throw new Error("Firestore is not initialized.");
    const orderRef = doc(db, getOrdersCollectionPath(restaurantId), orderId);
    const docSnap = await getDoc(orderRef);
    if (docSnap.exists()) {
        return toClientOrder(docSnap.id, docSnap.data());
    }
    return null;
}


export async function getOrdersByRestaurant(
  restaurantId: string,
  statusFilters?: OrderStatus[],
  startDateISO?: string,
  endDateISO?: string,
  tableId?: string,
): Promise<ClientOrder[]> {
  if (!db) throw new Error("Firestore is not initialized.");
  const ordersCol = collection(db, getOrdersCollectionPath(restaurantId));

  const queryConstraints: QueryConstraint[] = [];

  if (statusFilters && statusFilters.length > 0) {
    queryConstraints.push(where('status', 'in', statusFilters));
  }
  if (startDateISO) {
    queryConstraints.push(where('createdAt', '>=', Timestamp.fromDate(new Date(startDateISO))));
  }
  if (endDateISO) {
    queryConstraints.push(where('createdAt', '<=', Timestamp.fromDate(new Date(endDateISO))));
  }
  if (tableId) {
    queryConstraints.push(where('tableId', '==', tableId));
  }

  queryConstraints.push(orderBy('createdAt', 'desc'));

  const q = query(ordersCol, ...queryConstraints);

  const snapshot = await getDocs(q);
  return snapshot.docs.map(docSnap => toClientOrder(docSnap.id, docSnap.data()));
}

export async function getOrdersByTable(restaurantId: string, tableId: string, activeStatusesParam?: OrderStatus[]): Promise<ClientOrder[]> {
  if (!db) throw new Error("Firestore is not initialized.");
  const ordersCol = collection(db, getOrdersCollectionPath(restaurantId));
  const statusesToQuery = activeStatusesParam || ['pending_kitchen', 'confirmed_by_kitchen', 'preparing', 'ready_for_pickup', 'served', 'payment_pending'];

  if (!tableId) {
    console.warn("getOrdersByTable called with undefined tableId. Returning empty array.");
    return [];
  }

  const q = query(ordersCol, where('tableId', '==', tableId), where('status', 'in', statusesToQuery), orderBy('createdAt', 'asc'));

  const snapshot = await getDocs(q);
  return snapshot.docs.map(docSnap => toClientOrder(docSnap.id, docSnap.data()));
}

export async function updateOrderItemStatusInFirestore(
  restaurantId: string,
  orderId: string,
  itemUniqueId: string,
  newItemStatus: OrderItemStatus
): Promise<void> {
  if (!db) throw new Error("Firestore is not initialized.");
  const orderRef = doc(db, getOrdersCollectionPath(restaurantId), orderId);

  await runTransaction(db, async (transaction) => {
    const orderDoc = await transaction.get(orderRef);
    if (!orderDoc.exists()) {
      throw new Error(`Order ${orderId} not found.`);
    }

    const orderData = orderDoc.data() as Order;
    let items = (orderData.items || []).map(item => sanitizeOrderItem(item as Partial<OrderItem>));

    const itemIndex = items.findIndex(item => item.uniqueId === itemUniqueId);
    if (itemIndex === -1) {
      // If item not found by uniqueId, try by menuItemId if it's the only one (less safe, for backward compatibility or error recovery)
      const itemsWithSameMenuId = items.filter(item => item.menuItemId === itemUniqueId.split('-')[0]);
      if (itemsWithSameMenuId.length === 1 && itemsWithSameMenuId[0].uniqueId.startsWith(itemUniqueId.split('-')[0])) {
        const foundIndex = items.findIndex(item => item.uniqueId === itemsWithSameMenuId[0].uniqueId);
        if(foundIndex > -1) {
            items[foundIndex].status = newItemStatus;
            items[foundIndex].updatedAt = Date.now();
        } else {
             throw new Error(`Item with unique ID ${itemUniqueId} not found in order ${orderId} (fallback search failed).`);
        }
      } else {
        throw new Error(`Item with unique ID ${itemUniqueId} not found or ambiguous in order ${orderId}.`);
      }
    } else {
        items[itemIndex].status = newItemStatus;
        items[itemIndex].updatedAt = Date.now(); 
    }
    
    const newOverallStatus = deriveOverallOrderStatus(items);

    transaction.update(orderRef, { 
      items: items, 
      status: newOverallStatus, 
      updatedAt: serverTimestamp() 
    });
  });
}


export async function updateOrder(restaurantId: string, orderId: string, data: Partial<Omit<Order, 'id' | 'restaurantId' | 'createdAt' | 'updatedAt'>>): Promise<void> {
    if (!db) throw new Error("Firestore is not initialized.");
    const orderRef = doc(db, getOrdersCollectionPath(restaurantId), orderId);

    const updatePayload: { [key: string]: any } = { ...data };

    const optionalFields: (keyof Omit<Order, 'id' | 'restaurantId' | 'createdAt' | 'updatedAt' | 'items' | 'subtotal' | 'totalAmount' | 'status'>)[] = [
        'userId', 'tableId', 'tableNumber', 'customerName', 'customerPhoneNumber', 'customerWhatsapp',
        'taxAmount', 'serviceCharge', 'discountAmount', 'customerNotes', 'kitchenNotes',
        'paymentMethod', 'transactionId', 'groupId', 'taxBreakup'
    ];

    optionalFields.forEach(field => {
      if (updatePayload.hasOwnProperty(field)) {
        if (field === 'taxAmount' || field === 'serviceCharge' || field === 'discountAmount') {
            updatePayload[field] = safeNumber(updatePayload[field]);
        } else if (typeof updatePayload[field] === 'string') {
            updatePayload[field] = safeString(updatePayload[field]);
        } else if (updatePayload[field] === undefined) {
            updatePayload[field] = null;
        }
        if (field === 'taxBreakup' && (updatePayload[field] === undefined || (Array.isArray(updatePayload[field]) && updatePayload[field].length === 0))) {
            updatePayload[field] = null;
        }
      }
    });

    if (updatePayload.items && Array.isArray(updatePayload.items)) {
      updatePayload.items = updatePayload.items.map(item => sanitizeOrderItem(item as Partial<OrderItem>));
      updatePayload.status = deriveOverallOrderStatus(updatePayload.items);
    } else if (updatePayload.hasOwnProperty('status') && data.items === undefined) {
      // If only status is updated, ensure it's a valid OrderStatus.
      // The derivation logic in deriveOverallOrderStatus should be preferred.
      // This case should be rare as status should mostly be derived.
    }

    // If items are updated, re-calculate totals and taxes if not explicitly provided in `data`
    if (updatePayload.items && (!updatePayload.hasOwnProperty('subtotal') || !updatePayload.hasOwnProperty('totalAmount') || !updatePayload.hasOwnProperty('taxAmount'))) {
      const restaurant = await getRestaurant(restaurantId);
      if (!restaurant) throw new Error('Restaurant not found for order update totals recalculation.');
      const categoriesData = await getMenuCategories(restaurantId);
      const categoryMap = Object.fromEntries(categoriesData.map(cat => [cat.id, cat]));

      const itemsForTax = (updatePayload.items || []).map((item: OrderItem) => ({
        item: {
          id: item.menuItemId,
          itemIdString: item.menuItemId, // Assuming menuItemId can serve as itemIdString
          restaurantId,
          categoryId: item.categoryId || '',
          name: item.menuItemName,
          description: '',
          price: item.unitPrice,
          availability: true,
          order: 0,
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now(),
          taxOverrides: item.taxOverrides || null,
        },
        quantity: item.quantity,
      }));
      const taxResult = calculateOrderTaxes({ items: itemsForTax, restaurant, categoryMap });
      updatePayload.subtotal = taxResult.subtotal;
      updatePayload.taxAmount = taxResult.totalTax ?? null;
      updatePayload.taxBreakup = (taxResult.taxBreakup && taxResult.taxBreakup.length > 0) ? taxResult.taxBreakup : null;
      updatePayload.totalAmount = taxResult.total;
    }

    const finalUpdateData = { ...updatePayload, updatedAt: serverTimestamp() };
    await updateDoc(orderRef, finalUpdateData);

    // Deduct stock if order is now moving to a "usage" state and wasn't before
    if (data.status && ['preparing', 'served', 'completed'].includes(data.status) ) {
      const currentOrder = await getOrder(restaurantId, orderId);
      if (currentOrder && currentOrder.items) {
        // Logic to check if stock was already deducted (e.g., based on a previous status)
        // For now, assume we deduct when status becomes one of these.
        // This might need a more sophisticated check to prevent double deduction.
        await deductStockForSoldItems(restaurantId, orderId, currentOrder.items as ClientOrderItem[]);
      }
    }
}


export async function cancelOrder(restaurantId: string, orderId: string, cancelledBy: 'customer' | 'restaurant', reason?: string): Promise<void> {
  if (!db) throw new Error("Firestore is not initialized.");
  const orderRef = doc(db, getOrdersCollectionPath(restaurantId), orderId);
  const newStatus: OrderStatus = cancelledBy === 'customer' ? 'cancelled_by_customer' : 'cancelled_by_restaurant';
  
  const orderDoc = await getDoc(orderRef);
  if (!orderDoc.exists()) throw new Error("Order to cancel not found.");
  
  const orderData = orderDoc.data() as Order;
  const updatedItems = (orderData.items || []).map(item => sanitizeOrderItem({
    ...item,
    status: cancelledBy === 'customer' ? 'cancelled_by_customer' : 'cancelled_by_kitchen',
    updatedAt: Date.now(),
  }));

  const updateData: any = {
    items: updatedItems,
    status: newStatus, 
    updatedAt: serverTimestamp()
  };

  if (reason !== undefined) {
    const existingNotes = orderData.customerNotes || "";
    updateData.customerNotes = safeString(`${existingNotes} Cancellation Reason (${cancelledBy}): ${reason}`.trim());
  }
  await updateDoc(orderRef, updateData);
}

export interface RestaurantOrderSummary {
  totalRevenue: number;
  totalOrders: number;
  averageOrderValue: number;
  ordersLastPeriod?: ClientOrder[];
}

export async function getRestaurantOrderSummary(
  restaurantId: string,
  periodInDays: 7 | 30
): Promise<RestaurantOrderSummary> {
  if (!db) throw new Error("Firestore is not initialized.");
  const ordersCol = collection(db, getOrdersCollectionPath(restaurantId));

  const endDate = new Date();
  const startDate = subDays(endDate, periodInDays -1);

  const q = query(
    ordersCol,
    where('createdAt', '>=', Timestamp.fromDate(startOfDay(startDate))),
    where('createdAt', '<=', Timestamp.fromDate(endOfDay(endDate))),
    where('status', 'in', ['completed', 'served', 'payment_pending']) // Consider only orders that contribute to revenue
  );

  const snapshot = await getDocs(q);
  let totalRevenue = 0;
  const orders: ClientOrder[] = [];

  snapshot.forEach(docSnap => {
    const order = toClientOrder(docSnap.id, docSnap.data());
    totalRevenue += order.totalAmount;
    orders.push(order);
  });

  const totalOrders = snapshot.size;
  const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

  return {
    totalRevenue,
    totalOrders,
    averageOrderValue,
    ordersLastPeriod: orders,
  };
}

export interface OrderStatusDistribution {
  status: OrderStatus;
  count: number;
  fill?: string;
}
export async function getRestaurantOrderStatusDistribution(
  restaurantId: string,
  periodInDays: 7 | 30
): Promise<OrderStatusDistribution[]> {
    if (!db) throw new Error("Firestore is not initialized.");
    const ordersCol = collection(db, getOrdersCollectionPath(restaurantId));
    const endDate = new Date();
    const startDate = subDays(endDate, periodInDays -1);

    const q = query(
        ordersCol,
        where('createdAt', '>=', Timestamp.fromDate(startOfDay(startDate))),
        where('createdAt', '<=', Timestamp.fromDate(endOfDay(endDate)))
    );

    const snapshot = await getDocs(q);
    const statusCounts: Record<OrderStatus, number> = {} as Record<OrderStatus, number>;

    snapshot.forEach(docSnap => {
        const order = docSnap.data() as Order;
        statusCounts[order.status] = (statusCounts[order.status] || 0) + 1;
    });

    return (Object.keys(statusCounts) as OrderStatus[]).map(status => ({
        status,
        count: statusCounts[status]
    }));
}


export interface PopularItem {
  menuItemId: string;
  menuItemName: string;
  orderCount: number;
  totalRevenue: number;
}
export async function getPopularMenuItems(
  restaurantId: string,
  periodInDays: 7 | 30,
  limitCount: number = 5
): Promise<PopularItem[]> {
  if (!db) throw new Error("Firestore is not initialized.");
  const ordersCol = collection(db, getOrdersCollectionPath(restaurantId));
  const endDate = new Date();
  const startDate = subDays(endDate, periodInDays -1);

  const q = query(
    ordersCol,
    where('createdAt', '>=', Timestamp.fromDate(startOfDay(startDate))),
    where('createdAt', '<=', Timestamp.fromDate(endOfDay(endDate))),
     where('status', 'in', ['completed', 'served', 'payment_pending']) // Consider only items from revenue-generating orders
  );

  const snapshot = await getDocs(q);
  const itemStats: Record<string, { name: string, count: number, revenue: number }> = {};

  snapshot.forEach(docSnap => {
    const order = docSnap.data() as Order;
    (order.items || []).forEach(item => {
      if (!itemStats[item.menuItemId]) {
        itemStats[item.menuItemId] = { name: item.menuItemName, count: 0, revenue: 0 };
      }
      itemStats[item.menuItemId].count += item.quantity;
      itemStats[item.menuItemId].revenue += item.totalPrice;
    });
  });

  return Object.entries(itemStats)
    .map(([menuItemId, data]) => ({
      menuItemId,
      menuItemName: data.name,
      orderCount: data.count,
      totalRevenue: data.revenue,
    }))
    .sort((a, b) => b.orderCount - a.orderCount) // Sort by count
    .slice(0, limitCount);
}


export function listenToRestaurantOrders(
  restaurantId: string,
  callback: (orders: ClientOrder[]) => void,
  periodInDays: 7 | 30 = 7 // Default to 7 days for live dashboard views, can be adjusted
): () => void { // Returns an unsubscribe function
  if (!db) throw new Error("Firestore is not initialized for real-time listener.");

  const ordersCol = collection(db, getOrdersCollectionPath(restaurantId));
  const endDate = new Date();
  const startDate = subDays(endDate, periodInDays - 1);

  // Query for orders within the specified period
  const q = query(
    ordersCol,
    where('createdAt', '>=', Timestamp.fromDate(startOfDay(startDate))),
    where('createdAt', '<=', Timestamp.fromDate(endOfDay(endDate))),
    orderBy('createdAt', 'desc') // Show most recent first
  );

  const unsubscribe = onSnapshot(q, (snapshot) => {
    const orders = snapshot.docs.map(docSnap => toClientOrder(docSnap.id, docSnap.data()));
    callback(orders);
  }, (error) => {
    console.error(`Error listening to orders for restaurant ${restaurantId}:`, error);
    // Optionally, call callback with an empty array or error indicator
    // callback([]); 
  });

  return unsubscribe; // Return the unsubscribe function
}
