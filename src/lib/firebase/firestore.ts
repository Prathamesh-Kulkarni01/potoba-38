
import {
  doc, setDoc, getDoc, serverTimestamp, Timestamp,
  collection, addDoc, writeBatch, query, where, getDocs,
  collectionGroup, limit, orderBy, updateDoc, WriteBatch, documentId, FieldPath
} from 'firebase/firestore';
import { db } from './config';
import type { UserRole, UserProfile as UserProfileType, RestaurantProfile, OutletType, StaffInvitation, StaffPermissions, StaffRole } from '@/types';
import { DEFAULT_PERMISSIONS_BY_ROLE, defaultStaffPermissions, STAFF_ROLES_ARRAY } from '@/types'; // Import defaultStaffPermissions and STAFF_ROLES_ARRAY

export async function createUserProfile(
  uid: string,
  email: string | null,
  selectedRoleOnSignup: UserRole, // This is the role selected on the signup form ('owner', 'staff', 'user')
  restaurantData?: { name: string; outletType: OutletType },
  phoneNumber?: string | null,
  isAnonymous?: boolean
): Promise<{ userProfile: UserProfileType; restaurantId?: string }> {
  if (!db) throw new Error("Firestore is not initialized.");

  let finalRestaurantId: string | null = null;
  let onboardingComplete = true;
  let finalUserRole: UserRole; // This will be 'owner', 'user', or a specific StaffRole like 'Waiter'
  let finalStaffRole: StaffRole | undefined = undefined; // Explicitly for staff's specific duty
  let finalStaffPermissions: StaffPermissions | undefined = undefined;
  const batch = writeBatch(db);

  const normalizedSignupEmail = email ? email.toLowerCase() : null;

  // Check for pending staff invitations first
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

      console.log(`Staff invitation found for ${email} (normalized: ${normalizedSignupEmail}) for restaurant ${invitationData.restaurantId}. Assigning role '${invitationData.role}'.`);
      
      finalUserRole = invitationData.role; // Assign the specific role from invitation (e.g., 'Waiter', 'Manager')
      finalStaffRole = invitationData.staffRole; // Also store the specific staff role here
      finalRestaurantId = invitationData.restaurantId;
      onboardingComplete = true; // Staff are considered onboarded for their role
      finalStaffPermissions = invitationData.permissions || DEFAULT_PERMISSIONS_BY_ROLE[invitationData.role as StaffRole] || { ...defaultStaffPermissions };

      batch.update(invitationDoc.ref, {
        status: 'accepted',
        acceptedAt: serverTimestamp(),
        acceptedByUid: uid,
      });
    } else if (selectedRoleOnSignup === 'staff') {
      // User selected 'staff' but no invitation found
      console.warn(`User ${normalizedSignupEmail} selected 'staff' role on signup form but no pending invitation found. Creating as 'user' role without restaurant assignment.`);
      finalUserRole = 'user'; 
      finalStaffRole = undefined;
      finalRestaurantId = null;
      onboardingComplete = true; 
      finalStaffPermissions = undefined;
    } else {
      // No invitation, and role is not 'staff' (e.g. 'owner' or 'user' from signup form)
      finalUserRole = selectedRoleOnSignup;
    }
  } else if (isAnonymous) {
    finalUserRole = 'user'; // Anonymous users are 'user'
    onboardingComplete = true;
  } else {
    // Not anonymous and no email (should not happen with email/password signup)
    finalUserRole = selectedRoleOnSignup; // Fallback
  }


  // Handle 'owner' signup if not overridden by staff invitation and role is indeed 'owner'
  if (finalUserRole === 'owner') {
    if (!restaurantData?.name) {
      throw new Error("Restaurant name is required for owner sign-up.");
    }
    if (!restaurantData?.outletType) {
      throw new Error("Outlet type is required for owner sign-up.");
    }
    onboardingComplete = false; // Owners need to go through onboarding
    const newRestaurantRef = doc(collection(db, 'restaurants'));
    finalRestaurantId = newRestaurantRef.id;
    batch.set(newRestaurantRef, {
      id: finalRestaurantId,
      ownerId: uid,
      name: restaurantData.name,
      outletType: restaurantData.outletType,
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
    role: finalUserRole,
    staffRole: finalStaffRole, 
    restaurantId: finalRestaurantId,
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
    staffPermissions: finalStaffPermissions,
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
    restaurantId: finalRestaurantId ?? undefined
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
      role: data.role as UserRole,
      staffRole: data.staffRole || null,
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
    dataToUpdate.email = data.email.toLowerCase();
  }

  if (data.hasOwnProperty('staffPermissions')) {
    dataToUpdate.staffPermissions = data.staffPermissions === undefined ? null : data.staffPermissions;
  }
   // If 'role' is provided and it's a StaffRole, also update 'staffRole'
  if (data.role && STAFF_ROLES_ARRAY.includes(data.role as StaffRole)) {
    dataToUpdate.staffRole = data.role;
  } else if (data.hasOwnProperty('staffRole') && data.staffRole === undefined) {
    // If staffRole is explicitly being set to undefined (e.g., user is no longer staff)
    dataToUpdate.staffRole = null;
  }


  await setDoc(userRef, dataToUpdate, { merge: true });
}

export async function createRestaurant(ownerId: string, name: string, outletType: OutletType): Promise<RestaurantProfile> {
  if (!db) throw new Error("Firestore is not initialized.");
  const restaurantCol = collection(db, 'restaurants');
  const now = serverTimestamp();
  const newRestaurantRef = doc(restaurantCol); 
  const restaurantId = newRestaurantRef.id;

  const restaurantData = {
    id: restaurantId,
    ownerId,
    name,
    outletType: outletType, 
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
  staffRoleToInvite: StaffRole, // Specific role like 'Waiter', 'Manager'
  customPermissions?: StaffPermissions
): Promise<StaffInvitation> {
  if (!db) throw new Error("Firestore is not initialized.");
  if (!restaurantId) throw new Error("Restaurant ID is required to invite staff.");
  if (!staffEmail) throw new Error("Staff email is required.");
  if (!staffRoleToInvite) throw new Error("Staff role is required for invitation.");

  const normalizedStaffEmail = staffEmail.toLowerCase();

  const invitationsCol = collection(db, `restaurants/${restaurantId}/staffInvitations`);

  const q = query(invitationsCol, where('email', '==', normalizedStaffEmail), where('status', '==', 'pending'));
  const existingInvites = await getDocs(q);
  if (!existingInvites.empty) {
    throw new Error(`An active invitation already exists for ${staffEmail} for this restaurant.`);
  }

  const createdAt = serverTimestamp();
  const newInvitationRef = doc(invitationsCol);

  const permissionsToSet = customPermissions || DEFAULT_PERMISSIONS_BY_ROLE[staffRoleToInvite] || { ...defaultStaffPermissions };

  const invitationData: StaffInvitation = {
    id: newInvitationRef.id,
    restaurantId,
    email: normalizedStaffEmail,
    role: staffRoleToInvite, // Store the specific staff role in the 'role' field of invitation
    staffRole: staffRoleToInvite, // Also store it in staffRole for consistency
    status: 'pending',
    invitedBy: invitingOwnerId,
    createdAt: createdAt as Timestamp,
    permissions: permissionsToSet,
  };

  await setDoc(newInvitationRef, invitationData);
  console.log(`Staff invitation created for ${staffEmail} (normalized: ${normalizedStaffEmail}) for restaurant ${restaurantId} with role ${staffRoleToInvite} and permissions:`, invitationData.permissions);
  return { ...invitationData, createdAt: Timestamp.now() };
}

export async function getStaffForRestaurant(restaurantId: string): Promise<UserProfileType[]> {
  if (!db) throw new Error("Firestore is not initialized.");
  const usersCol = collection(db, 'users');
  // Query for users whose role is one of the StaffRole types and match restaurantId
  const q = query(usersCol, 
    where('role', 'in', STAFF_ROLES_ARRAY), 
    where('restaurantId', '==', restaurantId)
  );
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
      role: data.role as StaffRole, // Ensure this is typed as StaffRole
      staffRole: data.staffRole as StaffRole, // Ensure this is typed as StaffRole
    } as StaffInvitation;
  });
}

export async function updateStaffRoleAndPermissions(
  userId: string,
  restaurantId: string,
  newRole: StaffRole, // This is the specific new role like 'Waiter', 'Manager'
  newPermissions?: StaffPermissions
): Promise<void> {
  if (!db) throw new Error("Firestore is not initialized.");
  const userRef = doc(db, 'users', userId);
  const userSnap = await getDoc(userRef);
  if (!userSnap.exists()) {
    throw new Error("Staff member user profile not found.");
  }
  const userData = userSnap.data() as UserProfileType;
  // Check if the current role is a staff role and if the restaurant ID matches
  if (!STAFF_ROLES_ARRAY.includes(userData?.role as StaffRole) || userData?.restaurantId !== restaurantId) {
    throw new Error("User is not a staff member of this restaurant or restaurantId mismatch.");
  }

  const permissionsToSet = newPermissions || DEFAULT_PERMISSIONS_BY_ROLE[newRole] || { ...defaultStaffPermissions };

  await updateDoc(userRef, {
    role: newRole, // Update the main role to the specific staff role
    staffRole: newRole, // Also update staffRole field for consistency
    staffPermissions: permissionsToSet,
    updatedAt: serverTimestamp()
  });
}
