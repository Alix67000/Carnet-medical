import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';

// Initialisation de l'application Firebase
const app = initializeApp(firebaseConfig);

// Initialisation de la base Firestore par défaut (default)
export const db = getFirestore(app);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

// Configuration du Google Provider
googleProvider.setCustomParameters({
  prompt: 'select_account'
});

/**
 * Gestionnaire d'erreurs standardisé pour Firestore
 * - Ne journalise aucune information personnelle (UID, e-mail, données de compte).
 * - Anonymise les chemins pour éliminer les identifiants utilisateurs ou documents.
 * - Ne consigne que le code d'erreur et le type d'opération nécessaires au diagnostic.
 */
export function handleFirestoreError(error, operationType, path = null) {
  const errorCode = error?.code || (error instanceof Error ? error.name : 'unknown');

  // Détermination d'une cible générique pour éviter d'exposer l'UID ou l'ID d'injection présent dans le chemin
  let sanitizedTarget = 'collection';
  if (typeof path === 'string') {
    if (path.includes('injections')) {
      sanitizedTarget = 'injections';
    } else if (path.includes('settings')) {
      sanitizedTarget = 'settings/preferences';
    }
  }

  const sanitizedInfo = {
    code: errorCode,
    operation: operationType || 'unknown',
    target: sanitizedTarget,
  };

  console.error('Erreur Firestore:', JSON.stringify(sanitizedInfo));
  return sanitizedInfo;
}

