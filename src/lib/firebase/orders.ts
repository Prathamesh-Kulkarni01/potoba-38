
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

  const docRef = await addDoc(ordersCol, {
    ...orderData,
    restaurantId, 
    createdAt,
    updatedAt,
  });
  
  return {
    id: docRef.id,
    ...orderData,
    createdAt: Timestamp.now(), // For Firestore, this should be a Timestamp
    updatedAt: Timestamp.now(), // For Firestore, this should be a Timestamp
  } as Order; // This function interacts with Firestore, so Order type with Timestamp is correct here.
}

export async function getOrder(restaurantId: string, orderId: string): Promise<ClientOrder | null> {
    if (!db) throw new Error("Firestore is not initialized.");
    const orderRef = doc(db, getOrdersCollectionPath(restaurantId), orderId);
    const docSnap = await getDoc(orderRef);
    if (docSnap.exists()) {
        const data = docSnap.data();
        const clientOrderData: Omit<ClientOrder, 'id'> = {
            ...(data as Omit<Order, 'id' | 'createdAt' | 'updatedAt'>),
            restaurantId: data.restaurantId,
            tableId: data.tableId,
            tableNumber: data.tableNumber,
            items: data.items as OrderItem[],
            subtotal: data.subtotal,
            totalAmount: data.totalAmount,
            status: data.status as OrderStatus,
            createdAt: convertFirebaseTimestampToString(data.createdAt),
            updatedAt: convertFirebaseTimestampToString(data.updatedAt),
            taxAmount: data.taxAmount,
            serviceCharge: data.serviceCharge,
            discountAmount: data.discountAmount,
            customerNotes: data.customerNotes,
            kitchenNotes: data.kitchenNotes,
            paymentMethod: data.paymentMethod,
            transactionId: data.transactionId,
        };
        return {
            id: docSnap.id,
            ...clientOrderData
        };
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
  return snapshot.docs.map(docSnap => {
    const data = docSnap.data();
    const clientOrderData: Omit<ClientOrder, 'id'> = {
        ...(data as Omit<Order, 'id' | 'createdAt' | 'updatedAt'>),
        restaurantId: data.restaurantId,
        tableId: data.tableId,
        tableNumber: data.tableNumber,
        items: data.items as OrderItem[],
        subtotal: data.subtotal,
        totalAmount: data.totalAmount,
        status: data.status as OrderStatus,
        createdAt: convertFirebaseTimestampToString(data.createdAt),
        updatedAt: convertFirebaseTimestampToString(data.updatedAt),
        taxAmount: data.taxAmount,
        serviceCharge: data.serviceCharge,
        discountAmount: data.discountAmount,
        customerNotes: data.customerNotes,
        kitchenNotes: data.kitchenNotes,
        paymentMethod: data.paymentMethod,
        transactionId: data.transactionId,
    };
    return { 
      id: docSnap.id, 
      ...clientOrderData
    };
  });
}

export async function getOrdersByTable(restaurantId: string, tableId: string, activeStatusesParam?: OrderStatus[]): Promise<ClientOrder[]> {
  if (!db) throw new Error("Firestore is not initialized.");
  const ordersCol = collection(db, getOrdersCollectionPath(restaurantId));
  const statusesToQuery = activeStatusesParam || ['pending_kitchen', 'confirmed_by_kitchen', 'preparing', 'ready_for_pickup', 'served', 'payment_pending'];
  const q = query(ordersCol, where('tableId', '==', tableId), where('status', 'in', statusesToQuery), orderBy('createdAt', 'asc'));
  
  const snapshot = await getDocs(q);
  return snapshot.docs.map(docSnap => {
    const data = docSnap.data();
    const clientOrderData: Omit<ClientOrder, 'id'> = {
        ...(data as Omit<Order, 'id' | 'createdAt' | 'updatedAt'>),
        restaurantId: data.restaurantId,
        tableId: data.tableId,
        tableNumber: data.tableNumber,
        items: data.items as OrderItem[],
        subtotal: data.subtotal,
        totalAmount: data.totalAmount,
        status: data.status as OrderStatus,
        createdAt: convertFirebaseTimestampToString(data.createdAt),
        updatedAt: convertFirebaseTimestampToString(data.updatedAt),
        taxAmount: data.taxAmount,
        serviceCharge: data.serviceCharge,
        discountAmount: data.discountAmount,
        customerNotes: data.customerNotes,
        kitchenNotes: data.kitchenNotes,
        paymentMethod: data.paymentMethod,
        transactionId: data.transactionId,
    };
    return { 
      id: docSnap.id, 
      ...clientOrderData
    };
  });
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

    // Convert string dates back to Timestamps if they are part of the update payload
    // This is unlikely for partial updates like status changes, but good to be aware of.
    // For this function, we primarily expect status or notes updates.
    // If `data` could contain `createdAt` or `updatedAt` as strings intended for update,
    // they would need special handling to convert back to Firestore Timestamps or serverTimestamp().
    // However, `createdAt` should generally not be updated. `updatedAt` is handled by serverTimestamp().

    const finalUpdateData = { ...updatePayload, updatedAt: serverTimestamp() };
    
    // Remove createdAt from update payload if it's somehow included, as it shouldn't be changed after creation.
    if (finalUpdateData.hasOwnProperty('createdAt')) {
      delete finalUpdateData.createdAt;
    }

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
    const currentOrderSnapshot = await getDoc(orderRef); // Fetch current order to append reason
    if (currentOrderSnapshot.exists()){
        const currentOrderData = currentOrderSnapshot.data();
        const existingNotes = currentOrderData?.customerNotes || ""; // Assuming cancellation reason goes to customerNotes
        updateData.customerNotes = `${existingNotes} Cancellation Reason (${cancelledBy}): ${reason}`.trim();
    } else {
        updateData.customerNotes = `Cancellation Reason (${cancelledBy}): ${reason}`;
    }
  }
  await updateDoc(orderRef, updateData);
}
