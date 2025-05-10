import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyAU8FrdgZgvtbGvvd0pXugKohODjlo0CXI",
  authDomain: "app1-65be0.firebaseapp.com",
  projectId: "app1-65be0",
  storageBucket: "app1-65be0.appspot.com",
  messagingSenderId: "1081840443655",
  appId: "1:1081840443655:web:b16feb9b7b4e406c8365a2",
};

let app: FirebaseApp;
let authInstance: Auth; // Renamed to avoid conflict with auth export if any global auth object exists
let dbInstance: Firestore; // Renamed to avoid conflict

if (!getApps().length) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApp();
}

authInstance = getAuth(app);
dbInstance = getFirestore(app);

// Exporting renamed instances
export { app, authInstance as auth, dbInstance as db };
