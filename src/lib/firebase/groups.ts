// src/lib/firebase/groups.ts
'use server';
import {
  collection,
  doc,
  setDoc,
  getDoc,
  updateDoc,
  arrayUnion,
  serverTimestamp,
  Timestamp,
  query,
  where,
  getDocs,
  runTransaction,
} from 'firebase/firestore';
import { db } from './config';
import type { TableGroup, GroupCartItem, MenuItem, UserProfile, AuthUser, ClientTableGroup } from '@/types';
import { convertFirebaseTimestampToString } from './utils';

function generateUniqueGroupCode(): string {
  let code = '';
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  for (let i = 0; i < 4; i++) {
    code += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return code;
}

async function isGroupCodeUnique(restaurantId: string, code: string): Promise<boolean> {
  const groupRef = doc(db, `restaurants/${restaurantId}/tableGroups`, code);
  const docSnap = await getDoc(groupRef);
  return !docSnap.exists();
}

export async function createTableGroup(
  restaurantId: string,
  tableId: string,
  tableNumber: string,
  creatorName: string,
  creatorPhone: string,
  creatorUid?: string
): Promise<ClientTableGroup | null> {
  if (!db) throw new Error("Firestore is not initialized.");
  if (!creatorName || !creatorPhone) throw new Error("Creator name and phone are required.");

  let groupCode = '';
  let unique = false;
  let attempts = 0;
  const maxAttempts = 10;

  while (!unique && attempts < maxAttempts) {
    groupCode = generateUniqueGroupCode();
    unique = await isGroupCodeUnique(restaurantId, groupCode);
    attempts++;
  }

  if (!unique) {
    console.error("Failed to generate a unique group code after several attempts.");
    return null; 
  }

  const groupRef = doc(db, `restaurants/${restaurantId}/tableGroups`, groupCode);
  const nowServer = serverTimestamp(); 
  const nowClient = Timestamp.now();   

  const newGroupDataForFirestore: Omit<TableGroup, 'id' | 'createdAt' | 'updatedAt'> & { createdAt: any, updatedAt: any, creatorUid?: string } = {
    restaurantId,
    tableId,
    tableNumber,
    creatorName,
    creatorPhone,
    creatorUid: creatorUid || undefined,
    members: [{ name: creatorName, phone: creatorPhone, uid: creatorUid || null }],
    status: 'active',
    cartItems: [],
    createdAt: nowServer,
    updatedAt: nowServer,
  };

  await setDoc(groupRef, newGroupDataForFirestore);
  
  return {
    id: groupCode,
    restaurantId: newGroupDataForFirestore.restaurantId,
    tableId: newGroupDataForFirestore.tableId,
    tableNumber: newGroupDataForFirestore.tableNumber,
    creatorName: newGroupDataForFirestore.creatorName,
    creatorPhone: newGroupDataForFirestore.creatorPhone,
    creatorUid: newGroupDataForFirestore.creatorUid,
    members: newGroupDataForFirestore.members,
    status: newGroupDataForFirestore.status,
    cartItems: newGroupDataForFirestore.cartItems,
    createdAt: convertFirebaseTimestampToString(nowClient), 
    updatedAt: convertFirebaseTimestampToString(nowClient), 
  };
}

export async function joinTableGroup(
  restaurantId: string,
  groupCode: string,
  user: AuthUser
): Promise<ClientTableGroup | { error: string } | null> { // Return type includes ClientTableGroup
  if (!db) throw new Error("Firestore is not initialized.");
  if (!user || !user.uid) return { error: "User information is missing." };

  const groupRef = doc(db, `restaurants/${restaurantId}/tableGroups`, groupCode.toUpperCase());

  try {
    const groupDoc = await getDoc(groupRef);
    if (!groupDoc.exists()) {
      return { error: "Group code not found or invalid." };
    }

    const groupData = groupDoc.data() as TableGroup; // Raw data from Firestore

    if (groupData.status !== 'active' && groupData.status !== 'ordering') {
        return { error: `This group is currently ${groupData.status} and cannot be joined.` };
    }

    // Check if user is already a member
    if (groupData.members.some(member => member.uid === user.uid)) {
      const { id: _id, ...rest } = groupData;
      return {
        id: groupDoc.id,
        ...rest,
        createdAt: convertFirebaseTimestampToString(groupData.createdAt),
        updatedAt: convertFirebaseTimestampToString(groupData.updatedAt),
      };
    }
    
    const memberData = { uid: user.uid, name: user.displayName || user.email?.split('@')[0] || 'New Member' };

    await updateDoc(groupRef, {
      members: arrayUnion(memberData),
      updatedAt: serverTimestamp(),
    });
    
    const updatedGroupDoc = await getDoc(groupRef); 
    const updatedGroupData = updatedGroupDoc.data() as TableGroup;

    const { id: _id, ...rest } = updatedGroupData;
    return {
      id: updatedGroupDoc.id,
      ...rest,
      createdAt: convertFirebaseTimestampToString(updatedGroupData.createdAt),
      updatedAt: convertFirebaseTimestampToString(updatedGroupData.updatedAt),
    };

  } catch (error: any) {
    console.error("Error joining table group:", error);
    return { error: error.message || "Could not join the group." };
  }
}

export async function getTableGroup(restaurantId: string, groupCode: string): Promise<ClientTableGroup | null> {
  if (!db) throw new Error("Firestore is not initialized.");
  const groupRef = doc(db, `restaurants/${restaurantId}/tableGroups`, groupCode.toUpperCase());
  const docSnap = await getDoc(groupRef);
  if (docSnap.exists()) {
    const data = docSnap.data() as TableGroup;
    const { id: _id, ...rest } = data;
    return {
      id: docSnap.id,
      ...rest,
      createdAt: convertFirebaseTimestampToString(data.createdAt),
      updatedAt: convertFirebaseTimestampToString(data.updatedAt),
    };
  }
  return null;
}

export async function addItemToGroupCart(
  restaurantId: string,
  groupCode: string,
  item: MenuItem,
  quantity: number,
  user: AuthUser,
  variantChoices?: { variantName: string; optionName: string; optionPrice: number }[]
): Promise<void> {
  if (!db) throw new Error("Firestore is not initialized.");
  if (!user || !user.uid) throw new Error("User information is missing.");

  const groupRef = doc(db, `restaurants/${restaurantId}/tableGroups`, groupCode.toUpperCase());

  await runTransaction(db, async (transaction) => {
    const groupDoc = await transaction.get(groupRef);
    if (!groupDoc.exists()) {
      throw new Error("Group not found.");
    }

    const groupData = groupDoc.data() as TableGroup;
    const cartItems = groupData.cartItems || [];

    const itemKey = item.id + (variantChoices ? JSON.stringify(variantChoices.sort((a,b) => a.variantName.localeCompare(b.variantName))) : "");
    
    let itemFound = false;
    const updatedCartItems = cartItems.map(cartItem => {
      const cartItemKey = cartItem.menuItemId + (cartItem.variantChoices ? JSON.stringify(cartItem.variantChoices.sort((a,b) => a.variantName.localeCompare(b.variantName))) : "");
      if (cartItemKey === itemKey) {
        itemFound = true;
        return {
          ...cartItem,
          quantity: cartItem.quantity + quantity,
          totalPrice: (cartItem.quantity + quantity) * cartItem.unitPrice,
        };
      }
      return cartItem;
    });

    if (!itemFound) {
      // Determine unit price based on variants or base price.
      // This logic needs to be robust. If variant prices are absolute, then the first variant's option price might be used.
      // Or, if variants are additive, sum their price adjustments.
      // For simplicity, if variants exist and have prices, we might take the price of the first chosen option of the first variant, or average, or sum.
      // The item page's price calculation logic should ideally be mirrored or a base item price passed.
      // Assuming item.price is the base and variantChoices contain actual prices of selected options that replace/modify base.
      let effectiveUnitPrice = item.price; // Default to base item price
      if (variantChoices && variantChoices.length > 0) {
          // Example: if variants set absolute price, find the relevant one
          // This example assumes the variantChoice.optionPrice IS the price for that configuration.
          // Often, the FIRST variant choice's price might dictate the item's price, or they sum up.
          // Let's assume the price is determined by the *item page* and passed correctly.
          // If item page calculates a new unitPrice based on variants, that should be passed.
          // For now, let's use item.price as a fallback if variant pricing isn't detailed here.
          // A better approach is for `item.price` to already reflect the selected variant combination's price,
          // or pass the calculated `pricePerItem` from the item page.
          // The current MenuItem type might not fully support complex variant pricing structures without more info.
          // Let's use the passed item.price as unitPrice for now, assuming it's correctly set on the `item` object from client.
          effectiveUnitPrice = item.price;
      }


      updatedCartItems.push({
        menuItemId: item.id,
        menuItemName: item.name,
        quantity,
        unitPrice: effectiveUnitPrice, // This should be the price for THIS specific configuration
        totalPrice: quantity * effectiveUnitPrice,
        variantChoices: variantChoices || [],
        addedByUid: user.uid,
        addedByName: user.displayName || user.email?.split('@')[0] || 'Member',
      });
    }

    transaction.update(groupRef, {
      cartItems: updatedCartItems,
      updatedAt: serverTimestamp(),
    });
  });
}

/**
 * Fetch all table groups for a given table (by restaurantId and tableId)
 */
export async function getTableGroupsForTable(restaurantId: string, tableId: string): Promise<ClientTableGroup[]> {
  if (!db) throw new Error("Firestore is not initialized.");
  if (!tableId) throw new Error("tableId is required and must be a string.");
  const groupsCol = collection(db, `restaurants/${restaurantId}/tableGroups`);
  const q = query(groupsCol, where('tableId', '==', tableId));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(docSnap => {
    const data = docSnap.data() as TableGroup;
    const { id: _id, ...rest } = data; // Remove any id from data to avoid duplicate
    return {
      id: docSnap.id,
      ...rest,
      createdAt: convertFirebaseTimestampToString(data.createdAt),
      updatedAt: convertFirebaseTimestampToString(data.updatedAt),
    };
  });
}

// Additional functions like removeItemFromGroupCart, updateGroupCartItemQuantity, placeGroupOrder would go here.
// For now, focusing on create and join.

