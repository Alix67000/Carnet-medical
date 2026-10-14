import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { 
  collection, 
  doc, 
  query, 
  orderBy, 
  onSnapshot, 
  addDoc, 
  deleteDoc, 
  setDoc,
  serverTimestamp, 
  Timestamp 
} from 'firebase/firestore';
import { db, handleFirestoreError } from '../firebase';
import { useAuth } from './AuthContext';
import { getNextZone } from '../utils/zoneLogic';
import { addDays, subDays, addMonths, differenceInCalendarDays, startOfDay } from 'date-fns';

const InjectionsContext = createContext(null);

const DEFAULT_PREFERENCES = {
  intervalDays: 7,
  reminderTime: '09:00',
  notificationsEnabled: true,
};

// Données initiales d'exemple pour le mode démonstration
function getInitialDemoInjections() {
  const sevenDaysAgo = subDays(new Date(), 7);
  sevenDaysAgo.setHours(9, 30, 0, 0);

  return [
    {
      id: 'demo-inj-1',
      zone: 1, // Supérieur Droit
      lotNumber: 'VVG-2026-A12',
      date: sevenDaysAgo,
      expirationDate: addMonths(new Date(), 8),
      createdAt: sevenDaysAgo,
    }
  ];
}

export function InjectionsProvider({ children }) {
  const { user } = useAuth();
  const [injections, setInjections] = useState([]);
  const [preferences, setPreferences] = useState(DEFAULT_PREFERENCES);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Synchronisation des données (Firestore ou LocalStorage en mode démo)
  useEffect(() => {
    if (!user) {
      setInjections([]);
      setPreferences(DEFAULT_PREFERENCES);
      setLoading(false);
      return;
    }

    // Cas 1 : Mode Démonstration local (quand Anonymous auth ou Firestore n'est pas encore configuré)
    if (user.isDemo) {
      const storageKeyInj = `vvg_demo_injections_${user.uid}`;
      const storageKeyPref = `vvg_demo_prefs_${user.uid}`;

      const savedInj = localStorage.getItem(storageKeyInj);
      if (savedInj) {
        try {
          const parsed = JSON.parse(savedInj).map((item) => ({
            ...item,
            date: new Date(item.date),
            expirationDate: item.expirationDate ? new Date(item.expirationDate) : null,
            createdAt: new Date(item.createdAt || Date.now()),
          }));
          setInjections(parsed);
        } catch (e) {
          const initial = getInitialDemoInjections();
          setInjections(initial);
          localStorage.setItem(storageKeyInj, JSON.stringify(initial));
        }
      } else {
        const initial = getInitialDemoInjections();
        setInjections(initial);
        localStorage.setItem(storageKeyInj, JSON.stringify(initial));
      }

      const savedPref = localStorage.getItem(storageKeyPref);
      if (savedPref) {
        try {
          setPreferences(JSON.parse(savedPref));
        } catch (e) {
          setPreferences(DEFAULT_PREFERENCES);
        }
      } else {
        setPreferences(DEFAULT_PREFERENCES);
      }

      setLoading(false);
      return;
    }

    // Cas 2 : Utilisateur Firebase Authentifié (Firestore en direct)
    setLoading(true);
    const injectionsRef = collection(db, 'users', user.uid, 'injections');
    const injectionsQuery = query(injectionsRef, orderBy('date', 'desc'));

    const unsubscribeInjections = onSnapshot(
      injectionsQuery,
      (snapshot) => {
        const items = snapshot.docs.map((docSnap) => {
          const data = docSnap.data();
          return {
            id: docSnap.id,
            zone: Number(data.zone) || 1,
            lotNumber: data.lotNumber || '',
            date: data.date?.toDate ? data.date.toDate() : new Date(data.date || Date.now()),
            expirationDate: data.expirationDate?.toDate ? data.expirationDate.toDate() : (data.expirationDate ? new Date(data.expirationDate) : null),
            createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(),
          };
        });
        setInjections(items);
        setLoading(false);
      },
      (err) => {
        handleFirestoreError(err, 'list', `users/${user.uid}/injections`);
        setError('Impossible de charger l\'historique des injections Firestore.');
        setLoading(false);
      }
    );

    // Écoute des préférences utilisateur dans Firestore
    const prefDocRef = doc(db, 'users', user.uid, 'settings', 'preferences');
    const unsubscribePrefs = onSnapshot(
      prefDocRef,
      (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.data();
          setPreferences({
            intervalDays: typeof data.intervalDays === 'number' ? data.intervalDays : 7,
            reminderTime: data.reminderTime || '09:00',
            notificationsEnabled: data.notificationsEnabled !== undefined ? Boolean(data.notificationsEnabled) : true,
          });
        } else {
          // Initialise les préférences par défaut dans Firestore
          setDoc(prefDocRef, {
            ...DEFAULT_PREFERENCES,
            updatedAt: serverTimestamp(),
          }).catch((err) => {
            handleFirestoreError(err, 'write', `users/${user.uid}/settings/preferences`);
          });
        }
      },
      (err) => {
        handleFirestoreError(err, 'get', `users/${user.uid}/settings/preferences`);
      }
    );

    return () => {
      unsubscribeInjections();
      unsubscribePrefs();
    };
  }, [user]);

  // Ajouter une injection
  const addInjection = async ({ date, zone, lotNumber, expirationDate }) => {
    if (!user) throw new Error('Utilisateur non connecté');

    const injectionDate = date instanceof Date ? date : new Date(date);
    const expDate = expirationDate instanceof Date ? expirationDate : new Date(expirationDate);

    // Mode Démo Local
    if (user.isDemo) {
      const newEntry = {
        id: `demo-inj-${Date.now()}`,
        date: injectionDate,
        zone: Number(zone),
        lotNumber: String(lotNumber).trim().toUpperCase(),
        expirationDate: expDate,
        createdAt: new Date(),
      };
      const updated = [newEntry, ...injections].sort((a, b) => b.date - a.date);
      setInjections(updated);
      localStorage.setItem(`vvg_demo_injections_${user.uid}`, JSON.stringify(updated));
      return newEntry.id;
    }

    // Mode Firestore en direct
    const injectionsRef = collection(db, 'users', user.uid, 'injections');
    const dateTimestamp = Timestamp.fromDate(injectionDate);
    const expTimestamp = Timestamp.fromDate(expDate);

    try {
      const docRef = await addDoc(injectionsRef, {
        date: dateTimestamp,
        zone: Number(zone),
        lotNumber: String(lotNumber).trim().toUpperCase(),
        expirationDate: expTimestamp,
        createdAt: serverTimestamp(),
      });
      return docRef.id;
    } catch (err) {
      handleFirestoreError(err, 'create', `users/${user.uid}/injections`);
      throw err;
    }
  };

  // Supprimer une injection
  const deleteInjection = async (injectionId) => {
    if (!user) throw new Error('Utilisateur non connecté');

    // Mode Démo Local
    if (user.isDemo) {
      const updated = injections.filter((inj) => inj.id !== injectionId);
      setInjections(updated);
      localStorage.setItem(`vvg_demo_injections_${user.uid}`, JSON.stringify(updated));
      return;
    }

    // Mode Firestore
    try {
      const docRef = doc(db, 'users', user.uid, 'injections', injectionId);
      await deleteDoc(docRef);
    } catch (err) {
      handleFirestoreError(err, 'delete', `users/${user.uid}/injections/${injectionId}`);
      throw err;
    }
  };

  // Mettre à jour les préférences
  const updatePreferences = async (newPrefs) => {
    if (!user) throw new Error('Utilisateur non connecté');

    const payload = {
      intervalDays: Number(newPrefs.intervalDays) || 7,
      reminderTime: newPrefs.reminderTime || '09:00',
      notificationsEnabled: Boolean(newPrefs.notificationsEnabled),
    };

    // Mode Démo Local
    if (user.isDemo) {
      setPreferences(payload);
      localStorage.setItem(`vvg_demo_prefs_${user.uid}`, JSON.stringify(payload));
      return;
    }

    // Mode Firestore
    try {
      const prefDocRef = doc(db, 'users', user.uid, 'settings', 'preferences');
      await setDoc(prefDocRef, { ...payload, updatedAt: serverTimestamp() }, { merge: true });
      setPreferences(payload);
    } catch (err) {
      handleFirestoreError(err, 'update', `users/${user.uid}/settings/preferences`);
      throw err;
    }
  };

  // Métriques et calculs dérivés
  const calculations = useMemo(() => {
    const lastInjection = injections.length > 0 ? injections[0] : null;
    const nextSuggestedZone = getNextZone(lastInjection?.zone);

    let nextInjectionDate = null;
    let daysUntilNext = null;
    let scheduleStatus = 'none'; // 'today', 'future', 'overdue', 'none'

    if (lastInjection && lastInjection.date) {
      nextInjectionDate = addDays(lastInjection.date, preferences.intervalDays || 7);
      const today = startOfDay(new Date());
      const targetDay = startOfDay(nextInjectionDate);
      daysUntilNext = differenceInCalendarDays(targetDay, today);

      if (daysUntilNext === 0) {
        scheduleStatus = 'today';
      } else if (daysUntilNext < 0) {
        scheduleStatus = 'overdue';
      } else {
        scheduleStatus = 'future';
      }
    }

    return {
      lastInjection,
      nextSuggestedZone,
      nextInjectionDate,
      daysUntilNext,
      scheduleStatus,
      totalInjections: injections.length,
    };
  }, [injections, preferences]);

  return (
    <InjectionsContext.Provider
      value={{
        injections,
        preferences,
        loading,
        error,
        addInjection,
        deleteInjection,
        updatePreferences,
        ...calculations,
      }}
    >
      {children}
    </InjectionsContext.Provider>
  );
}

export function useInjections() {
  const context = useContext(InjectionsContext);
  if (!context) {
    throw new Error('useInjections doit être utilisé au sein de InjectionsProvider');
  }
  return context;
}
