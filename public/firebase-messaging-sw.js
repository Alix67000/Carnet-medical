// Service Worker pour Firebase Cloud Messaging (Web Push en arrière-plan)
// Compatible avec les versions Firebase SDK v10/v11/v12/v13
// Ce script est également importé par le Service Worker principal PWA (sw.js)
// afin de n'enregistrer qu'un seul Service Worker unifié sur le scope racine '/'.

/* eslint-disable no-undef */
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js');

// Configuration Firebase Web publique cliente (nécessaire au client, sans clé privée)
const firebaseConfig = {
  apiKey: "AIzaSyAX9wn4mP0gnJWEvR67Gz-am9qiGoASP8M",
  authDomain: "carnet-medical-ca19c.firebaseapp.com",
  projectId: "carnet-medical-ca19c",
  storageBucket: "carnet-medical-ca19c.firebasestorage.app",
  messagingSenderId: "261505958409",
  appId: "1:261505958409:web:fcdbf6a4bb965690a22ed8"
};

// Initialisation idempotente de Firebase dans le contexte Service Worker
if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}

const messaging = firebase.messaging();

/**
 * Gestionnaire des messages FCM reçus lorsque l'application est fermée ou en arrière-plan.
 * Exigence de confidentialité : Le texte affiché sur l'écran verrouillé doit rester neutre
 * et discret. Ne JAMAIS mentionner le nom du traitement, de pathologie ou de numéro de lot.
 */
messaging.onBackgroundMessage((payload) => {
  const notificationTitle = payload.notification?.title || payload.data?.title || 'Rappel de votre carnet médical';
  const notificationBody = payload.notification?.body || payload.data?.body || "C'est le moment de réaliser votre injection programmée.";

  const notificationOptions = {
    body: notificationBody,
    icon: '/pwa-192x192.png',
    badge: '/pwa-192x192.png',
    tag: 'carnet-medical-reminder',
    renotify: true,
    data: {
      url: payload.data?.click_action || payload.data?.url || '/',
      timestamp: Date.now()
    }
  };

  return self.registration.showNotification(notificationTitle, notificationOptions);
});

// Gestionnaire du clic sur la notification : ramène l'utilisateur vers l'application
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      // Si un onglet de l'application est déjà ouvert, on lui donne le focus
      for (let i = 0; i < windowClients.length; i++) {
        const client = windowClients[i];
        if (client.url && 'focus' in client) {
          return client.focus();
        }
      }
      // Sinon, on ouvre un nouvel onglet vers la page cible
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});
