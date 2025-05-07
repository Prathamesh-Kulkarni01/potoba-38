import { initializeApp } from 'firebase/app';
import { getAuth, setPersistence, browserLocalPersistence } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: "AIzaSyAU8FrdgZgvtbGvvd0pXugKohODjlo0CXI",
  authDomain: "app1-65be0.firebaseapp.com",
  databaseURL: "https://app1-65be0.firebaseio.com",
  projectId: "app1-65be0",
  storageBucket: "app1-65be0.firebasestorage.app",
  messagingSenderId: "1081840443655",
  appId: "1:1081840443655:web:b16feb9b7b4e406c8365a2"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase services
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

// Set persistence to LOCAL to persist across subdomains
setPersistence(auth, browserLocalPersistence);

export default app; 