import { initializeApp, getApps, cert, applicationDefault } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getMessaging } from 'firebase-admin/messaging';
import { getAuth } from 'firebase-admin/auth';

let initializedApp = null;

/**
 * Initialise Firebase Admin SDK de manière sécurisée côté serveur.
 * La clé privée est TOUJOURS lue depuis les variables d'environnement de Netlify,
 * JAMAIS inscrite en clair dans le code, ni dans Git, ni dans des variables VITE_.
 */
export function getFirebaseAdmin() {
  if (initializedApp) {
    return {
      app: initializedApp,
      db: getFirestore(initializedApp),
      messaging: getMessaging(initializedApp),
      auth: getAuth(initializedApp),
    };
  }

  const existingApps = getApps();
  if (existingApps.length > 0) {
    initializedApp = existingApps[0];
    return {
      app: initializedApp,
      db: getFirestore(initializedApp),
      messaging: getMessaging(initializedApp),
      auth: getAuth(initializedApp),
    };
  }

  let credential = null;
  const projectId = process.env.FIREBASE_PROJECT_ID || 'carnet-medical-ca19c';

  // Option 1 : Objet JSON complet dans FIREBASE_SERVICE_ACCOUNT
  if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    try {
      const raw = process.env.FIREBASE_SERVICE_ACCOUNT.trim();
      const serviceAccount = JSON.parse(raw);
      credential = cert(serviceAccount);
    } catch (err) {
      console.error('[Firebase Admin] Erreur lors du parsing JSON de FIREBASE_SERVICE_ACCOUNT:', err.message);
    }
  }

  // Option 2 : Variables séparées (FIREBASE_PRIVATE_KEY + FIREBASE_CLIENT_EMAIL)
  if (!credential && process.env.FIREBASE_PRIVATE_KEY && process.env.FIREBASE_CLIENT_EMAIL) {
    try {
      const privateKey = process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n');
      credential = cert({
        projectId: projectId,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: privateKey,
      });
    } catch (err) {
      console.error('[Firebase Admin] Erreur lors du chargement des variables de clé privée:', err.message);
    }
  }

  // Option 3 : Fallback si GOOGLE_APPLICATION_CREDENTIALS est défini
  if (!credential) {
    if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
      credential = applicationDefault();
    } else {
      throw new Error(
        "Clé Firebase Admin manquante : Veuillez renseigner FIREBASE_SERVICE_ACCOUNT (ou FIREBASE_CLIENT_EMAIL + FIREBASE_PRIVATE_KEY) dans les variables d'environnement de Netlify."
      );
    }
  }

  initializedApp = initializeApp({
    credential,
    projectId,
  });

  return {
    app: initializedApp,
    db: getFirestore(initializedApp),
    messaging: getMessaging(initializedApp),
    auth: getAuth(initializedApp),
  };
}

/**
 * Convertit une date Date en chaîne YYYY-MM-DD et heure HH:mm dans le fuseau horaire du patient.
 * Utilise l'API native Intl.DateTimeFormat de Node.js.
 */
export function getZonedTimeInfo(date, timeZone) {
  const safeZone = timeZone || 'Europe/Paris';
  try {
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: safeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
      hourCycle: 'h23',
    });

    const parts = formatter.formatToParts(date);
    const getPart = (type) => parts.find((p) => p.type === type)?.value || '00';

    return {
      dateStr: `${getPart('year')}-${getPart('month')}-${getPart('day')}`,
      timeStr: `${getPart('hour')}:${getPart('minute')}`,
      hours: parseInt(getPart('hour'), 10),
      minutes: parseInt(getPart('minute'), 10),
    };
  } catch {
    const iso = date.toISOString();
    return {
      dateStr: iso.slice(0, 10),
      timeStr: iso.slice(11, 16),
      hours: date.getUTCHours(),
      minutes: date.getUTCMinutes(),
    };
  }
}
