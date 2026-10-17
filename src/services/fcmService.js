import { getToken, onMessage, deleteToken } from 'firebase/messaging';
import { 
  collection, 
  doc, 
  setDoc, 
  deleteDoc, 
  getDocs, 
  serverTimestamp, 
  query, 
  where 
} from 'firebase/firestore';
import { db, getFirebaseMessaging, handleFirestoreError } from '../firebase';

// Clé de stockage session pour mémoriser l'identifiant du token de l'appareil courant
const CURRENT_DEVICE_TOKEN_ID_KEY = 'carnet_medical_current_fcm_token_id';

/**
 * Génère un identifiant de document sûr pour Firestore à partir d'un token FCM.
 */
function generateTokenDocId(token) {
  if (!token) return 'device_unknown';
  // Utilise les 36 derniers caractères nettoyés pour créer un ID unique et compact
  const cleaned = token.replace(/[^a-zA-Z0-9]/g, '');
  return `dev_${cleaned.slice(-32)}`;
}

/**
 * Vérifie si le navigateur et l'environnement supportent les notifications push Web.
 */
export async function isPushNotificationSupported() {
  if (typeof window === 'undefined') return false;
  if (!('Notification' in window)) return false;
  if (!('serviceWorker' in navigator)) return false;
  
  const messaging = await getFirebaseMessaging();
  return Boolean(messaging);
}

/**
 * Retourne la permission actuelle accordée par l'utilisateur ('granted', 'denied', 'default').
 */
export function getNotificationPermission() {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'unsupported';
  }
  return Notification.permission;
}

/**
 * Demande explicitement l'autorisation à l'utilisateur suite à un clic
 * et enregistre l'appareil dans Firestore sous son propre UID.
 *
 * @param {Object} user - Utilisateur Firebase Auth connecté (non démo)
 * @param {string} [customTimeZone] - Fuseau horaire de l'utilisateur (détecté par défaut)
 * @returns {Promise<{ success: boolean, token?: string, tokenId?: string, error?: string, permission?: string }>}
 */
