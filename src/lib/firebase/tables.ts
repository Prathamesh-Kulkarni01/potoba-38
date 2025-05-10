// src/lib/firebase/tables.ts
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
} from 'firebase/firestore';
import { db } from './config';
import type { Table, TableStatus } from '@/types';

const getTablesCollection = (restaurantId: string) => {
  if (!db) throw new Error("Firestore is not initialized.");
  return collection(db, 'restaurants', restaurantId, 'tables');
};

export async function addTable(restaurantId: string, tableData: Omit<Table, 'id' | 'restaurantId' | 'qrCodeValue' | 'createdAt' | 'updatedAt' | 'status'>): Promise<Table> {
  const tablesCol = getTablesCollection(restaurantId);
  const createdAt = serverTimestamp();
  const updatedAt = serverTimestamp();
  
  // Generate a preliminary qrCodeValue, this will be updated with the actual doc ID post-creation
  // Or, use a pre-generated unique ID if your QR strategy needs it.
  // For simplicity, we'll make qrCodeValue dependent on the table's future ID.
  
  const partialTableData = {
    ...tableData,
    restaurantId,
    status: 'available' as TableStatus,
    createdAt,
    updatedAt,
    qrCodeValue: '', // Placeholder, will be updated
  };

  const docRef = await addDoc(tablesCol, partialTableData);

  // Now update with the actual QR code value using the document ID
  const qrCodeValue = `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:9002'}/menu/table/${docRef.id}`;
  await updateDoc(docRef, { qrCodeValue });

  return {
    id: docRef.id,
    ...tableData,
    restaurantId,
    qrCodeValue,
    status: 'available' as TableStatus,
    createdAt: Timestamp.now(), // Optimistic
    updatedAt: Timestamp.now(), // Optimistic
  } as Table;
}

export async function getTables(restaurantId: string): Promise<Table[]> {
  const tablesCol = getTablesCollection(restaurantId);
  const q = query(tablesCol, orderBy('tableNumber', 'asc'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ 
      id: doc.id, 
      ...doc.data(),
      createdAt: doc.data().createdAt as Timestamp, // Ensure Timestamps are correctly typed
      updatedAt: doc.data().updatedAt as Timestamp
    } as Table));
}

export async function getTable(restaurantId: string, tableId: string): Promise<Table | null> {
  if (!db) throw new Error("Firestore is not initialized.");
  const tableRef = doc(db, 'restaurants', restaurantId, 'tables', tableId);
  const docSnap = await getDoc(tableRef);
  if (docSnap.exists()) {
    return { 
      id: docSnap.id, 
      ...docSnap.data(),
      createdAt: docSnap.data().createdAt as Timestamp,
      updatedAt: docSnap.data().updatedAt as Timestamp
    } as Table;
  }
  return null;
}

export async function updateTable(restaurantId: string, tableId: string, data: Partial<Omit<Table, 'id' | 'restaurantId' | 'createdAt'>>): Promise<void> {
  if (!db) throw new Error("Firestore is not initialized.");
  const tableRef = doc(db, 'restaurants', restaurantId, 'tables', tableId);
  // Ensure qrCodeValue is updated if tableNumber changes and your QR strategy depends on it, or handle separately.
  // For this example, qrCodeValue is based on ID, so it doesn't change with tableNumber.
  await updateDoc(tableRef, { ...data, updatedAt: serverTimestamp() });
}

export async function deleteTable(restaurantId: string, tableId: string): Promise<void> {
  if (!db) throw new Error("Firestore is not initialized.");
  const tableRef = doc(db, 'restaurants', restaurantId, 'tables', tableId);
  // Consider implications: what happens to active orders for this table?
  // This simple delete doesn't handle that.
  await deleteDoc(tableRef);
}
