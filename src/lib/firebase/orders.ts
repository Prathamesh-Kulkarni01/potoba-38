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
  QueryConstraint, // Import QueryConstraint
} from 'firebase/firestore';
import { db } from './config';
import type { Order, OrderStatus, OrderItem } from '@/types';

const getOrdersCollectionPath = (restaurantId: string) => `restaurants/${restaurantId}/orders`;

export async function createOrder(restaurantId: string, orderData: Omit<Order, 'id' | 'createdAt' | 'updatedAt'>): Promise<Order> {
  if (!db) throw new Error("Firestore is not initialized.");
  const ordersCol = collection(db, getOrdersCollectionPath(restaurantId));
  const createdAt = serverTimestamp(); // This is a sentinel value
  const updatedAt = serverTimestamp(); // This is a sentinel value

  const docRef = await addDoc(ordersCol, {
    ...orderData,
    restaurantId, 
    createdAt,
    updatedAt,
  });
  
  // For optimistic UI updates, return with client-side Timestamp. Actual value is server-generated.
  return {
    id: docRef.id,
    ...orderData,
    createdAt: Timestamp.now(), 
    updatedAt: Timestamp.now(), 
  } as Order;
}

export async function getOrder(restaurantId: string, orderId: string): Promise<Order | null> {
    if (!db) throw new Error("Firestore is not initialized.");
    const orderRef = doc(db, getOrdersCollectionPath(restaurantId), orderId);
    const docSnap = await getDoc(orderRef);
    if (docSnap.exists()) {
        const data = docSnap.data();
        // Ensure createdAt and updatedAt are Firestore Timestamps
        return {
            id: docSnap.id,
            ...data,
            createdAt: data.createdAt instanceof Timestamp ? data.createdAt : Timestamp.fromDate(new Date(data.createdAt?.seconds * 1000 || Date.now())),
            updatedAt: data.updatedAt instanceof Timestamp ? data.updatedAt : Timestamp.fromDate(new Date(data.updatedAt?.seconds * 1000 || Date.now())),
        } as Order;
    }
    return null;
}


export async function getOrdersByRestaurant(
  restaurantId: string, 
  statusFilters?: OrderStatus[],
  startDate?: Timestamp,
  endDate?: Timestamp,
  tableId?: string,
): Promise<Order[]> {
  if (!db) throw new Error("Firestore is not initialized.");
  const ordersCol = collection(db, getOrdersCollectionPath(restaurantId));
  
  const queryConstraints: QueryConstraint[] = [];

  if (statusFilters && statusFilters.length > 0) {
    queryConstraints.push(where('status', 'in', statusFilters));
  }
  if (startDate) {
    queryConstraints.push(where('createdAt', '>=', startDate));
  }
  if (endDate) {
    // For 'endDate', if it's meant to be inclusive of the whole day, adjust it to the end of the day.
    // Example: new Date(endDate.toDate().setHours(23, 59, 59, 999))
    // For simplicity, assuming endDate is already correctly formed for the query.
    queryConstraints.push(where('createdAt', '<=', endDate));
  }
  if (tableId) {
    queryConstraints.push(where('tableId', '==', tableId));
  }

  queryConstraints.push(orderBy('createdAt', 'desc')); // Default sort

  const q = query(ordersCol, ...queryConstraints);
  
  const snapshot = await getDocs(q);
  return snapshot.docs.map(docSnap => {
    const data = docSnap.data();
    // Ensure createdAt and updatedAt are Firestore Timestamps
    return { 
      id: docSnap.id, 
      ...data,
      createdAt: data.createdAt instanceof Timestamp ? data.createdAt : Timestamp.fromDate(new Date(data.createdAt?.seconds * 1000 || Date.now())),
      updatedAt: data.updatedAt instanceof Timestamp ? data.updatedAt : Timestamp.fromDate(new Date(data.updatedAt?.seconds * 1000 || Date.now())),
    } as Order;
  });
}

export async function getOrdersByTable(restaurantId: string, tableId: string, activeStatusesParam?: OrderStatus[]): Promise<Order[]> {
  if (!db) throw new Error("Firestore is not initialized.");
  const ordersCol = collection(db, getOrdersCollectionPath(restaurantId));
  const statusesToQuery = activeStatusesParam || ['pending_kitchen', 'confirmed_by_kitchen', 'preparing', 'ready_for_pickup', 'served', 'payment_pending'];
  const q = query(ordersCol, where('tableId', '==', tableId), where('status', 'in', statusesToQuery), orderBy('createdAt', 'asc'));
  
  const snapshot = await getDocs(q);
  return snapshot.docs.map(docSnap => {
    const data = docSnap.data();
    return { 
      id: docSnap.id, 
      ...data,
      createdAt: data.createdAt instanceof Timestamp ? data.createdAt : Timestamp.fromDate(new Date(data.createdAt?.seconds * 1000 || Date.now())),
      updatedAt: data.updatedAt instanceof Timestamp ? data.updatedAt : Timestamp.fromDate(new Date(data.updatedAt?.seconds * 1000 || Date.now())),
    } as Order;
  });
}

export async function updateOrderStatus(restaurantId: string, orderId: string, status: OrderStatus, kitchenNotes?: string): Promise<void> {
  if (!db) throw new Error("Firestore is not initialized.");
  const orderRef = doc(db, getOrdersCollectionPath(restaurantId), orderId);
  const updateData: any = { // Use any for flexibility with serverTimestamp
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
    const updateData: any = { ...data, updatedAt: serverTimestamp() };
     // Ensure Timestamps aren't passed as strings if they exist in data
    if (data.createdAt && typeof data.createdAt !== 'string') {
      updateData.createdAt = data.createdAt;
    } else if (data.createdAt) {
      delete updateData.createdAt; // Avoid trying to write string as timestamp
    }
    await updateDoc(orderRef, updateData);
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
     // Fetch existing order to append reason to notes, or create notes field
    const currentOrder = await getOrder(restaurantId, orderId);
    const existingNotes = currentOrder?.notes || "";
    updateData.notes = `${existingNotes} Cancellation Reason (${cancelledBy}): ${reason}`.trim();
  }
  await updateDoc(orderRef, updateData);
}

