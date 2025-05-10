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
  collectionGroup,
  limit,
  setDoc, // Added setDoc
} from 'firebase/firestore';
import { db } from './config';
import type { Table, TableStatus } from '@/types';

const getTablesCollection = (restaurantId: string) => {
  if (!db) throw new Error("Firestore is not initialized.");
  return collection(db, 'restaurants', restaurantId, 'tables');
};

export async function addTable(restaurantId: string, tableData: Omit<Table, 'id' | 'restaurantId' | 'tableDocId' | 'qrCodeValue' | 'createdAt' | 'updatedAt' | 'status'>): Promise<Table> {
  const tablesCol = getTablesCollection(restaurantId);
  const nowTimestamp = Timestamp.now();
  
  // Generate a reference with a new unique ID for the table document
  const newTableRef = doc(tablesCol);
  const tableId = newTableRef.id;

  const finalQrCodeValue = `${process.env.NEXT_PUBLIC_BASE_URL || 'https://6000-firebase-studio-1746809721561.cluster-ancjwrkgr5dvux4qug5rbzyc2y.cloudworkstations.dev'}/menu/table/${tableId}`;

  const fullTableData: Omit<Table, 'id' | 'createdAt' | 'updatedAt'> & { createdAt: Timestamp; updatedAt: Timestamp } = {
    ...tableData, // Includes tableNumber, capacity, and optionally currentOrderIds
    restaurantId,
    tableDocId: tableId, // Set tableDocId to the document's own ID
    status: 'available' as TableStatus,
    qrCodeValue: finalQrCodeValue,
    createdAt: nowTimestamp, 
    updatedAt: nowTimestamp, 
  };

  // Use setDoc to create the document with the pre-generated ID and all fields atomically
  await setDoc(newTableRef, fullTableData);

  // Return the Table object with stringified timestamps as per the Table type
  return {
    id: tableId,
    ...tableData,
    restaurantId,
    tableDocId: tableId,
    qrCodeValue: finalQrCodeValue,
    status: 'available' as TableStatus,
    createdAt: nowTimestamp.toDate().toISOString(),
    updatedAt: nowTimestamp.toDate().toISOString(),
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
    } as Table;
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
    } as Table;
  }
  return null;
}

export async function getTableByDocIdFromGroup(tableDocIdToFind: string): Promise<{ table: Table; restaurantId: string } | null> {
  if (!db) throw new Error("Firestore is not initialized.");
  const tablesGroupRef = collectionGroup(db, 'tables');
  // Note: This query requires a composite index on `tableDocId` for the `tables` collection group.
  // Firestore will likely provide a link to create this index in your Firebase console if it's missing.
  const q = query(tablesGroupRef, where('tableDocId', '==', tableDocIdToFind), limit(1));
  
  const snapshot = await getDocs(q);
  if (!snapshot.empty) {
    const docSnap = snapshot.docs[0];
    const tableData = docSnap.data();
    if (!tableData.restaurantId) {
        console.error(`Table with tableDocId ${tableDocIdToFind} is missing restaurantId field.`);
        return null;
    }
    return {
      table: {
        id: docSnap.id, 
        ...tableData,
        createdAt: (tableData.createdAt as Timestamp).toDate().toISOString(),
        updatedAt: (tableData.updatedAt as Timestamp).toDate().toISOString(),
      } as Table,
      restaurantId: tableData.restaurantId as string,
    };
  }
  console.log(`No table found with tableDocId: ${tableDocIdToFind}`);
  return null;
}


export async function updateTable(restaurantId: string, tableId: string, data: Partial<Omit<Table, 'id' | 'restaurantId' | 'createdAt' | 'updatedAt' | 'tableDocId'>>): Promise<void> {
  if (!db) throw new Error("Firestore is not initialized.");
  const tableRef = doc(db, 'restaurants', restaurantId, 'tables', tableId);
  
  const updateData: any = { ...data, updatedAt: serverTimestamp() };
  
  if (typeof data.createdAt === 'string') delete updateData.createdAt; // Prevent client-side string timestamp from overwriting server timestamp
  // qrCodeValue and tableDocId should generally not be part of partial updates unless specifically intended.

  await updateDoc(tableRef, updateData);
}

export async function deleteTable(restaurantId: string, tableId: string): Promise<void> {
  if (!db) throw new Error("Firestore is not initialized.");
  const tableRef = doc(db, 'restaurants', restaurantId, 'tables', tableId);
  await deleteDoc(tableRef);
}

