
import {
  doc, setDoc, getDoc, serverTimestamp, Timestamp,
  collection, addDoc, writeBatch, query, where, getDocs,
  collectionGroup, limit, orderBy, updateDoc, WriteBatch, documentId, FieldPath
} from 'firebase/firestore';
import { db } from './config';
import type { UserRole, UserProfile as UserProfileType, RestaurantProfile, OutletType, StaffInvitation, StaffPermissions } from '@/types';
import { defaultStaffPermissions } from '@/types'; // Import defaultStaffPermissions

export async function createUserProfile(
  uid: string,
  email: string | null,
  role: UserRole, // This is the role selected on the signup form
  restaurantData?: { name: string; outletType?: OutletType },
  phoneNumber?: string | null,
  isAnonymous?: boolean
): Promise<{ userProfile: UserProfileType; restaurantId?: string }> {
  if (!db) throw new Error("Firestore is not initialized.");

  let restaurantId: string | null = null;
  let onboardingComplete = true;
  let finalRole = role; 
  let staffPermissions: StaffPermissions | undefined = undefined;
  const batch = writeBatch(db);

  const normalizedSignupEmail = email ? email.toLowerCase() : null;

  
  if (!isAnonymous && normalizedSignupEmail) {
    const invitationsQuery = query(
      collectionGroup(db, 'staffInvitations'),
      where('email', '==', normalizedSignupEmail), 
      where('status', '==', 'pending'),
      limit(1)
    );
    const invitationsSnapshot = await getDocs(invitationsQuery);

    if (!invitationsSnapshot.empty) {
      const invitationDoc = invitationsSnapshot.docs[0];
      const invitationData = invitationDoc.data() as StaffInvitation;

      console.log(`Staff invitation found for ${email} (normalized: ${normalizedSignupEmail}) for restaurant ${invitationData.restaurantId}. Assigning role 'staff'. Permissions:`, invitationData.permissions);

      finalRole = 'staff'; 
      restaurantId = invitationData.restaurantId;
      onboardingComplete = true; 
      staffPermissions = invitationData.permissions || { ...defaultStaffPermissions };

      batch.update(invitationDoc.ref, {
        status: 'accepted',
        acceptedAt: serverTimestamp(),
        acceptedByUid: uid,
      });
    } else if (role === 'staff') {
      
      console.warn(`User ${email} (normalized: ${normalizedSignupEmail}) selected 'staff' role but no pending invitation found. Creating as 'user' role without restaurant assignment.`);
      finalRole = 'user';
      restaurantId = null;
      onboardingComplete = true; 
      staffPermissions = undefined;
    }
  }


  if (finalRole === 'owner' && !restaurantId) { 
    if (!restaurantData?.name) {
      throw new Error("Restaurant name is required for owner sign-up.");
    }
    onboardingComplete = false; 
    const newRestaurantRef = doc(collection(db, 'restaurants')); 
    restaurantId = newRestaurantRef.id;
    batch.set(newRestaurantRef, {
      id: restaurantId, 
      ownerId: uid,
      name: restaurantData.name,
      outletType: restaurantData.outletType || 'restaurant',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      settings: {
        onlineOrderingEnabled: false,
        tableReservationsEnabled: false,
        notificationEmail: `orders@${restaurantData.name.toLowerCase().replace(/\s+/g, '')}.example.com`,
        customDomain: null,
      },
      taxes: [],
    });
  }

  const userRef = doc(db, 'users', uid);
  const profileData: UserProfileType = {
    uid,
    email: normalizedSignupEmail, 
    role: finalRole,
    restaurantId,
    onboardingComplete,
    phoneNumber: phoneNumber || null,
    isAnonymous: isAnonymous || false,
    createdAt: serverTimestamp() as Timestamp, 
    displayName: email?.split('@')[0] || 'User', 
    photoURL: null,
    lastLoginAt: serverTimestamp() as Timestamp,
    lastActiveAt: serverTimestamp() as Timestamp,
    status: 'active',
    preferences: {},
    metadata: {},
    staffPermissions: finalRole === 'staff' ? (staffPermissions || { ...defaultStaffPermissions }) : undefined,
  };

  batch.set(userRef, profileData);
  await batch.commit();
  
  const now = Timestamp.now();
  return {
    userProfile: {
      ...profileData,
      email: email, 
      createdAt: profileData.createdAt instanceof Timestamp ? profileData.createdAt : now, 
      lastLoginAt: profileData.lastLoginAt instanceof Timestamp ? profileData.lastLoginAt : now,
      lastActiveAt: profileData.lastActiveAt instanceof Timestamp ? profileData.lastActiveAt : now,
    },
    restaurantId: restaurantId ?? undefined
  };
}


