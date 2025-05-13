// Import and configure the Firebase SDK
// This is the GSTATIC URL version, adjust if you prefer a different method
importScripts('https://www.gstatic.com/firebasejs/10.12.3/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.3/firebase-messaging-compat.js');

// Initialize Firebase
// IMPORTANT: Replace with your actual Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyAU8FrdgZgvtbGvvd0pXugKohODjlo0CXI",
  authDomain: "app1-65be0.firebaseapp.com",
  projectId: "app1-65be0",
  storageBucket: "app1-65be0.appspot.com",
  messagingSenderId: "1081840443655", // This ID is crucial for FCM
  appId: "1:1081840443655:web:b16feb9b7b4e406c8365a2",
};

firebase.initializeApp(firebaseConfig);

// Retrieve an instance of Firebase Messaging so that it can handle background messages.
const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message ', payload);

  // Customize notification here
  const notificationTitle = payload.notification?.title || 'New Message';
  const notificationOptions = {
    body: payload.notification?.body || 'You have a new message.',
    icon: payload.notification?.icon || '/icons/icon-192x192.png', // Default icon
    data: payload.data // Pass along any data payload
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});
