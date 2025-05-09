import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyAU8FrdgZgvtbGvvd0pXugKohODjlo0CXI",
  authDomain: "app1-65be0.firebaseapp.com",
  // databaseURL: "https://app1-65be0.firebaseio.com", // databaseURL is not used in modern Firebase SDKs for Firestore
  projectId: "app1-65be0",
  storageBucket: "app1-65be0.appspot.com", // Corrected storage bucket format
  messagingSenderId: "1081840443655",
  appId: "1:1081840443655:web:b16feb9b7b4e406c8365a2",
  // measurementId is optional and not provided, so it's removed.
  // measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

let app: FirebaseApp;
let auth: Auth;
let db: Firestore;

if (typeof window !== 'undefined' && !getApps().length) {
  app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = getFirestore(app);
} else if (typeof window !== 'undefined') {
  app = getApp();
  auth = getAuth(app);
  db = getFirestore(app);
} else {
  // For server-side, you might initialize differently or not at all if only client-side SDK is used
  // This scaffold focuses on client-side Firebase
  // To avoid errors during Next.js build/server-side rendering when Firebase client SDK is imported,
  // we can conditionally initialize or provide placeholder objects.
  // However, for this setup, we assume client-side only usage for auth and db.
  // If server-side Firebase Admin SDK were used, its initialization would be separate.
}

export { app, auth, db };

