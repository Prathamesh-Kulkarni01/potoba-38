import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth, Auth, setPersistence, browserLocalPersistence, initializeAuth, indexedDBLocalPersistence } from 'firebase/auth';
import { getFirestore, Firestore, enableIndexedDbPersistence, initializeFirestore, CACHE_SIZE_UNLIMITED } from 'firebase/firestore';
import { getMessaging, Messaging } from 'firebase/messaging';

const firebaseConfig = {
  apiKey: "AIzaSyAU8FrdgZgvtbGvvd0pXugKohODjlo0CXI",
  authDomain: "app1-65be0.firebaseapp.com",
  databaseURL: "https://app1-65be0.firebaseio.com",
  projectId: "app1-65be0",
  storageBucket: "app1-65be0.firebasestorage.app",
  messagingSenderId: "1081840443655",
  appId: "1:1081840443655:web:b16feb9b7b4e406c8365a2",
};

let app: FirebaseApp;
let authInstance: Auth;
let dbInstance: Firestore;
let messagingInstance: Messaging | null = null;

if (!getApps().length) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApp();
}

// Initialize Auth with advanced persistence
try {
  authInstance = initializeAuth(app, {
    persistence: [indexedDBLocalPersistence, browserLocalPersistence]
  });
} catch (e) {
  console.error("Error initializing Auth with persistence:", e);
  // Fallback to regular auth initialization
  authInstance = getAuth(app);
  setPersistence(authInstance, browserLocalPersistence);
}  // Initialize Firestore with enhanced offline persistence
try {
  dbInstance = initializeFirestore(app, {
    cacheSizeBytes: CACHE_SIZE_UNLIMITED,
    experimentalForceLongPolling: true, // Helps with reliability in some environments
  });

  // Enable offline persistence
  enableIndexedDbPersistence(dbInstance).then(() => {
    console.log("Firebase Firestore: Enhanced offline persistence enabled.");
  }).catch((err) => {
    if (err.code === 'failed-precondition') {
      console.warn("Firebase Firestore: Multiple tabs open, persistence enabled in another tab.");
    } else if (err.code === 'unimplemented') {
      console.warn("Firebase Firestore: Browser doesn't support persistence.");
    } else {
      console.error("Firebase Firestore: Error enabling offline persistence:", err);
    }
  });
} catch (e) {
  console.error("Error initializing Firestore with persistence:", e);
  // Fallback to regular Firestore initialization
  dbInstance = getFirestore(app);
}

// Initialize Firebase Messaging if in a browser environment
if (typeof window !== 'undefined') {
  try {
    messagingInstance = getMessaging(app);
  } catch (error) {
    console.error('Error initializing Firebase Messaging:', error);
  }
}

export { app, authInstance as auth, dbInstance as db, messagingInstance as messaging };
