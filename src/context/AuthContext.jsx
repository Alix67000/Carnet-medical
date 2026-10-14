import React, { createContext, useContext, useState, useEffect } from 'react';
import { 
  onAuthStateChanged, 
  signInWithPopup, 
  signOut
} from 'firebase/auth';
import { auth, googleProvider } from '../firebase';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState(null);

  useEffect(() => {
    // Nettoyer d'éventuelles clés de session ou données démo laissées par des versions antérieures dans localStorage
    try {
      const legacyKeys = [
        'vvg_demo_user_session',
        'vvg_demo_injections_demo-patient-local',
        'vvg_demo_prefs_demo-patient-local'
      ];
      legacyKeys.forEach((key) => localStorage.removeItem(key));
    } catch {
      // Ignorer si localStorage n'est pas accessible
    }

    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser) {
        // Utilisateur Firebase authentifié réel (ex: Google)
        setUser(currentUser);
      } else {
        // Si l'utilisateur actuel n'est pas en session démo en mémoire, réinitialiser
        setUser((prev) => (prev?.isDemo ? prev : null));
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const loginWithGoogle = async () => {
    setAuthError(null);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      return result.user;
    } catch (error) {
      console.error('Erreur de connexion Google:', error);
      let errorObj = {
        code: error.code || 'unknown',
        message: 'Échec de la connexion Google.',
        details: null,
      };

      if (error.code === 'auth/unauthorized-domain') {
        const currentHostname = typeof window !== 'undefined' ? window.location.hostname : '';
        errorObj = {
          code: 'auth/unauthorized-domain',
          message: 'Domaine non autorisé dans votre console Firebase.',
          domain: currentHostname,
          details: `Le domaine « ${currentHostname} » doit être ajouté dans Firebase Console > Authentication > Settings > Authorized domains.`,
        };
      } else if (error.code === 'auth/popup-closed-by-user') {
        errorObj.message = 'La fenêtre de connexion a été fermée avant la fin.';
      } else if (error.code === 'auth/popup-blocked') {
        errorObj.message = 'Le pop-up a été bloqué par votre navigateur. Veuillez autoriser les fenêtres pop-up.';
      } else if (error.code === 'auth/cancelled-popup-request') {
        errorObj.message = 'Opération de connexion annulée.';
      } else if (error.code === 'auth/network-request-failed') {
        errorObj.message = 'Erreur réseau lors de la communication avec les serveurs d\'authentification.';
      } else if (error.message) {
        errorObj.message = error.message;
      }

      setAuthError(errorObj);
      throw error;
    }
  };

  const logout = async () => {
    // Réinitialisation immédiate de l'état en mémoire
    setUser(null);
    setAuthError(null);
    try {
      await signOut(auth);
    } catch (error) {
      console.error('Erreur de déconnexion Firebase:', error);
    }
  };

  /**
   * Mode Démonstration strictement local et éphémère.
   * - Ne fait aucun appel à Firebase Auth (pas de signInAnonymously).
   * - N'utilise pas localStorage ni IndexedDB pour stocker des données médicales.
   * - Données purement conservées dans l'état React en mémoire vive.
   * - Réinitialisé à la déconnexion ou au rechargement de page.
   */
  const startDemoMode = () => {
    setAuthError(null);
    const ephemeralDemoUser = {
      uid: 'demo-local-ephemeral',
      email: 'demo@carnet-medical.local',
      displayName: 'Patient Démonstration (Local)',
      isDemo: true,
      isAnonymous: false,
    };
    setUser(ephemeralDemoUser);
    return ephemeralDemoUser;
  };

  return (
    <AuthContext.Provider value={{
      user,
      loading,
      authError,
      setAuthError,
      loginWithGoogle,
      logout,
      startDemoMode,
      loginGuest: startDemoMode // Alias pour rétro-compatibilité
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth doit être utilisé au sein de AuthProvider');
  }
  return context;
}
