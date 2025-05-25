
import {
  doc, setDoc, getDoc, serverTimestamp, Timestamp,
  collection, addDoc, writeBatch, query, where, getDocs,
  collectionGroup, limit, orderBy // Added orderBy here
} from 'firebase/firestore';
import { db } from './config';
import type { UserRole, UserProfile as UserProfileType, RestaurantProfile, OutletType, StaffInvitation } from '@/types';

export async function createUserProfile(
  uid: string,
  email: string | null,
  role: UserRole,
  restaurantData?: { name: string; outletType?: OutletType },
  phoneNumber?: string | null,
  isAnonymous?: boolean
): Promise<{ userProfile: UserProfileType; restaurantId?: string }> {
  if (!db) throw new Error("Firestore is not initialized.");

  let restaurantId: string | null = null;
  let onboardingComplete = true;
  let finalRole = role;

  // Check for pending staff invitations
  if (!isAnonymous && email) { // Only check for non-anonymous users with an email
    const invitationsSnapshot = await getDocs(
      query(collectionGroup(db, 'staffInvitations'), where('email', '==', email), where('status', '==', 'pending'), limit(1))
    );

    if (!invitationsSnapshot.empty) {
      const invitationDoc = invitationsSnapshot.docs[0];
      const invitationData = invitationDoc.data() as StaffInvitation;

      console.log(`Staff invitation found for ${email} at restaurant ${invitationData.restaurantId}`);

      finalRole = 'staff'; // Override role to staff
      restaurantId = invitationData.restaurantId;
      onboardingComplete = true; // Staff are considered onboarded

      // Update invitation status
      await updateDoc(invitationDoc.ref, {
        status: 'accepted',
        acceptedAt: serverTimestamp(),
        acceptedByUid: uid,
      });
      toast({ title: "Invitation Accepted!", description: `You've been added as staff to restaurant ID ${restaurantId}.` });
    }
  }


  // If still an owner role after checking invitations (or no invitation found for staff/user role)
  if (finalRole === 'owner' && !restaurantId) { // Ensure restaurantId isn't already set by an invitation override
    if (!restaurantData?.name) {
      throw new Error("Restaurant name is required for owner sign-up.");
    }
    onboardingComplete = false;
    const newRestaurantRef = await addDoc(collection(db, 'restaurants'), {
      ownerId: uid,
      name: restaurantData.name,
      outletType: restaurantData.outletType || 'restaurant',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    restaurantId = newRestaurantRef.id;
  }

  const userRef = doc(db, 'users', uid);
  const profileData: UserProfileType = {
    uid,
    email,
    role: finalRole,
    restaurantId,
    onboardingComplete,
    phoneNumber: phoneNumber || null,
    isAnonymous: isAnonymous || false,
    createdAt: serverTimestamp() as Timestamp,
    displayName: email?.split('@')[0] || 'User', // Basic display name
    photoURL: null, // Default photoURL
    // Default other fields if necessary
    lastLoginAt: serverTimestamp() as Timestamp,
    lastActiveAt: serverTimestamp() as Timestamp,
    status: 'active',
    preferences: {},
    metadata: {},
  };

  await setDoc(userRef, profileData);
  const now = Timestamp.now();
  return {
    userProfile: {
      ...profileData,
      createdAt: profileData.createdAt instanceof Timestamp ? profileData.createdAt : now
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
      email: data.email,
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
    } as UserProfileType;
  } else {
    return null;
  }
}

export async function updateUserProfile(uid: string, data: Partial<UserProfileType>): Promise<void> {
  if (!db) throw new Error("Firestore is not initialized.");
  const userRef = doc(db, 'users', uid);
  const dataToUpdate = { ...data, updatedAt: serverTimestamp() };
  if (data.createdAt && !(data.createdAt instanceof Timestamp)) {
    // Handle potential client-side timestamp if needed, or ensure it's always serverTimestamp for updates
  }
  await setDoc(userRef, dataToUpdate, { merge: true });
}

export async function createRestaurant(ownerId: string, name: string, outletType?: OutletType): Promise<RestaurantProfile> {
  if (!db) throw new Error("Firestore is not initialized.");
  const restaurantCol = collection(db, 'restaurants');
  const now = serverTimestamp();
  const restaurantRef = await addDoc(restaurantCol, {
    ownerId,
    name,
    outletType: outletType || 'restaurant',
    createdAt: now,
    updatedAt: now,
  });
  return {
    id: restaurantRef.id,
    ownerId,
    name,
    outletType: outletType || 'restaurant',
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
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
      createdAt: data.createdAt as Timestamp, // Cast to Timestamp
      updatedAt: data.updatedAt as Timestamp, // Cast to Timestamp
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
  querySnapshot.forEach((doc) => {
    const data = doc.data();
    restaurants.push({
      id: doc.id,
      ...data,
      createdAt: data.createdAt as Timestamp, // Cast to Timestamp
      updatedAt: data.updatedAt as Timestamp, // Cast to Timestamp
    } as RestaurantProfile);
  });
  return restaurants;
}

export async function updateRestaurantProfile(restaurantId: string, data: Partial<Omit<RestaurantProfile, 'id' | 'createdAt'>>): Promise<void> {
  if (!db) throw new Error("Firestore is not initialized.");
  const restaurantRef = doc(db, 'restaurants', restaurantId);
  await setDoc(restaurantRef, { ...data, updatedAt: serverTimestamp() }, { merge: true });
}

// --- Staff Invitation Functions ---
export async function inviteStaffMember(restaurantId: string, staffEmail: string, invitingOwnerId: string): Promise<StaffInvitation> {
  if (!db) throw new Error("Firestore is not initialized.");
  if (!restaurantId) throw new Error("Restaurant ID is required to invite staff.");
  if (!staffEmail) throw new Error("Staff email is required.");

  const invitationsCol = collection(db, `restaurants/${restaurantId}/staffInvitations`);

  // Check if an active pending invitation already exists for this email for this restaurant
  const q = query(invitationsCol, where('email', '==', staffEmail), where('status', '==', 'pending'));
  const existingInvites = await getDocs(q);
  if (!existingInvites.empty) {
    throw new Error(`An active invitation already exists for ${staffEmail} for this restaurant.`);
  }

  const createdAt = serverTimestamp();
  const newInvitationRef = doc(invitationsCol); // Generate a new ID

  const invitationData: StaffInvitation = {
    id: newInvitationRef.id,
    restaurantId,
    email: staffEmail,
    role: 'staff', // Default role for invited staff
    status: 'pending',
    invitedBy: invitingOwnerId,
    createdAt: createdAt as Timestamp, // Will be server timestamp
  };

  await setDoc(newInvitationRef, invitationData);
  return { ...invitationData, createdAt: Timestamp.now() }; // Return with client-side timestamp for immediate use
}

export async function getStaffForRestaurant(restaurantId: string): Promise<UserProfileType[]> {
  if (!db) throw new Error("Firestore is not initialized.");
  const usersCol = collection(db, 'users');
  const q = query(usersCol, where('role', '==', 'staff'), where('restaurantId', '==', restaurantId));
  const querySnapshot = await getDocs(q);
  const staffList: UserProfileType[] = [];
  querySnapshot.forEach((doc) => {
    staffList.push({ uid: doc.id, ...doc.data() } as UserProfileType);
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
      createdAt: data.createdAt as Timestamp, // Assuming createdAt is a Timestamp
    } as StaffInvitation;
  });
}

// This is just a placeholder for toast, assuming you have a toast system
const toast = ({ title, description, variant }: { title: string; description: string; variant?: string }) => {
  console.log(`Toast (${variant || 'default'}): ${title} - ${description}`);
};
