
import { doc, setDoc, getDoc, serverTimestamp, Timestamp, collection, addDoc, writeBatch, query, where, getDocs } from 'firebase/firestore';
import { db } from './config';
import type { UserRole, UserProfile as UserProfileType, RestaurantProfile, OutletType } from '@/types'; 

export async function createUserProfile(
  uid: string,
  email: string | null,
  role: UserRole, 
  restaurantData?: { name: string; outletType?: OutletType }, // outletType is now part of restaurantData
  phoneNumber?: string | null, 
  isAnonymous?: boolean 
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
      outletType: restaurantData.outletType || 'restaurant', // Default if not provided during initial creation
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
    phoneNumber: phoneNumber || null, 
    isAnonymous: isAnonymous || false, 
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
      phoneNumber: data.phoneNumber || null, 
      isAnonymous: typeof data.isAnonymous === 'boolean' ? data.isAnonymous : false, 
      createdAt: data.createdAt as Timestamp, 
    } as UserProfileType;
  } else {
    return null;
  }
}

export async function updateUserProfile(uid: string, data: Partial<UserProfileType>): Promise<void> {
  if (!db) throw new Error("Firestore is not initialized.");
  const userRef = doc(db, 'users', uid);
  const dataToUpdate = { ...data };
  if (data.createdAt && !(data.createdAt instanceof Timestamp)) {
    // Handle potential client-side timestamp if needed, or ensure it's always serverTimestamp for updates
  }
  // dataToUpdate.updatedAt = serverTimestamp(); // Consider adding an updatedAt field to UserProfile
  await setDoc(userRef, dataToUpdate, { merge: true });
}

export async function createRestaurant(ownerId: string, name: string, outletType?: OutletType): Promise<RestaurantProfile> {
  if (!db) throw new Error("Firestore is not initialized.");
  const restaurantCol = collection(db, 'restaurants');
  const createdAt = serverTimestamp();
  const restaurantRef = await addDoc(restaurantCol, {
    ownerId,
    name,
    outletType: outletType || 'restaurant', // Default if not provided
    createdAt,
  });
  return {
    id: restaurantRef.id,
    ownerId,
    name,
    outletType: outletType || 'restaurant',
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
