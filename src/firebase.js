import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getMessaging, isSupported } from 'firebase/messaging';
import firebaseConfig from '../firebase-applet-config.json';

// Initialisation de l'application Firebase
export const app = initializeApp(firebaseConfig);

// Initialisation des services Firebase
export const db = getFirestore(app);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

// Configuration du Google Provider
googleProvider.setCustomParameters({
  prompt: 'select_account'
});

/**
 * Obtient l'instance Firebase Cloud Messaging si supportée par le navigateur.
 * Renvoie null dans les environnements non compatibles (ex: SSR, fenêtres privées restrictives).
 */
export async function getFirebaseMessaging() {
  if (typeof window === 'undefined') return null;
  try {
    const supported = await isSupported();
    if (!supported) return null;
    return getMessaging(app);
  } catch {
    return null;
  }
}

/**
 * Gestionnaire d'erreurs standardisé pour Firestore
 * - Ne journalise aucune information personnelle (UID, e-mail, données de compte).
 * - Anonymise les chemins pour éliminer les identifiants utilisateurs ou documents.
 * - Ne consigne que le code d'erreur et le type d'opération nécessaires au diagnostic.
 */
export function handleFirestoreError(error, operationType, path = null) {
  const errorCode = error?.code || (error instanceof Error ? error.name : 'unknown');

  // Détermination d'une cible générique pour éviter d'exposer l'UID ou l'ID présent dans le chemin
  let sanitizedTarget = 'collection';
  if (typeof path === 'string') {
    if (path.includes('injections')) {
      sanitizedTarget = 'injections';
    } else if (path.includes('settings')) {
      sanitizedTarget = 'settings/preferences';
    } else if (path.includes('fcmTokens') || path.includes('tokens')) {
      sanitizedTarget = 'fcmTokens';
    }
  }

  const sanitizedInfo = {
    code: errorCode,
    operation: operationType || 'unknown',
    target: sanitizedTarget,
  };

  console.error('Erreur Firestore [code]:', errorCode, '[operation]:', operationType || 'unknown', '[cible]:', sanitizedTarget);
  return sanitizedInfo;
}