export async function getUserProfile(uid: string): Promise<UserProfileType | null> {
  if (!db) {
    console.error("Firestore is not initialized in getUserProfile.");
    return null;
  }
  const userRef = doc(db, 'users', uid);
  const docSnap = await getDoc(userRef);

  if (docSnap.exists()) {
    const data = docSnap.data();
    return {
      uid: data.uid,
      email: data.email, // This will be the stored (potentially lowercase) email
      displayName: data.displayName || data.email?.split('@')[0] || null,
      photoURL: data.photoURL || null,
      role: data.role,
      restaurantId: data.restaurantId || null,
      onboardingComplete: typeof data.onboardingComplete === 'boolean' ? data.onboardingComplete : false,
      phoneNumber: data.phoneNumber || null,
      isAnonymous: typeof data.isAnonymous === 'boolean' ? data.isAnonymous : false,
      createdAt: data.createdAt as Timestamp,
      lastLoginAt: data.lastLoginAt as Timestamp,
      lastActiveAt: data.lastActiveAt as Timestamp,
      status: data.status || 'active',
      preferences: data.preferences || {},
      metadata: data.metadata || {},
      staffPermissions: data.staffPermissions || undefined,
    } as UserProfileType;
  } else {
    return null;
  }
}

export async function updateUserProfile(uid: string, data: Partial<UserProfileType>): Promise<void> {
  if (!db) throw new Error("Firestore is not initialized.");
  const userRef = doc(db, 'users', uid);
  const dataToUpdate: any = { ...data, updatedAt: serverTimestamp() };
  
  if (data.email) {
    dataToUpdate.email = data.email.toLowerCase(); // Normalize email if updated
  }

  if (data.hasOwnProperty('staffPermissions')) {
    dataToUpdate.staffPermissions = data.staffPermissions === undefined ? null : data.staffPermissions;
  }

  await setDoc(userRef, dataToUpdate, { merge: true });
}

export async function createRestaurant(ownerId: string, name: string, outletType?: OutletType): Promise<RestaurantProfile> {
  if (!db) throw new Error("Firestore is not initialized.");
  const restaurantCol = collection(db, 'restaurants');
  const now = serverTimestamp();
  const newRestaurantRef = doc(restaurantCol); // Generate ID client-side
  const restaurantId = newRestaurantRef.id;

  const restaurantData = {
    id: restaurantId,
    ownerId,
    name,
    outletType: outletType || 'restaurant',
    createdAt: now,
    updatedAt: now,
    settings: {
      onlineOrderingEnabled: false,
      tableReservationsEnabled: false,
      notificationEmail: `orders@${name.toLowerCase().replace(/\s+/g, '')}.example.com`,
      customDomain: null,
    },
    taxes: [],
  };
  await setDoc(newRestaurantRef, restaurantData);

  return {
    ...restaurantData,
    createdAt: Timestamp.now(), // For immediate client use
    updatedAt: Timestamp.now(), // For immediate client use
  } as RestaurantProfile;
}

export async function getRestaurant(restaurantId: string): Promise<RestaurantProfile | null> {
  if (!db) {
     console.error("Firestore is not initialized in getRestaurant.");
    return null;
  }
  const restaurantRef = doc(db, 'restaurants', restaurantId);
  const docSnap = await getDoc(restaurantRef);

  if (docSnap.exists()) {
    const data = docSnap.data();
    return {
      id: docSnap.id,
      ...data,
      createdAt: data.createdAt as Timestamp,
      updatedAt: data.updatedAt as Timestamp,
    } as RestaurantProfile;
  } else {
    return null;
  }
}

export async function getRestaurantsByOwner(ownerId: string): Promise<RestaurantProfile[]> {
  if (!db) {
    console.error("Firestore is not initialized in getRestaurantsByOwner.");
    return [];
  }
  const restaurantsCol = collection(db, 'restaurants');
  const q = query(restaurantsCol, where('ownerId', '==', ownerId), orderBy('createdAt', 'desc'));
  const querySnapshot = await getDocs(q);
  const restaurants: RestaurantProfile[] = [];
  querySnapshot.forEach((docSnap) => { 
    const data = docSnap.data();
    restaurants.push({
      id: docSnap.id,
      ...data,
      createdAt: data.createdAt as Timestamp,
      updatedAt: data.updatedAt as Timestamp,
    } as RestaurantProfile);
  });
  return restaurants;
}

