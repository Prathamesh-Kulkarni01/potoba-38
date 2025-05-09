import { doc, setDoc, getDoc, serverTimestamp, Timestamp, collection, addDoc, writeBatch } from 'firebase/firestore';
import { db } from './config';
import type { UserRole, UserProfile as UserProfileType, RestaurantProfile } from '@/types'; // UserProfileType alias to avoid naming conflict

export async function createUserProfile(
  uid: string,
  email: string | null,
  role: UserRole, // Role is now a parameter
  restaurantData?: { name: string; type?: string } // Optional, primarily for 'owner'
): Promise<{ userProfile: UserProfileType; restaurantId?: string }> {
  if (!db) throw new Error("Firestore is not initialized.");

  let restaurantId: string | null = null;
  let onboardingComplete = true; // Default to true for non-owners or if no specific onboarding path

  if (role === 'owner') {
    if (!restaurantData?.name) {
      // This check could be more robust or handled by form validation prior to calling this function.
      // For now, ensure restaurantData.name exists if role is owner.
      throw new Error("Restaurant name is required for owner sign-up.");
    }
    onboardingComplete = false; // Owners start with onboarding incomplete
    const newRestaurantRef = await addDoc(collection(db, 'restaurants'), {
      ownerId: uid,
      name: restaurantData.name,
      type: restaurantData.type || '',
      createdAt: serverTimestamp(),
      // other initial restaurant fields
    });
    restaurantId = newRestaurantRef.id;
  }
  // For 'staff' and 'user' roles, restaurantId remains null and onboardingComplete remains true.
  // Staff would typically be invited to a restaurant later.
  // Users might have a different, simpler onboarding or none if not applicable.

  const userRef = doc(db, 'users', uid);
  const profileData: UserProfileType = {
    uid,
    email,
    role, // Use the passed role
    restaurantId,
    onboardingComplete,
    createdAt: serverTimestamp() as Timestamp, // serverTimestamp() will be converted
  };

  await setDoc(userRef, profileData);
  // For the return, ensure createdAt is a Timestamp, even if temporary for client-side use before Firestore sync
  // This satisfies the UserProfileType.
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
      createdAt: data.createdAt as Timestamp, 
    } as UserProfileType;
  } else {
    return null;
  }
}

export async function updateUserProfile(uid: string, data: Partial<UserProfileType>): Promise<void> {
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
    return null;
  }
}

export async function updateRestaurantProfile(restaurantId: string, data: Partial<RestaurantProfile>): Promise<void> {
  if (!db) throw new Error("Firestore is not initialized.");
  const restaurantRef = doc(db, 'restaurants', restaurantId);
  await setDoc(restaurantRef, data, { merge: true });
}
