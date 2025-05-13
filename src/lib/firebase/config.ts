import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import { getFirestore, Firestore, enableIndexedDbPersistence, initializeFirestore, CACHE_SIZE_UNLIMITED } from 'firebase/firestore';
import { getMessaging, Messaging } from 'firebase/messaging';

const firebaseConfig = {
  apiKey: "AIzaSyAU8FrdgZgvtbGvvd0pXugKohODjlo0CXI",
  authDomain: "app1-65be0.firebaseapp.com",
  databaseURL: "https://app1-65be0.firebaseio.com",
  projectId: "app1-65be0",
  storageBucket: "app1-65be0.firebasestorage.app", // Ensured this matches user's explicit instruction
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

authInstance = getAuth(app);

// Initialize Firestore with offline persistence
try {
    dbInstance = initializeFirestore(app, {
        cacheSizeBytes: CACHE_SIZE_UNLIMITED // Optional: adjust cache size
    });
    enableIndexedDbPersistence(dbInstance)
    .then(() => {
        console.log("Firebase Firestore: Offline persistence enabled.");
    })
    .catch((err) => {
        if (err.code == 'failed-precondition') {
            console.warn("Firebase Firestore: Multiple tabs open, offline persistence can only be enabled in one tab at a a time.");
        } else if (err.code == 'unimplemented') {
            console.warn("Firebase Firestore: The current browser does not support all of the features required to enable offline persistence.");
        } else {
            console.error("Firebase Firestore: Error enabling offline persistence: ", err);
        }
    });
} catch (e) {
    console.error("Error initializing Firestore with persistence: ", e);
    // Fallback to regular Firestore initialization if persistence setup fails
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