export async function registerDeviceForPush(user, customTimeZone) {
  if (!user || user.isDemo) {
    return {
      success: false,
      error: 'Vous devez être connecté avec votre compte Google réel pour activer les rappels push.'
    };
  }

  const isSupported = await isPushNotificationSupported();
  if (!isSupported) {
    return {
      success: false,
      error: 'Les notifications push Web ne sont pas supportées par ce navigateur.'
    };
  }

  // 1. Demande d'autorisation explicite
  let permission = Notification.permission;
  if (permission !== 'granted') {
    try {
      permission = await Notification.requestPermission();
    } catch {
      return {
        success: false,
        error: "Erreur lors de la demande d'autorisation de notifications."
      };
    }
  }

  if (permission !== 'granted') {
    return {
      success: false,
      permission,
      error: 'Autorisation refusée par le navigateur. Veuillez l\'autoriser dans les paramètres de votre site.'
    };
  }

  // 2. Récupération de l'instance Messaging et du Service Worker PWA actif
  const messaging = await getFirebaseMessaging();
  if (!messaging) {
    return {
      success: false,
      error: 'Impossible d\'initialiser Firebase Cloud Messaging.'
    };
  }

  let swRegistration = null;
  if ('serviceWorker' in navigator) {
    try {
      swRegistration = await navigator.serviceWorker.ready;
    } catch {
      swRegistration = null;
    }
  }

  // 3. Récupération de la clé VAPID publique configurée
  const vapidKey = import.meta.env.VITE_FIREBASE_VAPID_KEY;

  let fcmToken = null;
  try {
    const tokenOptions = {};
    if (vapidKey && typeof vapidKey === 'string' && vapidKey.trim().length > 10) {
      tokenOptions.vapidKey = vapidKey.trim();
    }
    if (swRegistration) {
      tokenOptions.serviceWorkerRegistration = swRegistration;
    }

    fcmToken = await getToken(messaging, tokenOptions);
  } catch (err) {
    console.error('Erreur obtention token FCM [code]:', err?.code || err?.name || 'unknown');
    let message = 'Impossible de générer le jeton de notification push.';
    if (!vapidKey) {
      message = 'Clé publique VAPID non configurée. Ajoutez VITE_FIREBASE_VAPID_KEY dans vos variables d\'environnement Netlify ou .env.';
    }
    return {
      success: false,
      error: message,
      details: err?.code || 'getToken_error'
    };
  }

  if (!fcmToken) {
    return {
      success: false,
      error: 'Aucun jeton de notification n\'a été renvoyé par Firebase.'
    };
  }

  // 4. Enregistrement dans Firestore sous /users/{userId}/fcmTokens/{tokenId}
  const tokenId = generateTokenDocId(fcmToken);
  const detectedTimeZone = customTimeZone || Intl.DateTimeFormat().resolvedOptions().timeZone || 'Europe/Paris';
  const userAgentStr = typeof navigator !== 'undefined' ? navigator.userAgent.slice(0, 200) : 'Web Client';
  const platformStr = typeof navigator !== 'undefined' ? (navigator.userAgentData?.platform || navigator.platform || 'Web').slice(0, 50) : 'Web';

  try {
    const tokenDocRef = doc(db, 'users', user.uid, 'fcmTokens', tokenId);
    await setDoc(tokenDocRef, {
      token: fcmToken,
      enabled: true,
      timeZone: detectedTimeZone,
      userAgent: userAgentStr,
      platform: platformStr,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    }, { merge: true });

    // Résolution du cas "documents fantômes" : backfill du document parent /users/{userId}
    const userDocRef = doc(db, 'users', user.uid);
    await setDoc(userDocRef, {
      lastSeenAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      hasPushDevices: true,
    }, { merge: true });

    // Synchronisation du fuseau horaire dans les préférences
    const prefDocRef = doc(db, 'users', user.uid, 'settings', 'preferences');
    await setDoc(prefDocRef, {
      timeZone: detectedTimeZone,
      updatedAt: serverTimestamp(),
    }, { merge: true });

    // Sauvegarde de l'ID du token courant pour la session
    try {
      sessionStorage.setItem(CURRENT_DEVICE_TOKEN_ID_KEY, tokenId);
    } catch {
      // Ignorer si sessionStorage restreint
    }

    return {
      success: true,
      token: fcmToken,
      tokenId,
      timeZone: detectedTimeZone,
      permission: 'granted',
    };
  } catch (err) {
    handleFirestoreError(err, 'write', 'fcmTokens');
    return {
      success: false,
      error: 'Impossible d\'enregistrer l\'appareil dans la base sécurisée.'
    };
  }
}

/**
 * Désactive ou supprime le token de notification de l'appareil courant dans Firestore.
 *
 * @param {Object} user - Utilisateur connecté
 * @param {string} [specificTokenId] - ID du token à supprimer (ou token courant en session)
 */
export async function unregisterDeviceForPush(user, specificTokenId = null) {
  if (!user || user.isDemo) return { success: true };

  const tokenId = specificTokenId || (() => {
    try {
      return sessionStorage.getItem(CURRENT_DEVICE_TOKEN_ID_KEY);
    } catch {
      return null;
    }
  })();

  try {
    if (tokenId) {
      const tokenDocRef = doc(db, 'users', user.uid, 'fcmTokens', tokenId);
      await deleteDoc(tokenDocRef);
      try {
        sessionStorage.removeItem(CURRENT_DEVICE_TOKEN_ID_KEY);
      } catch {
        // ignore
      }
    }

    // Supprimer le token de l'instance FCM locale
    const messaging = await getFirebaseMessaging();
    if (messaging) {
      await deleteToken(messaging).catch(() => {});
    }

    return { success: true };
  } catch (err) {
    handleFirestoreError(err, 'delete', 'fcmTokens');
    return {
      success: false,
      error: 'Erreur lors de la désactivation des notifications sur cet appareil.'
    };
  }
}

/**
 * Récupère la liste des appareils autorisés pour l'utilisateur connecté.
 */
