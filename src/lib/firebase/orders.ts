

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
  collectionGroup,
  QueryConstraint, 
} from 'firebase/firestore';
import { db } from './config';
import type { Order, OrderStatus, OrderItem, ClientOrder } from '@/types';

const getOrdersCollectionPath = (restaurantId: string) => `restaurants/${restaurantId}/orders`;

const convertFirebaseTimestampToString = (ts: any): string => {
    if (!ts) return new Date().toISOString(); 
    if (ts instanceof Timestamp) {
        return ts.toDate().toISOString();
    }
    if (typeof ts === 'object' && ts !== null && typeof ts.seconds === 'number' && typeof ts.nanoseconds === 'number') {
        return new Date(ts.seconds * 1000 + ts.nanoseconds / 1000000).toISOString();
    }
    if (typeof ts === 'string') {
        try {
            const date = new Date(ts);
            if (!isNaN(date.getTime())) { 
                return date.toISOString();
            }
        } catch (e) {
          // If parsing fails, fall through to default
        }
    }
    console.warn("Unhandled timestamp format in convertFirebaseTimestampToString, returning current date as ISO string:", ts);
    return new Date().toISOString(); 
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
    tableId: orderData.tableId || null, // Ensure tableId is null if not provided
    tableNumber: orderData.tableNumber || null, // Ensure tableNumber is null if not provided
  };

  const docRef = await addDoc(ordersCol, dataToSave);
  
  return {
    id: docRef.id,
    ...orderData,
    createdAt: Timestamp.now(), 
    updatedAt: Timestamp.now(), 
  } as Order; 
}

// Helper to safely get optional string fields
const safeString = (value: any): string | undefined => typeof value === 'string' ? value : undefined;
const safeNumber = (value: any): number | undefined => typeof value === 'number' && !isNaN(value) ? value : undefined;


const toClientOrder = (docId: string, data: any): ClientOrder => {
    // Ensure all fields from Order are considered, especially optional ones.
    const orderBase: Omit<Order, 'id' | 'createdAt' | 'updatedAt'> = {
        restaurantId: data.restaurantId,
        tableId: data.tableId, // Can be string or null
        tableNumber: data.tableNumber, // Can be string or null
        items: data.items as OrderItem[],
        subtotal: data.subtotal,
        totalAmount: data.totalAmount,
        status: data.status as OrderStatus,
        // Optional fields from Order type
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

export async function updateOrder(restaurantId: string, orderId: string, data: Partial<Omit<Order, 'id' | 'restaurantId' | 'createdAt'>>): Promise<void> {
    if (!db) throw new Error("Firestore is not initialized.");
    const orderRef = doc(db, getOrdersCollectionPath(restaurantId), orderId);
    const updatePayload: { [key: string]: any } = { ...data };

    const finalUpdateData = { ...updatePayload, updatedAt: serverTimestamp() };
    
    if (finalUpdateData.hasOwnProperty('createdAt')) {
      delete finalUpdateData.createdAt;
    }
    
    // Ensure tableId and tableNumber are explicitly set to null if undefined in payload,
    // to avoid issues if they were previously set and now need to be cleared.
    // However, usually these are not updated post-creation in this manner.
    // This is more for fields like notes, items, status, etc.
    if (data.tableId === undefined) finalUpdateData.tableId = data.tableId === null ? null : (await getDoc(orderRef)).data()?.tableId;
    if (data.tableNumber === undefined) finalUpdateData.tableNumber = data.tableNumber === null ? null : (await getDoc(orderRef)).data()?.tableNumber;


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

