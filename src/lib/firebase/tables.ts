
// src/lib/firebase/tables.ts
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
  onSnapshot,
  writeBatch,
} from 'firebase/firestore';
import { db } from './config';
import type { Table, TableStatus, TableArea } from '@/types';
import { convertFirebaseTimestampToString, getTablesCollectionPath } from './utils';

const getTableAreasCollectionPath = (restaurantId: string) => `restaurants/${restaurantId}/tableAreas`;


export async function addTable(
  restaurantId: string, 
  tableData: Omit<Table, 'id' | 'restaurantId' | 'tableDocId' | 'qrCodeValue' | 'createdAt' | 'updatedAt' | 'status' | 'assignedWaiterId' | 'assignedWaiterName' | 'lastOrderId' | 'lastOrderTotal' | 'lastOrderAt'> & { areaId?: string | null; areaName?: string | null;}
): Promise<Table> {
  if (!db) throw new Error("Firestore is not initialized.");
  const tablesCol = collection(db, getTablesCollectionPath(restaurantId));
  const nowTimestamp = Timestamp.now();
  
  const newTableRef = doc(tablesCol); 
  const tableDocId = newTableRef.id;

  const baseUrl = (process.env.NEXT_PUBLIC_BASE_URL || 'https://6000-firebase-studio-1746809721561.cluster-ancjwrkgr5dvux4qug5rbzyc2y.cloudworkstations.dev').replace(/\/$/, '');
  const finalQrCodeValue = `${baseUrl}/menu/table/${tableDocId}`;


  const fullTableData: Omit<Table, 'id' | 'createdAt' | 'updatedAt'> & { createdAt: Timestamp; updatedAt: Timestamp } = {
    ...tableData, 
    restaurantId,
    tableDocId: tableDocId, 
    status: 'available' as TableStatus,
    qrCodeValue: finalQrCodeValue,
    areaId: tableData.areaId || null,
    areaName: tableData.areaName || null,
    assignedWaiterId: null,
    assignedWaiterName: null,
    lastOrderId: null,
    lastOrderTotal: null,
    lastOrderAt: null,
    createdAt: nowTimestamp, 
    updatedAt: nowTimestamp, 
  };

  await setDoc(newTableRef, fullTableData);

  return {
    id: tableDocId,
    ...tableData,
    restaurantId,
    tableDocId: tableDocId,
    qrCodeValue: finalQrCodeValue,
    status: 'available' as TableStatus,
    areaId: tableData.areaId || null,
    areaName: tableData.areaName || null,
    assignedWaiterId: null,
    assignedWaiterName: null,
    lastOrderId: null,
    lastOrderTotal: null,
    lastOrderAt: null,
    createdAt: convertFirebaseTimestampToString(nowTimestamp),
    updatedAt: convertFirebaseTimestampToString(nowTimestamp),
  };
}

export async function getTables(restaurantId: string): Promise<Table[]> {
  if (!db) throw new Error("Firestore is not initialized.");
  const tablesCol = collection(db, getTablesCollectionPath(restaurantId));
  const q = query(tablesCol, orderBy('areaName', 'asc'), orderBy('tableNumber', 'asc'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(docSnap => {
    const data = docSnap.data();
    return { 
      id: docSnap.id, 
      ...data,
      tableDocId: docSnap.id, 
      createdAt: convertFirebaseTimestampToString(data.createdAt as Timestamp),
      updatedAt: convertFirebaseTimestampToString(data.updatedAt as Timestamp),
      lastOrderAt: data.lastOrderAt ? convertFirebaseTimestampToString(data.lastOrderAt as Timestamp) : null,
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
      updatedAt: convertFirebaseTimestampToString(data.updatedAt as Timestamp),
      lastOrderAt: data.lastOrderAt ? convertFirebaseTimestampToString(data.lastOrderAt as Timestamp) : null,
    } as Table;
  }
  return null;
}

export async function getTableByDocIdFromGroup(tableDocIdToFind: string): Promise<{ table: Table; restaurantId: string } | null> {
  if (!db) throw new Error("Firestore is not initialized.");
  if (!tableDocIdToFind || typeof tableDocIdToFind !== 'string' || tableDocIdToFind.trim() === '') {
    console.error("[getTableByDocIdFromGroup] Invalid tableDocIdToFind received:", tableDocIdToFind);
    return null;
  }
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
        lastOrderAt: tableData.lastOrderAt ? convertFirebaseTimestampToString(tableData.lastOrderAt as Timestamp) : null,
      } as Table,
      restaurantId: tableData.restaurantId as string,
    };
  }
  console.warn(`No table found with tableDocId: ${tableDocIdToFind}. Ensure tableDocId field exists and matches the document ID, and Firestore index on 'tables' collection group (field 'tableDocId' ASC) is created.`);
  return null;
}


