import React, { createContext, useContext, useState, useEffect } from 'react';
import { 
  onAuthStateChanged, 
  signInWithPopup, 
  signOut,
  signInAnonymously
} from 'firebase/auth';
import { auth, googleProvider } from '../firebase';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
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
      let message = 'Échec de la connexion Google.';
      if (error.code === 'auth/popup-closed-by-user') {
        message = 'La fenêtre de connexion a été fermée.';
      } else if (error.code === 'auth/popup-blocked') {
        message = 'Le pop-up a été bloqué par votre navigateur. Veuillez autoriser les fenêtres pop-up.';
      } else if (error.code === 'auth/cancelled-popup-request') {
        message = 'Opération de connexion annulée.';
      } else if (error.message) {
        message = error.message;
      }
      setAuthError(message);
      throw new Error(message);
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error('Erreur de déconnexion:', error);
      throw error;
    }
  };

  // Option de session anonyme (démo / test de secours si les popups externes sont désactivés)
  const loginGuest = async () => {
    setAuthError(null);
    try {
      const res = await signInAnonymously(auth);
      return res.user;
    } catch (err) {
      console.error('Erreur mode invité:', err);
      setAuthError('Connexion temporaire impossible.');
      throw err;
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
