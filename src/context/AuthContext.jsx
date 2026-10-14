import React, { createContext, useContext, useState, useEffect } from 'react';
import { 
  onAuthStateChanged, 
  signInWithPopup, 
  signOut,
  signInAnonymously
} from 'firebase/auth';
import { auth, googleProvider } from '../firebase';

const AuthContext = createContext(null);

const DEMO_USER_STORAGE_KEY = 'vvg_demo_user_session';

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState(null);

  useEffect(() => {
    // Vérifie d'abord s'il existe une session démo locale active
    const savedDemoUser = localStorage.getItem(DEMO_USER_STORAGE_KEY);
    if (savedDemoUser) {
      try {
        const parsed = JSON.parse(savedDemoUser);
        if (parsed && parsed.isDemo) {
          setUser(parsed);
          setLoading(false);
        }
      } catch (e) {
        localStorage.removeItem(DEMO_USER_STORAGE_KEY);
      }
    }

    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser) {
        // Utilisateur Firebase authentifié (ex: Google)
        localStorage.removeItem(DEMO_USER_STORAGE_KEY);
        setUser(currentUser);
      } else {
        // Si pas d'utilisateur Firebase et pas de session démo
        const currentSavedDemo = localStorage.getItem(DEMO_USER_STORAGE_KEY);
        if (!currentSavedDemo) {
          setUser(null);
        }
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const loginWithGoogle = async () => {
    setAuthError(null);
    try {
      localStorage.removeItem(DEMO_USER_STORAGE_KEY);
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
      } else if (error.message) {
        errorObj.message = error.message;
      }

      setAuthError(errorObj);
      throw error;
    }
  };

  const logout = async () => {
    try {
      localStorage.removeItem(DEMO_USER_STORAGE_KEY);
      setUser(null);
      await signOut(auth);
    } catch (error) {
      console.error('Erreur de déconnexion:', error);
      setUser(null);
    }
  };

  // Option de session démonstration / invité résiliente
  const loginGuest = async () => {
    setAuthError(null);

    // 1. Essayer d'abord l'authentification anonyme Firebase si elle est activée sur le projet
    try {
      const res = await signInAnonymously(auth);
      localStorage.removeItem(DEMO_USER_STORAGE_KEY);
      setUser(res.user);
      return res.user;
    } catch (err) {
      // Si la console Firebase bloque l'anonyme (auth/admin-restricted-operation), bascule en session locale démo
      console.warn('Authentification anonyme Firebase non activée (admin-restricted), démarrage en mode démo local:', err?.code);
      
      const demoUser = {
        uid: 'demo-patient-local',
        email: 'patient.demo@carnet-medical.local',
        displayName: 'Patient Démonstration',
        isAnonymous: true,
        isDemo: true,
      };

      localStorage.setItem(DEMO_USER_STORAGE_KEY, JSON.stringify(demoUser));
      setUser(demoUser);
      return demoUser;
    }
  };

  return (
    <AuthContext.Provider value={{
      user,
      loading,
      authError,
      setAuthError,
      loginWithGoogle,
      logout,
      loginGuest
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
