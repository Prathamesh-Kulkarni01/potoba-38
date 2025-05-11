// src/lib/firebase/orders.ts
'use server';

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
} from 'firebase/firestore';
import { db } from './config';
import type { Order, OrderStatus, OrderItem, ClientOrder } from '@/types';
import { convertFirebaseTimestampToString, getOrdersCollectionPath } from './utils'; // Import the utility

const safeString = (value: any): string | undefined => typeof value === 'string' ? value : undefined : undefined;
const safeNumber = (value: any): number | undefined => typeof value === 'number' && !isNaN(value) ? value : undefined : undefined;

const toClientOrder = (docId: string, data: any): ClientOrder => {
    const orderBase: Omit<ClientOrder, 'id' | 'createdAt' | 'updatedAt'> = {
        restaurantId: data.restaurantId,
        tableId: data.tableId || null,
        tableNumber: data.tableNumber || null,
        items: data.items as OrderItem[],
        subtotal: data.subtotal,
        totalAmount: data.totalAmount,
        status: data.status as OrderStatus,
        customerName: safeString(data.customerName),
        customerWhatsapp: safeString(data.customerWhatsapp),
        taxAmount: safeNumber(data.taxAmount),
        serviceCharge: safeNumber(data.serviceCharge),
        discountAmount: safeNumber(data.discountAmount),
        customerNotes: safeString(data.customerNotes),
        kitchenNotes: safeString(data.kitchenNotes),
        paymentMethod: safeString(data.paymentMethod),
        transactionId: safeString(data.transactionId),
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

  const dataToSave = {
    ...orderData,
    restaurantId, 
    createdAt,
    updatedAt,
    tableId: orderData.tableId || null,
    tableNumber: orderData.tableNumber || null,
    customerName: orderData.customerName || undefined,
    customerWhatsapp: orderData.customerWhatsapp || undefined,
  };

  const docRef = await addDoc(ordersCol, dataToSave);
  
  return {
    id: docRef.id,
    ...orderData,
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

// This function is kept for potential one-time fetches if needed elsewhere.
// For real-time updates on the main orders page, onSnapshot is used directly in the component.
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


// This function is kept for potential one-time fetches if needed elsewhere.
// For real-time updates in table management, onSnapshot is used directly in the component.
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
    
    // Ensure timestamps from client (which might be strings) are not passed directly if they are meant to be server timestamps.
    // This is mainly for `createdAt` which should not be updated after creation. `updatedAt` is always serverTimestamp().
    if (updatePayload.hasOwnProperty('createdAt')) {
      delete updatePayload.createdAt; 
    }
    // if (updatePayload.hasOwnProperty('updatedAt')) {
    //   delete updatePayload.updatedAt; // Let serverTimestamp handle this
    // }
    
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