export async function getRegisteredDevices(user) {
  if (!user || user.isDemo) return [];

  try {
    const tokensRef = collection(db, 'users', user.uid, 'fcmTokens');
    const q = query(tokensRef, where('enabled', '==', true));
    const snap = await getDocs(q);

    return snap.docs.map((d) => ({
      id: d.id,
      ...d.data(),
    }));
  } catch (err) {
    handleFirestoreError(err, 'list', 'fcmTokens');
    return [];
  }
}

/**
 * Déclenche un test d'envoi FCM via la fonction Netlify sécurisée.
 * La fonction vérifie l'authentification et n'envoie la notification qu'aux tokens
 * appartenant strictement à l'UID du compte connecté.
 *
 * @returns {Promise<{ success: boolean, count?: number, error?: string, isFunctionMissing?: boolean }>}
 */
export async function sendFcmTestNotification(user) {
  if (!user || user.isDemo) {
    return {
      success: false,
      error: 'Le mode démo fonctionne en mémoire locale. Connectez-vous avec un compte Google pour tester l\'envoi FCM.'
    };
  }

  try {
    const idToken = await user.getIdToken();
    const response = await fetch('/.netlify/functions/send-test-reminder', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${idToken}`,
      },
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      const isMissing = response.status === 404;
      return {
        success: false,
        isFunctionMissing: isMissing,
        error: errData.error || (isMissing
          ? 'La fonction Netlify "send-test-reminder" n\'est pas encore disponible sur cette URL.'
          : `Erreur ${response.status} lors de l'envoi du test.`),
      };
    }

    const data = await response.json();
    return {
      success: true,
      count: data.count || data.successCount || 1,
      failureCount: data.failureCount || 0,
    };
  } catch (err) {
    console.error('Erreur test FCM Netlify Function [code]:', err?.name || 'unknown');
    return {
      success: false,
      error: 'Échec de la communication avec la fonction Netlify de test. Vérifiez votre connexion ou la configuration des fonctions Netlify.'
    };
  }
}

/**
 * Écoute les messages FCM reçus lorsque l'application est ouverte au premier plan.
 */
export async function initForegroundNotificationListener(onMessageCallback) {
  const messaging = await getFirebaseMessaging();
  if (!messaging) return () => {};

  return onMessage(messaging, (payload) => {
    // Texte discret et neutre
    const title = payload.notification?.title || payload.data?.title || 'Rappel de votre carnet médical';
    const body = payload.notification?.body || payload.data?.body || "C'est le moment de réaliser votre injection programmée.";

    if (onMessageCallback) {
      onMessageCallback({ title, body, payload });
    }

    // Affichage d'une notification système si autorisée
    if (Notification.permission === 'granted') {
      try {
        new Notification(title, {
          body,
          icon: '/pwa-192x192.png',
          badge: '/pwa-192x192.png',
          tag: 'carnet-medical-reminder'
        });
      } catch {
        // Fallback silencieux si l'affichage natif est restreint
      }
    }
  });
}

/**
 * Affiche une notification de test locale via le Service Worker pour vérifier
 * le rendu visuel discret sur l'écran verrouillé.
 */
export async function triggerLocalTestNotification() {
  const title = 'Rappel de votre carnet médical';
  const body = "C'est le moment de réaliser votre injection programmée.";

  if ('serviceWorker' in navigator) {
    try {
      const reg = await navigator.serviceWorker.ready;
      if (reg && reg.showNotification) {
        await reg.showNotification(title, {
          body,
          icon: '/pwa-192x192.png',
          badge: '/pwa-192x192.png',
          tag: 'carnet-medical-test',
          renotify: true,
          data: { url: '/' }
        });
        return { success: true, method: 'serviceWorker' };
      }
    } catch {
      // fallback
    }
  }

  if ('Notification' in window && Notification.permission === 'granted') {
    new Notification(title, {
      body,
      icon: '/pwa-192x192.png',
      badge: '/pwa-192x192.png'
    });
    return { success: true, method: 'notification' };
  }

  return { success: false, error: 'Permission de notification non accordée.' };
}
