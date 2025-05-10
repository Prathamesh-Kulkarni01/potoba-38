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
} from 'firebase/firestore';
import { db } from './config';
import type { Order, OrderStatus, OrderItem } from '@/types';

const getOrdersCollectionPath = (restaurantId: string) => `restaurants/${restaurantId}/orders`;

export async function createOrder(restaurantId: string, orderData: Omit&lt;Order, 'id' | 'createdAt' | 'updatedAt'>): Promise&lt;Order> {
  if (!db) throw new Error("Firestore is not initialized.");
  const ordersCol = collection(db, getOrdersCollectionPath(restaurantId));
  const createdAt = serverTimestamp();
  const updatedAt = serverTimestamp();

  const docRef = await addDoc(ordersCol, {
    ...orderData,
    restaurantId, // Ensure restaurantId is part of the document
    createdAt,
    updatedAt,
  });

  return {
    id: docRef.id,
    ...orderData,
    createdAt: Timestamp.now(), // Optimistic
    updatedAt: Timestamp.now(), // Optimistic
  } as Order;
}

export async function getOrder(restaurantId: string, orderId: string): Promise&lt;Order | null> {
    if (!db) throw new Error("Firestore is not initialized.");
    const orderRef = doc(db, getOrdersCollectionPath(restaurantId), orderId);
    const docSnap = await getDoc(orderRef);
    if (docSnap.exists()) {
        const data = docSnap.data();
        return {
            id: docSnap.id,
            ...data,
            createdAt: data.createdAt as Timestamp,
            updatedAt: data.updatedAt as Timestamp,
        } as Order;
    }
    return null;
}


export async function getOrdersByRestaurant(restaurantId: string, statusFilters?: OrderStatus[]): Promise&lt;Order[]> {
  if (!db) throw new Error("Firestore is not initialized.");
  const ordersCol = collection(db, getOrdersCollectionPath(restaurantId));
  let q;
  if (statusFilters && statusFilters.length > 0) {
    q = query(ordersCol, where('status', 'in', statusFilters), orderBy('createdAt', 'desc'));
  } else {
    // If no status filter, get all non-completed and non-cancelled orders by default, or adjust as needed.
    // For a general overview, you might want to exclude 'completed' and 'cancelled' unless specified.
    const defaultExcludeStatus: OrderStatus[] = ['completed', 'cancelled_by_customer', 'cancelled_by_restaurant'];
    q = query(ordersCol, where('status', 'not-in', defaultExcludeStatus), orderBy('createdAt', 'desc'));
  }
  
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ 
      id: doc.id, 
      ...doc.data(),
      createdAt: doc.data().createdAt as Timestamp,
      updatedAt: doc.data().updatedAt as Timestamp,
    } as Order));
}

export async function getOrdersByTable(restaurantId: string, tableId: string, activeStatuses: OrderStatus[] = ['pending_kitchen', 'confirmed_by_kitchen', 'preparing', 'ready_for_pickup', 'served', 'payment_pending']): Promise&lt;Order[]> {
  if (!db) throw new Error("Firestore is not initialized.");
  const ordersCol = collection(db, getOrdersCollectionPath(restaurantId));
  const q = query(ordersCol, where('tableId', '==', tableId), where('status', 'in', activeStatuses), orderBy('createdAt', 'asc'));
  
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ 
      id: doc.id, 
      ...doc.data(),
      createdAt: doc.data().createdAt as Timestamp,
      updatedAt: doc.data().updatedAt as Timestamp,
    } as Order));
}

export async function updateOrderStatus(restaurantId: string, orderId: string, status: OrderStatus, kitchenNotes?: string): Promise&lt;void> {
  if (!db) throw new Error("Firestore is not initialized.");
  const orderRef = doc(db, getOrdersCollectionPath(restaurantId), orderId);
  const updateData: { status: OrderStatus, updatedAt: Timestamp, kitchenNotes?: string } = {
    status,
    updatedAt: serverTimestamp() as Timestamp,
  };
  if (kitchenNotes) {
    updateData.kitchenNotes = kitchenNotes;
  }
  await updateDoc(orderRef, updateData);
}

export async function updateOrder(restaurantId: string, orderId: string, data: Partial&lt;Omit&lt;Order, 'id' | 'restaurantId' | 'createdAt'>>>: Promise&lt;void> {
    if (!db) throw new Error("Firestore is not initialized.");
    const orderRef = doc(db, getOrdersCollectionPath(restaurantId), orderId);
    await updateDoc(orderRef, { ...data, updatedAt: serverTimestamp() });
}


export async function cancelOrder(restaurantId: string, orderId: string, cancelledBy: 'customer' | 'restaurant', reason?: string): Promise&lt;void> {
  if (!db) throw new Error("Firestore is not initialized.");
  const orderRef = doc(db, getOrdersCollectionPath(restaurantId), orderId);
  const status: OrderStatus = cancelledBy === 'customer' ? 'cancelled_by_customer' : 'cancelled_by_restaurant';
  await updateDoc(orderRef, { 
    status, 
    ...(reason && { notes: `Cancellation Reason: ${reason}` }), // Append to existing notes or add new
    updatedAt: serverTimestamp() 
  });
}
