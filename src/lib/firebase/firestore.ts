
import { doc, setDoc, getDoc, serverTimestamp, Timestamp, collection, addDoc, writeBatch, query, where, getDocs } from 'firebase/firestore';
import { db } from './config';
import type { UserRole, UserProfile as UserProfileType, RestaurantProfile } from '@/types'; 

export async function createUserProfile(
  uid: string,
  email: string | null,
  role: UserRole, 
  restaurantData?: { name: string; type?: string },
  phoneNumber?: string | null, // Added
  isAnonymous?: boolean // Added
): Promise<{ userProfile: UserProfileType; restaurantId?: string }> {
  if (!db) throw new Error("Firestore is not initialized.");

  let restaurantId: string | null = null;
  let onboardingComplete = true; 

  if (role === 'owner') {
    if (!restaurantData?.name) {
      throw new Error("Restaurant name is required for owner sign-up.");
    }
    onboardingComplete = false; 
    const newRestaurantRef = await addDoc(collection(db, 'restaurants'), {
      ownerId: uid,
      name: restaurantData.name,
      type: restaurantData.type || '',
      createdAt: serverTimestamp(),
    });
    restaurantId = newRestaurantRef.id;
  }
  
  const userRef = doc(db, 'users', uid);
  const profileData: UserProfileType = {
    uid,
    email,
    role, 
    restaurantId, 
    onboardingComplete,
    phoneNumber: phoneNumber || null, // Save phone number
    isAnonymous: isAnonymous || false, // Save anonymous status
    createdAt: serverTimestamp() as Timestamp, 
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
      role: data.role,
      restaurantId: data.restaurantId || null, 
      onboardingComplete: typeof data.onboardingComplete === 'boolean' ? data.onboardingComplete : false,
      phoneNumber: data.phoneNumber || null, // Retrieve phone number
      isAnonymous: typeof data.isAnonymous === 'boolean' ? data.isAnonymous : false, // Retrieve anonymous status
      createdAt: data.createdAt as Timestamp, 
    } as UserProfileType;
  } else {
    return null;
  }
}

export async function updateUserProfile(uid: string, data: Partial<UserProfileType>): Promise<void> {
  if (!db) throw new Error("Firestore is not initialized.");
  const userRef = doc(db, 'users', uid);
  // Ensure serverTimestamp is used for any timestamp fields if they are part of `data`
  const dataToUpdate = { ...data };
  if (data.createdAt && !(data.createdAt instanceof Timestamp)) {
      // If createdAt is being set and it's not already a Timestamp (e.g. from a client placeholder)
      // it's generally not updated after initial creation, but if it is, ensure it's correct type or serverTimestamp
  }
  // Add updatedAt if it's a field in UserProfileType and you want to track updates
  // dataToUpdate.updatedAt = serverTimestamp(); 
  await setDoc(userRef, dataToUpdate, { merge: true });
}

export async function createRestaurant(ownerId: string, name: string, type?: string): Promise<RestaurantProfile> {
  if (!db) throw new Error("Firestore is not initialized.");
  const restaurantCol = collection(db, 'restaurants');
  const createdAt = serverTimestamp();
  const restaurantRef = await addDoc(restaurantCol, {
    ownerId,
    name,
    type: type || '',
    createdAt,
  });
  return {
    id: restaurantRef.id,
    ownerId,
    name,
    type: type || '',
    createdAt: Timestamp.now(), 
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
    return { id: docSnap.id, ...docSnap.data() } as RestaurantProfile;
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
  const q = query(restaurantsCol, where('ownerId', '==', ownerId));
  const querySnapshot = await getDocs(q);
  const restaurants: RestaurantProfile[] = [];
  querySnapshot.forEach((doc) => {
    restaurants.push({ id: doc.id, ...doc.data() } as RestaurantProfile);
  });
  return restaurants;
}

export async function updateRestaurantProfile(restaurantId: string, data: Partial<RestaurantProfile>): Promise<void> {
  if (!db) throw new Error("Firestore is not initialized.");
  const restaurantRef = doc(db, 'restaurants', restaurantId);
  await setDoc(restaurantRef, data, { merge: true });
}
