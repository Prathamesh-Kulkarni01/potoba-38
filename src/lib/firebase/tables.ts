
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
  const now = Timestamp.now();
  
  const partialTableData = {
    ...tableData,
    restaurantId,
    status: 'available' as TableStatus,
    createdAt: now, // Store as Timestamp in Firestore
    updatedAt: now, // Store as Timestamp in Firestore
    qrCodeValue: '', 
  };

  const docRef = await addDoc(tablesCol, partialTableData);

  const qrCodeValue = `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:9002'}/menu/table/${docRef.id}`;
  await updateDoc(docRef, { qrCodeValue });

  return {
    id: docRef.id,
    ...tableData,
    restaurantId,
    qrCodeValue,
    status: 'available' as TableStatus,
    createdAt: now.toDate().toISOString(), // Return as ISO string
    updatedAt: now.toDate().toISOString(), // Return as ISO string
  };
}

export async function getTables(restaurantId: string): Promise<Table[]> {
  const tablesCol = getTablesCollection(restaurantId);
  const q = query(tablesCol, orderBy('tableNumber', 'asc'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(docSnap => {
    const data = docSnap.data();
    return { 
      id: docSnap.id, 
      ...data,
      createdAt: (data.createdAt as Timestamp).toDate().toISOString(),
      updatedAt: (data.updatedAt as Timestamp).toDate().toISOString()
    } as Table; // Cast to Table, which now expects string dates
  });
}

export async function getTable(restaurantId: string, tableId: string): Promise<Table | null> {
  if (!db) throw new Error("Firestore is not initialized.");
  const tableRef = doc(db, 'restaurants', restaurantId, 'tables', tableId);
  const docSnap = await getDoc(tableRef);
  if (docSnap.exists()) {
    const data = docSnap.data();
    return { 
      id: docSnap.id, 
      ...data,
      createdAt: (data.createdAt as Timestamp).toDate().toISOString(),
      updatedAt: (data.updatedAt as Timestamp).toDate().toISOString()
    } as Table; // Cast to Table
  }
  return null;
}

export async function updateTable(restaurantId: string, tableId: string, data: Partial<Omit<Table, 'id' | 'restaurantId' | 'createdAt' | 'updatedAt'>>): Promise<void> {
  if (!db) throw new Error("Firestore is not initialized.");
  const tableRef = doc(db, 'restaurants', restaurantId, 'tables', tableId);
  
  // ServerTimestamp should be used for Firestore update, not for the data object if it expects strings
  const updateData: any = { ...data, updatedAt: serverTimestamp() };
  
  // If data includes createdAt or updatedAt as strings, remove them before sending to Firestore if they are meant to be managed by serverTimestamp
  if (typeof data.createdAt === 'string') delete updateData.createdAt;
  // updatedAt is always set to serverTimestamp()

  await updateDoc(tableRef, updateData);
}

export async function deleteTable(restaurantId: string, tableId: string): Promise<void> {
  if (!db) throw new Error("Firestore is not initialized.");
  const tableRef = doc(db, 'restaurants', restaurantId, 'tables', tableId);
  await deleteDoc(tableRef);
}
