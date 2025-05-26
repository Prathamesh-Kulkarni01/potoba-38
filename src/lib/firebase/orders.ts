
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
} from 'firebase/firestore';
import { db } from './config';
import type { Order, OrderStatus, OrderItem, ClientOrder, MenuItem, TaxConfig, MenuCategory, RestaurantProfile } from '@/types';
import { convertFirebaseTimestampToString, getOrdersCollectionPath } from './utils';
import { startOfDay, endOfDay, subDays } from 'date-fns';
import { getRestaurant } from './firestore';
import { getMenuCategories, getMenuItemByIdFromGroup } from './menu';
import { calculateOrderTaxes } from '../taxEngine';
import { deductStockForSoldItems } from './inventory';

const safeString = (value: any): string | null => typeof value === 'string' && value.trim() !== '' ? value : null;
const safeNumber = (value: any): number | null => typeof value === 'number' && !isNaN(value) ? value : null;

// Helper to sanitize an OrderItem
const sanitizeOrderItem = (item: Partial<OrderItem>): OrderItem => {
  const menuItemId = item.menuItemId || 'unknown-item';
  const menuItemName = item.menuItemName || 'Unknown Item';
  const unitPrice = typeof item.unitPrice === 'number' ? item.unitPrice : 0;
  const quantity = typeof item.quantity === 'number' && item.quantity > 0 ? item.quantity : 0; // Quantity should be positive

  return {
    menuItemId: menuItemId,
    menuItemName: menuItemName,
    quantity: quantity,
    unitPrice: unitPrice,
    totalPrice: unitPrice * quantity,
    variantChoices: item.variantChoices || null,
    notes: safeString(item.notes),
    status: item.status || 'pending',
    createdAt: item.createdAt || Date.now(),
    uniqueId: item.uniqueId || `${menuItemId}-${item.createdAt || Date.now()}-${Math.random().toString(36).substring(7)}`,
    instructions: safeString(item.instructions),
    groupId: safeString(item.groupId),
    imageUrl: safeString(item.imageUrl),
    categoryId: safeString(item.categoryId),
    taxOverrides: item.taxOverrides || null, // Assuming taxOverrides is an array or null
  };
};


