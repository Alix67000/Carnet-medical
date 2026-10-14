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
 */
export function handleFirestoreError(error, operationType, path = null) {
  const errInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid || null,
      email: auth.currentUser?.email || null,
      emailVerified: auth.currentUser?.emailVerified || null,
      isAnonymous: auth.currentUser?.isAnonymous || null,
    },
    operationType,
    path
  };
  console.error('Erreur Firestore: ', JSON.stringify(errInfo));
  return errInfo;
}

