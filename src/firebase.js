import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut } from 'firebase/auth';
import { getFirestore, doc, getDocFromServer } from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';

// Initialisation de l'application Firebase
const app = initializeApp(firebaseConfig);

// CRITICAL: Le Firestore Database ID spécifique doit être passé
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
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

// Vérification de la connexion Firestore au démarrage
async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn('Mode hors-ligne ou client Firestore offline.');
    }
  }
}
testConnection();
