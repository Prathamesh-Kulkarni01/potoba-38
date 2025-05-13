'use client';

import { useEffect } from 'react';
import { getToken, onMessage } from 'firebase/messaging';
import { messaging } from '@/lib/firebase/config'; // Ensure messaging is exported from config
import { useToast } from '@/hooks/use-toast';

// =====================================================================================
// IMPORTANT: CRITICAL PUSH NOTIFICATION SETUP REQUIRED
// =====================================================================================
// REPLACE "YOUR_VAPID_KEY_HERE" WITH YOUR ACTUAL VAPID KEY FROM THE FIREBASE CONSOLE.
// You can find this in: Firebase Console -> Project Settings -> Cloud Messaging tab -> Web configuration -> Web Push certificates.
// Generate a key pair if you haven't already. Copy the PUBLIC key.
//
// PUSH NOTIFICATIONS WILL NOT WORK WITHOUT A VALID VAPID KEY.
// =====================================================================================
const VAPID_KEY = "YOUR_VAPID_KEY_HERE"; 
// =====================================================================================

export default function FirebaseMessagingInitializer() {
  const { toast } = useToast();

  useEffect(() => {
    if (VAPID_KEY === "YOUR_VAPID_KEY_HERE") {
      console.warn("FirebaseMessagingInitializer: VAPID_KEY is a placeholder. Push notifications will not work until it's replaced with a real key from your Firebase project.");
      toast({
        variant: "destructive",
        title: "Push Notification Setup Required",
        description: "VAPID key is missing. Please configure it in firebase-messaging-initializer.tsx.",
        duration: 10000, // Show for longer
      });
    }
    
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator && messaging) {
      // Request permission and get token
      const requestNotificationPermission = async () => {
        try {
          const permission = await Notification.requestPermission();
          if (permission === 'granted') {
            console.log('Notification permission granted.');
            // Get registration token.
            const currentToken = await getToken(messaging, { vapidKey: VAPID_KEY });
            if (currentToken) {
              console.log('FCM Token:', currentToken);
              // Send this token to your server to send notifications to this device
              // e.g., sendTokenToServer(currentToken);
            } else {
              console.log('No registration token available. Request permission to generate one.');
            }
          } else {
            console.log('Unable to get permission to notify.');
          }
        } catch (error) {
          console.error('An error occurred while retrieving token. ', error);
        }
      };

      requestNotificationPermission();

      // Handle incoming messages when the app is in the foreground
      const unsubscribeOnMessage = onMessage(messaging, (payload) => {
        console.log('Message received in foreground. ', payload);
        toast({
          title: payload.notification?.title || 'New Notification',
          description: payload.notification?.body || '',
        });
        // Optionally, display an in-app notification UI
      });

      return () => {
        unsubscribeOnMessage(); // Unsubscribe from foreground messages when component unmounts
      };
    }
  }, [toast]);

  return null; // This component does not render anything
}