export async function updateRestaurantProfile(restaurantId: string, data: Partial<Omit<RestaurantProfile, 'id' | 'createdAt'>>): Promise<void> {
  if (!db) throw new Error("Firestore is not initialized.");
  const restaurantRef = doc(db, 'restaurants', restaurantId);
  await setDoc(restaurantRef, { ...data, updatedAt: serverTimestamp() }, { merge: true });
}


export async function inviteStaffMember(
  restaurantId: string, 
  staffEmail: string, 
  invitingOwnerId: string,
  permissions?: StaffPermissions
): Promise<StaffInvitation> {
  if (!db) throw new Error("Firestore is not initialized.");
  if (!restaurantId) throw new Error("Restaurant ID is required to invite staff.");
  if (!staffEmail) throw new Error("Staff email is required.");

  const normalizedStaffEmail = staffEmail.toLowerCase(); 

  const invitationsCol = collection(db, `restaurants/${restaurantId}/staffInvitations`);

  const q = query(invitationsCol, where('email', '==', normalizedStaffEmail), where('status', '==', 'pending'));
  const existingInvites = await getDocs(q);
  if (!existingInvites.empty) {
    throw new Error(`An active invitation already exists for ${staffEmail} for this restaurant.`);
  }

  const createdAt = serverTimestamp();
  const newInvitationRef = doc(invitationsCol); 

  const invitationData: StaffInvitation = {
    id: newInvitationRef.id, 
    restaurantId,
    email: normalizedStaffEmail, 
    role: 'staff',
    status: 'pending',
    invitedBy: invitingOwnerId,
    createdAt: createdAt as Timestamp, 
    permissions: permissions || { ...defaultStaffPermissions },
  };

  await setDoc(newInvitationRef, invitationData);
  console.log(`Staff invitation created for ${staffEmail} (normalized: ${normalizedStaffEmail}) for restaurant ${restaurantId} with permissions:`, invitationData.permissions);
  return { ...invitationData, createdAt: Timestamp.now() }; 
}

export async function getStaffForRestaurant(restaurantId: string): Promise<UserProfileType[]> {
  if (!db) throw new Error("Firestore is not initialized.");
  const usersCol = collection(db, 'users');
  const q = query(usersCol, where('role', '==', 'staff'), where('restaurantId', '==', restaurantId));
  const querySnapshot = await getDocs(q);
  const staffList: UserProfileType[] = [];
  querySnapshot.forEach((docSnap) => { 
    staffList.push({ uid: docSnap.id, ...docSnap.data() } as UserProfileType);
  });
  return staffList;
}

export async function getPendingStaffInvitations(restaurantId: string): Promise<StaffInvitation[]> {
  if (!db) throw new Error("Firestore is not initialized.");
  const invitationsCol = collection(db, `restaurants/${restaurantId}/staffInvitations`);
  const q = query(invitationsCol, where('status', '==', 'pending'), orderBy('createdAt', 'desc'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(docSnap => {
    const data = docSnap.data();
    return {
      id: docSnap.id,
      ...data,
      createdAt: data.createdAt as Timestamp,
      acceptedAt: data.acceptedAt as Timestamp | undefined,
      acceptedByUid: data.acceptedByUid as string | undefined,
      permissions: data.permissions as StaffPermissions | undefined,
    } as StaffInvitation;
  });
}

export async function updateStaffPermissions(userId: string, restaurantId: string, permissions: StaffPermissions): Promise<void> {
  if (!db) throw new Error("Firestore is not initialized.");
  const userRef = doc(db, 'users', userId);
  const userSnap = await getDoc(userRef);
  if (!userSnap.exists()) {
    throw new Error("Staff member user profile not found.");
  }
  const userData = userSnap.data();
  if (userData?.role !== 'staff' || userData?.restaurantId !== restaurantId) {
    throw new Error("User is not a staff member of this restaurant or restaurantId mismatch.");
  }
  await updateDoc(userRef, { 
    staffPermissions: permissions, 
    updatedAt: serverTimestamp() 
  });
}
