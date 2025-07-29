// Scripts for firebase and firebase messaging
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-messaging-compat.js');

// Initialize the Firebase app in the service worker
firebase.initializeApp({
  apiKey: "AIzaSyD8wqhL5Mzkw1W1hNFDY1vhlIvktA4sRgw",
  authDomain: "taskflow-8aa86.firebaseapp.com",
  projectId: "taskflow-8aa86",
  storageBucket: "taskflow-8aa86.firebasestorage.app",
  messagingSenderId: "173208953562",
  appId: "1:173208953562:web:97bf9e8fe964a925897be3",
  measurementId: "G-RSRS00NJE1"
});

// Retrieve firebase messaging
const messaging = firebase.messaging();

// Handle background messages
messaging.onBackgroundMessage(function(payload) {
  console.log('Received background message ', payload);

  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification.body,
    icon: payload.notification.icon || '/assets/icons/android-chrome-192x192.png',
    badge: '/assets/icons/android-chrome-192x192.png',
    tag: payload.data?.tag || 'taskflow-notification',
    data: payload.data,
    requireInteraction: true,
    actions: [
      {
        action: 'open',
        title: 'Open App',
        icon: '/assets/icons/android-chrome-192x192.png'
      }
    ]
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});

// Handle notification click
self.addEventListener('notificationclick', function(event) {
  console.log('Notification click received.');

  event.notification.close();

  if (event.action === 'open' || !event.action) {
    // Open the app
    event.waitUntil(
      clients.openWindow('/')
    );
  }
});
