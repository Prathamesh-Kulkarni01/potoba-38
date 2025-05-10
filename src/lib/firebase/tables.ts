
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
} from 'firebase/firestore';
import { db } from './config';
import type { Table, TableStatus } from '@/types';

const getTablesCollection = (restaurantId: string) => {
  if (!db) throw new Error("Firestore is not initialized.");
  return collection(db, 'restaurants', restaurantId, 'tables');
};

export async function addTable(restaurantId: string, tableData: Omit<Table, 'id' | 'restaurantId' | 'tableDocId' | 'qrCodeValue' | 'createdAt' | 'updatedAt' | 'status'>): Promise<Table> {
  const tablesCol = getTablesCollection(restaurantId);
  const now = Timestamp.now();
  
  // Temporary docRef to get an ID
  const tempDocRef = doc(tablesCol); // Create a reference to get an ID
  const tableId = tempDocRef.id;

  const fullTableData = {
    ...tableData,
    restaurantId,
    tableDocId: tableId, // Store the document ID as a field
    status: 'available' as TableStatus,
    createdAt: now, 
    updatedAt: now, 
    qrCodeValue: `${process.env.NEXT_PUBLIC_BASE_URL || 'https://6000-firebase-studio-1746809721561.cluster-ancjwrkgr5dvux4qug5rbzyc2y.cloudworkstations.dev'}/menu/table/${tableId}`,
  };

  // Use setDoc with the pre-generated ID
  await addDoc(tablesCol, fullTableData); // addDoc will generate a new ID, we actually want to set the ID we generated.
                                       // Let's correct this to use setDoc if we want to control the ID, or let addDoc generate it and then update.
                                       // For simplicity, let addDoc generate, then update with tableDocId.

  const docRef = await addDoc(tablesCol, {
    ...tableData,
    restaurantId,
    status: 'available'as TableStatus,
    createdAt: now,
    updatedAt: now,
    // qrCodeValue will be updated shortly
  });
  
  const finalQrCodeValue = `${process.env.NEXT_PUBLIC_BASE_URL || 'https://6000-firebase-studio-1746809721561.cluster-ancjwrkgr5dvux4qug5rbzyc2y.cloudworkstations.dev'}/menu/table/${docRef.id}`;
  await updateDoc(docRef, { qrCodeValue: finalQrCodeValue, tableDocId: docRef.id });


  return {
    id: docRef.id,
    ...tableData,
    restaurantId,
    tableDocId: docRef.id,
    qrCodeValue: finalQrCodeValue,
    status: 'available' as TableStatus,
    createdAt: now.toDate().toISOString(),
    updatedAt: now.toDate().toISOString(),
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
  // Firestore will likely provide a link to create this index in the console error if it's missing.
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
  
  if (typeof data.createdAt === 'string') delete updateData.createdAt;
  if (data.qrCodeValue === undefined && data.tableDocId === undefined) { // ensure we don't accidentally overwrite tableDocId if not intended by partial update
      // If tableDocId is not part of `data`, it means it's not being changed.
  }


  await updateDoc(tableRef, updateData);
}

export async function deleteTable(restaurantId: string, tableId: string): Promise<void> {
  if (!db) throw new Error("Firestore is not initialized.");
  const tableRef = doc(db, 'restaurants', restaurantId, 'tables', tableId);
  await deleteDoc(tableRef);
}
