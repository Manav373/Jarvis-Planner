importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyDV5Y7TzNxAFSbmvuV5uC1byLpM_CSmPrI",
  authDomain: "jarvis-cc51c.firebaseapp.com",
  projectId: "jarvis-cc51c",
  storageBucket: "jarvis-cc51c.firebasestorage.app",
  messagingSenderId: "269290130248",
  appId: "1:269290130248:web:b8d31bcebf156eef92417d",
  measurementId: "G-YV3H46BJVS"
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message ', payload);
  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification.body,
    icon: '/logo.png'
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});