export async function updateTable(
  restaurantId: string, 
  tableId: string, 
  data: Partial<Omit<Table, 'id' | 'restaurantId' | 'createdAt' | 'updatedAt' | 'tableDocId' | 'qrCodeValue'>> & { areaId?: string | null; areaName?: string | null;}
): Promise<void> {
  if (!db) throw new Error("Firestore is not initialized.");
  const tableRef = doc(db, getTablesCollectionPath(restaurantId), tableId);
  
  const updateData: any = { ...data, updatedAt: serverTimestamp() };
  
  if (updateData.hasOwnProperty('qrCodeValue')) delete updateData.qrCodeValue;
  if (updateData.hasOwnProperty('tableDocId')) delete updateData.tableDocId;

  if (data.hasOwnProperty('areaId')) {
    updateData.areaId = data.areaId === undefined ? null : data.areaId;
  }
  if (data.hasOwnProperty('areaName')) {
    updateData.areaName = data.areaName === undefined ? null : data.areaName;
  }
  if (data.hasOwnProperty('assignedWaiterId')) {
    updateData.assignedWaiterId = data.assignedWaiterId === undefined ? null : data.assignedWaiterId;
  }
  if (data.hasOwnProperty('assignedWaiterName')) {
    updateData.assignedWaiterName = data.assignedWaiterName === undefined ? null : data.assignedWaiterName;
  }
  if (data.hasOwnProperty('lastOrderId')) {
    updateData.lastOrderId = data.lastOrderId === undefined ? null : data.lastOrderId;
  }
  if (data.hasOwnProperty('lastOrderTotal')) {
    updateData.lastOrderTotal = data.lastOrderTotal === undefined ? null : data.lastOrderTotal;
  }
  if (data.hasOwnProperty('lastOrderAt')) {
    updateData.lastOrderAt = data.lastOrderAt === undefined ? null : data.lastOrderAt;
  }
  
  await updateDoc(tableRef, updateData);
}

export async function deleteTable(restaurantId: string, tableId: string): Promise<void> {
  if (!db) throw new Error("Firestore is not initialized.");
  const tableRef = doc(db, getTablesCollectionPath(restaurantId), tableId);
  await deleteDoc(tableRef);
}

// --- TableArea Functions ---

export async function addTableArea(restaurantId: string, areaData: Omit<TableArea, 'id' | 'restaurantId' | 'createdAt' | 'updatedAt'>): Promise<TableArea> {
  if (!db) throw new Error("Firestore is not initialized.");
  const areasCol = collection(db, getTableAreasCollectionPath(restaurantId));
  const now = serverTimestamp();
  const docRef = await addDoc(areasCol, { ...areaData, restaurantId, createdAt: now, updatedAt: now });
  return { id: docRef.id, restaurantId, ...areaData, createdAt: Timestamp.now(), updatedAt: Timestamp.now() } as TableArea;
}

export async function getTableAreas(restaurantId: string): Promise<TableArea[]> {
  if (!db) throw new Error("Firestore is not initialized.");
  const areasCol = collection(db, getTableAreasCollectionPath(restaurantId));
  const q = query(areasCol, orderBy('order', 'asc'), orderBy('name', 'asc'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data(), createdAt: docSnap.data().createdAt as Timestamp, updatedAt: docSnap.data().updatedAt as Timestamp } as TableArea));
}

export async function updateTableArea(restaurantId: string, areaId: string, data: Partial<Omit<TableArea, 'id' | 'restaurantId' | 'createdAt'>>): Promise<void> {
  if (!db) throw new Error("Firestore is not initialized.");
  const areaRef = doc(db, getTableAreasCollectionPath(restaurantId), areaId);
  await updateDoc(areaRef, { ...data, updatedAt: serverTimestamp() });
}

export async function deleteTableArea(restaurantId: string, areaId: string): Promise<void> {
  if (!db) throw new Error("Firestore is not initialized.");
  const batch = writeBatch(db);
  const areaRef = doc(db, getTableAreasCollectionPath(restaurantId), areaId);
  
  const tablesCol = collection(db, getTablesCollectionPath(restaurantId));
  const q = query(tablesCol, where('areaId', '==', areaId));
  const tablesSnapshot = await getDocs(q);
  tablesSnapshot.forEach(tableDoc => {
    batch.update(tableDoc.ref, { areaId: null, areaName: null, updatedAt: serverTimestamp() });
  });

  batch.delete(areaRef);
  await batch.commit();
}

// --- Dashboard Specific Data Fetching ---
export interface TableOccupancy {
  totalTables: number;
  occupiedTables: number;
  occupancyRate: number;
}

export async function getRestaurantTableOccupancy(restaurantId: string): Promise<TableOccupancy> {
  if (!db) throw new Error("Firestore is not initialized.");
  const tablesCol = collection(db, getTablesCollectionPath(restaurantId));
  const snapshot = await getDocs(tablesCol);
  
  let occupiedCount = 0;
  snapshot.forEach(docSnap => {
    const table = docSnap.data() as Table;
    if (table.status === 'occupied') {
      occupiedCount++;
    }
  });
  
  const totalTables = snapshot.size;
  const occupancyRate = totalTables > 0 ? (occupiedCount / totalTables) * 100 : 0;

  return {
    totalTables,
    occupiedTables: occupiedCount,
    occupancyRate,
  };
}

// Real-time listener setup for a restaurant's tables
export function listenToRestaurantTables(
  restaurantId: string,
  callback: (tables: Table[]) => void
): () => void { 
  if (!db) throw new Error("Firestore is not initialized for real-time listener.");
  
  const tablesCol = collection(db, getTablesCollectionPath(restaurantId));
  const q = query(tablesCol, orderBy('areaName', 'asc'), orderBy('tableNumber', 'asc'));

  const unsubscribe = onSnapshot(q, (snapshot) => {
    const tables = snapshot.docs.map(docSnap => ({
        id: docSnap.id,
        tableDocId: docSnap.id, // ensure tableDocId is always populated correctly
        ...docSnap.data(),
        createdAt: convertFirebaseTimestampToString(docSnap.data().createdAt as Timestamp),
        updatedAt: convertFirebaseTimestampToString(docSnap.data().updatedAt as Timestamp),
        lastOrderAt: docSnap.data().lastOrderAt ? convertFirebaseTimestampToString(docSnap.data().lastOrderAt as Timestamp) : null,
      } as Table));
    callback(tables);
  }, (error) => {
    console.error(`Error listening to tables for restaurant ${restaurantId}:`, error);
  });

  return unsubscribe;
}
