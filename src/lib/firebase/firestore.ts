import { doc, setDoc, getDoc, serverTimestamp, Timestamp } from 'firebase/firestore';
import { db } from './config'; // Ensure db is exported from config.ts
import type { UserRole } from '@/types';

export interface UserProfile {
  uid: string;
  email: string | null;
  role: UserRole;
  createdAt: Timestamp;
}

export async function createUserProfile(uid: string, email: string | null, role: UserRole = 'user'): Promise<void> {
  if (!db) throw new Error("Firestore is not initialized.");
  const userRef = doc(db, 'users', uid);
  await setDoc(userRef, {
    uid,
    email,
    role,
    createdAt: serverTimestamp(),
  });
}

export async function getUserRole(uid: string): Promise<UserRole | null> {
  if (!db) throw new Error("Firestore is not initialized.");
  const userRef = doc(db, 'users', uid);
  const docSnap = await getDoc(userRef);

  if (docSnap.exists()) {
    const userData = docSnap.data() as UserProfile;
    return userData.role;
  } else {
    // console.warn(`No user profile found for UID: ${uid}`);
    return null;
  }
}
