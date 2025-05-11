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
import type { TableGroup, GroupCartItem, MenuItem, UserProfile, AuthUser } from '@/types';
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
  creator: AuthUser
): Promise<TableGroup | null> {
  if (!db) throw new Error("Firestore is not initialized.");
  if (!creator || !creator.uid) throw new Error("Creator UID is required.");

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
    return null; // Or throw an error
  }

  const groupRef = doc(db, `restaurants/${restaurantId}/tableGroups`, groupCode);
  const now = serverTimestamp();

  const newGroupData: Omit<TableGroup, 'id' | 'createdAt' | 'updatedAt'> & { createdAt: any, updatedAt: any } = {
    restaurantId,
    tableId,
    tableNumber,
    creatorUid: creator.uid,
    creatorName: creator.displayName || creator.email?.split('@')[0] || 'Group Host',
    members: [{ uid: creator.uid, name: creator.displayName || creator.email?.split('@')[0] || 'Group Host' }],
    status: 'active',
    cartItems: [],
    createdAt: now,
    updatedAt: now,
  };

  await setDoc(groupRef, newGroupData);

  return {
    id: groupCode,
    ...newGroupData,
    createdAt: Timestamp.now(), // Optimistic return
    updatedAt: Timestamp.now(), // Optimistic return
  } as TableGroup;
}

export async function joinTableGroup(
  restaurantId: string,
  groupCode: string,
  user: AuthUser
): Promise<TableGroup | { error: string } | null> {
  if (!db) throw new Error("Firestore is not initialized.");
  if (!user || !user.uid) return { error: "User information is missing." };

  const groupRef = doc(db, `restaurants/${restaurantId}/tableGroups`, groupCode.toUpperCase());

  try {
    const groupDoc = await getDoc(groupRef);
    if (!groupDoc.exists()) {
      return { error: "Group code not found or invalid." };
    }

    const groupData = groupDoc.data() as TableGroup;

    if (groupData.status !== 'active' && groupData.status !== 'ordering') {
        return { error: `This group is currently ${groupData.status} and cannot be joined.` };
    }

    // Check if user is already a member
    if (groupData.members.some(member => member.uid === user.uid)) {
      return { 
        id: groupDoc.id,
        ...groupData,
        createdAt: convertFirebaseTimestampToString(groupData.createdAt),
        updatedAt: convertFirebaseTimestampToString(groupData.updatedAt),
       } as TableGroup; // User already in group, return group data
    }
    
    const memberData = { uid: user.uid, name: user.displayName || user.email?.split('@')[0] || 'New Member' };

    await updateDoc(groupRef, {
      members: arrayUnion(memberData),
      updatedAt: serverTimestamp(),
    });
    
    const updatedGroupDoc = await getDoc(groupRef); // Fetch again to get the latest members array
    const updatedGroupData = updatedGroupDoc.data() as TableGroup;


    return { 
        id: updatedGroupDoc.id, 
        ...updatedGroupData,
        createdAt: convertFirebaseTimestampToString(updatedGroupData.createdAt),
        updatedAt: convertFirebaseTimestampToString(updatedGroupData.updatedAt),
    } as TableGroup;

  } catch (error: any) {
    console.error("Error joining table group:", error);
    return { error: error.message || "Could not join the group." };
  }
}

export async function getTableGroup(restaurantId: string, groupCode: string): Promise<TableGroup | null> {
  if (!db) throw new Error("Firestore is not initialized.");
  const groupRef = doc(db, `restaurants/${restaurantId}/tableGroups`, groupCode.toUpperCase());
  const docSnap = await getDoc(groupRef);
  if (docSnap.exists()) {
    const data = docSnap.data() as TableGroup;
    return { 
      id: docSnap.id, 
      ...data,
      createdAt: convertFirebaseTimestampToString(data.createdAt),
      updatedAt: convertFirebaseTimestampToString(data.updatedAt),
    } as TableGroup;
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

    // Create a unique key for the item based on ID and variants to handle existing items
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
          // Potentially update addedBy if multiple people add to the same item stack
        };
      }
      return cartItem;
    });

    if (!itemFound) {
      const unitPrice = variantChoices && variantChoices.length > 0 
        ? variantChoices.reduce((sum, v) => sum + v.optionPrice, 0) // This logic might need to be more complex depending on how variant prices are set
        : item.price;

      updatedCartItems.push({
        menuItemId: item.id,
        menuItemName: item.name,
        quantity,
        unitPrice: unitPrice, 
        totalPrice: quantity * unitPrice,
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

// Additional functions like removeItemFromGroupCart, updateGroupCartItemQuantity, placeGroupOrder would go here.
// For now, focusing on create and join.