const toClientOrder = (docId: string, data: any): ClientOrder => {
    const orderBase: Omit<ClientOrder, 'id' | 'createdAt' | 'updatedAt'> = {
        restaurantId: data.restaurantId,
        userId: data.userId || null,
        tableId: data.tableId || null,
        tableNumber: data.tableNumber || null,
        items: (data.items || []).map(sanitizeOrderItem), // Ensure items are sanitized
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


export async function createOrder(restaurantId: string, orderData: Omit<Order, 'id' | 'createdAt' | 'updatedAt'>): Promise<Order> {
  if (!db) throw new Error("Firestore is not initialized.");
  const ordersCol = collection(db, getOrdersCollectionPath(restaurantId));
  const createdAt = serverTimestamp();
  const updatedAt = serverTimestamp();

  const restaurant = await getRestaurant(restaurantId);
  if (!restaurant) throw new Error('Restaurant not found for order creation.');
  const categoriesData = await getMenuCategories(restaurantId);
  const categoryMap = Object.fromEntries(categoriesData.map(cat => [cat.id, cat]));

  const itemsForTax = (orderData.items || []).map(item => ({
    item: {
      id: item.menuItemId,
      itemIdString: item.menuItemId, // Assuming itemIdString is same as menuItemId for simplicity
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

  const dataToSave: Omit<Order, 'id'> & { createdAt: any, updatedAt: any } = {
    restaurantId,
    userId: orderData.userId || null,
    tableId: orderData.tableId || null,
    tableNumber: orderData.tableNumber || null,
    items: (orderData.items || []).map(sanitizeOrderItem),
    subtotal: taxResult.subtotal,
    taxAmount: taxResult.totalTax === undefined ? null : taxResult.totalTax,
    taxBreakup: taxResult.taxBreakup && taxResult.taxBreakup.length > 0 ? taxResult.taxBreakup : null,
    totalAmount: taxResult.total,
    status: orderData.status || 'pending_kitchen',
    customerName: safeString(orderData.customerName),
    customerPhoneNumber: safeString(orderData.customerPhoneNumber),
    customerWhatsapp: safeString(orderData.customerWhatsapp),
    customerNotes: safeString(orderData.customerNotes),
    kitchenNotes: safeString(orderData.kitchenNotes),
    paymentMethod: safeString(orderData.paymentMethod),
    transactionId: safeString(orderData.transactionId),
    groupId: safeString(orderData.groupId),
    serviceCharge: safeNumber(orderData.serviceCharge),
    discountAmount: safeNumber(orderData.discountAmount),
    createdAt,
    updatedAt,
  };

  const docRef = await addDoc(ordersCol, dataToSave);

  try {
    await deductStockForSoldItems(restaurantId, docRef.id, dataToSave.items as ClientOrderItem[]);
  } catch (error) {
    console.error(`Failed to deduct stock for order ${docRef.id}:`, error);
  }

  const nowForClient = Timestamp.now();
  return {
    id: docRef.id,
    ...orderData,
    items: dataToSave.items, // Use sanitized items
    subtotal: dataToSave.subtotal,
    taxAmount: dataToSave.taxAmount!,
    taxBreakup: dataToSave.taxBreakup!,
    totalAmount: dataToSave.totalAmount,
    createdAt: nowForClient,
    updatedAt: nowForClient,
  } as Order;
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

export async function updateOrderStatus(restaurantId: string, orderId: string, status: OrderStatus, kitchenNotes?: string): Promise<void> {
  if (!db) throw new Error("Firestore is not initialized.");
  const orderRef = doc(db, getOrdersCollectionPath(restaurantId), orderId);
  const updateData: any = {
    status,
    updatedAt: serverTimestamp(),
  };
  if (kitchenNotes !== undefined) {
    updateData.kitchenNotes = safeString(kitchenNotes);
  }
  await updateDoc(orderRef, updateData);
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
        // Explicitly handle potential undefined for number fields as well before safeNumber
        if (field === 'taxAmount' || field === 'serviceCharge' || field === 'discountAmount') {
            updatePayload[field] = safeNumber(updatePayload[field]);
        } else if (typeof updatePayload[field] === 'string') {
            updatePayload[field] = safeString(updatePayload[field]);
        } else if (updatePayload[field] === undefined) {
            updatePayload[field] = null;
        }
        // For other types like taxBreakup (array), if it's undefined, set to null or ensure it's omitted if already handled by spread
        if (field === 'taxBreakup' && updatePayload[field] === undefined) {
            updatePayload[field] = null;
        }
      }
    });

    if (updatePayload.items && Array.isArray(updatePayload.items)) {
      updatePayload.items = updatePayload.items.map(sanitizeOrderItem); // Ensure items are sanitized
    }

    // Recalculate totals if items are part of the update
    if (updatePayload.items) {
      const restaurant = await getRestaurant(restaurantId);
      if (!restaurant) throw new Error('Restaurant not found for order update.');
      const categoriesData = await getMenuCategories(restaurantId);
      const categoryMap = Object.fromEntries(categoriesData.map(cat => [cat.id, cat]));

      const itemsForTax = (updatePayload.items || []).map((item: OrderItem) => ({
        item: {
          id: item.menuItemId,
          itemIdString: item.menuItemId,
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
      updatePayload.taxAmount = taxResult.totalTax === undefined ? null : taxResult.totalTax;
      updatePayload.taxBreakup = taxResult.taxBreakup && taxResult.taxBreakup.length > 0 ? taxResult.taxBreakup : null;
      updatePayload.totalAmount = taxResult.total;
    }


    const finalUpdateData = { ...updatePayload, updatedAt: serverTimestamp() };

    await updateDoc(orderRef, finalUpdateData);
}


export async function cancelOrder(restaurantId: string, orderId: string, cancelledBy: 'customer' | 'restaurant', reason?: string): Promise<void> {
  if (!db) throw new Error("Firestore is not initialized.");
  const orderRef = doc(db, getOrdersCollectionPath(restaurantId), orderId);
  const status: OrderStatus = cancelledBy === 'customer' ? 'cancelled_by_customer' : 'cancelled_by_restaurant';
  const updateData: any = {
    status,
    updatedAt: serverTimestamp()
  };
  if (reason !== undefined) {
    const currentOrderSnapshot = await getDoc(orderRef);
    if (currentOrderSnapshot.exists()){
        const currentOrderData = currentOrderSnapshot.data();
        const existingNotes = currentOrderData?.customerNotes || "";
        updateData.customerNotes = safeString(`${existingNotes} Cancellation Reason (${cancelledBy}): ${reason}`.trim());
    } else {
        updateData.customerNotes = safeString(`Cancellation Reason (${cancelledBy}): ${reason}`);
    }
  }
  await updateDoc(orderRef, updateData);
}

// --- Dashboard Specific Data Fetching ---
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
    where('status', 'in', ['completed', 'served', 'payment_pending'])
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
  fill?: string; // For charts
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
     where('status', 'in', ['completed', 'served', 'payment_pending'])
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
    .sort((a, b) => b.orderCount - a.orderCount)
    .slice(0, limitCount);
}


export function listenToRestaurantOrders(
  restaurantId: string,
  callback: (orders: ClientOrder[]) => void,
  periodInDays: 7 | 30 = 7
): () => void {
  if (!db) throw new Error("Firestore is not initialized for real-time listener.");

  const ordersCol = collection(db, getOrdersCollectionPath(restaurantId));
  const endDate = new Date();
  const startDate = subDays(endDate, periodInDays - 1);

  const q = query(
    ordersCol,
    where('createdAt', '>=', Timestamp.fromDate(startOfDay(startDate))),
    where('createdAt', '<=', Timestamp.fromDate(endOfDay(endDate))),
    orderBy('createdAt', 'desc')
  );

  const unsubscribe = onSnapshot(q, (snapshot) => {
    const orders = snapshot.docs.map(docSnap => toClientOrder(docSnap.id, docSnap.data()));
    callback(orders);
  }, (error) => {
    console.error(`Error listening to orders for restaurant ${restaurantId}:`, error);
    // Optionally, you could propagate this error to the UI
  });

  return unsubscribe;
}

    