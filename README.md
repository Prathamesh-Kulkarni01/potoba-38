# Potoba - AI Powered Restaurant Management

This is a NextJS starter for Potoba, an AI-powered restaurant management platform.

To get started, take a look at `src/app/page.tsx`.

## PWA and Push Notifications Setup

This application is configured as a Progressive Web App (PWA) with offline capabilities and Firebase Cloud Messaging (FCM) for push notifications.

### Prerequisites

1.  **Firebase Project**: Ensure you have a Firebase project set up and the configuration details in `src/lib/firebase/config.ts` are correct.
2.  **Firebase CLI**: You might need Firebase CLI for some operations (`npm install -g firebase-tools`).
3.  **HTTPS**: PWAs and push notifications require HTTPS for deployment (localhost is an exception for development).

### Service Worker and Manifest

*   **`next-pwa`**: Handles PWA setup, service worker registration, and caching strategies. Configured in `next.config.js`.
*   **`public/manifest.json`**: Defines PWA metadata like name, icons, start URL, theme colors.
*   **`public/icons/`**: Contains PWA icons. Replace placeholder comments with actual PNG images.
*   **`public/offline.html`**: A basic fallback page for when the user is offline and the requested page isn't cached. `next-pwa` can be configured to use this.

### Firebase Cloud Messaging (FCM)

1.  **`public/firebase-messaging-sw.js`**: This service worker handles incoming push notifications when the app is in the background or closed.
    *   It uses the Firebase SDK to listen for messages and display notifications.
    *   Ensure the `firebaseConfig` within this file matches your project.

2.  **VAPID Key**:
    *   Generate a VAPID key pair in your Firebase project:
        *   Go to Firebase Console -> Project Settings -> Cloud Messaging tab.
        *   Under "Web configuration", find "Web Push certificates".
        *   Click "Generate key pair".
    *   **IMPORTANT**: Copy the generated public key and update the `VAPID_KEY` constant in `src/components/firebase/firebase-messaging-initializer.tsx`. **Do not commit your private key.**

3.  **Client-Side Initialization**:
    *   The `src/components/firebase/firebase-messaging-initializer.tsx` component handles:
        *   Requesting notification permission from the user.
        *   Retrieving the FCM registration token for the device. This token should be sent to your backend to target specific devices for push notifications.
        *   Listening for messages when the app is in the foreground.

### Testing Push Notifications

You can send test notifications from the Firebase Console:

1.  **Get FCM Token**:
    *   Run the app locally (`npm run dev`).
    *   Open your browser's developer console.
    *   If permission is granted, the FCM token will be logged (e.g., "FCM Token: cKv..."). Copy this token.

2.  **Send from Firebase Console**:
    *   Go to Firebase Console -> Engage (in the left sidebar) -> Messaging.
    *   Click "Create your first campaign" or "New campaign".
    *   Choose "Firebase Notification messages".
    *   **Notification Title & Text**: Enter your desired content.
    *   **Delivery Date**: Set to "Send now".
    *   **Target**:
        *   Select "Send to particular FCM registration tokens".
        *   Paste the FCM token you copied.
    *   **Scheduling**: Select "Now".
    *   (Optional) Configure other options like sound, Android channel, etc.
    *   Click "Review" and then "Publish".

    The notification should arrive on your device if the app is in the background/closed (handled by `firebase-messaging-sw.js`) or if in the foreground (handled by `FirebaseMessagingInitializer`).

### Offline Capabilities

*   **Firestore Offline Persistence**: Enabled in `src/lib/firebase/config.ts` using `enableIndexedDbPersistence`. This allows Firestore data to be queried and mutated while offline, with changes synced when the connection is restored.
*   **Service Worker Caching**: `next-pwa` in `next.config.js` is configured with runtime caching strategies for static assets, API calls, and fonts, allowing parts of the app to work offline.

## SEO and Performance Tips

*   **Lighthouse**: Regularly audit your PWA with Lighthouse in Chrome DevTools to identify areas for improvement in performance, accessibility, best practices, and SEO.
*   **Image Optimization**: Use `next/image` for automatic image optimization. Serve images in modern formats like WebP.
*   **Code Splitting**: Next.js does this by default per page. Ensure your components are well-structured to leverage this.
*   **Lazy Loading**: Lazy load offscreen images and non-critical components.
*   **Minification**: Next.js handles JS/CSS minification in production builds.
*   **SSR/SSG**: Utilize Server-Side Rendering or Static Site Generation where appropriate for faster initial page loads and better SEO.
*   **Caching Headers**: Ensure your hosting provider (e.g., Netlify, Vercel) sets appropriate caching headers for static assets.
*   **Structured Data**: Use JSON-LD (as added in `layout.tsx`) to provide search engines with detailed information about your content.
*   **Mobile-First Design**: Ensure the UI is fully responsive and provides an excellent experience on mobile devices.
