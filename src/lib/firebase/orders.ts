// src/lib/firebase/orders.ts
// Removed 'use server' directive as listenToRestaurantOrders uses onSnapshot (client-side listener)
// and server actions must be async. If other functions in this file were intended as server actions
// for form submissions, they might need to be refactored or this file split.

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
  QueryConstraint, 
  limit,
  getCountFromServer,
  onSnapshot, 
  startAt,
  endAt,
  documentId,
} from 'firebase/firestore';
import { db } from './config';
import type { Order, OrderStatus, OrderItem, ClientOrder, MenuItem } from '@/types';
import { convertFirebaseTimestampToString, getOrdersCollectionPath } from './utils'; 
import { startOfDay, endOfDay, subDays } from 'date-fns';
import { getRestaurant } from './firestore';
import { getMenuCategories } from './menu';
import { calculateOrderTaxes } from '../taxEngine';

const safeString = (value: any): string | undefined => typeof value === 'string' ? value : undefined;
const safeNumber = (value: any): number | undefined => typeof value === 'number' && !isNaN(value) ? value : undefined;

const toClientOrder = (docId: string, data: any): ClientOrder => {
    const orderBase: Omit<ClientOrder, 'id' | 'createdAt' | 'updatedAt'> = {
        restaurantId: data.restaurantId,
        userId: data.userId || undefined, 
        tableId: data.tableId || null,
        tableNumber: data.tableNumber || null,
        items: data.items as OrderItem[],
        subtotal: data.subtotal,
        totalAmount: data.totalAmount,
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

  // --- TAX ENGINE INTEGRATION ---
  // 1. Fetch restaurant profile (with taxes)
  const restaurant = await getRestaurant(restaurantId);
  if (!restaurant) throw new Error('Restaurant not found');
  // 2. Fetch all categories for this restaurant
  const categories = await getMenuCategories(restaurantId);
  const categoryMap = Object.fromEntries(categories.map(cat => [cat.id, cat]));
  // 3. Prepare items for tax engine (need MenuItem shape)
  //    orderData.items: OrderItem[] (need to fetch MenuItem for each)
  //    For now, assume orderData.items have enough info (id, price, categoryId, taxOverrides)
  //    If not, you may need to fetch each MenuItem by id
  const itemsForTax = orderData.items.map(item => ({
    item: {
      id: item.menuItemId,
      itemIdString: item.menuItemId,
      restaurantId,
      categoryId: (item as any).categoryId || '', // Use categoryId from OrderItem if present
      name: item.menuItemName,
      description: '',
      price: item.unitPrice,
      availability: true,
      order: 0,
      createdAt: createdAt as Timestamp,
      updatedAt: updatedAt as Timestamp,
      // taxOverrides: ... // If you have this info, pass it
    },
    quantity: item.quantity,
  }));
  const taxResult = calculateOrderTaxes({ items: itemsForTax, restaurant, categoryMap });

  const dataToSave = {
    ...orderData,
    restaurantId,
    userId: orderData.userId || null, 
    createdAt,
    updatedAt,
    tableId: orderData.tableId || null,
    tableNumber: orderData.tableNumber || null,
    customerName: orderData.customerName || null, 
    customerPhoneNumber: orderData.customerPhoneNumber || null,
    customerWhatsapp: orderData.customerWhatsapp || null,
    groupId: orderData.groupId || null,
    subtotal: taxResult.subtotal,
    taxAmount: taxResult.totalTax,
    taxBreakup: taxResult.taxBreakup,
    totalAmount: taxResult.total,
  };

  const docRef = await addDoc(ordersCol, dataToSave);
  return {
    id: docRef.id,
    ...orderData, 
    subtotal: taxResult.subtotal,
    taxAmount: taxResult.totalTax,
    taxBreakup: taxResult.taxBreakup,
    totalAmount: taxResult.total,
    createdAt: Timestamp.now(), 
    updatedAt: Timestamp.now(), 
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
  if (kitchenNotes) {
    updateData.kitchenNotes = kitchenNotes;
  }
  await updateDoc(orderRef, updateData);
}

export async function updateOrder(restaurantId: string, orderId: string, data: Partial<Omit<Order, 'id' | 'restaurantId' | 'createdAt' | 'updatedAt'>>): Promise<void> {
    if (!db) throw new Error("Firestore is not initialized.");
    const orderRef = doc(db, getOrdersCollectionPath(restaurantId), orderId);
    const updatePayload: { [key: string]: any } = { ...data };
    
    if (updatePayload.hasOwnProperty('createdAt')) {
      delete updatePayload.createdAt; 
    }
    
    updatePayload.customerName = data.customerName === undefined ? null : data.customerName;
    updatePayload.customerPhoneNumber = data.customerPhoneNumber === undefined ? null : data.customerPhoneNumber;
    updatePayload.customerWhatsapp = data.customerWhatsapp === undefined ? null : data.customerWhatsapp;
    updatePayload.groupId = data.groupId === undefined ? null : data.groupId;


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
  if (reason) {
    const currentOrderSnapshot = await getDoc(orderRef); 
    if (currentOrderSnapshot.exists()){
        const currentOrderData = currentOrderSnapshot.data();
        const existingNotes = currentOrderData?.customerNotes || ""; 
        updateData.customerNotes = `${existingNotes} Cancellation Reason (${cancelledBy}): ${reason}`.trim();
    } else {
        updateData.customerNotes = `Cancellation Reason (${cancelledBy}): ${reason}`;
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
    order.items.forEach(item => {
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

// Real-time listener setup for a restaurant's orders
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
