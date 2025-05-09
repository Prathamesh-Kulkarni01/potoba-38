import { doc, setDoc, getDoc, serverTimestamp, Timestamp, collection, addDoc, writeBatch } from 'firebase/firestore';
import { db } from './config';
import type { UserRole, UserProfile, RestaurantProfile } from '@/types';

// UserProfile is now imported from '@/types'

export async function createUserProfile(
  uid: string,
  email: string | null,
  role: UserRole = 'owner', // Default new sign-ups to 'owner'
  restaurantData?: { name: string; type?: string }
): Promise<{ userProfile: UserProfileType; restaurantId?: string }> {
  if (!db) throw new Error("Firestore is not initialized.");

  let restaurantId: string | null = null;
  let onboardingComplete = true; // Default to true for non-owners or if no restaurant setup needed

  if (role === 'owner') {
    onboardingComplete = false; // Owners start with onboarding incomplete
    // Create a restaurant for the owner
    const newRestaurantRef = await addDoc(collection(db, 'restaurants'), {
      ownerId: uid,
      name: restaurantData?.name || `${email?.split('@')[0]}'s Restaurant` || "New Restaurant",
      type: restaurantData?.type || '',
      createdAt: serverTimestamp(),
      // other initial restaurant fields
    });
    restaurantId = newRestaurantRef.id;
  }

  const userRef = doc(db, 'users', uid);
  const profileData: UserProfile = {
    uid,
    email,
    role,
    restaurantId,
    onboardingComplete,
    createdAt: serverTimestamp() as Timestamp, // serverTimestamp() will be converted
  };

  await setDoc(userRef, profileData);
  return { userProfile: { ...profileData, createdAt: new Timestamp(0,0) /* temp value */ }, restaurantId: restaurantId ?? undefined };
}


export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  if (!db) {
    console.error("Firestore is not initialized in getUserProfile.");
    return null;
  }
  const userRef = doc(db, 'users', uid);
  const docSnap = await getDoc(userRef);

  if (docSnap.exists()) {
    // Explicitly cast to ensure type safety, especially for serverTimestamp fields
    const data = docSnap.data();
    return {
      uid: data.uid,
      email: data.email,
      role: data.role,
      restaurantId: data.restaurantId || null,
      onboardingComplete: typeof data.onboardingComplete === 'boolean' ? data.onboardingComplete : false,
      createdAt: data.createdAt as Timestamp, // Assuming it's stored as a Firestore Timestamp
    } as UserProfile;
  } else {
    // console.warn(`No user profile found for UID: ${uid}`);
    return null;
  }
}

export async function updateUserProfile(uid: string, data: Partial<UserProfile>): Promise<void> {
  if (!db) throw new Error("Firestore is not initialized.");
  const userRef = doc(db, 'users', uid);
  await setDoc(userRef, data, { merge: true });
}

export async function createRestaurant(ownerId: string, name: string, type?: string): Promise<string> {
  if (!db) throw new Error("Firestore is not initialized.");
  const restaurantCol = collection(db, 'restaurants');
  const restaurantRef = await addDoc(restaurantCol, {
    ownerId,
    name,
    type: type || '',
    createdAt: serverTimestamp(),
    // other initial fields
  });
  return restaurantRef.id;
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
    // console.warn(`No restaurant found for ID: ${restaurantId}`);
    return null;
  }
}

export async function updateRestaurantProfile(restaurantId: string, data: Partial<RestaurantProfile>): Promise<void> {
  if (!db) throw new Error("Firestore is not initialized.");
  const restaurantRef = doc(db, 'restaurants', restaurantId);
  await setDoc(restaurantRef, data, { merge: true });
}
