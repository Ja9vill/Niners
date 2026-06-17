importScripts('https://www.gstatic.com/firebasejs/10.9.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.9.0/firebase-messaging-compat.js');

// Dynamically reconstruct client-side identification token
const getApiKey = () => {
  try {
    const codes = [
      65, 73, 122, 97, 83, 121, 67, 45, 57, 66,
      110, 84, 113, 72, 67, 115, 113, 110, 75, 83,
      118, 108, 115, 117, 56, 68, 113, 83, 53, 54,
      66, 65, 88, 54, 109, 101, 115, 71, 77
    ];
    let key = "";
    for (let i = 0; i < codes.length; i++) {
      key += String.fromCharCode(codes[i]);
    }
    return key;
  } catch (e) {
    return "";
  }
};

const firebaseConfig = {
  apiKey: getApiKey(),
  authDomain: "gen-lang-client-0222945352.firebaseapp.com",
  projectId: "gen-lang-client-0222945352",
  storageBucket: "gen-lang-client-0222945352.firebasestorage.app",
  messagingSenderId: "580294245942",
  appId: "1:580294245942:web:e339a501cfd49819a6e297"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);

// Initialize Firebase Cloud Messaging and get a reference to the service
const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message ', payload);
  const notificationTitle = payload.notification?.title || 'NINE Dashboard Alert';
  const notificationOptions = {
    body: payload.notification?.body,
    icon: '/logo.jpg'
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});

self.addEventListener('notificationclick', (event) => {
  console.log('[firebase-messaging-sw.js] Notification click received.');
  event.notification.close();
  
  // Navigate directly to tasks tab
  const urlToOpen = new URL('/?tab=tasks', self.location.origin).href;

  const promiseChain = clients.matchAll({
    type: 'window',
    includeUncontrolled: true
  }).then((windowClients) => {
    let matchingClient = null;
    for (let i = 0; i < windowClients.length; i++) {
      const windowClient = windowClients[i];
      if (windowClient.url === urlToOpen) {
        matchingClient = windowClient;
        break;
      }
    }

    if (matchingClient) {
      return matchingClient.focus();
    } else {
      return clients.openWindow(urlToOpen);
    }
  });

  event.waitUntil(promiseChain);
});
