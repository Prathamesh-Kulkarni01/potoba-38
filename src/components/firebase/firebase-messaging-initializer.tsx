'use client';

import { useEffect } from 'react';
import { getToken, onMessage } from 'firebase/messaging';
import { messaging } from '@/lib/firebase/config'; // Ensure messaging is exported from config
import { useToast } from '@/hooks/use-toast';

// IMPORTANT: Replace with your VAPID key from Firebase Console
// Project settings > Cloud Messaging > Web configuration > Key pair
const VAPID_KEY = "YOUR_VAPID_KEY_HERE"; // TODO: User needs to replace this

export default function FirebaseMessagingInitializer() {
  const { toast } = useToast();

  useEffect(() => {
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
