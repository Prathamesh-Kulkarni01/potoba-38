
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
  setDoc, 
} from 'firebase/firestore';
import { db } from './config';
import type { Table, TableStatus } from '@/types';
import { convertFirebaseTimestampToString } from './utils';

export const getTablesCollectionPath = (restaurantId: string) => `restaurants/${restaurantId}/tables`;

export async function addTable(restaurantId: string, tableData: Omit<Table, 'id' | 'restaurantId' | 'tableDocId' | 'qrCodeValue' | 'createdAt' | 'updatedAt' | 'status'>): Promise<Table> {
  if (!db) throw new Error("Firestore is not initialized.");
  const tablesCol = collection(db, getTablesCollectionPath(restaurantId));
  const nowTimestamp = Timestamp.now();
  
  const newTableRef = doc(tablesCol);
  const tableId = newTableRef.id;

  const finalQrCodeValue = `${process.env.NEXT_PUBLIC_BASE_URL || 'https://6000-firebase-studio-1746809721561.cluster-ancjwrkgr5dvux4qug5rbzyc2y.cloudworkstations.dev'}/menu/table/${tableId}`;

  const fullTableData: Omit<Table, 'id' | 'createdAt' | 'updatedAt'> & { createdAt: Timestamp; updatedAt: Timestamp } = {
    ...tableData, 
    restaurantId,
    tableDocId: tableId, 
    status: 'available' as TableStatus,
    qrCodeValue: finalQrCodeValue,
    createdAt: nowTimestamp, 
    updatedAt: nowTimestamp, 
  };

  await setDoc(newTableRef, fullTableData);

  return {
    id: tableId,
    ...tableData,
    restaurantId,
    tableDocId: tableId,
    qrCodeValue: finalQrCodeValue,
    status: 'available' as TableStatus,
    createdAt: convertFirebaseTimestampToString(nowTimestamp),
    updatedAt: convertFirebaseTimestampToString(nowTimestamp),
  };
}

// This function is kept for one-time fetches if needed. Real-time updates use onSnapshot in the component.
export async function getTables(restaurantId: string): Promise<Table[]> {
  if (!db) throw new Error("Firestore is not initialized.");
  const tablesCol = collection(db, getTablesCollectionPath(restaurantId));
  const q = query(tablesCol, orderBy('tableNumber', 'asc'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(docSnap => {
    const data = docSnap.data();
    return { 
      id: docSnap.id, 
      ...data,
      createdAt: convertFirebaseTimestampToString(data.createdAt as Timestamp),
      updatedAt: convertFirebaseTimestampToString(data.updatedAt as Timestamp)
    } as Table;
  });
}

export async function getTable(restaurantId: string, tableId: string): Promise<Table | null> {
  if (!db) throw new Error("Firestore is not initialized.");
  const tableRef = doc(db, getTablesCollectionPath(restaurantId), tableId);
  const docSnap = await getDoc(tableRef);
  if (docSnap.exists()) {
    const data = docSnap.data();
    return { 
      id: docSnap.id, 
      ...data,
      createdAt: convertFirebaseTimestampToString(data.createdAt as Timestamp),
      updatedAt: convertFirebaseTimestampToString(data.updatedAt as Timestamp)
    } as Table;
  }
  return null;
}

export async function getTableByDocIdFromGroup(tableDocIdToFind: string): Promise<{ table: Table; restaurantId: string } | null> {
  if (!db) throw new Error("Firestore is not initialized.");
  const tablesGroupRef = collectionGroup(db, 'tables');
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
        createdAt: convertFirebaseTimestampToString(tableData.createdAt as Timestamp),
        updatedAt: convertFirebaseTimestampToString(tableData.updatedAt as Timestamp),
      } as Table,
      restaurantId: tableData.restaurantId as string,
    };
  }
  console.log(`No table found with tableDocId: ${tableDocIdToFind}`);
  return null;
}


export async function updateTable(restaurantId: string, tableId: string, data: Partial<Omit<Table, 'id' | 'restaurantId' | 'createdAt' | 'updatedAt' | 'tableDocId' | 'qrCodeValue'>>): Promise<void> {
  if (!db) throw new Error("Firestore is not initialized.");
  const tableRef = doc(db, getTablesCollectionPath(restaurantId), tableId);
  
  const updateData: any = { ...data, updatedAt: serverTimestamp() };
  
  await updateDoc(tableRef, updateData);
}

export async function deleteTable(restaurantId: string, tableId: string): Promise<void> {
  if (!db) throw new Error("Firestore is not initialized.");
  const tableRef = doc(db, getTablesCollectionPath(restaurantId), tableId);
  await deleteDoc(tableRef);
}
